"""«Birga o'qish» / «Birga takrorlash» rejimlari uchun namoz ketma-ketligi.

Ketma-ketlik faqat tasdiqlangan (published) dars qadamlaridan deterministik tarzda yig'iladi —
yangi diniy matn yaratilmaydi. Har bir rakat Fotiha o'qiladigan qadamdan boshlanadi; birinchi
rakatdagi Fotiha qadami bilan keyingi rakat qadami orasidagi qadamlar (ruku', qavma, sajda, jalsa)
keyingi rakatlarda takrorlanadi. Tuzilmani tanib bo'lmasa rejim o'chiriladi (supported=False).
"""
import re

from apps.quran.models import Ayah

from .models import PrayerCategory, Recitation
from .step_images import _image

FOTIHA = 'fotiha'
QUNUT = 'qunut'
# O'tirib o'qiladiganlar — rasm «o'tirish» bo'lishi kerak
SITTING_RECITATIONS = {'tashahhud', 'salavotlar', 'robbana'}

# Ruku' va sajdada tasbeh kamida uch marta aytiladi («Subhana Robbiyal-’aziym / a’la» ×3) —
# shoshirmaslik uchun eng kami 8 soniya (frontend ham shundan kam qilmaydi).
TASBIH_TIMING = (8, 12)
JALSA_TIMING = (3, 5)
# Qadam nomidagi kalit so'z → (eng kam, eng ko'p) soniya. Tartib muhim: 'jalsa' 'sajda'dan oldin.
POSTURE_TIMING = [
    ('jalsa', (JALSA_TIMING[0] + TASBIH_TIMING[0], JALSA_TIMING[1] + TASBIH_TIMING[1])),   # jalsa + ikkinchi sajda
    ('sajda', TASBIH_TIMING),
    ('ruku', TASBIH_TIMING),
    ('qavma', (3, 5)),
]
ACTION_TIMING = (4, 6)

SETTINGS = {
    # Lotin yozuvidagi o'qilish matni: soniyasiga taxminan nechta harf o'qiladi
    'speeds': {'sekin': 7, 'ortacha': 10, 'tez': 14},
    # Mikrofon sezgirligi: ovoz chegarasi (RMS) va sura so'zlari mosligi (ulush). Tilovatni brauzer
    # hamma so'zini tanimaydi — oxirgi so'zlar ham tanilishi shart bo'lgani uchun ulush past bo'lishi mumkin.
    'sensitivity': {
        'past': {'rms': 0.045, 'match': 0.6},
        'ortacha': {'rms': 0.03, 'match': 0.45},
        'yuqori': {'rms': 0.018, 'match': 0.3},
    },
    'fallback_seconds': {'min': 3, 'max': 20, 'default': 6},
    'recitation_seconds': {'min': 4, 'max': 240},
    'defaults': {
        'speed': 'ortacha', 'sensitivity': 'ortacha', 'fallback': 6, 'large_text': False,
        'wake_lock': True, 'night': False, 'speech': True, 'offline': True,
    },
}

# Salom lafzi — muslim.uz «Ikki rakatli farz namozini o'qish tartibi»
SALOM_TEXT = 'Assalomu alaykum va rohmatulloh'
SALOM_SOURCE = 'https://muslim.uz/uz/c/prayer/ikki-rakatli-farz-namozini-o-qish-tartibi'
MUSLIM_UZ = 'O‘zbekiston musulmonlari idorasi rasmiy sayti (muslim.uz)'
SALOM_SOURCE_TITLE = f'{MUSLIM_UZ} — «Ikki rakatli farz namozini o‘qish tartibi»'
SUNNAT4_SOURCE = ('https://muslim.uz/uz/c/prayer/to-rt-rakatli-sunnat-namozni-o-qish-tartibi',
                  f'{MUSLIM_UZ} — «To‘rt rakatli sunnat namozni o‘qish tartibi»')
TANZIL_SOURCE = ('https://tanzil.net', 'Tanzil Project — Usmoniy Qur’on matni (CC BY 3.0)')
OWNER_NOTE = 'Loyiha egasi ko‘rsatmasi (manbada alohida yozilmagan)'

