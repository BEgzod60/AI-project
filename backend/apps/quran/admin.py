from django.contrib import admin

from .models import Ayah, Surah, SurahAudio


class SurahAudioInline(admin.TabularInline):
    model = SurahAudio
    extra = 0


@admin.register(Surah)
class SurahAdmin(admin.ModelAdmin):
    list_display = ('number', 'name_uz', 'name_simple', 'verses_count', 'revelation')
    search_fields = ('name_uz', 'name_simple')
    inlines = [SurahAudioInline]


@admin.register(Ayah)
class AyahAdmin(admin.ModelAdmin):
    list_display = ('surah', 'number')
    list_filter = ('surah',)
    search_fields = ('translation_uz',)


@admin.register(SurahAudio)
class SurahAudioAdmin(admin.ModelAdmin):
    list_display = ('surah', 'reciter', 'source_title', 'license_status', 'is_active')
    list_filter = ('license_status', 'is_active')
