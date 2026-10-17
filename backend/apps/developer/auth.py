"""/api/v1/ — API kalit, kunlik limit va CORS (boshqa saytlardan ham chaqirish mumkin)."""
from functools import wraps

from django.http import HttpResponse, JsonResponse

from .models import ApiKey

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'X-API-Key, Authorization, Content-Type',
    'Access-Control-Expose-Headers': 'X-RateLimit-Limit, X-RateLimit-Remaining',
    'Access-Control-Max-Age': '86400',
}


def _key_from(request):
    header = request.META.get('HTTP_X_API_KEY', '')
    if header:
        return header.strip()
    auth = request.META.get('HTTP_AUTHORIZATION', '')
    if auth.lower().startswith('bearer '):
        return auth[7:].strip()
    return request.GET.get('api_key', '').strip()


def _error(code, message, status, extra=None):
    resp = JsonResponse({'error': {'code': code, 'message': message}}, status=status, json_dumps_params={'ensure_ascii': False})
    for k, v in {**CORS_HEADERS, **(extra or {})}.items():
        resp[k] = v
    return resp


def api_key_required(view):
    """Mavjud ichki API ko'rinishini kalit va limit bilan o'raydi — javob formati o'zgarmaydi."""
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        if request.method == 'OPTIONS':
            resp = HttpResponse(status=204)
            for k, v in CORS_HEADERS.items():
                resp[k] = v
            return resp
        if request.method != 'GET':
            return _error('method_not_allowed', 'Faqat GET so‘rovlari.', 405)
        raw = _key_from(request)
        if not raw:
            return _error('missing_key', 'API kalit kerak: «X-API-Key» sarlavhasida yuboring.', 401)
        key = ApiKey.find(raw)
        if not key:
            return _error('invalid_key', 'API kalit noto‘g‘ri.', 401)
        if not key.is_active:
            return _error('disabled_key', 'API kalit o‘chirilgan.', 403)
        used = key.consume()
        limit_headers = {'X-RateLimit-Limit': str(key.daily_limit), 'X-RateLimit-Remaining': str(max(0, key.daily_limit - used))}
        if used > key.daily_limit:
            return _error('rate_limited', f'Kunlik limit ({key.daily_limit} so‘rov) tugadi. Ertaga yangilanadi.', 429, limit_headers)
        response = view(request, *args, **kwargs)
        for k, v in {**CORS_HEADERS, **limit_headers}.items():
            response[k] = v
        return response
    wrapped.csrf_exempt = True
    return wrapped
