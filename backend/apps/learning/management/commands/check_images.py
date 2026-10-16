"""Bazadagi barcha rasm manzillari frontend'da mavjud faylga ishora qilishini tekshirish.

    python manage.py check_images

Deploy'dan oldin (yoki production bazasida) ishga tushiriladi: biror rasm fayli
o'chirilgan, nomi o'zgargan yoki git'ga qo'shilmagan bo'lsa — ro'yxatini chiqarib, xato bilan tugaydi.
Rasmlar frontend/public ichida saqlanadi; bazada faqat ularning manzili (/images/...) turadi.
"""
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.learning.models import LessonStep, PrayerCategory
from apps.namoz.models import Topic

PUBLIC = Path(settings.BASE_DIR).parent / 'frontend' / 'public'


class Command(BaseCommand):
    help = "Bazadagi rasm manzillari frontend/public dagi fayllarga mos kelishini tekshiradi"

    def handle(self, *args, **options):
        refs = []  # (manzil, qayerda ishlatilgan)
        for topic in Topic.objects.exclude(image=''):
            refs.append((topic.image, f'Mavzu: {topic.slug}'))
        for category in PrayerCategory.objects.exclude(image=''):
            refs.append((category.image, f'Namoz turi: {category.slug}'))
        for step in LessonStep.objects.select_related('category'):
            for image in step.images or []:
                for key in ('src', 'src_female'):
                    if image.get(key):
                        refs.append((image[key], f'Qadam: {step.category.slug} / {step.title}'))

        missing = [(src, where) for src, where in refs if not (PUBLIC / src.lstrip('/')).is_file()]
        for src, where in missing:
            self.stderr.write(self.style.ERROR(f'YO‘Q: {src}  ({where})'))
        if missing:
            raise CommandError(f'{len(missing)} ta rasm fayli topilmadi (jami {len(refs)} ta havola).')
        files = len({src for src, _ in refs})
        self.stdout.write(self.style.SUCCESS(f'Hammasi joyida: {len(refs)} ta havola, {files} ta rasm fayli.'))
