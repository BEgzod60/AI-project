"""muslim.uz «Namoz» va «Iymon» bo'limlari matnlarini import qilish.

    python manage.py import_muslimuz                  # Namoz: saytdan yuklab, yangi bo'limlarni qo'shadi
    python manage.py import_muslimuz --category iymon # Iymon bo'limi (muslim.uz/uz/c/iyman)
    python manage.py import_muslimuz --dry-run        # faqat hisobot
    python manage.py import_muslimuz --update         # mavjud bo'limlar matnini ham yangilaydi (holatiga tegmaydi)
    python manage.py import_muslimuz --keep-arabic    # arab yozuvidagi xatboshilarni saqlash (sukut — olib tashlanadi)
    python manage.py import_muslimuz --uz-file a.html --oz-file b.html   # saqlangan sahifalardan

Lotin sahifasi (uz) asosiy manba. Lotin matni kirill (oz) sahifasidagidan sezilarli qisqa yoki
arabcha matn/tilovat yo'qolgan bo'lsa, kirill matni lotinga o'giriladi va bo'lim
«Tekshiruv kutilmoqda» holatida qoldiriladi — o'girish inson tomonidan tekshirilishi kerak.
"""
import re

import requests
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.namoz import muslimuz as mu
from apps.namoz.models import Section, SourceReference, Topic

PUBLISHER = 'O‘zbekiston musulmonlari idorasi'
REVIEWED_BY = f'{PUBLISHER} (muslim.uz)'

# Bo'lim -> (muslim.uz sahifasi, manba nomidagi bo'lim nomi, source_key prefiksi)
SOURCES = {
    Topic.Category.NAMOZ: ('prayer', 'Namoz', 'muslim.uz'),  # prefiks avvalgi importlar bilan mos
    Topic.Category.IYMON: ('iyman', 'Iymon', 'muslim.uz/iyman'),
}


def _norm(title):
    return re.sub(r'[^\w]', '', mu.fix_homoglyphs(title).lower())


def _fetch(url):
    try:
        resp = requests.get(url, timeout=60, headers={'User-Agent': 'Mozilla/5.0 (Iymon importer)'})
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise CommandError(f'{url} yuklanmadi: {exc}') from exc
    resp.encoding = 'utf-8'
    return resp.text


FALLBACK_NOTE = ' (kirill yozuvidan lotinga o‘girilgan — tekshirish kerak)'


def _needs_fallback(uz_body, oz_body, keep_arabic):
    uz_text, oz_text = mu.source_plain_text(uz_body), mu.source_plain_text(oz_body)
    if len(uz_text) < 0.6 * len(oz_text):
        return 'lotin matni to‘liq emas'
    if keep_arabic and mu.ARABIC_RE.search(oz_text) and not mu.ARABIC_RE.search(uz_text):
        return 'lotin matnida arabcha matn yo‘q'
    if oz_body.count('<iframe') > uz_body.count('<iframe'):
        return 'lotin matnida tilovat yo‘q'
    return None


