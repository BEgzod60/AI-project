"""O'zimizda saqlangan (siqilgan) oyat audiolari: MEDIA_ROOT/quran/<qori>/SSSAAA.webm."""
from django.conf import settings

EXT = 'webm'
BITRATE = '32k'
COMPLETE_MARKER = '.complete'


def file_name(surah, ayah):
    return f'{surah:03d}{ayah:03d}'


def reciter_dir(reciter):
    return settings.MEDIA_ROOT / 'quran' / reciter


def is_local(reciter):
    """Qorining hamma oyatlari siqib saqlangan bo'lsa — True."""
    return (reciter_dir(reciter) / COMPLETE_MARKER).exists()


def url_template():
    return f'/{settings.MEDIA_URL.strip("/")}/quran/{{reciter}}/{{file}}.{EXT}'
