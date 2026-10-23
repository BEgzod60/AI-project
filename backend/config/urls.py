"""Iymon URL configuration."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path

from apps.namoz.urls import iymon_urlpatterns, roza_urlpatterns, zakot_urlpatterns
from apps.namoz.views import search_view
from apps.developer.urls import dev_urlpatterns, v1_urlpatterns
from apps.quran.media_views import quran_audio

urlpatterns = [
    # Docker healthcheck uchun yengil endpoint (baza so'rovi yo'q)
    path('healthz/', lambda r: HttpResponse('ok', content_type='text/plain')),
    path('admin/', admin.site.urls),
    path('api/prayer-times/', include('apps.prayer_times.urls')),
    path('api/namoz/', include('apps.namoz.urls')),
    path('api/iymon/', include(iymon_urlpatterns)),
    path('api/zakot/', include(zakot_urlpatterns)),
    path('api/roza/', include(roza_urlpatterns)),
    path('api/search/', search_view, name='search'),
    path('api/namoz-organish/', include('apps.learning.urls')),
    path('api/ai/', include('apps.ai.urls')),
    path('api/qibla/', include('apps.mosques.urls')),
    path('api/quran/', include('apps.quran.urls')),
    path('api/aloqa/', include('apps.contact.urls')),
    path('api/dev/', include(dev_urlpatterns)),
    path('api/v1/', include(v1_urlpatterns)),
]

from django.views.static import serve
from django.urls import re_path

# Media (siqilgan Qur'on audiolari va h.k.)
urlpatterns += [
    re_path(r'^media/quran/(?P<reciter>[a-z0-9_-]+)/(?P<file>[0-9]{6})\.webm$', quran_audio),
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