# Farz namozidan so'ng (muslim.uz manbalari bilan, aynan)
AFTER_FARZ = [
    {
        'slug': 'istigfor', 'name': 'Istig‘for', 'kind': 'dua', 'surah_number': None,
        'transliteration': 'Astag‘firulloh', 'meaning': 'Allohdan mag‘firat so‘rayman', 'times': 3,
        'source_title': f'{MUSLIM_UZ} — «Farz namozlaridan avval va keyingi sunnat namozlari» (Fatvo markazi)',
        # «...farz namozni tugatganlarida uch marta “Astag'firulloh” der edilar» (Imom Muslim rivoyati)
        'source_url': 'https://muslim.uz/uz/e/post/4478-farz-namozlaridan-avval-va-keyingi-sunnat-namozlari',
    },
    {
        'slug': 'antas-salom', 'name': 'Namozdan so‘ng duo', 'kind': 'dua', 'surah_number': None,
        'transliteration': 'Allohumma, antas-salom va minkas-salom, tabarokta ya zaljaloli val-ikrom',
        'meaning': 'Allohim! Sen Salomsan, salomatlik Sendandir. Sen Tabarruksan, ey jalol va ikrom egasi!',
        'times': 1,
        'source_title': f'{MUSLIM_UZ} — «Namozdan so‘ng o‘qiladigan duolar»',
        # «(Ushbu duo farz namozlaridan so'ng o'qiladi)»
        'source_url': 'https://muslim.uz/uz/c/prayer/namozdan-so-ng-o-qiladigan-duolar',
    },
]

SAFETY_NOTICE = (
    "Hanafiy mazhabida namoz ichida ekrandan yoki mushafdan qarab qiroat qilish masalasi alohida hukmga ega. "
    "Bu rejimdan haqiqiy namozda foydalanishdan oldin masjid imomi yoki diniy mutaxassis bilan maslahatlashing. "
    "Ilova o‘qiganingizni tasdiqlamaydi: belgilangan vaqt faqat keyingi ko‘rsatmani chiqaradi."
)


def _published(qs):
    return [obj for obj in qs if obj.is_published]


def _timing(title, default=ACTION_TIMING):
    lower = title.lower().replace('’', '').replace("'", '')
    return next((t for key, t in POSTURE_TIMING if key in lower), default)


ZIKR_RE = re.compile(r'«([^»]+)»\s*(?:\(([^)]+)\))?')
SENTENCE_RE = re.compile(r'(?<=[.!?])\s+')


def _tidy(text):
    """Manbadagi bir xil zikrning yozilishi bir xil bo'lsin («Subhana robbiyal» → «Subhana Robbiyal»).
    Sajda tasbehi «a’la» bilan — muslim.uz «To'rt rakatli farz namozni o'qish tartibi»dagi kabi
    («Subhaana Robbiyal a’la»), loyiha egasi ko'rsatmasi bilan."""
    text = re.sub(r'^Subhana robbiy', 'Subhana Robbiy', text.strip())
    return re.sub(r'Robbiyal-a’lo\b', 'Robbiyal-a’la', text)


def extract_zikr(text, label=''):
    """Qadam matnidagi «...» ichidagi zikrlar — aynan manbadagidek. Ma'nosi qavsda bo'lsa olinadi;
    oldida «uch marta» yozilgan bo'lsa takror soni 3."""
    items = []
    for m in ZIKR_RE.finditer(text or ''):
        before = text[max(0, m.start() - 30):m.start()].lower()
        items.append({
            'text': _tidy(m.group(1)),
            'meaning': (m.group(2) or '').strip(),
            'times': 3 if 'uch marta' in before else 1,
            'label': label,
        })
    return items


def _with_label(item, label):
    return {**item, 'label': label}


def _posture_kind(title):
    lower = title.lower().replace('’', '').replace("'", '')
    if lower.startswith('ikkinchi sajda'):
        return 'sajda2'
    for key in ('jalsa', 'sajda', 'ruku', 'qavma'):
        if key in lower:
            return key
    return ''


