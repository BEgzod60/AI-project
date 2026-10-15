from rest_framework import serializers

from .models import Section, SectionItem, SourceReference, Topic
from .sanitize import clean_html


def published_sections(queryset=None):
    """Saytda ko'rsatiladigan bo'limlar: chop etilgan, tekshirgan mutaxassis va kamida bitta manbasi bor."""
    qs = queryset if queryset is not None else Section.objects.all()
    return (
        qs.filter(status=Section.Status.PUBLISHED, sources__isnull=False)
        .exclude(reviewed_by='')
        .distinct()
    )


class SectionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SectionItem
        fields = ['title', 'body']


class SourceReferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SourceReference
        fields = ['title', 'author', 'reference', 'url']


class SectionSerializer(serializers.ModelSerializer):
    items = SectionItemSerializer(many=True, read_only=True)
    sources = SourceReferenceSerializer(many=True, read_only=True)
    content_html = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = ['id', 'title', 'kind', 'body', 'content_html', 'items', 'sources', 'reviewed_by', 'reviewed_at']

    def get_content_html(self, section):
        # Admin orqali kiritilgan matn ham har safar tozalanadi
        return clean_html(section.content_html)


class TopicListSerializer(serializers.ModelSerializer):
    has_content = serializers.BooleanField(read_only=True)

    class Meta:
        model = Topic
        fields = ['number', 'slug', 'title', 'summary', 'icon', 'theme', 'image', 'has_content']


class TopicNeighbourSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ['number', 'slug', 'title']


class TopicDetailSerializer(serializers.ModelSerializer):
    sections = serializers.SerializerMethodField()
    awaiting_review = serializers.SerializerMethodField()
    previous = serializers.SerializerMethodField()
    next = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = [
            'number', 'slug', 'title', 'summary', 'icon', 'theme', 'image',
            'sections', 'awaiting_review', 'previous', 'next',
        ]

    def get_sections(self, topic):
        qs = published_sections(topic.sections.all()).prefetch_related('items', 'sources')
        return SectionSerializer(qs, many=True).data

    def get_awaiting_review(self, topic):
        """Hali chop etilmagan bo'limlar soni (sarlavhasiz — faqat son)."""
        published_ids = published_sections(topic.sections.all()).values('id')
        return topic.sections.exclude(id__in=published_ids).count()

    def _neighbour(self, topic, **lookup):
        qs = Topic.objects.filter(is_visible=True, category=topic.category, **lookup)
        qs = qs.order_by('number' if 'number__gt' in lookup else '-number')
        other = qs.first()
        return TopicNeighbourSerializer(other).data if other else None

    def get_previous(self, topic):
        return self._neighbour(topic, number__lt=topic.number)

    def get_next(self, topic):
        return self._neighbour(topic, number__gt=topic.number)
