"""Namoz vaqtlari xizmati: o'z bazamiz + tashqi manba (namoz-vaqtlari.more-info.uz).

Vaqtlar PrayerTime modelida saqlanadi. So'rov kelganda avval bazadan o'qiladi;
oy bazada to'liq bo'lmasa, tashqi API'dan butun oy yuklab olinib saqlanadi.
Tashqi API ishlamay qolsa — bazadagi ma'lumot qaytariladi.
Oldindan to'ldirish: `python manage.py sync_prayer_times` (cron orqali kuniga 1 marta).

Manba: https://namoz-vaqtlari-api.more-info.uz/ (ma'lumotlar islom.uz asosida, 07-2024 dan)
- Kunlik:  GET /api/GetDailyPrayTimes/{region}/{YYYY-MM-DD}
- Oylik:   GET /api/GetMonthlyPrayTimes/{region}/{YYYY-MM}
  (faqat e'lon qilingan oylar keladi — keyingi oylar uchun bo'sh ro'yxat)

Javob formati: {"isSuccess": true, "statusCode": 200, "response": {...} | [...]}
Vaqtlar 'HH:MM:SS' ko'rinishida keladi — biz 'HH:MM' ga qisqartiramiz.
"""
import calendar
import datetime as dt
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import quote
from zoneinfo import ZoneInfo

import requests
from django.core.cache import cache

from .models import PrayerTime

API_BASE = 'https://namoz-vaqtlari.more-info.uz:444/api'
REQUEST_TIMEOUT = 10
# Manbada oy topilmasa yoki u ishlamasa, qayta urinishgacha kutiladigan vaqt
MISS_TTL = 60 * 30
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
    return data.get('response')


def _parse_time(value):
    """'05:16:00' -> time(5, 16)."""
    return dt.time.fromisoformat(value[:5])


def fetch_month(region, year, month):
    """Tashqi API'dan bir oylik vaqtlarni oladi (bazaga yozmaydi).

    Manba ba'zi oylarda bir sanani ikki marta qaytaradi (ikkinchisi — boshqa oyning
    ma'lumoti). Kunlik endpoint birinchi yozuvni qaytaradi, biz ham shuni olamiz.
    """
    items = _request(f'/GetMonthlyPrayTimes/{quote(region)}/{year:04d}-{month:02d}')
    if not isinstance(items, list):
        return []

    rows = {}
    for item in items:
        try:
            date = dt.date.fromisoformat(item.get('date', ''))
            times = {key: _parse_time(item[key]) for key in PRAYER_KEYS}
        except (KeyError, TypeError, ValueError):
            continue
        if (date.year, date.month) == (year, month) and date not in rows:
            # Birinchi yozuv buzuq bo'lsa ham sana band qilinadi — dublikat boshqa oyniki
            rows[date] = PrayerTime(region=region, date=date, **times) if _is_valid(times) else None
    return [row for row in rows.values() if row is not None]


def _is_valid(times):
    """Manbada ba'zi oylarda ustunlar siljigan (peshin o'rnida ishroq vaqti, xufton yo'q).

    Bunday kunlarni saqlamaymiz: vaqtlar o'sish tartibida va peshin kun o'rtasida bo'lishi kerak.
    """
    values = [times[key] for key in PRAYER_KEYS]
    in_order = all(a < b for a, b in zip(values, values[1:]))
    return in_order and dt.time(11, 0) <= times['peshin'] <= dt.time(14, 0)


def save_month(rows):
    """Oy yozuvlarini bazaga yozadi (mavjudlari yangilanadi)."""
    if not rows:
        return 0
    PrayerTime.objects.bulk_create(
        rows,
        update_conflicts=True,
        unique_fields=['region', 'date'],
        update_fields=list(PRAYER_KEYS) + ['updated_at'],
    )
    return len(rows)


def sync_month(region, year, month):
    """Oyni manbadan yuklab bazaga saqlaydi. Saqlangan kunlar sonini qaytaradi."""
    return save_month(fetch_month(region, year, month))


def _miss_key(region, year, month):
    return f'prayer_times:miss:{region}:{year:04d}-{month:02d}'


def _db_month(region, year, month):
    return list(PrayerTime.objects.filter(region=region, date__year=year, date__month=month))


def _month_rows(region, year, month):
    """Oy yozuvlari: bazadan, kerak bo'lsa manbadan to'ldirib."""
    rows = _db_month(region, year, month)
    if len(rows) >= calendar.monthrange(year, month)[1]:
        return rows

    # Yaqinda topilmagan bo'lsa, manbani qayta-qayta bezovta qilmaymiz
    if cache.get(_miss_key(region, year, month)):
        return rows

    try:
        fetched = fetch_month(region, year, month)
    except PrayerTimesServiceError:
        cache.set(_miss_key(region, year, month), True, MISS_TTL)
        if rows:
            return rows
        raise

    if not fetched:
        cache.set(_miss_key(region, year, month), True, MISS_TTL)
        return rows

    save_month(fetched)
    return _db_month(region, year, month)


def _timings(row):
    return {key: getattr(row, key).strftime('%H:%M') for key in PRAYER_KEYS}


def _month_days(rows):
    return [
        {'date': row.date.isoformat(), 'timings': _timings(row)}
        for row in sorted(rows, key=lambda r: r.date)
    ]


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

    row = next((r for r in _month_rows(region, date.year, date.month) if r.date == date), None)
    if row is None:
        raise PrayerTimesServiceError(
            "Bu sana uchun namoz vaqtlari hali e'lon qilinmagan."
        )

    timings = _timings(row)
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
    rows = _month_rows(region, year, month)
    if not rows:
        raise PrayerTimesServiceError(
            "Bu oy uchun namoz vaqtlari hali e'lon qilinmagan."
        )

    return {
        'city': region,
        'month': month,
        'year': year,
        'days': _month_days(rows),
    }


def get_yearly_prayer_times(city, year):
    """Yil bo'yicha namoz vaqtlari: faqat e'lon qilingan oylar qaytariladi."""
    region = parse_city(city)

    by_month = {m: [] for m in range(1, 13)}
    for row in PrayerTime.objects.filter(region=region, date__year=year):
        by_month[row.date.month].append(row)

    missing = [
        m for m in range(1, 13)
        if len(by_month[m]) < calendar.monthrange(year, m)[1]
        and not cache.get(_miss_key(region, year, m))
    ]

    def fetch(month):
        try:
            return month, fetch_month(region, year, month)
        except PrayerTimesServiceError:
            return month, None

    # Tarmoq so'rovlari parallel, bazaga yozish — asosiy oqimda
    if missing:
        with ThreadPoolExecutor(max_workers=6) as pool:
            for month, fetched in pool.map(fetch, missing):
                if fetched:
                    save_month(fetched)
                    by_month[month] = _db_month(region, year, month)
                else:
                    cache.set(_miss_key(region, year, month), True, MISS_TTL)

    months = [
        {'month': month, 'days': _month_days(rows)}
        for month, rows in by_month.items()
        if rows
    ]
    if not months:
        raise PrayerTimesServiceError(
            "Bu yil uchun namoz vaqtlari topilmadi."
        )
    return {'city': region, 'year': year, 'months': months}