def link_postures(block):
    """Bir rakatdagi holatlar zikrini «qachon aytiladi» bo'yicha belgilaydi va turishda aytiladiganini
    shu holatning o'ziga o'tkazadi (ruku'dan turishda «Sami'allohu...», sajdadan turishda «Allohu akbar»).
    Hech qanday matn qo'shilmaydi — faqat manbadagi zikrlar joylashtiriladi."""
    kinds = [_posture_kind(st['title']) for st in block]
    rising_from_sajda = None
    for st, kind in zip(block, kinds):
        if kind == 'jalsa' and st['zikr']:
            rising_from_sajda = st['zikr'][0]

    for i, (st, kind) in enumerate(zip(block, kinds)):
        zikr = st['zikr']
        nxt = block[i + 1] if i + 1 < len(block) else None
        if kind in ('ruku', 'sajda', 'sajda2'):
            place = 'Ruku’da' if kind == 'ruku' else 'Sajdada'
            zikr = [_with_label(z, place if z['times'] > 1 else 'Borishda') for z in zikr]
            if kind == 'ruku' and nxt and _posture_kind(nxt['title']) == 'qavma' and nxt['zikr']:
                zikr.append(_with_label(nxt['zikr'][0], 'Turishda'))
            elif kind in ('sajda', 'sajda2') and rising_from_sajda:
                zikr.append(_with_label(rising_from_sajda, 'Turishda'))
        elif kind == 'qavma':
            zikr = [_with_label(z, 'Tik turgach') for z in zikr[1:]]  # birinchisi ruku'dan turishda aytiladi
        elif kind == 'jalsa' and rising_from_sajda is not None and len(block) > i + 1:
            zikr = []  # sajdadan turishdagi takbir sajda bosqichida ko'rsatiladi
        st['zikr'] = zikr


def action_zikr(step):
    """Niyat, takbir, salom: faqat birinchi «...» (keyingilari — talaffuz izohlari).
    Manbada to'liq yozilmagan («...» bilan qisqartirilgan) bo'lsa — ko'rsatilmaydi."""
    items = extract_zikr(step.text)
    if not items or '...' in items[0]['text'] or '…' in items[0]['text']:
        return []
    item = items[0]
    lower, title = step.text.lower(), step.title.lower()
    if title.startswith('niyat'):
        label = 'Niyat mazmuni'
    elif 'salom' in title and 'o‘ng' in lower and 'chap' in lower:
        label = 'Avval o‘ngga, so‘ng chapga'
    elif 'takbir' in title:
        label = 'Takbir'
    else:
        label = ''
    return [{**item, 'times': 1, 'label': label}]


def _split_jalsa(step, sajda_step):
    """«Jalsa va ikkinchi sajda» qadamini ikki bosqichga ajratadi (matn jumlalari bo'yicha).
    Ajratib bo'lmasa — None (qadam bitta bosqich bo'lib qoladi)."""
    sentences = SENTENCE_RE.split(step.text.strip())
    second = [x for x in sentences if 'ikkinchi' in x.lower() and 'sajda' in x.lower()]
    first = [x for x in sentences if x not in second]
    if not first or not second:
        return None
    images = step.images or []
    sajda_images = (sajda_step.images if sajda_step else None) or images[1:] or images
    # Ikkinchi sajdada ham birinchi sajdadagi tasbeh aytiladi (Sajda qadami matnidan)
    tasbeh = [z for z in extract_zikr(sajda_step.text if sajda_step else '') if z['times'] > 1]
    return [
        {'title': 'Jalsa', 'text': ' '.join(first), 'images': images[:1], 'timing': JALSA_TIMING,
         'zikr': extract_zikr(' '.join(first))},
        {'title': 'Ikkinchi sajda', 'text': ' '.join(second), 'images': sajda_images[-1:], 'timing': TASBIH_TIMING,
         'zikr': extract_zikr(' '.join(second)) + tasbeh},
    ]


def _recitation_slugs(step):
    return [r.slug for r in step.recitations.all() if r.is_published]


