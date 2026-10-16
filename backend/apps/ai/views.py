import json

from django.http import StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import services


def _error(message: str, code: str, http_status: int = status.HTTP_503_SERVICE_UNAVAILABLE):
    return Response({'error': {'code': code, 'message': message}}, status=http_status)


def _messages(payload):
    question = (payload.get('question') or '').strip()
    history = payload.get('history') or []
    messages = [
        {'role': m.get('role'), 'content': m.get('content', '')}
        for m in history[-8:] if m.get('role') in ('user', 'assistant') and m.get('content')
    ]
    messages.append({'role': 'user', 'content': question})
    return messages


@api_view(['GET'])
def status_view(request):
    """GET /api/ai/status/ — AI xizmati tayyormi?"""
    return Response({
        'configured': services.is_configured(),
        'model': services.DEFAULT_MODEL,
    })


@api_view(['GET'])
def models_view(request):
    return Response({'models': services.list_models()})


@api_view(['POST'])
def chat(request):
    """POST /api/ai/chat/ {question, history[]} — bir martalik javob."""
    question = (request.data.get('question') or '').strip()
    if not question:
        return _error('Savol bo‘sh.', 'empty_question', status.HTTP_400_BAD_REQUEST)
    try:
        answer = services.complete(_messages(request.data), model=request.data.get('model'))
    except services.AiError as exc:
        return _error(str(exc), exc.code)
    return Response({'answer': answer})


@csrf_exempt
@api_view(['POST'])
def chat_stream(request):
    """POST /api/ai/chat/stream/ — SSE: har bir so'z alohida yuboriladi."""
    question = (request.data.get('question') or '').strip()
    if not question:
        return _error('Savol bo‘sh.', 'empty_question', status.HTTP_400_BAD_REQUEST)
    try:
        chunks = services.stream(_messages(request.data), model=request.data.get('model'))
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


@api_view(['POST'])
def describe(request):
    """POST /api/ai/describe-image/ {image, question?} — rasmni AI bilan o'qish."""
    image = (request.data.get('image') or '').strip()
    if not image:
        return _error('Rasm manzili kerak.', 'empty_image', status.HTTP_400_BAD_REQUEST)
    try:
        text = services.describe_image(image, question=request.data.get('question', ''), model=request.data.get('model'))
    except services.AiError as exc:
        return _error(str(exc), exc.code)
    return Response({'text': text})
