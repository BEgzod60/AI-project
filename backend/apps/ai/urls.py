from django.urls import path

from . import views

urlpatterns = [
    path('status/', views.status_view, name='ai-status'),
    path('models/', views.models_view, name='ai-models'),
    path('chat/', views.chat, name='ai-chat'),
    path('chat/stream/', views.chat_stream, name='ai-chat-stream'),
    path('describe-image/', views.describe, name='ai-describe-image'),
]
