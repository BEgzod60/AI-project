from django.urls import path

from . import views

urlpatterns = [
    path('', views.PrayerCategoryListView.as_view(), name='prayer-category-list'),
    path('audio/<int:pk>/', views.audio_view, name='lesson-audio'),
    path('<slug:slug>/birga/', views.birga_view, name='prayer-birga'),
    path('<slug:slug>/lesson/', views.lesson_view, name='prayer-lesson'),
    path('<slug:slug>/', views.PrayerCategoryDetailView.as_view(), name='prayer-category-detail'),
]
