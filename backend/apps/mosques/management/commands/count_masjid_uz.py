"""masjid.uz (Islom.uz) katalogi bo'yicha har bir viloyatdagi masjidlar sonini hisoblash.

    python manage.py count_masjid_uz
    python manage.py count_masjid_uz --only /andijon-v

Natija MosqueCount'ga manbasi va sanasi bilan yoziladi (Qibla sahifasida ko'rsatiladi).
Eslatma: bu katalogdagi yozuvlar soni — rasmiy ro'yxatdagi barcha masjidlar emas.
"""
from datetime import date

import requests
from django.core.management.base import BaseCommand

from apps.mosques import directory
from apps.mosques.models import MosqueCount


class Command(BaseCommand):
    help = "masjid.uz katalogi bo'yicha viloyatlardagi masjidlar sonini hisoblaydi"

    def add_arguments(self, parser):
        parser.add_argument('--only', help="Faqat bitta hudud sahifasi, masalan /andijon-v")
        parser.add_argument('--pause', type=float, default=1.0)

    def handle(self, *args, **options):
        sess = directory.session()
        regions = {k: v for k, v in directory.REGIONS.items() if not options['only'] or k == options['only']}
        total = 0
        for path, (scope, label, _center) in regions.items():
            try:
                count, detail = directory.region_count(sess, path, options['pause'])
            except requests.RequestException as exc:
                self.stderr.write(self.style.WARNING(f'{label}: {exc}'))
                continue
            if count == 0:
                self.stderr.write(self.style.WARNING(f'{label}: katalogda topilmadi — saqlanmadi'))
                continue
            MosqueCount.objects.update_or_create(scope=scope, defaults={
                'label': label, 'count': count,
                'source_title': 'masjid.uz (Islom.uz) masjidlar katalogi',
                'source_url': f'{directory.BASE}{path}.html',
                'as_of': date.today(),
            })
            total += count
            self.stdout.write(f'{label}: {count} ta masjid ({len(detail)} ta tuman/shahar)')
        self.stdout.write(self.style.SUCCESS(f'Katalog bo‘yicha jami: {total} ta masjid'))
