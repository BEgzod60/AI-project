"""Tashqi namoz vaqtlari xizmati (namoz-vaqtlari.more-info.uz).

Manba: https://namoz-vaqtlari-api.more-info.uz/ (ma'lumotlar islom.uz asosida, 07-2024 dan)
- Kunlik:  GET /api/GetDailyPrayTimes/{region}/{YYYY-MM-DD}
- Oylik:   GET /api/GetMonthlyPrayTimes/{region}/{YYYY-MM}
  (faqat e'lon qilingan oylar keladi — keyingi oylar uchun bo'sh ro'yxat)

Javob formati: {"isSuccess": true, "statusCode": 200, "response": {...} | [...]}
Vaqtlar 'HH:MM:SS' ko'rinishida keladi — biz 'HH:MM' ga qisqartiramiz.
"""
import datetime as dt
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import quote
from zoneinfo import ZoneInfo

import requests
from django.core.cache import cache

API_BASE = 'https://namoz-vaqtlari.more-info.uz:444/api'
REQUEST_TIMEOUT = 10
CACHE_TTL = 60 * 60 * 6  # vaqtlar kun davomida o'zgarmaydi
TIMEZONE = ZoneInfo('Asia/Tashkent')

# API qo'llab-quvvatlaydigan hududlar (aynan shu yozilishda yuboriladi)
REGIONS = [
    'Toshkent',
    'Andijon',
    'Buxoro',
    "Farg'ona",
    'Jizzax',
    'Namangan',
    'Navoiy',
    'Qashqadaryo',
    "Qoraqalpog'iston",
    'Samarqand',
    'Sirdaryo',
    'Surxandaryo',
    'Xiva',
]

# Muqobil nomlar (eski nomlar, viloyat markazlari) -> API hududi
REGION_ALIASES = {
    'toshkent shahri': 'Toshkent',
    'guliston': 'Sirdaryo',
    "marg'ilon": "Farg'ona",
    'nukus': "Qoraqalpog'iston",
    'qarshi': 'Qashqadaryo',
    'termiz': 'Surxandaryo',
    'surxondaryo': 'Surxandaryo',
    'urganch': 'Xiva',
    'xorazm': 'Xiva',
}

PRAYER_KEYS = ('bomdod', 'quyosh', 'peshin', 'asr', 'shom', 'xufton')

DEFAULT_REGION = 'Toshkent'


class PrayerTimesServiceError(Exception):
    """Namoz vaqtlarini olib kelishda umumiy xato."""


class CityNotFoundError(PrayerTimesServiceError):
    """Hudud topilmadi yoki nomi noto'g'ri kiritilgan."""


def _normalize_key(value):
    # O'zbekcha apostrof variantlari: ʻ ʼ ‘ ’ -> '
    for ch in 'ʻʼ‘’`':
        value = value.replace(ch, "'")
    return value.strip().lower()


_REGION_LOOKUP = {_normalize_key(r): r for r in REGIONS}
_REGION_LOOKUP.update({_normalize_key(k): v for k, v in REGION_ALIASES.items()})


def parse_city(raw_city):
    """Kiritilgan hudud nomini API qabul qiladigan nomga o'giradi."""
    if not raw_city or not raw_city.strip():
        return DEFAULT_REGION
    region = _REGION_LOOKUP.get(_normalize_key(raw_city))
    if region is None:
        raise CityNotFoundError(
            f"Bunday hudud topilmadi: {raw_city!r}. Mavjud hududlar: {', '.join(REGIONS)}"
        )
    return region


def today_local():
    return dt.datetime.now(TIMEZONE).date()


