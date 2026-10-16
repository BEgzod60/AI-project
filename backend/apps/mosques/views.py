from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import services


def _error(message, code, http_status=status.HTTP_400_BAD_REQUEST):
    return Response({'error': {'code': code, 'message': message}}, status=http_status)


@api_view(['GET'])
def nearby_mosques(request):
    """GET /api/qibla/mosques/?lat=41.311&lon=69.279&radius=3000 — yaqin masjidlar (OpenStreetMap)."""
    try:
        lat = services.round_coord(request.query_params.get('lat', ''))
        lon = services.round_coord(request.query_params.get('lon', ''))
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError
    except (TypeError, ValueError):
        return _error("lat va lon to‘g‘ri koordinata bo‘lishi kerak.", 'invalid_coords')

    try:
        radius = int(request.query_params.get('radius', 3000))
    except ValueError:
        radius = 0
    if radius not in services.RADII:
        allowed = ', '.join(str(r // 1000) for r in services.RADII)
        return _error(f"Radius quyidagilardan biri bo‘lishi kerak (km): {allowed}.", 'invalid_radius')

    try:
        mosques = services.nearby_mosques(lat, lon, radius)
    except services.MosqueServiceError as exc:
        return _error(str(exc), 'upstream_error', exc.status)

    return Response({
        'radius': radius,
        'count': len(mosques),
        'mosques': mosques,
        'counts': services.area_counts(lat, lon),
        'source': 'OpenStreetMap',
        'attribution': '© OpenStreetMap hissadorlari',
    })
