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


@api_view(['GET', 'POST'])
@throttle_classes([])
def contact_view(request):
    """POST /api/aloqa/ — Telegram botiga xabar; GET /api/aloqa/?stats=1&vid=... — tashriflar statistikasi."""
    if request.method == 'GET' and request.query_params.get('stats') != '1':
        return _error('method_not_allowed', 'Bu manzilga GET so‘rovi faqat stats=1 bilan yuboriladi.', 405)
    if request.query_params.get('stats') == '1':
        from apps.developer.models import SiteVisitor
        vid = request.query_params.get('vid') or request.data.get('vid')
        if vid:
            stats = SiteVisitor.record_visit(str(vid)[:64])
        else:
            total_unique = SiteVisitor.objects.count()
            from django.utils import timezone
            today = timezone.localdate()
            today_unique = SiteVisitor.objects.filter(last_seen__date=today).count()
            from django.db import models
            total_views = SiteVisitor.objects.aggregate(models.Sum('visit_count'))['visit_count__sum'] or 0
            stats = {
                'total_unique': total_unique,
                'today_unique': today_unique,
                'total_views': total_views,
            }
        return Response(stats)

    data = request.data if isinstance(request.data, dict) else {}
    if str(data.get('website', '')).strip() == 'stats':
        from apps.developer.models import SiteVisitor
        vid = data.get('vid')
        if vid:
            stats = SiteVisitor.record_visit(str(vid)[:64])
        else:
            total_unique = SiteVisitor.objects.count()
            from django.utils import timezone
            today = timezone.localdate()
            today_unique = SiteVisitor.objects.filter(last_seen__date=today).count()
            from django.db import models
            total_views = SiteVisitor.objects.aggregate(models.Sum('visit_count'))['visit_count__sum'] or 0
            stats = {
                'total_unique': total_unique,
                'today_unique': today_unique,
                'total_views': total_views,
            }
        return Response(stats)

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


@api_view(['GET', 'POST'])
def site_stats_view(request):
    """GET/POST /api/aloqa/stats/?vid=<id> — tashriflarni hisoblash va ko'rish."""
    from apps.developer.models import SiteVisitor
    vid = request.data.get('vid') if request.method == 'POST' else request.query_params.get('vid')
    if vid:
        stats = SiteVisitor.record_visit(str(vid)[:64])
    else:
        total_unique = SiteVisitor.objects.count()
        from django.utils import timezone
        today = timezone.localdate()
        today_unique = SiteVisitor.objects.filter(last_seen__date=today).count()
        from django.db import models
        total_views = SiteVisitor.objects.aggregate(models.Sum('visit_count'))['visit_count__sum'] or 0
        stats = {
            'total_unique': total_unique,
            'today_unique': today_unique,
            'total_views': total_views,
        }
    return Response(stats)