class Command(BaseCommand):
    help = "muslim.uz «Namoz»/«Iymon» sahifalaridagi matnlarni tegishli bo'limga import qiladi."

    def add_arguments(self, parser):
        parser.add_argument('--category', default=Topic.Category.NAMOZ, choices=list(SOURCES), help="Bo'lim")
        parser.add_argument('--uz-file', help='Saqlangan lotin sahifa (HTML)')
        parser.add_argument('--oz-file', help='Saqlangan kirill sahifa (HTML)')
        parser.add_argument('--dry-run', action='store_true', help="Bazaga yozmasdan hisobot chiqarish")
        parser.add_argument('--update', action='store_true', help="Mavjud bo'limlar matnini ham yangilash")
        parser.add_argument(
            '--keep-arabic', action='store_true',
            help="Arab yozuvidagi xatboshilarni saqlash (sukut bo'yicha olib tashlanadi — saytda faqat lotincha matn)",
        )

    def handle(self, *args, category=Topic.Category.NAMOZ, uz_file=None, oz_file=None, dry_run=False, update=False,
               keep_arabic=False, **opts):
        self.keep_arabic = keep_arabic
        page, label, self.key_prefix = SOURCES[category]
        self.url_uz = f'https://muslim.uz/uz/c/{page}'
        self.source_title = f'{PUBLISHER} rasmiy sayti — «{label}» bo‘limi'
        uz_html = open(uz_file, encoding='utf-8').read() if uz_file else _fetch(self.url_uz)
        oz_html = open(oz_file, encoding='utf-8').read() if oz_file else _fetch(f'https://muslim.uz/oz/c/{page}')
        uz_articles, oz_articles = mu.parse_page(uz_html), mu.parse_page(oz_html)
        oz_blocks = {b.key: b for a in oz_articles for b in a.blocks}

        topics = list(Topic.objects.filter(category=category).order_by('number'))
        if len(uz_articles) != len(topics):
            raise CommandError(f'Manbada {len(uz_articles)} ta mavzu, bazada {len(topics)} ta — moslik buzilgan.')
        for topic, art in zip(topics, uz_articles):
            if _norm(topic.title) != _norm(art.blocks[0].title):
                raise CommandError(f'Mavzu mos emas: «{topic.title}» ≠ manbada «{art.blocks[0].title}».')

        stats = {'created': 0, 'updated': 0, 'skipped': 0, 'fallback': [], 'resolved': []}
        with transaction.atomic():
            for topic, art in zip(topics, uz_articles):
                for position, block in enumerate(art.blocks):
                    self._import_block(topic, position, block, oz_blocks.get(block.key), update, stats)
            if dry_run:
                transaction.set_rollback(True)

        prefix = '[DRY-RUN] ' if dry_run else ''
        self.stdout.write(self.style.SUCCESS(
            f"{prefix}Yaratildi: {stats['created']}, yangilandi: {stats['updated']}, o'tkazib yuborildi: {stats['skipped']}"
        ))
        for key, title, reason in stats['fallback']:
            self.stdout.write(self.style.WARNING(f'  {key} «{title}»: {reason} — kirilldan o‘girildi, tekshiruv kutilmoqda'))
        for key, title in stats['resolved']:
            self.stdout.write(self.style.SUCCESS(f'  {key} «{title}»: endi rasmiy lotin matni to‘liq — chop etildi'))

    def _import_block(self, topic, position, block, oz_block, update, stats):
        source_key = f'{self.key_prefix}:{block.key}'
        existing = Section.objects.filter(source_key=source_key).first()
        if existing and not update:
            stats['skipped'] += 1
            return

        body = mu.fix_homoglyphs(block.body)
        oz_body = oz_block.body if oz_block else None
        if not self.keep_arabic:
            body = mu.strip_arabic(body)
            oz_body = mu.strip_arabic(oz_body) if oz_body else None
        title = mu.sentence_case(mu.fix_homoglyphs(block.title))
        reason = _needs_fallback(body, oz_body, self.keep_arabic) if oz_body else None
        if reason:
            body = mu.transliterate_html(oz_body)
            stats['fallback'].append((block.key, title, reason))

        content = mu.transform(body)
        if mu.transformed_plain_text(content) != mu.source_plain_text(body):
            raise CommandError(f'{block.key}: formatlashda matn o‘zgarib ketdi — import to‘xtatildi.')

        fields = {'topic': topic, 'order': position * 10, 'title': title, 'content_html': content}
        if existing:
            for name, value in fields.items():
                setattr(existing, name, value)
            # Avval kirilldan o'girilgan blok endi rasmiy lotin matni bilan to'liq bo'lsa — manba matni sifatida chop etiladi
            fallback_refs = existing.sources.filter(reference__endswith=FALLBACK_NOTE)
            if not reason and fallback_refs.exists() and existing.status == Section.Status.AWAITING_REVIEW:
                existing.status = Section.Status.PUBLISHED
                existing.reviewed_by = REVIEWED_BY
                fallback_refs.update(reference=title)
                stats['resolved'].append((block.key, title))
            existing.save()
            stats['updated'] += 1
            return

        section = Section.objects.create(
            **fields,
            kind=Section.Kind.TEXT,
            source_key=source_key,
            status=Section.Status.AWAITING_REVIEW if reason else Section.Status.PUBLISHED,
            reviewed_by='' if reason else REVIEWED_BY,
        )
        reference = title + (FALLBACK_NOTE if reason else '')
        SourceReference.objects.create(
            section=section,
            title=self.source_title,
            author=PUBLISHER,
            reference=reference,
            url=f'{self.url_uz}#{block.key}',
        )
        stats['created'] += 1
