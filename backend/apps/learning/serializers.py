from rest_framework import serializers

from .models import AudioSource, LessonNote, LessonStep, PrayerCategory, Recitation


class PrayerCategorySerializer(serializers.ModelSerializer):
    """Tasdiqlanmagan yozuvlarda diniy ma'lumot (tavsif, rakatlar, manba) yuborilmaydi."""

    review_status = serializers.SerializerMethodField()

    class Meta:
        model = PrayerCategory
        fields = [
            'number', 'slug', 'name', 'icon', 'image', 'review_status',
            'description', 'rakats', 'rakat_breakdown', 'source_title', 'source_url',
        ]

    def get_review_status(self, obj):
        return 'published' if obj.is_published else 'awaiting_review'

    def to_representation(self, obj):
        data = super().to_representation(obj)
        if not obj.is_published:
            data.update(description='', rakats='', rakat_breakdown=[], source_title='', source_url='')
        return data



def _published(qs):
    return [obj for obj in qs if obj.is_published]


class AudioDescriptorSerializer(serializers.ModelSerializer):
    """Faqat tasdiqlangan audio haqida ma'lumot; havola /audio/<id>/ orqali alohida olinadi."""

    modes = serializers.SerializerMethodField()
    license = serializers.CharField(source='get_license_status_display')

    class Meta:
        model = AudioSource
        fields = ['id', 'provider', 'reciter', 'source_url', 'license', 'modes', 'display_note']

    def get_modes(self, obj):
        if obj.provider == AudioSource.Provider.QURAN_FOUNDATION and not obj.qf_verse:
            return ['full', 'verses']
        return ['full']


class RecitationSerializer(serializers.ModelSerializer):
    audio = serializers.SerializerMethodField()
    audio_reference = serializers.SerializerMethodField()

    class Meta:
        model = Recitation
        fields = [
            'slug', 'name', 'kind', 'surah_number', 'transliteration', 'meaning',
            'is_zam_sura', 'source_title', 'source_url', 'audio', 'audio_reference',
        ]

    def _playable(self, obj):
        return next((a for a in obj.audio_sources.all() if a.is_playable), None)

    def get_audio(self, obj):
        playable = self._playable(obj)
        return AudioDescriptorSerializer(playable).data if playable else None

    def get_audio_reference(self, obj):
        """Audio ishlamasa — audio e'lon qilingan rasmiy maqola havolasi (faqat ma'lumot uchun)."""
        if self._playable(obj):
            return None
        refs = [a for a in obj.audio_sources.all() if a.display_note and a.source_url]
        refs.sort(key=lambda a: '/e/post/' not in a.source_url)  # rasmiy maqola birinchi
        return {'url': refs[0].source_url, 'title': refs[0].display_note} if refs else None


class LessonStepSerializer(serializers.ModelSerializer):
    recitations = serializers.SerializerMethodField()

    class Meta:
        model = LessonStep
        fields = [
            'order', 'title', 'text', 'text_female', 'female_source_url', 'zam_sura_choice',
            'recitations', 'source_title', 'source_url',
        ]

    def get_recitations(self, obj):
        return [r.slug for r in obj.recitations.all() if r.is_published]


class LessonNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonNote
        fields = ['tab', 'title', 'text', 'source_title', 'source_url']


def lesson_payload(category):
    """Dars sahifasi uchun to'liq ma'lumot. Tasdiqlanmagan diniy mazmun kiritilmaydi."""
    data = {
        'category': PrayerCategorySerializer(category).data,
        'steps': [], 'notes': {tab: [] for tab in LessonNote.Tab.values}, 'recitations': {}, 'zam_suras': [],
    }
    if not category.is_published:
        return data

    steps = _published(category.steps.prefetch_related('recitations'))
    data['steps'] = LessonStepSerializer(steps, many=True).data
    for note in _published(category.notes.all()):
        data['notes'][note.tab].append(LessonNoteSerializer(note).data)

    needed = {slug for step in data['steps'] for slug in step['recitations']}
    zam = _published(Recitation.objects.filter(is_zam_sura=True)) if any(s.zam_sura_choice for s in steps) else []
    data['zam_suras'] = [r.slug for r in zam]
    needed |= set(data['zam_suras'])
    recs = Recitation.objects.filter(slug__in=needed).prefetch_related('audio_sources')
    data['recitations'] = {r.slug: RecitationSerializer(r).data for r in recs if r.is_published}
    return data
