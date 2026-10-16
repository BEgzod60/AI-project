"""masjid.uz (Islom.uz) masjidlar katalogi: sahifalarni o'qish, lotinga o'girish va OSM'ga moslashtirish.

Faqat faktlar olinadi (nom, imom-xatib, manzil, telefon). Tarix matnlari va rasmlar ko'chirilmaydi —
saytda "barcha huquqlar himoyalangan", rasmlar papkasi robots.txt'da yopilgan. Har bir yozuvda manba
sahifasiga havola saqlanadi.
"""
import html
import re
import time
from difflib import SequenceMatcher

import requests

BASE = 'https://masjid.uz'
USER_AGENT = 'Iymon/1.0 (Islamic education platform; mosque directory)'
TIMEOUT = 30

# --- Kirill -> lotin (o'zbek) ------------------------------------------------------------------

_MAP = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ё': 'yo', 'ж': 'j', 'з': 'z', 'и': 'i',
    'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
    'у': 'u', 'ф': 'f', 'х': 'x', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': '’', 'ы': 'i',
    'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'ў': 'o‘', 'қ': 'q', 'ғ': 'g‘', 'ҳ': 'h',
}
_VOWELS = set('аеёиоуэюяўАЕЁИОУЭЮЯЎ')


def to_latin(text):
    """O'zbek kirill yozuvini lotinga o'giradi (е so'z boshida va unlidan keyin — "ye")."""
    out = []
    for i, ch in enumerate(text):
        low = ch.lower()
        if low == 'е':
            prev = text[i - 1] if i else ' '
            lat = 'ye' if (not prev.isalpha() or prev in _VOWELS or prev in 'ъьЪЬ') else 'e'
        elif low in _MAP:
            lat = _MAP[low]
        else:
            out.append(ch)
            continue
        if ch != low and lat:
            nxt = text[i + 1] if i + 1 < len(text) else ''
            # So'z to'liq bosh harfda bo'lsa (SH), aks holda — Sh
            lat = lat.upper() if (nxt.isupper() and len(lat) > 1) else lat[0].upper() + lat[1:]
        out.append(lat)
    return ''.join(out)


# --- Sahifalarni o'qish ------------------------------------------------------------------------

def _get(session, path):
    response = session.get(f'{BASE}{path}', timeout=TIMEOUT)
    response.raise_for_status()
    return response.text


def session():
    s = requests.Session()
    s.headers['User-Agent'] = USER_AGENT
    return s


def district_paths(sess, region_path):
    """'/toshkent-v/toshkent-sh' -> ['/toshkent-v/toshkent-sh/chilonzor-tumani', ...]"""
    page = _get(sess, f'{region_path}.html')
    found = re.findall(rf'href="({re.escape(region_path)}/[a-z0-9-]+)\.html"', page)
    return list(dict.fromkeys(found))


def mosque_paths(sess, district_path):
    page = _get(sess, f'{district_path}.html')
    found = re.findall(rf'href="({re.escape(district_path)}/[0-9]+-[^"]+\.html)"', page)
    return list(dict.fromkeys(found))


def _clean(text):
    text = html.unescape(re.sub(r'<[^>]+>', ' ', text))
    return re.sub(r'\s+', ' ', text).strip(' .,;:-')


