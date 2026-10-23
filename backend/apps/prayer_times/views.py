from datetime import datetime

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .services import (
    CityNotFoundError,
    PrayerTimesServiceError,
    get_monthly_prayer_times,
    get_yearly_prayer_times,
    get_prayer_times,
)


def _error_response(message: str, code: str = 'error', http_status: int = status.HTTP_400_BAD_REQUEST):
    return Response({'error': {'code': code, 'message': message}}, status=http_status)


def _upstream_error(exc: PrayerTimesServiceError):
    return _error_response(str(exc), code='upstream_error', http_status=status.HTTP_502_BAD_GATEWAY)


@api_view(['GET'])
def daily_prayer_times(request):
    """GET /api/prayer-times/?city=Toshkent&date=15-10-2026 — kunlik namoz vaqtlari."""
    city = request.query_params.get('city')
    date_str = request.query_params.get('date')

    if date_str:
        try:
            datetime.strptime(date_str, '%d-%m-%Y')
        except ValueError:
            return _error_response(
                "Sana formati noto'g'ri. To'g'ri format: DD-MM-YYYY, masalan 15-10-2026.",
                code='invalid_date',
            )

    try:
        data = get_prayer_times(city=city, date_str=date_str)
    except CityNotFoundError as exc:
        return _error_response(str(exc), code='city_not_found')
    except PrayerTimesServiceError as exc:
        return _upstream_error(exc)

    vid = request.query_params.get('vid')
    if vid:
        try:
            from apps.developer.models import SiteVisitor
            stats = SiteVisitor.record_visit(str(vid)[:64])
            data['site_stats'] = stats
        except Exception:
            pass

    return Response(data)


@api_view(['GET'])
def monthly_prayer_times(request):
    """GET /api/prayer-times/month/?city=Toshkent&month=10&year=2026 — oylik."""
    city = request.query_params.get('city')
    month = request.query_params.get('month')
    year = request.query_params.get('year')

    if not month or not year:
        return _error_response("month va year parametrlarini yuboring.", 'missing_params')

    try:
        month, year = int(month), int(year)
        if not (1 <= month <= 12) or not (2000 <= year <= 2100):
            raise ValueError
    except (TypeError, ValueError):
        return _error_response("month 1..12 oralig'ida, year 2000..2100 oralig'ida bo'lishi kerak.", 'invalid_params')

    try:
        data = get_monthly_prayer_times(city, month, year)
    except CityNotFoundError as exc:
        return _error_response(str(exc), code='city_not_found')
    except PrayerTimesServiceError as exc:
        return _upstream_error(exc)

    return Response(data)


@api_view(['GET'])
def yearly_prayer_times(request):
    """GET /api/prayer-times/year/?city=Toshkent&year=2026 — yillik (e'lon qilingan oylar)."""
    city = request.query_params.get('city')
    try:
        year = int(request.query_params.get('year', ''))
        if not (2000 <= year <= 2100):
            raise ValueError
    except ValueError:
        return _error_response("year 2000..2100 oralig'ida bo'lishi kerak.", 'invalid_params')

    try:
        data = get_yearly_prayer_times(city, year)
    except CityNotFoundError as exc:
        return _error_response(str(exc), code='city_not_found')
    except PrayerTimesServiceError as exc:
        return _upstream_error(exc)

    return Response(data)