def build_sequence(steps):
    """Qadamlar ro'yxatidan (tartiblangan) bosqichlar ro'yxatini quradi.

    Qaytaradi: (stages, rakat_count). Tuzilma tanilmasa — ([], 0).
    """
    fotiha_idx = [i for i, s in enumerate(steps) if FOTIHA in _recitation_slugs(s)]
    if len(fotiha_idx) < 2:
        return [], 0

    first, second = fotiha_idx[0], fotiha_idx[1]
    postures = steps[first + 1:second]
    if not postures or any(_recitation_slugs(p) for p in postures):
        return [], 0

    # Niyatdan oldingi tayyorgarlik/izoh qadamlari namoz ichidagi ketma-ketlikka kirmaydi
    start = next((i for i, s in enumerate(steps[:first]) if s.title.lower().startswith('niyat')), 0)

    stages = []
    rakat = 0
    # opening — niyat/takbir/sano; rakat — qiroat va holatlar; qada — rakatlar orasidagi o'tirish;
    # final — oxirgi qa'da va salom (rakatlar sonini o'zgartirishda kerak)
    state = {'segment': 'opening'}

    def add(step, kind, recitation=None, zam=False, title=None, override=None):
        stage = {
            'index': len(stages),
            'step_order': step.order,
            'rakat': max(rakat, 1),
            'kind': kind,
            'title': title or step.title,
            'text': step.text,
            'text_female': step.text_female,
            'images': step.images or [],
            'recitation': recitation,
            'zam': zam,
            'timing': None if kind == 'recitation' else _timing(step.title),
            # Ruku', sajda va boshqa holatlarda ekranda faqat o'qiladigan zikr ko'rsatiladi
            'zikr': extract_zikr(step.text) if kind == 'posture' else action_zikr(step) if kind == 'action' else [],
            'source_url': step.source_url,
            'source_title': step.source_title,
            'segment': state['segment'],
        }
        stage.update(override or {})
        stages.append(stage)

    # Birinchi sajda qadami — nomida «sajda» bor, «jalsa» yo'q (ruku' bilan vaqti bir xil, shuning uchun nom bo'yicha)
    sajda_step = next((p for p in postures if 'sajda' in p.title.lower() and 'jalsa' not in p.title.lower()), None)

    def add_postures():
        start_idx = len(stages)
        for p in postures:
            lower = p.title.lower()
            parts = _split_jalsa(p, sajda_step) if 'jalsa' in lower and 'sajda' in lower else None
            if parts:
                for part in parts:
                    add(p, 'posture', override=part)
            else:
                add(p, 'posture')
        link_postures(stages[start_idx:])

    def add_amiyn(step):
        # «valad doliyn»dan keyin ohista «amiyn» aytiladi (Qiroat qadami matni)
        add(step, 'action', title='Amiyn', override={
            'timing': (2, 3), 'images': (step.images or [])[:1],
            'zikr': [{'text': 'Amiyn', 'meaning': '', 'times': 1, 'label': 'Ohista'}],
        })

    def add_salom(step):
        """Salom ikki bosqich: avval o'ngga, so'ng chapga."""
        quoted = next((z['text'] for z in extract_zikr(step.text) if z['text'].lower().startswith('assalomu')), SALOM_TEXT)
        images = step.images or []
        for side, key, label in (('O‘ngga salom', 'salom-ong', 'O‘ng yelkaga qarab'), ('Chapga salom', 'salom-chap', 'Chap yelkaga qarab')):
            imgs = [img for img in images if key in img.get('src', '')]
            add(step, 'action', title=side, override={
                'timing': (2, 4), 'images': imgs[:1] or images[-1:],
                'zikr': [{'text': quoted, 'meaning': '', 'times': 1, 'label': label}],
                'source_url': step.source_url or SALOM_SOURCE,
                'source_title': step.source_title or SALOM_SOURCE_TITLE,
            })

    def add_qunut_takbir(step):
        """Vitr: zam suradan keyin ruku'ga bormay «Allohu akbar» deb qo'llar quloq to'g'risigacha ko'tariladi,
        so'ng qovushtirilib Qunut o'qiladi (qadam matnidan, aynan)."""
        takbir = next((z for z in extract_zikr(step.text) if z['text'].lower().startswith('allohu akbar')), None)
        if not takbir:
            return
        add(step, 'action', title='Qunut takbiri', override={
            'timing': (3, 5), 'images': [_image('takbir')],
            'zikr': [{**takbir, 'times': 1, 'label': 'Qo‘llar quloq to‘g‘risigacha ko‘tariladi'}],
        })

    def add_step(step):
        slugs = _recitation_slugs(step)
        is_salom = 'salom' in step.title.lower()
        if not slugs and not step.zam_sura_choice:
            if is_salom:
                add_salom(step)
            else:
                add(step, 'action')
            return
        # Zam sura Fotihadan keyin darhol o'qiladi (masalan Vitrda Qunutdan oldin)
        zam_after = slugs.index(FOTIHA) if FOTIHA in slugs else len(slugs) - 1
        sitting = [img for img in (step.images or []) if 'otirish' in img.get('src', '')][:1]
        for n, slug in enumerate(slugs):
            if slug == QUNUT:
                add_qunut_takbir(step)
            add(step, 'recitation', recitation=slug,
                override={'images': sitting} if slug in SITTING_RECITATIONS and sitting else None)
            if slug == FOTIHA:
                add_amiyn(step)
            if step.zam_sura_choice and n == zam_after:
                add(step, 'recitation', zam=True, title='Zam sura')
        if step.zam_sura_choice and not slugs:
            add(step, 'recitation', zam=True, title='Zam sura')
        if is_salom:  # «Qa'dai oxir va salom» — duolardan keyin salom
            add_salom(step)

    i = start
    while i < len(steps):
        step = steps[i]
        if i in fotiha_idx:
            rakat += 1
            state['segment'] = 'rakat'
            add_step(step)
            add_postures()
            if i == first:
                i = second
                continue
        else:
            state['segment'] = 'qada' if rakat else 'opening'
            add_step(step)
        i += 1
    last_rakat = max((n for n, st in enumerate(stages) if st['segment'] == 'rakat'), default=-1)
    for st in stages[last_rakat + 1:]:
        st['segment'] = 'final'
    return stages, rakat


