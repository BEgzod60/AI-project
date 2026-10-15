from django.contrib import admin, messages

from .models import Section, SectionItem, SourceReference, Topic


class SectionInline(admin.TabularInline):
    model = Section
    fields = ['order', 'title', 'kind', 'status']
    extra = 0
    show_change_link = True


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ['number', 'title', 'category', 'theme', 'is_visible', 'published_count', 'pending_count']
    list_filter = ['category']
    list_display_links = ['title']
    list_editable = ['is_visible']
    prepopulated_fields = {'slug': ['title']}
    search_fields = ['title', 'summary']
    inlines = [SectionInline]

    @admin.display(description='Chop etilgan')
    def published_count(self, obj):
        return obj.sections.filter(status=Section.Status.PUBLISHED).count()

    @admin.display(description='Tekshiruvda')
    def pending_count(self, obj):
        return obj.sections.exclude(status=Section.Status.PUBLISHED).count()


class SectionItemInline(admin.StackedInline):
    model = SectionItem
    extra = 0


class SourceReferenceInline(admin.TabularInline):
    model = SourceReference
    extra = 1


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ['title', 'topic', 'kind', 'status', 'source_count', 'reviewed_by', 'updated_at']
    list_filter = ['status', 'kind', 'topic__category', 'topic']
    list_select_related = ['topic']
    search_fields = ['title', 'body']
    inlines = [SectionItemInline, SourceReferenceInline]
    fieldsets = [
        (None, {'fields': ['topic', 'order', 'title', 'kind', 'body', 'content_html', 'source_key']}),
        ('Tekshiruv', {
            'fields': ['status', 'reviewed_by', 'reviewed_at'],
            'description': (
                "Faqat Hanafiy fiqhi bo'yicha mutaxassis tekshirgan va kamida bitta manbasi "
                "ko'rsatilgan bo'lim chop etiladi. Oyat, hadis yoki hukmni manbasiz kiritmang."
            ),
        }),
    ]

    @admin.display(description='Manbalar')
    def source_count(self, obj):
        return obj.sources.count()

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        section = form.instance
        if section.status != Section.Status.PUBLISHED:
            return
        problems = []
        if not section.sources.exists():
            problems.append("kamida bitta manba ko'rsatilmagan")
        if not section.reviewed_by:
            problems.append("tekshirgan mutaxassis ko'rsatilmagan")
        if problems:
            section.status = Section.Status.AWAITING_REVIEW
            section.save(update_fields=['status'])
            self.message_user(
                request,
                "Bo'lim chop etilmadi — " + ', '.join(problems) + ". Holat 'Tekshiruv kutilmoqda' ga qaytarildi.",
                level=messages.WARNING,
            )
