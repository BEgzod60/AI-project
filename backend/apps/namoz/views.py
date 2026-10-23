from django.db.models import Exists, OuterRef
from rest_framework import generics
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Topic
from .search import search
from .serializers import TopicDetailSerializer, TopicListSerializer, published_sections


class TopicListView(generics.ListAPIView):
    """GET /api/<bo'lim>/topics/ — bo'lim mavzulari (faqat o'qish). Bo'lim urls.py da beriladi."""

    serializer_class = TopicListSerializer
    category = Topic.Category.NAMOZ

    def get_queryset(self):
        has_content = Exists(published_sections().filter(topic=OuterRef('pk')))
        return Topic.objects.filter(is_visible=True, category=self.category).annotate(has_content=has_content)


class TopicDetailView(generics.RetrieveAPIView):
    """GET /api/<bo'lim>/topics/<slug>/ — mavzu va uning tekshirilgan bo'limlari."""

    serializer_class = TopicDetailSerializer
    lookup_field = 'slug'
    category = Topic.Category.NAMOZ

    def get_queryset(self):
        return Topic.objects.filter(is_visible=True, category=self.category)


@api_view(['GET'])
def search_view(request):
    """GET /api/search/?q=tahorat&category=namoz — Namoz va Iymon bo'limlari bo'yicha qidiruv;
       GET /api/search/?stats=1&vid=... — sayt tashrifchilari va ko'rishlar statistikasi."""
    if request.query_params.get('stats') == '1':
        from apps.developer.models import SiteVisitor
        vid = request.query_params.get('vid')
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

    query = (request.query_params.get('q') or '').strip()[:100]
    category = request.query_params.get('category') or ''
    if category and category not in Topic.Category.values:
        category = ''
    return Response(search(query, category))