COUNT_WORDS = {2: 'ikki', 3: 'uch', 4: 'to‘rt'}
KIND_LABELS = {'farz': 'farz', 'sunnat': 'sunnat', 'vojib': 'vojib', 'nafl': 'nafl'}


def _niyat_for(text, count, kind):
    """Niyat matnida faqat rakat soni va turi almashtiriladi (manba: «Faqat niyatda farq bo'ladi»;
    4 rakatli sunnat niyati — «...peshin namozining sunnatini...»)."""
    word = COUNT_WORDS.get(count)
    if not word:
        return text
    text = re.sub(r'(To‘rt|Uch|Ikki) rakatli', word.capitalize() + ' rakatli', text)
    text = re.sub(r'(to‘rt|uch|ikki) rakat ', word + ' rakat ', text)
    return re.sub(r'\b(farzini|sunnatini|vojibini)\b', KIND_LABELS[kind] + 'ini', text)


def build_part(stages, rakats, count, kind):
    """Farz ketma-ketligidan boshqa qism (masalan 4 yoki 2 rakat sunnat) — muslim.uz qoidalari bo'yicha:
    2 rakatli sunnat 2 rakatli farz kabi (faqat niyat farqli); 4 rakatli sunnatda 3- va 4-rakatda ham
    Fotihadan keyin zam sura o'qiladi. Bajarib bo'lmasa — None."""
    if count > rakats or count < 2:
        return None
    zam_stage = next((st for st in stages if st['zam']), None)
    out = []
    for st in stages:
        seg = st['segment']
        if seg != 'final' and st['rakat'] > count:
            continue
        if seg == 'qada' and count <= 2:
            continue  # 2 rakatda o'rta qa'da yo'q — oxirgi qa'da qoladi
        st = {**st, 'zikr': [dict(z) for z in st['zikr']]}
        if seg == 'final':
            st['rakat'] = count
        if st['title'].lower().startswith('niyat'):
            st['text'] = _niyat_for(st['text'], count, kind)
            for z in st['zikr']:
                z['text'] = _niyat_for(z['text'], count, kind)
        out.append(st)
        # Sunnat/vojib/nafl: har bir rakatda zam sura (farzda faqat avvalgi ikki rakatda)
        if kind != 'farz' and st['title'] == 'Amiyn' and st['segment'] == 'rakat' and zam_stage:
            nxt_is_zam = any(o['zam'] and o['rakat'] == st['rakat'] for o in stages)
            if not nxt_is_zam:
                out.append({**zam_stage, 'rakat': st['rakat'], 'step_order': st['step_order']})
    for n, st in enumerate(out):
        st['index'] = n
    return out


