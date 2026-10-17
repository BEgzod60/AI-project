from django.core.cache import cache
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response

from . import telegram

LIMITS = {'name': (2, 100), 'contact': (0, 100), 'message': (5, 2000)}
PER_HOUR = 5


def _client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    return forwarded.split(',')[0].strip() if forwarded else request.META.get('REMOTE_ADDR', '')


def _error(code, message, status):
    return Response({'error': {'code': code, 'message': message}}, status=status)


@api_view(['POST'])
@throttle_classes([])
def contact_view(request):
    """POST /api/aloqa/ — {name, contact, message} → loyiha egasining Telegram botiga."""
    data = request.data if isinstance(request.data, dict) else {}
    # Bot-tuzoq: odam ko'rmaydigan maydon to'ldirilgan bo'lsa — jim «qabul qilindi»
    if str(data.get('website', '')).strip():
        return Response({'ok': True})

    values = {k: ' '.join(str(data.get(k, '')).split()) if k != 'message' else str(data.get(k, '')).strip()
              for k in LIMITS}
    for key, (low, high) in LIMITS.items():
        if not low <= len(values[key]) <= high:
            labels = {'name': 'Ism', 'contact': 'Aloqa ma’lumoti', 'message': 'Xabar'}
            return _error('invalid', f'{labels[key]} {low}–{high} belgi bo‘lishi kerak.', 400)

    key = f'contact-rate:{_client_ip(request)}'
    sent = cache.get(key, 0)
    if sent >= PER_HOUR:
        return _error('rate_limited', 'Juda ko‘p xabar yuborildi — bir soatdan keyin urinib ko‘ring.', 429)

    text = (
        '📩 Iymon — yangi xabar\n\n'
        f"Ism: {values['name']}\n"
        f"Aloqa: {values['contact'] or '—'}\n\n"
        f"{values['message']}"
    )
    try:
        telegram.send_message(text)
    except telegram.NotConfigured:
        return _error('not_configured', 'Aloqa formasi hali sozlanmagan. Email yoki telefon orqali bog‘laning.', 503)
    except telegram.TelegramError:
        return _error('upstream_error', 'Xabar yuborilmadi — birozdan keyin qayta urinib ko‘ring.', 502)
    cache.set(key, sent + 1, 60 * 60)
    return Response({'ok': True})