def parse_mosque_page(page):
    """Sahifadan faktlar (kirillda): nom, imom-xatib, manzil, telefon."""
    title = re.search(r'<title>([^<]+)</title>', page)
    name = _clean(title.group(1).split(' - ')[0]) if title else ''

    start = page.find('Маълумот')
    body = page[start:start + 6000] if start >= 0 else page
    body = re.sub(r'<script.*?</script>', '', body, flags=re.S)
    text = html.unescape(re.sub(r'<(br|/p|/div|/li)[^>]*>', '\n', body, flags=re.I))
    text = re.sub(r'<[^>]+>', '', text)

    def field(pattern):
        m = re.search(pattern, text, re.I)
        return _clean(m.group(1)) if m else ''

    # Qiymat faqat shu qatordan olinadi — bo'sh bo'lsa keyingi qator (masalan, "транспортлар") olinmasin
    imam = field(r'имом[ \t\-–]*хатиби[ \t]*:[ \t]*([^\n]+)')
    address_line = field(r'манзили[ \t]*:[ \t]*([^\n]+)')
    phone = ''
    m = re.search(r'(?:Тел(?:ефон)?|tel(?:efon)?)\.?\s*:?\s*([+\d][\d\s()\-,+]{6,})', address_line, re.I)
    if m:
        phone = _clean(m.group(1))
        address_line = _clean(address_line[:m.start()])
    else:
        phone = field(r'Тел(?:ефон)?\.?[ \t]*:?[ \t]*([+\d][\d \t()\-,+]{6,})')
    return {'name': name, 'imam': imam, 'address': address_line, 'phone': phone}


def split_phone(address):
    """Manzil ichida qolgan telefonni ajratish: "...19-uy. tel: 212-44-20" -> ("...19-uy", "212-44-20")."""
    m = re.search(r'(?:Тел(?:ефон)?|tel(?:efon)?)\.?\s*:?\s*([+\d][\d\s()\-,+]{6,})', address, re.I)
    if not m:
        return address, ''
    return _clean(address[:m.start()]), _clean(m.group(1))


def normalize_phone(phone, city_code='71'):
    """Raqamni to'liq formatga keltirish (qo'ng'iroq qilish uchun): "212-44-20" -> "+998 71 212-44-20"."""
    first = re.split(r'[,;]', phone)[0].strip()
    digits = re.sub(r'\D', '', first)
    if len(digits) == 7 and city_code:
        return f'+998 {city_code} {digits[:3]}-{digits[3:5]}-{digits[5:]}'
    if len(digits) == 9:
        return f'+998 {digits[:2]} {digits[2:5]}-{digits[5:7]}-{digits[7:]}'
    if len(digits) == 12 and digits.startswith('998'):
        return f'+998 {digits[3:5]} {digits[5:8]}-{digits[8:10]}-{digits[10:]}'
    return first


# --- OSM'ga moslashtirish ----------------------------------------------------------------------

# Nomlarni taqqoslashda e'tiborga olinmaydigan umumiy so'zlar (normalize'dan keyingi ko'rinishda)
_STOP = {'jome', 'jomye', 'jomie', 'jami', 'masjidi', 'masjid', 'mosque', 'hazrati', 'hazrat', 'majmuasi', 'majmua'}


def normalize(name):
    """Taqqoslash uchun: lotin, kichik harf, x=h, apostroflar va umumiy so'zlarsiz."""
    s = to_latin(name).lower()
    s = re.sub(r'[‘’ʻʼ`\'"«»]', '', s)
    s = s.replace('x', 'h').replace('mechet', ' ')
    words = [w for w in re.split(r'[^a-z0-9]+', s) if w and w not in _STOP]
    return ' '.join(words)


