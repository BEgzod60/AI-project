from django.urls import path

from . import views

urlpatterns = [
    path('', views.contact_view, name='contact'),
    path('stats/', views.site_stats_view, name='contact-stats'),
]
