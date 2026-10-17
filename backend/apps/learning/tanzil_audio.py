"""Tanzil Project (tanzil.net) oyatma-oyat tilovat havolalari.

Tanzil fayllari SSSAAA.mp3 ko'rinishida (masalan 112001 — Ixlos, 1-oyat). Qori fayllari
`compress_quran_audio` bilan siqib saqlangan bo'lsa — o'zimizdagi nusxa beriladi, aks holda tanzil.net.
"""
from apps.quran import audio_files, sources
from apps.quran.models import Surah

DEFAULT_RECITER = 'afasy'


class TanzilAudioError(Exception):
    """Oyat audiosini tuzib bo'lmadi (masalan, suralar bazaga yuklanmagan)."""


def reciter_name(reciter: str) -> str:
    return dict(sources.AYAH_AUDIO_RECITERS).get(reciter, reciter)


def page_url(surah: int, ayah: int = 1) -> str:
    """Manba sahifasi: tanzil.net'da shu oyat."""
    return f'https://tanzil.net/#{surah}:{ayah}'


def ayah_url(reciter: str, surah: int, ayah: int, remote: bool = False) -> str:
    file = audio_files.file_name(surah, ayah)
    if not remote and audio_files.is_local(reciter):
        return audio_files.url_template().format(reciter=reciter, file=file)
    return sources.AYAH_AUDIO_URL.format(reciter=reciter, file=file)


def verse_urls(reciter: str, surah: int) -> list:
    """[{'verse': 1, 'url': '...'}] — butun sura oyatma-oyat."""
    count = Surah.objects.filter(number=surah).values_list('verses_count', flat=True).first()
    if not count:
        raise TanzilAudioError("Sura bazada yo'q: python manage.py import_quran")
    return [{'verse': n, 'url': ayah_url(reciter, surah, n)} for n in range(1, count + 1)]