def similarity(a, b):
    na, nb = normalize(a), normalize(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    return SequenceMatcher(None, na, nb).ratio()


def match(entries, mosques, threshold=0.86):
    """Katalog yozuvlari -> OSM masjidlari (birma-bir; eng yuqori o'xshashlik birinchi).

    entries: [(key, name)], mosques: [(osm_id, name)]. Natija: {key: osm_id}.
    """
    pairs = []
    for key, ename in entries:
        for osm_id, oname in mosques:
            if oname:
                score = similarity(ename, oname)
                if score >= threshold:
                    pairs.append((score, key, osm_id))
    result, used = {}, set()
    for score, key, osm_id in sorted(pairs, reverse=True):
        if key not in result and osm_id not in used:
            result[key] = osm_id
            used.add(osm_id)
    return result


# --- Hududlar bo'yicha masjidlar soni ----------------------------------------------------------

# masjid.uz hudud sahifasi -> (scope, nomi, markaz koordinatasi)
REGIONS = {
    '/andijon-v': ('andijon', 'Andijon viloyati', (40.7821, 72.3442)),
    '/buxoro-viloyati': ('buxoro', 'Buxoro viloyati', (39.7681, 64.4556)),
    '/fargona-v': ('fargona', 'Farg‘ona viloyati', (40.3864, 71.7864)),
    '/jizzax-v': ('jizzax', 'Jizzax viloyati', (40.1158, 67.8422)),
    '/namangan-v': ('namangan', 'Namangan viloyati', (40.9983, 71.6726)),
    '/navoiy-v': ('navoiy', 'Navoiy viloyati', (40.0844, 65.3792)),
    '/qashqadaryo-v': ('qashqadaryo', 'Qashqadaryo viloyati', (38.8606, 65.7891)),
    '/qoraqalpogiston-r': ('qoraqalpogiston', 'Qoraqalpog‘iston Respublikasi', (42.4531, 59.6103)),
    '/samarqand-v': ('samarqand', 'Samarqand viloyati', (39.6542, 66.9597)),
    '/sirdaryo-v': ('sirdaryo', 'Sirdaryo viloyati', (40.4897, 68.7842)),
    '/surxondaryo-v': ('surxondaryo', 'Surxondaryo viloyati', (37.2242, 67.2783)),
    '/xorazm-v': ('xorazm', 'Xorazm viloyati', (41.5500, 60.6333)),
    '/toshkent-v/toshkent-sh': ('toshkent-sh', 'Toshkent shahri', (41.2995, 69.2401)),
}
# Katalogda bo'lmagan hudud (sanog'i yo'q) — eng yaqin markazni aniqlashda boshqa viloyatga "tortilmasin"
EXTRA_CENTERS = {'toshkent-v': (41.0469, 69.3594)}  # Toshkent viloyati (Nurafshon)

_NAME = re.compile(r'>\s*([^<>]{2,90}?(?:масжиди|масжид|мачити|мачит))\s*<', re.I)


def article_names(page):
    """Maqola ko'rinishidagi tuman sahifasidagi masjid nomlari (takrorlanmas)."""
    i = page.find('item-page')
    body = page[i:] if i >= 0 else page
    j = body.find('<footer')
    body = re.sub(r'<script.*?</script>', '', body[:j] if j > 0 else body, flags=re.S)
    names = []
    for raw in _NAME.findall(body):
        n = re.sub(r'\s+', ' ', html.unescape(raw)).strip(' .,;:-–0123456789)')
        if 3 <= len(n) <= 90 and not n.lower().startswith(('масжид ', 'масжидлар')):
            names.append(n)
    return list(dict.fromkeys(names))


def _page_count(sess, path, pause, depth=0):
    """Bo'lim sahifasi: masjid havolalari; maqola: nomlar ro'yxati; ichki bo'limlar — rekursiv."""
    page = _get(sess, f'{path}.html')
    items = list(dict.fromkeys(re.findall(rf'href="({re.escape(path)}/[0-9]+-[^"]+\.html)"', page)))
    if items:
        return len(items)
    names = article_names(page)
    if names or depth >= 2:
        return len(names)
    total = 0
    for sub in dict.fromkeys(re.findall(rf'href="({re.escape(path)}/[a-z0-9-]+)\.html"', page)):
        time.sleep(pause)
        total += _page_count(sess, sub, pause, depth + 1)
    return total


def region_count(sess, region_path, pause=1.0):
    """Hududdagi masjidlar soni (katalog bo'yicha) va tumanlar kesimi."""
    page = _get(sess, f'{region_path}.html')
    districts = list(dict.fromkeys(re.findall(rf'href="({re.escape(region_path)}/[^"]+)\.html"', page)))
    if not districts:  # hudud sahifasining o'zi bo'lim (masalan, Toshkent shahri)
        return _page_count(sess, region_path, pause), {}
    detail = {}
    for d in districts:
        time.sleep(pause)
        detail[d.rsplit('/', 1)[1]] = _page_count(sess, d, pause)
    return sum(detail.values()), detail
