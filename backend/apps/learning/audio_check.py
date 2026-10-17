"""Audio havolasi haqiqatan ochilishini tekshirish (admin amali va import uchun)."""
import requests
from django.utils import timezone

from . import tanzil_audio
from .models import AudioSource

TIMEOUT = 15
HEADERS = {'User-Agent': 'Mozilla/5.0 (Iymon audio check)'}
OK_STATUSES = (200, 206)


def resolve_url(audio: AudioSource) -> str:
    if audio.provider == AudioSource.Provider.TANZIL:
        # Tekshiruv manbaning o'zida (tanzil.net) — birinchi yoki ko'rsatilgan oyat
        return tanzil_audio.ayah_url(audio.tanzil_reciter, audio.surah, audio.qf_verse or 1, remote=True)
    return audio.audio_url


def http_status(url: str) -> int:
    """HTTP holat kodi; tarmoq xatosida 0. HEAD qo'llanmasa — faqat 1 bayt so'raladi."""
    try:
        resp = requests.head(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
        if resp.status_code in (403, 405, 501):
            resp = requests.get(url, headers={**HEADERS, 'Range': 'bytes=0-0'}, timeout=TIMEOUT, stream=True)
            resp.close()
        return resp.status_code
    except requests.RequestException:
        return 0


def check(audio: AudioSource) -> int:
    try:
        status = http_status(resolve_url(audio))
    except tanzil_audio.TanzilAudioError:
        status = 0
    audio.last_http_status = status
    audio.last_checked_at = timezone.now()
    audio.save(update_fields=['last_http_status', 'last_checked_at', 'updated_at'])
    return status


def is_reachable(audio: AudioSource) -> bool:
    return audio.last_http_status in OK_STATUSES
