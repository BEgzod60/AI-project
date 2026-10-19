from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import birga, tanzil_audio
from .models import AudioSource, PrayerCategory
from .serializers import PrayerCategorySerializer, lesson_payload


class PrayerCategoryListView(generics.ListAPIView):
    """GET /api/namoz-organish/ — namoz turlari (faqat o'qish)."""

    serializer_class = PrayerCategorySerializer
    queryset = PrayerCategory.objects.filter(is_visible=True)


class PrayerCategoryDetailView(generics.RetrieveAPIView):
    """GET /api/namoz-organish/<slug>/"""

    serializer_class = PrayerCategorySerializer
    lookup_field = 'slug'
    queryset = PrayerCategory.objects.filter(is_visible=True)



@api_view(['GET'])
def lesson_view(request, slug):
    """GET /api/namoz-organish/<slug>/lesson/ — qadamlar, tab izohlari, suralar va duolar."""
    category = get_object_or_404(PrayerCategory, slug=slug, is_visible=True)
    return Response(lesson_payload(category))


@api_view(['GET'])
def birga_view(request, slug):
    """GET /api/namoz-organish/<slug>/birga/?qism=<n> — «Birga o'qish» ketma-ketligi, matnlar va sozlamalar.

    qism — rakat_breakdown indeksi (masalan Peshin: 0 = 4 sunnat, 1 = 4 farz, 2 = 2 sunnat).
    """
    category = get_object_or_404(PrayerCategory, slug=slug, is_visible=True)
    try:
        part = int(request.query_params['qism']) if 'qism' in request.query_params else None
    except ValueError:
        part = None
    return Response(birga.localize(birga.session_payload(category, part), request.query_params.get('lang')))


@api_view(['GET'])
def audio_view(request, pk):
    """GET /api/namoz-organish/audio/<id>/?mode=full|verses — faqat tasdiqlangan audio havolasi."""
    audio = get_object_or_404(AudioSource.objects.select_related('recitation'), pk=pk)
    if not audio.is_playable or not audio.recitation.is_published:
        return Response({'error': {'code': 'not_available', 'message': 'Audio hozircha mavjud emas'}}, status=404)
    try:
        if audio.provider == AudioSource.Provider.TANZIL:
            # Tanzil'da butun sura fayli yo'q — sura oyatma-oyat ketma-ket eshittiriladi
            reciter, surah = audio.tanzil_reciter, audio.surah
            if audio.qf_verse:
                return Response({'mode': 'full', 'url': tanzil_audio.ayah_url(reciter, surah, audio.qf_verse)})
            return Response({'mode': 'verses', 'verses': tanzil_audio.verse_urls(reciter, surah)})
        return Response({'mode': 'full', 'url': audio.audio_url})
    except tanzil_audio.TanzilAudioError:
        return Response({'error': {'code': 'upstream_error', 'message': 'Audio hozircha mavjud emas'}}, status=502)
