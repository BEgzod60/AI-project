import logging

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.contact import telegram

from .auth import api_key_required
from .models import ApiKey, PREFIX

log = logging.getLogger(__name__)
KEYS_PER_IP_HOUR = 3
KEYS_PER_EMAIL = 3


def _client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    return forwarded.split(',')[0].strip() if forwarded else request.META.get('REMOTE_ADDR') or None


def _error(code, message, status):
    return Response({'error': {'code': code, 'message': message}}, status=status)


@api_view(['POST'])
def create_key(request):
    """POST /api/dev/keys/ — {name, email} → yangi API kalit (to'liq kalit faqat shu javobda)."""
    data = request.data if isinstance(request.data, dict) else {}
    if str(data.get('website', '')).strip():  # bot-tuzoq
        return _error('invalid', 'So‘rov rad etildi.', 400)
    name = ' '.join(str(data.get('name', '')).split())
    email = str(data.get('email', '')).strip().lower()
    if not 2 <= len(name) <= 80:
        return _error('invalid', 'Ilova nomi 2–80 belgi bo‘lishi kerak.', 400)
    try:
        validate_email(email)
    except ValidationError:
        return _error('invalid', 'Email manzil noto‘g‘ri.', 400)
    if not data.get('agree'):
        return _error('invalid', 'Foydalanish shartlariga rozilik kerak.', 400)

    ip = _client_ip(request)
    rate_key = f'apikey-issue:{ip}'
    if cache.get(rate_key, 0) >= KEYS_PER_IP_HOUR:
        return _error('rate_limited', 'Juda ko‘p kalit so‘raldi — bir soatdan keyin urinib ko‘ring.', 429)
    if ApiKey.objects.filter(email=email, is_active=True).count() >= KEYS_PER_EMAIL:
        return _error('limit', f'Bitta email uchun ko‘pi bilan {KEYS_PER_EMAIL} ta faol kalit.', 400)

    key, raw = ApiKey.issue(name=name, email=email, created_ip=ip)
    cache.set(rate_key, cache.get(rate_key, 0) + 1, 60 * 60)
    try:  # loyiha egasiga xabar — bo'lmasa ham kalit beriladi
        telegram.send_message(f'🔑 Iymon API — yangi kalit\n\nIlova: {name}\nEmail: {email}\nKalit: {PREFIX}{key.prefix}…')
    except telegram.TelegramError:
        log.info('Telegram xabari yuborilmadi (API kalit %s)', key.prefix)
    return Response({
        'key': raw, 'prefix': f'{PREFIX}{key.prefix}', 'name': key.name, 'daily_limit': key.daily_limit,
        'note': 'Kalitni hozir saqlab qo‘ying — u qayta ko‘rsatilmaydi.',
    }, status=201)


@api_key_required
@api_view(['GET'])
def key_status(request):
    """GET /api/v1/me/ — kalit holati va bugungi limit."""
    key = ApiKey.find(request.META.get('HTTP_X_API_KEY') or request.META.get('HTTP_AUTHORIZATION', '')[7:] or request.GET.get('api_key', ''))
    return Response({
        'name': key.name, 'prefix': f'{PREFIX}{key.prefix}', 'daily_limit': key.daily_limit,
        'used_today': key.usage_count, 'total_requests': key.total_requests,
    })
