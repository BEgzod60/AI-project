from django.urls import path

from . import views
from .models import Topic


def topic_urlpatterns(category):
    return [
        path('topics/', views.TopicListView.as_view(category=category), name=f'{category}-topic-list'),
        path('topics/<slug:slug>/', views.TopicDetailView.as_view(category=category), name=f'{category}-topic-detail'),
    ]


urlpatterns = topic_urlpatterns(Topic.Category.NAMOZ)
iymon_urlpatterns = topic_urlpatterns(Topic.Category.IYMON)
zakot_urlpatterns = topic_urlpatterns(Topic.Category.ZAKOT)
roza_urlpatterns = topic_urlpatterns(Topic.Category.ROZA)
