"""Quran Foundation (quran.com) audio API mijozi — faqat backend'da.

Kalitlar muhit o'zgaruvchilarida saqlanadi va frontendga hech qachon yuborilmaydi:
    QF_CLIENT_ID, QF_CLIENT_SECRET  — bo'lsa: rasmiy OAuth2 (client_credentials) va
                                     https://apis.quran.foundation/content/api/v4
    (bo'lmasa)                       — ommaviy https://api.quran.com/api/v4

Faqat audio havolalari va oyat kalitlari olinadi; arabcha matn so'ralmaydi va saqlanmaydi.
Audio fayllar yuklab olinmaydi — brauzer ularni Quran Foundation CDN'idan oqim tarzida eshitadi.
"""
import os

import requests
from django.core.cache import cache

PUBLIC_BASE = 'https://api.quran.com/api/v4'
QF_BASE = 'https://apis.quran.foundation/content/api/v4'
QF_TOKEN_URL = 'https://oauth2.quran.foundation/oauth2/token'
VERSE_AUDIO_BASE = 'https://verses.quran.com/'
TIMEOUT = 15
CACHE_TTL = 60 * 60 * 24
ALLOWED_AUDIO_HOSTS = ('https://download.quranicaudio.com/', 'https://verses.quran.com/', 'https://audio.qurancdn.com/')


class QuranAudioError(Exception):
    """Quran Foundation API'dan audio olib bo'lmadi."""


def _credentials():
    client_id, secret = os.environ.get('QF_CLIENT_ID', ''), os.environ.get('QF_CLIENT_SECRET', '')
    return (client_id, secret) if client_id and secret else None


def _token(client_id, secret):
    cached = cache.get('qf-token')
    if cached:
        return cached
    try:
        resp = requests.post(
            QF_TOKEN_URL, auth=(client_id, secret),
            data={'grant_type': 'client_credentials', 'scope': 'content'}, timeout=TIMEOUT,
        )
        resp.raise_for_status()
        payload = resp.json()
    except (requests.RequestException, ValueError) as exc:
        raise QuranAudioError('Quran Foundation avtorizatsiyasi amalga oshmadi.') from exc
    token = payload['access_token']
    cache.set('qf-token', token, max(60, int(payload.get('expires_in', 3600)) - 60))
    return token


def _get(path, params=None):
    creds = _credentials()
    if creds:
        base, headers = QF_BASE, {'x-auth-token': _token(*creds), 'x-client-id': creds[0]}
    else:
        base, headers = PUBLIC_BASE, {}
    try:
        resp = requests.get(f'{base}{path}', params=params, headers=headers, timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except (requests.RequestException, ValueError) as exc:
        raise QuranAudioError('Quran Foundation API javob bermadi.') from exc


def _safe(url):
    if not url.startswith(ALLOWED_AUDIO_HOSTS):
        raise QuranAudioError('Kutilmagan audio manzili.')
    return url


def full_surah_url(recitation_id: int, surah: int) -> str:
    key = f'qf-full:{recitation_id}:{surah}'
    url = cache.get(key)
    if url:
        return url
    data = _get(f'/chapter_recitations/{recitation_id}/{surah}')
    try:
        url = _safe(data['audio_file']['audio_url'])
    except (KeyError, TypeError) as exc:
        raise QuranAudioError('Sura audiosi topilmadi.') from exc
    cache.set(key, url, CACHE_TTL)
    return url


def verse_urls(recitation_id: int, surah: int) -> list:
    """[{'verse': 1, 'url': '...'}] — oyatma-oyat tinglash uchun."""
    key = f'qf-verses:{recitation_id}:{surah}'
    items = cache.get(key)
    if items is not None:
        return items
    items, page = [], 1
    while page:
        data = _get(f'/recitations/{recitation_id}/by_chapter/{surah}', {'per_page': 50, 'page': page})
        for f in data.get('audio_files', []):
            raw = f['url']
            if raw.startswith('//'):
                url = 'https:' + raw
            elif raw.startswith('http'):
                url = raw
            else:
                url = VERSE_AUDIO_BASE + raw.lstrip('/')
            items.append({'verse': int(f['verse_key'].split(':')[1]), 'url': _safe(url)})
        page = (data.get('pagination') or {}).get('next_page')
        if page and page > 20:  # himoya: eng uzun sura ham 6 sahifadan oshmaydi
            break
    if not items:
        raise QuranAudioError('Oyat audiolari topilmadi.')
    items.sort(key=lambda x: x['verse'])
    cache.set(key, items, CACHE_TTL)
    return items


def ayah_url(recitation_id: int, surah: int, verse: int) -> str:
    """Bitta oyat tilovati havolasi."""
    key = f'qf-ayah:{recitation_id}:{surah}:{verse}'
    url = cache.get(key)
    if url:
        return url
    data = _get(f'/recitations/{recitation_id}/by_ayah/{surah}:{verse}')
    try:
        raw = data['audio_files'][0]['url']
    except (KeyError, IndexError, TypeError) as exc:
        raise QuranAudioError('Oyat audiosi topilmadi.') from exc
    url = 'https:' + raw if raw.startswith('//') else raw if raw.startswith('http') else VERSE_AUDIO_BASE + raw.lstrip('/')
    url = _safe(url)
    cache.set(key, url, CACHE_TTL)
    return url
