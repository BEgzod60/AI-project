from django.urls import path

from . import views

urlpatterns = [
    path('surahs/', views.surah_list, name='surah-list'),
    path('surahs/<int:number>/', views.surah_detail, name='surah-detail'),
]
