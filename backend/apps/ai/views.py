import json

from django.http import StreamingHttpResponse
from django.conf import settings
from django.http import Http404
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from . import services

MAX_QUESTION_CHARS = 2000
MAX_HISTORY_MESSAGES = 8


class AiEnabled(BasePermission):
    """AI o'chirilgan bo'lsa, endpointlar mavjud emasdek (404) ko'rinadi."""

    def has_permission(self, request, view):
        if not settings.AI_ENABLED:
            raise Http404
        return True


class AiBurstThrottle(UserRateThrottle):
    scope = 'ai'


class AiDailyThrottle(UserRateThrottle):
    scope = 'ai_daily'


def ai_api(methods):
    """AI endpoint: yoqilgan bo'lishi, tizimga kirish (session + CSRF) va tezlik cheklovi shart."""

    def decorator(view):
        view = throttle_classes([AiBurstThrottle, AiDailyThrottle])(view)
        view = permission_classes([AiEnabled, IsAuthenticated])(view)
        view = authentication_classes([SessionAuthentication])(view)
        return api_view(methods)(view)

    return decorator


def _error(message: str, code: str, http_status: int = status.HTTP_503_SERVICE_UNAVAILABLE):
    return Response({'error': {'code': code, 'message': message}}, status=http_status)


def _messages(payload):
    question = (payload.get('question') or '').strip()[:MAX_QUESTION_CHARS]
    history = payload.get('history') or []
    messages = [
        {'role': m.get('role'), 'content': str(m.get('content', ''))[:MAX_QUESTION_CHARS]}
        for m in history[-MAX_HISTORY_MESSAGES:]
        if isinstance(m, dict) and m.get('role') in ('user', 'assistant') and m.get('content')
    ]
    messages.append({'role': 'user', 'content': question})
    return messages


@ai_api(['GET'])
def status_view(request):
    """GET /api/ai/status/ — AI xizmati tayyormi?"""
    return Response({
        'configured': services.is_configured(),
        'model': services.DEFAULT_MODEL,
    })


@ai_api(['GET'])
def models_view(request):
    return Response({'models': services.list_models()})


@ai_api(['POST'])
def chat(request):
    """POST /api/ai/chat/ {question, history[]} — bir martalik javob."""
    question = (request.data.get('question') or '').strip()
    if not question:
        return _error('Savol bo‘sh.', 'empty_question', status.HTTP_400_BAD_REQUEST)
    try:
        answer = services.complete(_messages(request.data))
    except services.AiError as exc:
        return _error(str(exc), exc.code)
    return Response({'answer': answer})


@ai_api(['POST'])
def chat_stream(request):
    """POST /api/ai/chat/stream/ — SSE: har bir so'z alohida yuboriladi."""
    question = (request.data.get('question') or '').strip()
    if not question:
        return _error('Savol bo‘sh.', 'empty_question', status.HTTP_400_BAD_REQUEST)
    try:
        chunks = services.stream(_messages(request.data))
        first = next(iter(chunks), '')
    except services.AiError as exc:
        return _error(str(exc), exc.code)

    def sse():
        if first:
            yield f'data: {json.dumps({"text": first}, ensure_ascii=False)}\n\n'
        try:
            for part in chunks:
                yield f'data: {json.dumps({"text": part}, ensure_ascii=False)}\n\n'
        except services.AiError as exc:
            yield f'data: {json.dumps({"error": {"code": exc.code, "message": str(exc)}}, ensure_ascii=False)}\n\n'
        yield 'data: [DONE]\n\n'

    response = StreamingHttpResponse(sse(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response


@ai_api(['POST'])
def describe(request):
    """POST /api/ai/describe-image/ {image, question?} — rasmni AI bilan o'qish."""
    image = (request.data.get('image') or '').strip()
    if not image:
        return _error('Rasm manzili kerak.', 'empty_image', status.HTTP_400_BAD_REQUEST)
    try:
        text = services.describe_image(image, question=request.data.get('question', ''))
    except services.AiError as exc:
        return _error(str(exc), exc.code)
    return Response({'text': text})