def _request(path):
    cached = cache.get(path)
    if cached is not None:
        return cached

    try:
        response = requests.get(f'{API_BASE}{path}', timeout=REQUEST_TIMEOUT)
        data = response.json()
    except requests.exceptions.Timeout as exc:
        raise PrayerTimesServiceError(
            "Namoz vaqtlari serveri javob bermadi. Keyinroq urinib ko'ring."
        ) from exc
    except requests.exceptions.RequestException as exc:
        raise PrayerTimesServiceError(
            'Namoz vaqtlarini yuklashda tarmoq xatosi yuz berdi.'
        ) from exc
    except ValueError as exc:
        raise PrayerTimesServiceError(
            "Namoz vaqtlari serveri noto'g'ri javob qaytardi."
        ) from exc

    if not data.get('isSuccess'):
        raise PrayerTimesServiceError(
            'Tanlangan sana uchun namoz vaqtlari topilmadi.'
        )

    result = data.get('response')
    cache.set(path, result, CACHE_TTL)
    return result


def _short_time(value):
    """'05:16:00' -> '05:16'."""
    return value[:5] if value else ''


def _timings(item):
    return {key: _short_time(item.get(key, '')) for key in PRAYER_KEYS}


def _month_days(items):
    """Oylik ro'yxatni kunlarga aylantiradi.

    Manba ba'zi oylarda bir sanani ikki marta qaytaradi (ikkinchisi — boshqa oyning
    ma'lumoti). Kunlik endpoint birinchi yozuvni qaytaradi, biz ham shuni olamiz.
    """
    days = {}
    for item in items:
        date = item.get('date')
        if date and date not in days:
            days[date] = {'date': date, 'timings': _timings(item)}
    return [days[d] for d in sorted(days)]


def _upcoming(timings, date):
    """Hozirdan keyingi birinchi vaqt nomi (faqat bugun uchun)."""
    now = dt.datetime.now(TIMEZONE)
    if date != now.date():
        return None
    now_hm = now.strftime('%H:%M')
    for key in PRAYER_KEYS:
        if timings.get(key) and timings[key] > now_hm:
            return key
    return None


def get_prayer_times(city=None, date_str=None):
    """Kunlik namoz vaqtlari. date_str: 'DD-MM-YYYY' (bo'sh bo'lsa — bugun)."""
    region = parse_city(city)
    date = (
        dt.datetime.strptime(date_str, '%d-%m-%Y').date() if date_str else today_local()
    )

    item = _request(f'/GetDailyPrayTimes/{quote(region)}/{date.isoformat()}')
    if not isinstance(item, dict):
        raise PrayerTimesServiceError(
            "Bu sana uchun namoz vaqtlari hali e'lon qilinmagan."
        )

    timings = _timings(item)
    return {
        'city': region,
        'date': date.isoformat(),
        'timings': timings,
        'upcoming': _upcoming(timings, date),
        'source': 'islom.uz',
        'timezone': 'Asia/Tashkent',
    }


def get_monthly_prayer_times(city, month, year):
    """Oylik namoz vaqtlari jadvali."""
    region = parse_city(city)
    items = _request(f'/GetMonthlyPrayTimes/{quote(region)}/{year:04d}-{month:02d}')
    if not isinstance(items, list) or not items:
        raise PrayerTimesServiceError(
            "Bu oy uchun namoz vaqtlari hali e'lon qilinmagan."
        )

    return {
        'city': region,
        'month': month,
        'year': year,
        'days': _month_days(items),
    }


def get_yearly_prayer_times(city, year):
    """Yil bo'yicha namoz vaqtlari: faqat e'lon qilingan oylar qaytariladi."""
    region = parse_city(city)

    def fetch(month):
        try:
            items = _request(f'/GetMonthlyPrayTimes/{quote(region)}/{year:04d}-{month:02d}')
        except PrayerTimesServiceError:
            return month, None
        return month, items if isinstance(items, list) and items else None

    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(fetch, range(1, 13)))

    months = [
        {
            'month': month,
            'days': _month_days(items),
        }
        for month, items in results
        if items
    ]
    if not months:
        raise PrayerTimesServiceError(
            "Bu yil uchun namoz vaqtlari topilmadi."
        )
    return {'city': region, 'year': year, 'months': months}
