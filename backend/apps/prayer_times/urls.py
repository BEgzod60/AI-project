from django.urls import path

from . import views

urlpatterns = [
    path('', views.daily_prayer_times, name='daily-prayer-times'),
    path('month/', views.monthly_prayer_times, name='monthly-prayer-times'),
    path('year/', views.yearly_prayer_times, name='yearly-prayer-times'),
]
