from django.urls import path

from . import views

urlpatterns = [
    path('mosques/', views.nearby_mosques, name='nearby-mosques'),
]
