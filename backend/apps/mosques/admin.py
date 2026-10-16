from django.contrib import admin

from .models import DirectoryEntry, Mosque, MosqueArea, MosqueCount


@admin.register(Mosque)
class MosqueAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'lat', 'lon', 'osm_id', 'updated_at')
    search_fields = ('name', 'address', 'osm_id')


@admin.register(MosqueArea)
class MosqueAreaAdmin(admin.ModelAdmin):
    list_display = ('south', 'west', 'north', 'east', 'count', 'synced_at')



@admin.register(DirectoryEntry)
class DirectoryEntryAdmin(admin.ModelAdmin):
    list_display = ('name', 'district', 'imam', 'phone', 'mosque', 'fetched_at')
    list_filter = ('region', 'district')
    search_fields = ('name', 'imam', 'address')
    raw_id_fields = ('mosque',)


@admin.register(MosqueCount)
class MosqueCountAdmin(admin.ModelAdmin):
    list_display = ('label', 'count', 'source_title', 'as_of')