def prayer_parts(category, rakats):
    """Namozning rakat qismlari (masalan Peshin: 4 sunnat, 4 farz, 2 sunnat)."""
    parts = []
    for n, item in enumerate(category.rakat_breakdown or []):
        count, kind = item.get('count'), item.get('kind')
        parts.append({
            'index': n, 'count': count, 'kind': kind, 'label': f'{count} rakat {kind}',
            'supported': isinstance(count, int) and 2 <= count <= rakats,
        })
    return parts


def _arabic(surah_numbers):
    """Suralarning arabcha oyatlari (Tanzil) — ovozni solishtirish uchun.

    Tanzil matnida Fotihadan boshqa suralarning 1-oyati oldida Basmala turadi; zam sura
    basmalasiz o'qilgani uchun u solishtirishdan olib tashlanadi.
    """
    texts = {}
    for ayah in Ayah.objects.filter(surah__number__in=surah_numbers).select_related('surah'):
        text = ayah.text_arabic
        if ayah.number == 1 and ayah.surah.number not in (1, 9) and text.startswith('بِسْمِ'):
            text = ' '.join(text.split(' ')[4:])
        texts.setdefault(ayah.surah.number, []).append(text)
    return texts


def session_payload(category: PrayerCategory, part=None):
    base = {
        'category': {'slug': category.slug, 'name': category.name, 'image': category.image},
        'supported': False, 'reason': '', 'rakats': 0, 'stages': [], 'recitations': {}, 'zam_suras': [],
        'parts': [], 'part': None, 'sources': [],
        'settings': SETTINGS, 'safety_notice': SAFETY_NOTICE,
    }
    if not category.is_published:
        base['reason'] = 'Bu namoz ma’lumotlari hali tasdiqlanmagan.'
        return base

    steps = _published(category.steps.prefetch_related('recitations'))
    stages, rakats = build_sequence(steps)
    if not stages:
        base['reason'] = 'Bu namoz uchun bosqichma-bosqich ketma-ketlik hozircha mavjud emas.'
        return base

    # Qaysi qism: ko'rsatilmasa — farz (yoki birinchi mos qism)
    parts = prayer_parts(category, rakats)
    base['parts'] = parts
    chosen = next((p for p in parts if p['index'] == part and p['supported']), None) if part is not None else None
    chosen = chosen or next((p for p in parts if p['kind'] == 'farz' and p['count'] == rakats), None) \
        or next((p for p in parts if p['supported']), None)
    if chosen:
        base['part'] = chosen['index']
        is_lesson = chosen['kind'] in ('farz', 'vojib') and chosen['count'] == rakats
        if not is_lesson:
            stages = build_part(stages, rakats, chosen['count'], chosen['kind'])
            rakats = chosen['count']
        if chosen['kind'] == 'farz':
            add_after_farz(stages, rakats)

    needed = {s['recitation'] for s in stages if s['recitation']}
    zam = _published(Recitation.objects.filter(is_zam_sura=True)) if any(s['zam'] for s in stages) else []
    needed |= {r.slug for r in zam}
    recs = [r for r in Recitation.objects.filter(slug__in=needed) if r.is_published]
    arabic = _arabic({r.surah_number for r in recs if r.surah_number})

    base.update(
        supported=True, rakats=rakats, stages=stages, zam_suras=[r.slug for r in zam],
        recitations={
            r.slug: {
                'slug': r.slug, 'name': r.name, 'kind': r.kind, 'surah_number': r.surah_number,
                'transliteration': r.transliteration, 'meaning': r.meaning,
                'arabic': arabic.get(r.surah_number) if r.surah_number else None,
                'source_url': r.source_url, 'source_title': r.source_title,
            }
            for r in recs
        },
    )
    for item in AFTER_FARZ:
        if any(st['recitation'] == item['slug'] for st in stages):
            base['recitations'][item['slug']] = {k: v for k, v in item.items() if k != 'times'} | {'arabic': None}
    base['sources'] = collect_sources(base, chosen)
    return base


