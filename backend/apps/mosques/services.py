"""Yaqin masjidlar: OpenStreetMap ma'lumotlari Overpass API orqali.

- Faqat OSM'da belgilangan masjidlar qaytariladi (amenity=place_of_worship + religion=muslim);
  nomlar, manzillar va koordinatalar o'ylab topilmaydi — mavjud bo'lmasa bo'sh qoladi.
- Foydalanuvchi koordinatalari saqlanmaydi: so'rovdan oldin ~110 m aniqlikkacha yaxlitlanadi
  va faqat shu yaxlitlangan qiymat qisqa muddatli kesh kalitida ishlatiladi.
- Overpass band (429) yoki javob bermasa — zaxira serverga o'tiladi; ikkalasi ham ishlamasa,
  xato qisqa muddat keshlanadi (frontend qayta urinishlari Overpass'ni bezovta qilmasin).
- Masjidlar bazada saqlanadi (`sync_mosques` buyrug'i, O'zbekiston bo'yicha). To'liq yuklangan
  hududdagi so'rovlarga faqat bazadan javob beriladi — Overpass ishlamasa ham sayt ishlaydi.
  Yuklanmagan hududda jonli so'rov yuboriladi va natija bazaga yoziladi.
"""
import math
import time
from urllib.parse import quote, unquote

import requests
from django.core.cache import cache
from django.db import transaction

from .models import Mosque, MosqueArea

# Asosiy server va zaxiralar (biri band yoki ishlamasa — keyingisi)
OVERPASS_URLS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
]
USER_AGENT = 'Iymon/1.0 (Islamic education platform; nearby mosques)'  # HTTP sarlavhasi — faqat ASCII
QUERY_TIMEOUT = 15
REQUEST_TIMEOUT = 20
# Barcha serverlar uchun umumiy kutish chegarasi — foydalanuvchi uzoq kutib qolmasin
TOTAL_BUDGET = 30
MAX_RESULTS = 500

# Kesh katagi: so'rov markazi ~1 km lik katakka moslanadi va radius katak yarim diagonali (≤ ~790 m)
# qadar kengaytiriladi — bir hududdagi barcha foydalanuvchilarga bitta Overpass so'rovi yetadi
# (Overpass bitta IP'dan cheklangan so'rov qabul qiladi). Masofa har kim uchun o'z nuqtasidan hisoblanadi.
GRID_DEG = 0.01
GRID_MARGIN_M = 800

# Bazaga yuklash: hudud TILE_DEG gradusli kataklarga bo'linadi (har biri alohida Overpass so'rovi)
TILE_DEG = 2
SYNC_QUERY_TIMEOUT = 120
SYNC_REQUEST_TIMEOUT = 150
# O'zbekiston chegaralari (janub, g'arb, shimol, sharq)
UZBEKISTAN_BBOX = (37.17, 55.99, 45.59, 73.15)
# Viloyat markazlari — shu nuqtalar joylashgan kataklar birinchi yuklanadi (aholi zich joylar)
PRIORITY_POINTS = [
    (41.2995, 69.2401), (40.7821, 72.3442), (39.7681, 64.4556), (40.3864, 71.7864), (40.1158, 67.8422),
    (40.9983, 71.6726), (40.0844, 65.3792), (38.8606, 65.7891), (42.4531, 59.6103), (39.6542, 66.9597),
    (40.4897, 68.7842), (37.2242, 67.2783), (41.3783, 60.3639),
]

# Rasmlar: faqat OSM teglarida ko'rsatilgani (image, wikimedia_commons, wikidata -> P18).
# Wikimedia Commons'ning kichik (siqilgan) nusxasi ishlatiladi.
THUMB_WIDTH = 320
WIKIDATA_API = 'https://www.wikidata.org/w/api.php'

RADII = (1000, 3000)
CACHE_TTL = 60 * 30
FAIL_TTL = 60

EARTH_RADIUS_M = 6_371_000


class MosqueServiceError(Exception):
    """Umumiy xato (foydalanuvchiga ko'rsatiladigan matn bilan)."""

    status = 502


