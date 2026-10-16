from django.contrib import admin

from .models import PrayerTime


@admin.register(PrayerTime)
class PrayerTimeAdmin(admin.ModelAdmin):
    list_display = ('region', 'date', 'bomdod', 'quyosh', 'peshin', 'asr', 'shom', 'xufton')
    list_filter = ('region',)
    date_hierarchy = 'date'
    search_fields = ('region',)