def collect_sources(payload, part):
    """Rejimda ishlatilgan barcha manbalar (takrorlanmasdan): ketma-ketlik, matnlar, arabcha matn."""
    out, seen = [], set()

    def push(group, url, title):
        if (url or title) and (url, title) not in seen:
            seen.add((url, title))
            out.append({'group': group, 'url': url or '', 'title': title or url})

    for st in payload['stages']:
        if not st['recitation']:
            push('Namoz tartibi va zikrlar', st.get('source_url'), st.get('source_title'))
    if part and part['kind'] == 'sunnat':
        push('Namoz tartibi va zikrlar', *SUNNAT4_SOURCE) if part['count'] == 4 else push(
            'Namoz tartibi va zikrlar', SALOM_SOURCE, f'{SALOM_SOURCE_TITLE} — «Ikki rakatli sunnat namozlarini o‘qish tartibi ham bundan farqlanmaydi»')
    for rec in payload['recitations'].values():
        push('Sura va duolar (lotincha o‘qilishi va ma’nosi)', rec.get('source_url'), rec.get('source_title'))
    if any(rec.get('arabic') for rec in payload['recitations'].values()):
        push('Arabcha matn (ovozni solishtirish uchun)', *TANZIL_SOURCE)
    return out


def add_after_farz(stages, rakats):
    """Farz namozidan so'ng: uch marta istig'for, «Allohumma antas-salom...» duosi va amiyn."""
    last = stages[-1]
    all_images = [img for st in stages for img in st['images']]
    pick = lambda key: next(([img] for img in all_images if key in img.get('src', '')), last['images'][:1])  # noqa: E731
    sitting, dua = pick('otirish'), [_image('duo')]
    base = {'step_order': last['step_order'], 'rakat': rakats, 'text_female': '', 'zam': False}
    for item in AFTER_FARZ:
        stages.append({
            **base, 'images': sitting if item['slug'] == 'istigfor' else dua,
            'index': len(stages), 'kind': 'recitation', 'title': 'Namozdan so‘ng', 'recitation': item['slug'],
            'text': item['transliteration'], 'timing': None,
            'source_url': item['source_url'], 'source_title': item['source_title'],
            'zikr': [{'text': item['transliteration'], 'meaning': item['meaning'], 'times': item['times'],
                      'label': 'Salomdan so‘ng' if item['slug'] == 'istigfor' else 'Bir marta'}],
        })
    stages.append({
        **base, 'images': dua, 'index': len(stages), 'kind': 'action', 'title': 'Amiyn', 'recitation': None,
        'text': 'Duodan so‘ng «Amiyn» deyiladi.', 'timing': (2, 3), 'source_url': '', 'source_title': OWNER_NOTE,
        'zikr': [{'text': 'Amiyn', 'meaning': '', 'times': 1, 'label': 'Duodan so‘ng'}],
    })



