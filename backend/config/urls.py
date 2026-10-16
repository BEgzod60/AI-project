"""Iymon URL configuration."""
from django.contrib import admin
from django.urls import include, path

from apps.namoz.urls import iymon_urlpatterns
from apps.namoz.views import search_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/prayer-times/', include('apps.prayer_times.urls')),
    path('api/namoz/', include('apps.namoz.urls')),
    path('api/iymon/', include(iymon_urlpatterns)),
    path('api/search/', search_view, name='search'),
    path('api/namoz-organish/', include('apps.learning.urls')),
    path('api/ai/', include('apps.ai.urls')),
    path('api/qibla/', include('apps.mosques.urls')),
]
