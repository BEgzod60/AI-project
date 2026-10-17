"""Iymon URL configuration."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from apps.namoz.urls import iymon_urlpatterns
from apps.namoz.views import search_view
from apps.developer.urls import dev_urlpatterns, v1_urlpatterns

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/prayer-times/', include('apps.prayer_times.urls')),
    path('api/namoz/', include('apps.namoz.urls')),
    path('api/iymon/', include(iymon_urlpatterns)),
    path('api/search/', search_view, name='search'),
    path('api/namoz-organish/', include('apps.learning.urls')),
    path('api/ai/', include('apps.ai.urls')),
    path('api/qibla/', include('apps.mosques.urls')),
    path('api/quran/', include('apps.quran.urls')),
    path('api/aloqa/', include('apps.contact.urls')),
    path('api/dev/', include(dev_urlpatterns)),
    path('api/v1/', include(v1_urlpatterns)),
]

# Ishlab chiqishda media (siqilgan Qur'on audiolari va h.k.) Django orqali beriladi.
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