# --- Ruscha interfeys (lang=ru) ----------------------------------------------------------------
# Faqat yorliqlar va bosqich nomlari o'giriladi (amal nomlari). Zikr/sura matni (lotincha o'qilishi)
# o'zgarmaydi; o'zbekcha ma'no va qadam tafsiloti diniy mazmun — o'zimizdan tarjima qilinmaydi.
TITLES_RU = {
    'Niyat': 'Намерение (ният)', 'Takbiri tahrima': 'Начальный такбир', 'Qiyom va Sano': 'Стояние и «Сана»',
    'Qiroat': 'Чтение (кираат)', 'Ruku’': 'Поясной поклон (руку)', 'Qavma (tik turish)': 'Выпрямление (кавма)',
    'Sajda': 'Земной поклон (суджуд)', 'Jalsa': 'Сидение между суджудами', 'Ikkinchi sajda': 'Второй суджуд',
    'Jalsa va ikkinchi sajda': 'Сидение и второй суджуд', 'Ikkinchi rakat': 'Второй ракаат',
    'Birinchi qa’da': 'Первое сидение (каада)', 'Avvalgi qa’da': 'Первое сидение (каада)',
    'Uchinchi rakat': 'Третий ракаат', 'To‘rtinchi rakat': 'Четвёртый ракаат',
    'Qa’dai oxir va salom': 'Последнее сидение и салям', 'Oxirgi qa’da va salom': 'Последнее сидение и салям',
    'Qa’da (tashahhud)': 'Сидение (ташаххуд)', 'Salom': 'Салям', 'Uchinchi rakat va Qunut': 'Третий ракаат и кунут',
    'Ruku’, sajda, qa’da va salom': 'Руку, суджуд, сидение и салям', 'Zam sura': 'Дополнительная сура',
    'Amiyn': 'Амин', 'O‘ngga salom': 'Салям вправо', 'Chapga salom': 'Салям влево',
    'Qunut takbiri': 'Такбир перед кунутом', 'Namozdan so‘ng': 'После намаза',
}
LABELS_RU = {
    'Borishda': 'При переходе', 'Ruku’da': 'В руку', 'Sajdada': 'В суджуде', 'Turishda': 'При подъёме',
    'Tik turgach': 'Выпрямившись', 'Niyat mazmuni': 'Смысл намерения', 'Takbir': 'Такбир',
    'Avval o‘ngga, so‘ng chapga': 'Сначала вправо, затем влево', 'O‘ng yelkaga qarab': 'Глядя на правое плечо',
    'Chap yelkaga qarab': 'Глядя на левое плечо', 'Ohista': 'Тихо', 'Salomdan so‘ng': 'После саляма',
    'Bir marta': 'Один раз', 'Duodan so‘ng': 'После дуа',
    'Qo‘llar quloq to‘g‘risigacha ko‘tariladi': 'Руки поднимаются до уровня ушей',
}
RECITATIONS_RU = {
    'sano': 'Сана', 'auzu': 'Таъаввуз («А‘узу биллях»)', 'tashahhud': 'Ташаххуд («Ат-тахият»)',
    'salavotlar': 'Салаваты', 'robbana': 'Дуа «Раббана»', 'qunut': 'Дуа «Кунут»', 'istigfor': 'Истигфар',
    'antas-salom': 'Дуа после намаза', 'oyatul-kursiy': 'Аят аль-Курси',
}
SOURCE_GROUPS_RU = {
    'Namoz tartibi va zikrlar': 'Порядок намаза и зикры',
    'Sura va duolar (lotincha o‘qilishi va ma’nosi)': 'Суры и дуа (чтение латиницей и смысл)',
    'Arabcha matn (ovozni solishtirish uchun)': 'Арабский текст (для сверки голоса)',
}
SAFETY_NOTICE_RU = (
    'В ханафитском мазхабе вопрос чтения с экрана или из мусхафа во время намаза имеет особое решение. '
    'Прежде чем использовать этот режим в настоящем намазе, посоветуйтесь с имамом мечети или специалистом. '
    'Приложение не подтверждает ваше чтение: заданное время лишь переключает подсказку.'
)
REASONS_RU = {
    'Bu namoz ma’lumotlari hali tasdiqlanmagan.': 'Данные этого намаза ещё не подтверждены.',
    'Bu namoz uchun bosqichma-bosqich ketma-ketlik hozircha mavjud emas.': 'Пошаговая последовательность для этого намаза пока недоступна.',
}


def localize(payload, lang):
    """lang=ru: yorliqlarni ruschaga o'giradi (diniy matn o'zgarmaydi)."""
    if lang != 'ru':
        return payload
    from apps.quran.models import Surah
    names = dict(Surah.objects.values_list('number', 'name_simple'))
    for st in payload['stages']:
        st['title'] = TITLES_RU.get(st['title'], st['title'])
        for z in st['zikr']:
            z['label'] = LABELS_RU.get(z['label'], z['label'])
            z['meaning'] = ''  # o'zbekcha ma'no — ruscha interfeysda ko'rsatilmaydi
    for slug, rec in payload['recitations'].items():
        if rec.get('surah_number'):
            rec['name'] = f"Сура «{names.get(rec['surah_number'], rec['name'])}»"
        else:
            rec['name'] = RECITATIONS_RU.get(slug, rec['name'])
        rec['meaning'] = ''
    owner_ru = 'Указание автора проекта (в источнике отдельно не описано)'
    for st in payload['stages']:
        if st.get('source_title') == OWNER_NOTE:
            st['source_title'] = owner_ru
    for src in payload.get('sources', []):
        src['group'] = SOURCE_GROUPS_RU.get(src['group'], src['group'])
        if src.get('title') == OWNER_NOTE:
            src['title'] = owner_ru
    payload['safety_notice'] = SAFETY_NOTICE_RU
    payload['reason'] = REASONS_RU.get(payload['reason'], payload['reason'])
    return payload
