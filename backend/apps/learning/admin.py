from django.contrib import admin, messages

from .audio_check import check, is_reachable
from .models import AudioSource, LessonNote, LessonStep, PrayerCategory, Recitation


@admin.register(PrayerCategory)
class PrayerCategoryAdmin(admin.ModelAdmin):
    list_display = ['number', 'name', 'group', 'rakats', 'review_status', 'reviewed_by', 'is_visible', 'updated_at']
    list_display_links = ['name']
    list_filter = ['group', 'review_status', 'is_visible']
    search_fields = ['name', 'description', 'rakats']
    prepopulated_fields = {'slug': ['name']}
    fieldsets = [
        (None, {'fields': ['number', 'slug', 'name', 'group', 'icon', 'image', 'is_visible']}),
        ("Diniy ma'lumot", {'fields': ['description', 'rakats', 'rakat_breakdown']}),
        ('Manba', {'fields': ['source_title', 'source_url', 'source_quote']}),
        ('Tekshiruv', {
            'fields': ['review_status', 'reviewed_by', 'reviewed_at'],
            'description': (
                "Tavsif va rakatlarni manbadagi jumla bilan solishtiring. Chop etish uchun manba havolasi, "
                "manbadagi aynan jumla va tasdiqlagan shaxs majburiy. Tasdiqlanmagan yozuv saytda "
                "«Tekshirilmoqda» deb ko'rsatiladi va diniy ma'lumoti chiqarilmaydi."
            ),
        }),
    ]


REVIEW_HELP = (
    "Matnni manba bilan solishtiring. Chop etish uchun manba havolasi va tasdiqlagan shaxs majburiy. "
    "Tasdiqlanmagan mazmun saytda ko'rsatilmaydi («Tekshirilmoqda»)."
)


class AudioSourceInline(admin.StackedInline):
    model = AudioSource
    extra = 0
    fields = ['provider', 'audio_url', 'tanzil_reciter', 'qf_surah', 'qf_verse', 'reciter', 'display_note', 'source_url',
              'license_status', 'permission_note', 'verification_status', 'verified_by',
              'last_checked_at', 'last_http_status', 'notes']
    readonly_fields = ['last_checked_at', 'last_http_status']


@admin.register(Recitation)
class RecitationAdmin(admin.ModelAdmin):
    list_display = ['name', 'kind', 'surah_number', 'is_zam_sura', 'review_status', 'audio_status']
    list_filter = ['kind', 'review_status', 'is_zam_sura']
    search_fields = ['name', 'transliteration', 'meaning']
    prepopulated_fields = {'slug': ['name']}
    inlines = [AudioSourceInline]
    fieldsets = [
        (None, {'fields': ['slug', 'name', 'kind', 'surah_number', 'is_zam_sura', 'order']}),
        ("Matn (faqat lotin yozuvi)", {'fields': ['transliteration', 'meaning']}),
        ('Manba va tekshiruv', {'fields': ['source_title', 'source_url', 'review_status', 'reviewed_by', 'reviewed_at'],
                                'description': REVIEW_HELP}),
    ]

    @admin.display(description='Audio')
    def audio_status(self, obj):
        return 'Tasdiqlangan' if any(a.is_playable for a in obj.audio_sources.all()) else 'Mavjud emas'


@admin.register(AudioSource)
class AudioSourceAdmin(admin.ModelAdmin):
    list_display = ['recitation', 'provider', 'reciter', 'license_status', 'verification_status',
                    'availability', 'last_checked_at', 'verified_by']
    list_filter = ['verification_status', 'license_status', 'provider']
    search_fields = ['recitation__name', 'reciter', 'notes']
    readonly_fields = ['last_checked_at', 'last_http_status']
    actions = ['check_availability', 'approve', 'reject']
    fieldsets = [
        (None, {'fields': ['recitation', 'provider', 'audio_url', 'tanzil_reciter', 'qf_surah', 'qf_verse',
                           'reciter', 'display_note', 'source_url']}),
        ('Ruxsat', {'fields': ['license_status', 'permission_note']}),
        ('Tekshiruv', {
            'fields': ['verification_status', 'verified_by', 'last_checked_at', 'last_http_status', 'notes'],
            'description': "Avval «Mavjudligini tekshirish» amalini bajaring: faqat ochiladigan va foydalanish "
                           "ruxsati bor audio tasdiqlanadi.",
        }),
    ]

    @admin.display(description='Mavjudligi')
    def availability(self, obj):
        if obj.last_http_status is None:
            return 'Tekshirilmagan'
        return 'Ochiladi' if is_reachable(obj) else f'Ochilmaydi ({obj.last_http_status or "tarmoq xatosi"})'

    @admin.action(description='Mavjudligini tekshirish')
    def check_availability(self, request, queryset):
        results = [(a, check(a)) for a in queryset.select_related('recitation')]
        ok = sum(1 for a, _ in results if is_reachable(a))
        self.message_user(request, f'{len(results)} ta audio tekshirildi: {ok} tasi ochiladi, {len(results) - ok} tasi ochilmaydi.')

    @admin.action(description='Tanlanganlarni tasdiqlash')
    def approve(self, request, queryset):
        bad = queryset.exclude(license_status__in=AudioSource.PLAYABLE_LICENSES)
        if bad.exists():
            self.message_user(request, "Foydalanish ruxsati aniqlanmagan audio tasdiqlanmaydi.", messages.ERROR)
            return
        unreachable = [a for a in queryset if not is_reachable(a)]
        if unreachable:
            self.message_user(
                request,
                "Avval «Mavjudligini tekshirish» bajaring — ochilmaydigan audio tasdiqlanmaydi: "
                + ', '.join(str(a.recitation) for a in unreachable),
                messages.ERROR,
            )
            return
        name = request.user.get_full_name() or request.user.get_username()
        n = queryset.update(verification_status=AudioSource.Verification.APPROVED, verified_by=name)
        self.message_user(request, f'{n} ta audio tasdiqlandi.')

    @admin.action(description='Tanlanganlarni rad etish')
    def reject(self, request, queryset):
        n = queryset.update(verification_status=AudioSource.Verification.REJECTED)
        self.message_user(request, f'{n} ta audio rad etildi.')


@admin.register(LessonStep)
class LessonStepAdmin(admin.ModelAdmin):
    list_display = ['category', 'order', 'title', 'review_status', 'has_female_note']
    list_display_links = ['title']
    list_filter = ['category', 'review_status']
    filter_horizontal = ['recitations']
    fieldsets = [
        (None, {'fields': ['category', 'order', 'title', 'text', 'recitations', 'zam_sura_choice']}),
        ('Ayollar uchun farq', {'fields': ['text_female', 'female_source_url']}),
        ('Manba va tekshiruv', {'fields': ['source_title', 'source_url', 'review_status', 'reviewed_by', 'reviewed_at'],
                                'description': REVIEW_HELP}),
    ]

    @admin.display(boolean=True, description='Ayollar farqi')
    def has_female_note(self, obj):
        return bool(obj.text_female)


@admin.register(LessonNote)
class LessonNoteAdmin(admin.ModelAdmin):
    list_display = ['category', 'tab', 'title', 'review_status']
    list_filter = ['category', 'tab', 'review_status']
