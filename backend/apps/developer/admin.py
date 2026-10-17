from django.contrib import admin

from .models import PREFIX, ApiKey


@admin.register(ApiKey)
class ApiKeyAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'shown_key', 'is_active', 'daily_limit', 'usage_count', 'total_requests', 'last_used_at', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'email', 'prefix']
    list_editable = ['is_active', 'daily_limit']
    readonly_fields = ['prefix', 'key_hash', 'created_at', 'created_ip', 'last_used_at', 'usage_day', 'usage_count', 'total_requests']

    @admin.display(description='Kalit')
    def shown_key(self, obj):
        return f'{PREFIX}{obj.prefix}…'

    def has_add_permission(self, request):
        return False  # kalit faqat sayt orqali beriladi (to'liq kalit bir marta ko'rsatiladi)
