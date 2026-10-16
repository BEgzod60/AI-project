from django.contrib import admin

from .models import Mosque, MosqueArea


@admin.register(Mosque)
class MosqueAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'lat', 'lon', 'osm_id', 'updated_at')
    search_fields = ('name', 'address', 'osm_id')


@admin.register(MosqueArea)
class MosqueAreaAdmin(admin.ModelAdmin):
    list_display = ('south', 'west', 'north', 'east', 'count', 'synced_at')
