"""Dasturchilar uchun API.

/api/dev/keys/  — kalit olish (ochiq)
/api/v1/...     — kalit bilan ishlaydigan barqaror API (ichki /api/... ko'rinishlari o'raladi)
"""
from django.urls import path

from apps.learning import views as learning
from apps.namoz.models import Topic
from apps.namoz.views import TopicDetailView, TopicListView
from apps.prayer_times import views as prayer_times
from apps.quran import views as quran

from . import views
from .auth import api_key_required as k

dev_urlpatterns = [
    path('keys/', views.create_key, name='api-key-create'),
]

v1_urlpatterns = [
    path('me/', views.key_status, name='v1-me'),
    path('prayer-times/', k(prayer_times.daily_prayer_times), name='v1-prayer-times'),
    path('prayer-times/month/', k(prayer_times.monthly_prayer_times), name='v1-prayer-times-month'),
    path('surahs/', k(quran.surah_list), name='v1-surahs'),
    path('surahs/<int:number>/', k(quran.surah_detail), name='v1-surah'),
    path('prayers/', k(learning.PrayerCategoryListView.as_view()), name='v1-prayers'),
    path('prayers/<slug:slug>/lesson/', k(learning.lesson_view), name='v1-prayer-lesson'),
    path('prayers/<slug:slug>/sequence/', k(learning.birga_view), name='v1-prayer-sequence'),
    path('prayers/<slug:slug>/', k(learning.PrayerCategoryDetailView.as_view()), name='v1-prayer'),
]
for category in Topic.Category.values:
    v1_urlpatterns += [
        path(f'topics/{category}/', k(TopicListView.as_view(category=category)), name=f'v1-{category}-topics'),
        path(f'topics/{category}/<slug:slug>/', k(TopicDetailView.as_view(category=category)), name=f'v1-{category}-topic'),
    ]
