"""Google Maps reytingi (Places API New — Nearby Search). Faqat GOOGLE_MAPS_API_KEY sozlangan bo'lsa.

Qoidalar (Google Maps Platform):
- Reyting saqlanmaydi va keshlanmaydi — har so'rovda Google'dan olinadi (faqat place ID saqlash mumkin).
- Google ma'lumoti Google bo'lmagan xaritada ko'rsatilmaydi — faqat ro'yxatda, «Google Maps» belgisi bilan.
- Kalit faqat serverda — brauzerga uzatilmaydi.
Narx: rating maydoni Nearby Search Enterprise SKU'ga kiradi (oylik bepul limitdan keyin pullik).
"""
import os

import requests

from .directory import similarity

ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby'
FIELD_MASK = 'places.id,places.displayName,places.location,places.rating,places.userRatingCount,places.googleMapsUri'
TIMEOUT = 8
MAX_RESULTS = 20  # API cheklovi
# OSM (bino markazi) va Google belgisi orasidagi ruxsat etilgan masofa
MATCH_DISTANCE_M = 90


def api_key():
    return os.environ.get('GOOGLE_MAPS_API_KEY', '').strip()


def enabled():
    return bool(api_key())


def nearby_places(lat, lon, radius):
    """Yaqin masjidlar Google ma'lumoti bilan: [{'name','lat','lon','rating','count','url'}]. Xato bo'lsa — []."""
    key = api_key()
    if not key:
        return []
    try:
        response = requests.post(
            ENDPOINT,
            json={
                'includedTypes': ['mosque'],
                'maxResultCount': MAX_RESULTS,
                'rankPreference': 'DISTANCE',
                'languageCode': 'uz',
                'locationRestriction': {'circle': {'center': {'latitude': lat, 'longitude': lon}, 'radius': float(radius)}},
            },
            headers={'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELD_MASK},
            timeout=TIMEOUT,
        )
        if response.status_code != 200:
            return []
        places = response.json().get('places', [])
    except (requests.exceptions.RequestException, ValueError):
        return []

    result = []
    for p in places:
        loc = p.get('location') or {}
        if 'latitude' not in loc or 'longitude' not in loc or not p.get('rating'):
            continue
        result.append({
            'name': (p.get('displayName') or {}).get('text', ''),
            'lat': loc['latitude'],
            'lon': loc['longitude'],
            'rating': round(float(p['rating']), 1),
            'count': int(p.get('userRatingCount') or 0),
            'url': p.get('googleMapsUri', ''),
        })
    return result


def attach_ratings(mosques, lat, lon, radius, distance_fn):
    """Har bir masjidga Google reytingi (topilsa): eng yaqin Google joyi (≤ 90 m), teng bo'lsa — nomi o'xshashi.

    Har bir Google joyi faqat bitta masjidga beriladi.
    """
    places = nearby_places(lat, lon, radius)
    pairs = []
    for i, m in enumerate(mosques):
        for j, p in enumerate(places):
            d = distance_fn(m['lat'], m['lon'], p['lat'], p['lon'])
            if d <= MATCH_DISTANCE_M:
                # Masofa asosiy mezon; nom o'xshashligi ishonchni oshiradi
                score = (1 - d / MATCH_DISTANCE_M) + (similarity(m.get('name') or '', p['name']) if m.get('name') else 0)
                pairs.append((score, i, j))
    used_m, used_p = set(), set()
    for score, i, j in sorted(pairs, reverse=True):
        if i in used_m or j in used_p:
            continue
        used_m.add(i)
        used_p.add(j)
        p = places[j]
        mosques[i]['google'] = {'rating': p['rating'], 'count': p['count'], 'url': p['url']}
    for m in mosques:
        m.setdefault('google', None)
    return mosques
