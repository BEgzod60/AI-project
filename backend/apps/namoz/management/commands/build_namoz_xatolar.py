"""«Namozdagi xatolar» mavzusi — muslim.uz «Namoz» sahifasidagi bo'limlardan.

    python manage.py build_namoz_xatolar            # saytdan yuklab (bo'lmasa — bazadagi import nusxasidan)
    python manage.py build_namoz_xatolar --offline  # faqat bazadagi import nusxasidan

Manba: https://muslim.uz/uz/c/prayer — «Namozni buzuvchi amallar», «Namozdagi harom amallar»,
«Namozdagi makruh amallar», «Sajdai sahv». Matn O'ZGARTIRILMAYDI: ro'yxat bandlari alohida kartaga
ajratiladi va kartalardagi matn manbadagi matnga aynan tengligi tekshiriladi.
"""
import html as html_lib
import re

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.namoz import muslimuz as mu
from apps.namoz.management.commands.import_muslimuz import PUBLISHER, REVIEWED_BY, _fetch
from apps.namoz.models import Section, SourceReference, Topic

PAGE = 'https://muslim.uz/uz/c/prayer'
SOURCE_TITLE = f'{PUBLISHER} rasmiy sayti — «Namoz» bo‘limi'
TOPIC = {
    'slug': 'namozdagi-xatolar',
    'title': 'Namozdagi xatolar',
    'summary': 'Namozni buzadigan, harom va makruh amallar hamda sajdai sahv bilan tuzatiladigan xatolar.',
    'icon': Topic.Icon.SHIELD,
    'theme': Topic.Theme.GOLD,
    'image': '/images/namoz/13.webp',
}
# (muslim.uz bloki, bo'lim sarlavhasi, ko'rinishi) — og'iridan yengiliga
BLOCKS = [
    ('block150', 'Namozni buzuvchi amallar', 'list'),
    ('block148', 'Namozdagi harom amallar', 'list'),
    ('block151', 'Namozdagi makruh amallar', 'list'),
    ('block155', 'Sajdai sahv — xatoni isloh qilish sajdasi', 'text'),
]
KEY_PREFIX = 'muslim.uz:xatolar'

LI_RE = re.compile(r'<li\b[^>]*>(.*?)</li>', re.S)
P_RE = re.compile(r'<p\b[^>]*>(.*?)</p>', re.S)
DASH_RE = re.compile(r'^[–—-]\s*')


def _text(fragment):
    return ' '.join(html_lib.unescape(re.sub(r'<[^>]+>', ' ', fragment)).replace('\xa0', ' ').split())


def split_items(content):
    """Bo'lim HTML'idan: kirish matni va ro'yxat bandlari (raqamli <li> yoki «–» bilan boshlanuvchi xatboshilar)."""
    intro, items = [], []
    for m in re.finditer(r'<ol\b.*?</ol>|<ul\b.*?</ul>|<p\b[^>]*>.*?</p>', content, re.S):
        part = m.group(0)
        if part.startswith(('<ol', '<ul')):
            items += [_text(li) for li in LI_RE.findall(part)]
            continue
        text = _text(part)
        if DASH_RE.match(text):
            items.append(DASH_RE.sub('', text))
        elif text:
            intro.append(text)
    return ' '.join(intro), [i for i in items if i]


def _letters(text):
    return re.sub(r'[\W_]', '', text)


class Command(BaseCommand):
    help = "«Namoz» bo'limiga «Namozdagi xatolar» mavzusini muslim.uz matnlaridan quradi"

    def add_arguments(self, parser):
        parser.add_argument('--offline', action='store_true', help='Saytga murojaat qilmasdan, bazadagi import nusxasidan')

    def handle(self, *args, offline=False, **options):
        blocks, origin = {}, 'baza (avvalgi import)'
        if not offline:
            try:
                page = mu.parse_page(_fetch(PAGE))
                blocks = {b.key: b.body for art in page for b in art.blocks}
                origin = PAGE
            except (CommandError, ValueError) as exc:
                self.stderr.write(f'Sayt yuklanmadi ({exc}) — bazadagi nusxa ishlatiladi.')

        prepared = []
        for key, title, view in BLOCKS:
            if key in blocks:
                body = mu.strip_arabic(mu.fix_homoglyphs(blocks[key]))
                content = mu.transform(body)
                if mu.transformed_plain_text(content) != mu.source_plain_text(body):
                    raise CommandError(f'{key}: formatlashda matn o‘zgarib ketdi.')
            else:
                original = Section.objects.filter(source_key=f'muslim.uz:{key}').first()
                if not original:
                    raise CommandError(f'{key} na saytda, na bazada topildi: avval `import_muslimuz` ni ishga tushiring.')
                content = original.content_html

            intro, items = split_items(content) if view == 'list' else ('', [])
            if view == 'list':
                if not items:
                    raise CommandError(f'{key}: ro‘yxat bandlari topilmadi — sahifa tuzilishi o‘zgargan bo‘lishi mumkin.')
                # Kafolat: kirish + bandlar = manbadagi matn (harflar bo'yicha, tinish belgilari va raqamlardan tashqari)
                if _letters(intro + ''.join(items)) != _letters(_text(content)):
                    raise CommandError(f'{key}: bandlarga ajratishda matn o‘zgarib ketdi.')
            prepared.append((key, title, view, content, intro, items))

        with transaction.atomic():
            number = Topic.objects.filter(category=Topic.Category.NAMOZ, slug=TOPIC['slug']).values_list('number', flat=True).first()
            if number is None:
                last = Topic.objects.filter(category=Topic.Category.NAMOZ).order_by('-number').values_list('number', flat=True).first()
                number = (last or 0) + 1
            topic, _ = Topic.objects.update_or_create(
                category=Topic.Category.NAMOZ, slug=TOPIC['slug'], defaults={**TOPIC, 'number': number, 'is_visible': True},
            )
            topic.sections.all().delete()
            for position, (key, title, view, content, intro, items) in enumerate(prepared):
                section = Section.objects.create(
                    topic=topic, order=position * 10, title=title,
                    kind=Section.Kind.CARDS if view == 'list' else Section.Kind.TEXT,
                    body=intro, content_html='' if view == 'list' else content,
                    source_key=f'{KEY_PREFIX}:{key}', status=Section.Status.PUBLISHED, reviewed_by=REVIEWED_BY,
                )
                section.items.bulk_create([
                    section.items.model(section=section, order=n, title=text) for n, text in enumerate(items)
                ])
                SourceReference.objects.create(
                    section=section, title=SOURCE_TITLE, author=PUBLISHER, reference=title, url=f'{PAGE}#{key}',
                )
                self.stdout.write(f'  {title}: {len(items) or "matn"}{" ta band" if items else ""}')

        self.stdout.write(self.style.SUCCESS(f'«{topic.title}» ({topic.number}-mavzu) tayyor. Manba: {origin}'))
