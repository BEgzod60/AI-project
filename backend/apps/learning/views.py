from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import quran_audio
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
def audio_view(request, pk):
    """GET /api/namoz-organish/audio/<id>/?mode=full|verses — faqat tasdiqlangan audio havolasi."""
    audio = get_object_or_404(AudioSource.objects.select_related('recitation'), pk=pk)
    if not audio.is_playable or not audio.recitation.is_published:
        return Response({'error': {'code': 'not_available', 'message': 'Audio hozircha mavjud emas'}}, status=404)
    mode = request.query_params.get('mode', 'full')
    try:
        if audio.provider == AudioSource.Provider.QURAN_FOUNDATION:
            surah = audio.surah
            if audio.qf_verse:
                return Response({'mode': 'full', 'url': quran_audio.ayah_url(audio.qf_recitation_id, surah, audio.qf_verse)})
            if mode == 'verses':
                return Response({'mode': 'verses', 'verses': quran_audio.verse_urls(audio.qf_recitation_id, surah)})
            return Response({'mode': 'full', 'url': quran_audio.full_surah_url(audio.qf_recitation_id, surah)})
        return Response({'mode': 'full', 'url': audio.audio_url})
    except quran_audio.QuranAudioError:
        return Response({'error': {'code': 'upstream_error', 'message': 'Audio hozircha mavjud emas'}}, status=502)