class MosqueServiceBusy(MosqueServiceError):
    status = 503


class MosqueServiceTimeout(MosqueServiceError):
    status = 504


def round_coord(value):
    """Koordinatani 3 xonagacha (~110 m) yaxlitlash — aniq joylashuv saqlanmasin."""
    return round(float(value), 3)


def distance_m(lat1, lon1, lat2, lon2):
    """Ikki nuqta orasidagi to'g'ri chiziqli (katta doira) masofa, metrda."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def _query(lat, lon, radius):
    around = f'(around:{radius},{lat},{lon})'
    return (
        f'[out:json][timeout:{QUERY_TIMEOUT}];'
        f'(nwr["amenity"="place_of_worship"]["religion"="muslim"]{around};);'
        f'out center tags {MAX_RESULTS};'
    )


def _bbox_query(south, west, north, east):
    return (
        f'[out:json][timeout:{SYNC_QUERY_TIMEOUT}];'
        f'(nwr["amenity"="place_of_worship"]["religion"="muslim"]({south},{west},{north},{east}););'
        f'out center tags;'
    )


def _fetch(query, budget=TOTAL_BUDGET, request_timeout=REQUEST_TIMEOUT):
    busy = timeout = False
    deadline = time.monotonic() + budget
    for url in OVERPASS_URLS:
        left = deadline - time.monotonic()
        if left < 3:
            timeout = True
            break
        try:
            response = requests.post(
                url, data={'data': query}, timeout=min(request_timeout, left), headers={'User-Agent': USER_AGENT},
            )
        except requests.exceptions.Timeout:
            timeout = True
            continue
        except requests.exceptions.RequestException:
            continue
        if response.status_code in (429, 503, 504):
            busy = True
            continue
        if response.status_code != 200:
            continue
        try:
            data = response.json()
        except ValueError:
            continue
        # So'rov vaqti tugasa Overpass 200 + bo'sh ro'yxat qaytaradi, sababini "remark"ga yozadi —
        # buni "masjid yo'q" deb ko'rsatmaslik kerak
        if 'error' in str(data.get('remark', '')).lower() or 'timed out' in str(data.get('remark', '')).lower():
            timeout = True
            continue
        return data

    if busy:
        raise MosqueServiceBusy(
            "Xarita ma'lumotlari serveri hozir band. Bir daqiqadan so‘ng qayta urinib ko‘ring."
        )
    if timeout:
        raise MosqueServiceTimeout(
            "Xarita ma'lumotlari serveri javob bermadi. Kichikroq radius tanlab yoki keyinroq urinib ko‘ring."
        )
    raise MosqueServiceError("Yaqin masjidlarni yuklab bo‘lmadi. Keyinroq qayta urinib ko‘ring.")


def _name(tags):
    for key in ('name:uz', 'name:uz-Latn', 'name', 'name:ru', 'name:en', 'name:ar'):
        if tags.get(key):
            return tags[key].strip()
    return ''


def commons_thumb(filename, width=THUMB_WIDTH):
    """Commons fayl nomi -> kichik nusxa havolasi (Wikimedia o'zi siqib beradi)."""
    name = unquote(filename).strip()
    if name.lower().startswith('file:'):
        name = name[5:]
    name = name.replace(' ', '_')
    if not name:
        return ''
    return f'https://commons.wikimedia.org/wiki/Special:FilePath/{quote(name)}?width={width}'


def _image(tags):
    commons = tags.get('wikimedia_commons', '')
    if commons.lower().startswith('file:'):
        return commons_thumb(commons)
    image = tags.get('image', '').strip()
    if not image:
        return ''
    if image.lower().startswith('file:'):
        return commons_thumb(image)
    if 'commons.wikimedia.org/wiki/' in image and 'File:' in image:
        return commons_thumb(image.split('File:', 1)[1])
    if image.startswith('https://') and image.lower().split('?')[0].endswith(('.jpg', '.jpeg', '.png', '.webp')):
        return image[:500]
    return ''


def resolve_wikidata_images(ids):
    """Wikidata ID -> rasm (P18) kichik nusxasi. Xato bo'lsa — bo'sh (rasm shart emas)."""
    result = {}
    ids = [i for i in dict.fromkeys(ids) if i and i.startswith('Q')]
    for start in range(0, len(ids), 50):
        chunk = ids[start:start + 50]
        try:
            response = requests.get(
                WIKIDATA_API,
                params={'action': 'wbgetentities', 'ids': '|'.join(chunk), 'props': 'claims', 'format': 'json'},
                timeout=20, headers={'User-Agent': USER_AGENT},
            )
            entities = response.json().get('entities', {}) if response.status_code == 200 else {}
        except (requests.exceptions.RequestException, ValueError):
            continue
        for qid, entity in entities.items():
            for claim in entity.get('claims', {}).get('P18', []):
                filename = claim.get('mainsnak', {}).get('datavalue', {}).get('value')
                if isinstance(filename, str):
                    result[qid] = commons_thumb(filename)
                    break
    return result


def _address(tags):
    if tags.get('addr:full'):
        return tags['addr:full'].strip()
    street = ' '.join(p for p in (tags.get('addr:street'), tags.get('addr:housenumber')) if p)
    parts = [street, tags.get('addr:suburb') or tags.get('addr:district'), tags.get('addr:city')]
    return ', '.join(p.strip() for p in parts if p)


def _parse(data):
    """Overpass javobi -> masjidlar ro'yxati (masofasiz; nuqta = node yoki bino markazi)."""
    mosques = {}
    for el in data.get('elements', []):
        point = el if el.get('type') == 'node' else el.get('center')
        if not point or 'lat' not in point or 'lon' not in point:
            continue
        tags = el.get('tags', {})
        key = f"{el['type']}/{el['id']}"
        mosques[key] = {
            'id': key,
            'name': _name(tags),
            'address': _address(tags),
            'lat': point['lat'],
            'lon': point['lon'],
            'image': _image(tags),
            'wikidata': tags.get('wikidata', ''),
        }
    return list(mosques.values())


def _add_wikidata_images(items):
    missing = [m['wikidata'] for m in items if not m['image'] and m.get('wikidata')]
    if missing:
        images = resolve_wikidata_images(missing)
        for m in items:
            if not m['image'] and m.get('wikidata') in images:
                m['image'] = images[m['wikidata']]
    return items


def _snap(value):
    return round(round(value / GRID_DEG) * GRID_DEG, 2)


def bbox_around(lat, lon, radius):
    """Nuqta atrofidagi radiusni o'z ichiga olgan to'rtburchak (janub, g'arb, shimol, sharq)."""
    dlat = math.degrees(radius / EARTH_RADIUS_M)
    dlon = dlat / max(math.cos(math.radians(lat)), 0.01)
    return lat - dlat, lon - dlon, lat + dlat, lon + dlon


def _tile_of(value):
    return math.floor(value / TILE_DEG) * TILE_DEG


def tiles_for(south, west, north, east):
    """To'rtburchakni qoplaydigan kataklar: [(janub, g'arb), ...] — viloyat markazlari bor kataklar oldin."""
    tiles = [
        (s, w)
        for s in range(_tile_of(south), _tile_of(north) + 1, TILE_DEG)
        for w in range(_tile_of(west), _tile_of(east) + 1, TILE_DEG)
    ]
    priority = {(_tile_of(lat), _tile_of(lon)) for lat, lon in PRIORITY_POINTS}
    return sorted(tiles, key=lambda t: t not in priority)


def is_covered(south, west, north, east):
    """To'rtburchak to'liq bazaga yuklangan kataklar ichidami."""
    tiles = tiles_for(south, west, north, east)
    found = MosqueArea.objects.filter(
        south__in={t[0] for t in tiles}, west__in={t[1] for t in tiles},
    ).values_list('south', 'west')
    return set(tiles) <= {(round(s), round(w)) for s, w in found}


def _from_db(south, west, north, east):
    rows = Mosque.objects.filter(lat__gte=south, lat__lte=north, lon__gte=west, lon__lte=east)
    return [
        {'id': m.osm_id, 'name': m.name, 'address': m.address, 'lat': m.lat, 'lon': m.lon, 'image': m.image}
        for m in rows
    ]


def save_mosques(items):
    """Overpass natijalarini bazaga yozish (mavjudlari yangilanadi)."""
    if not items:
        return 0
    Mosque.objects.bulk_create(
        [
            Mosque(osm_id=m['id'], name=m['name'][:255], address=m['address'][:255], lat=m['lat'], lon=m['lon'],
                   image=m.get('image', '')[:500])
            for m in items
        ],
        update_conflicts=True,
        unique_fields=['osm_id'],
        update_fields=['name', 'address', 'lat', 'lon', 'image', 'updated_at'],
    )
    return len(items)


PUBLIC_FIELDS = ('id', 'name', 'address', 'lat', 'lon', 'image')


def _with_distance(items, lat, lon, radius):
    result = []
    for m in items:
        dist = distance_m(lat, lon, m['lat'], m['lon'])
        if dist <= radius:
            result.append({**{k: m.get(k, '') for k in PUBLIC_FIELDS}, 'distance_m': round(dist)})
    return sorted(result, key=lambda m: m['distance_m'])


def nearby_mosques(lat, lon, radius):
    """lat/lon — allaqachon yaxlitlangan; radius — RADII dan biri (metr). Masofa bo'yicha saralangan."""
    box = bbox_around(lat, lon, radius)
    if is_covered(*box):
        return _with_distance(_from_db(*box), lat, lon, radius)

    try:
        found = _cell_mosques(_snap(lat), _snap(lon), radius)
    except MosqueServiceError:
        # Overpass ishlamayapti — bazada (avvalgi so'rovlardan) bor ma'lumot bo'lsa, shuni beramiz
        stored = _from_db(*box)
        if stored:
            return _with_distance(stored, lat, lon, radius)
        raise
    return _with_distance(found, lat, lon, radius)


def sync_tile(south, west):
    """Bitta katakdagi barcha masjidlarni Overpass'dan yuklab, bazani shu katak bo'yicha yangilaydi.

    Faqat muvaffaqiyatli javobdan keyin: OSM'dan o'chirilgan masjidlar bazadan ham o'chiriladi.
    """
    north, east = south + TILE_DEG, west + TILE_DEG
    data = _fetch(_bbox_query(south, west, north, east), budget=SYNC_REQUEST_TIMEOUT * 2, request_timeout=SYNC_REQUEST_TIMEOUT)
    items = [m for m in _parse(data) if south <= m['lat'] < north and west <= m['lon'] < east]
    _add_wikidata_images(items)
    with transaction.atomic():
        save_mosques(items)
        Mosque.objects.filter(lat__gte=south, lat__lt=north, lon__gte=west, lon__lt=east).exclude(
            osm_id__in=[m['id'] for m in items],
        ).delete()
        MosqueArea.objects.update_or_create(
            south=south, west=west, north=north, east=east, defaults={'count': len(items)},
        )
    return len(items)


def _cell_mosques(lat, lon, radius):
    """Kesh katagi uchun masjidlar (katak markazidan radius + zaxira)."""
    key = f'mosques:{lat:.2f}:{lon:.2f}:{radius}'
    cached = cache.get(key)
    if cached is not None:
        return cached

    failed = cache.get(f'{key}:fail')
    if failed:
        status, message = failed
        error = {503: MosqueServiceBusy, 504: MosqueServiceTimeout}.get(status, MosqueServiceError)
        raise error(message)

    try:
        data = _fetch(_query(lat, lon, radius + GRID_MARGIN_M))
    except MosqueServiceError as exc:
        cache.set(f'{key}:fail', (exc.status, str(exc)), FAIL_TTL)
        raise

    result = _parse(data)
    save_mosques(result)  # keyingi safar Overpass ishlamasa ham bazada qoladi
    cache.set(key, result, CACHE_TTL)
    return result
