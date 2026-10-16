"""Namoz tartibi qadamlari uchun rasmlar (frontend/public/images/namoz/qadam/).

Rasm qadam sarlavhasiga qarab tanlanadi. Birinchi rasm — asosiy (katta), qolganlari
qadam ichidagi keyingi harakatlar (masalan, salom: avval o'ngga, keyin chapga).
"""

BASE = '/images/namoz/qadam'

# Rasmlar tayyorlangan namozlar (qadamlari harakatma-harakat yozilgan)
PRAYERS = {'bomdod', 'peshin', 'asr', 'shom', 'xufton', 'vitr'}

IMAGES = {
    'turish': 'Tik turish',
    'takbir': 'Takbir (qo‘l ko‘tarish)',
    'qiyom': 'Qiyom',
    'ruku': 'Ruku’',
    'sajda': 'Sajda',
    'otirish': 'O‘tirish',
    'salom-ong': 'O‘ng tomonga salom',
    'salom-chap': 'Chap tomonga salom',
    'duo': 'Duo',
}

# Ayollar uchun alohida rasm tayyorlangan harakatlar ({kalit}-ayol.webp)
FEMALE = {'turish', 'takbir', 'qiyom', 'ruku', 'sajda', 'otirish', 'salom-ong', 'salom-chap'}

SALOM = ['salom-ong', 'salom-chap']

# (sarlavhadagi kalit so'z, rasmlar) — tartib muhim: aniqrog'i oldin tekshiriladi
RULES = [
    ('qunut', ['qiyom', 'takbir']),
    ('ruku’, sajda, qa’da va salom', ['ruku', 'sajda', 'otirish', *SALOM, 'duo']),
    ('qa’da', ['otirish']),  # "...va salom" bo'lsa, quyida salom qo'shiladi
    ('salom', SALOM),
    ('takbir', ['takbir']),
    ('ruku', ['ruku']),
    ('jalsa', ['otirish', 'sajda']),
    ('sajda', ['sajda']),
    ('qavma', ['turish']),
    ('qiyom', ['qiyom']),
    ('qiroat', ['qiyom']),
    ('rakat', ['qiyom']),  # Ikkinchi / Uchinchi / To'rtinchi rakat
    ('niyat', ['turish']),
    ('tayyorgarlik', ['turish']),
]

# Vitrning kirish qadami ("Uch rakat, bir salom") — namozga tik turish
OVERRIDES = {'uch rakat, bir salom': ['turish']}

# Hayit namozi tartibi boshqacha (zoid takbirlar, xutba) — qadamlar aniq belgilanadi.
# Xutba uchun mos rasm yo'q — namozning umumiy rasmi qoladi.
HAYIT = {
    'niyat': ['turish'],
    'iftitoh takbiri': ['takbir'],
    'sano': ['qiyom'],
    'uch zoid takbir': ['takbir', 'qiyom'],
    'qiroat, ruku’ va sajda': ['qiyom', 'ruku', 'sajda'],
    'ikkinchi rakat va takbirlar': ['qiyom', 'takbir', 'ruku', 'sajda'],
    'qa’da va salom': ['otirish', *SALOM],
}

# Juma namozi erkaklarga farz — faqat erkaklar rasmlari (ayollar rejimida umumiy rasm qoladi).
# Tarkib va xutba qadamlari uchun mos rasm yo'q.
JUMA = {
    'farzdan oldingi to‘rt rakat sunnat': ['qiyom'],
    'ikki rakat farz': ['qiyom'],
    'takbiri tahrima': ['takbir'],
    'qiyom va sano': ['qiyom'],
    'qiroat': ['qiyom'],
    'ruku’': ['ruku'],
    'qavma (tik turish)': ['turish'],
    'sajda': ['sajda'],
    'jalsa va ikkinchi sajda': ['otirish', 'sajda'],
    'ikkinchi rakat': ['qiyom'],
    'qa’da (tashahhud)': ['otirish'],
    'salom': SALOM,
    'farzdan keyingi to‘rt rakat sunnat': ['qiyom'],
}


def _image(key, female=True):
    image = {'src': f'{BASE}/{key}.webp', 'caption': IMAGES[key]}
    if female and key in FEMALE:
        image['src_female'] = f'{BASE}/{key}-ayol.webp'
    return image


def images_for(title, category_slug):
    """Qadam sarlavhasi -> [{'src', 'caption', 'src_female'?}, ...] (mos rasm bo'lmasa — bo'sh ro'yxat)."""
    t = title.lower().replace("'", '’')
    if category_slug == 'hayit':
        return [_image(k) for k in HAYIT.get(t, [])]
    if category_slug == 'juma':
        return [_image(k, female=False) for k in JUMA.get(t, [])]
    if category_slug not in PRAYERS:
        return []
    keys = OVERRIDES.get(t)
    if keys is None:
        keys = next((keys for word, keys in RULES if word in t), [])
        # "Qa'dai oxir va salom", "Oxirgi qa'da va salom": o'tirish + ikki tomonga salom
        if keys == ['otirish'] and 'salom' in t:
            keys = ['otirish', *SALOM]
    return [_image(k) for k in keys]
