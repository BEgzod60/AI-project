from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.learning.models import Recitation

from . import audio_files, sources
from .models import Surah


def _prayer_sets():
    """Namozda o'qiladigan suralar: Fotiha va zam suralar (Namoz o'rganish bo'limidagi kabi)."""
    zam = set(
        Recitation.objects.filter(kind=Recitation.Kind.SURA, is_zam_sura=True, surah_number__isnull=False)
        .values_list('surah_number', flat=True)
    )
    return zam | {1}, zam


def _transliterations():
    """Lotin harflarida o'qilishi — faqat muslim.uz'dan olingan va tasdiqlangan suralar uchun."""
    return {
        r.surah_number: r
        for r in Recitation.objects.filter(kind=Recitation.Kind.SURA, surah_number__isnull=False)
        if r.is_published and r.transliteration
    }


def _audio(surah):
    a = next((x for x in surah.audios.all() if x.is_playable), None)
    return {'url': a.audio_url, 'reciter': a.reciter, 'source_title': a.source_title, 'source_url': a.source_url} if a else None


def _ru(request):
    return request.query_params.get('lang') == 'ru'


def _revelation(surah, ru):
    return sources.REVELATION_RU[surah.revelation] if ru else surah.get_revelation_display()


@api_view(['GET'])
def surah_list(request):
    """GET /api/quran/surahs/ — 114 sura (ro'yxat uchun qisqa ma'lumot)."""
    prayer, zam = _prayer_sets()
    translit = set(_transliterations())
    ru = _ru(request)
    surahs = Surah.objects.prefetch_related('audios')
    return Response({
        'surahs': [
            {
                'number': s.number, 'name_uz': s.name_uz, 'name_simple': s.name_simple, 'name_arabic': s.name_arabic,
                'verses_count': s.verses_count, 'revelation': _revelation(s, ru),
                'in_prayer': s.number in prayer, 'is_zam': s.number in zam,
                'has_transliteration': s.number in translit, 'has_audio': _audio(s) is not None,
            }
            for s in surahs
        ],
        'sources': _sources(ru),
    })


@api_view(['GET'])
def surah_detail(request, number):
    """GET /api/quran/surahs/<n>/ — oyatlar (arabcha + o'zbekcha ma'no), o'qilishi, audio, ma'lumot."""
    surah = get_object_or_404(Surah.objects.prefetch_related('ayahs', 'audios'), number=number)
    prayer, zam = _prayer_sets()
    rec = _transliterations().get(surah.number)
    ru = _ru(request)
    return Response({
        'number': surah.number, 'name_uz': surah.name_uz, 'name_simple': surah.name_simple,
        'name_arabic': surah.name_arabic, 'verses_count': surah.verses_count,
        'revelation': _revelation(surah, ru), 'revelation_order': surah.revelation_order,
        'in_prayer': surah.number in prayer, 'is_zam': surah.number in zam,
        'ayahs': [
            {'number': a.number, 'arabic': a.text_arabic, 'meaning': (a.translation_ru or a.translation_uz) if ru else a.translation_uz}
            for a in surah.ayahs.all()
        ],
        'transliteration': (
            {'text': rec.transliteration, 'source_title': rec.source_title, 'source_url': rec.source_url} if rec else None
        ),
        'audio': _audio(surah),
        'ayah_audio': _ayah_audio(),
        'sources': _sources(ru),
    })


def _ayah_audio():
    return {
        'url_template': sources.AYAH_AUDIO_URL,
        'reciters': [
            {'id': key, 'name': name, 'local': audio_files.is_local(key)} for key, name in sources.AYAH_AUDIO_RECITERS
        ],
        'local_url_template': audio_files.url_template(),
        'source_title': sources.AYAH_AUDIO_SOURCE,
        'source_url': sources.SOURCE_URL,
    }


def _sources(ru=False):
    return {
        'translation': sources.TRANSLATION_TITLE_RU if ru else sources.TRANSLATION_TITLE,
        'text': sources.TEXT_SOURCE_RU if ru else sources.TEXT_SOURCE,
        'url': sources.SOURCE_URL,
        'api': sources.API_TITLE,
    }
