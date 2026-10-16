"""Namoz vaqtlarini manbadan (namoz-vaqtlari.more-info.uz) bazaga yuklash.

    python manage.py sync_prayer_times                 # joriy va keyingi oy, barcha hududlar
    python manage.py sync_prayer_times --year 2026     # butun yil
    python manage.py sync_prayer_times --months 3      # joriy oydan boshlab 3 oy
    python manage.py sync_prayer_times --region Toshkent

Cron (kuniga 1 marta) orqali ishga tushirish tavsiya etiladi — keyingi oy e'lon
qilinishi bilan bazaga tushadi:
    0 3 * * * cd /path/to/backend && venv/bin/python manage.py sync_prayer_times
"""
from django.core.management.base import BaseCommand, CommandError

from apps.prayer_times import services


class Command(BaseCommand):
    help = "Namoz vaqtlarini tashqi manbadan bazaga yuklaydi"

    def add_arguments(self, parser):
        parser.add_argument('--year', type=int, help="Butun yilni yuklash")
        parser.add_argument('--months', type=int, default=2, help="Joriy oydan boshlab nechta oy (sukut: 2)")
        parser.add_argument('--region', help="Faqat bitta hudud")

    def handle(self, *args, **options):
        if options['region']:
            try:
                regions = [services.parse_city(options['region'])]
            except services.CityNotFoundError as exc:
                raise CommandError(str(exc))
        else:
            regions = services.REGIONS

        if options['year']:
            periods = [(options['year'], m) for m in range(1, 13)]
        else:
            today = services.today_local()
            periods = []
            for i in range(max(options['months'], 1)):
                index = today.month - 1 + i
                periods.append((today.year + index // 12, index % 12 + 1))

        total, failed = 0, 0
        for region in regions:
            for year, month in periods:
                label = f'{region} {year:04d}-{month:02d}'
                try:
                    count = services.sync_month(region, year, month)
                except services.PrayerTimesServiceError as exc:
                    failed += 1
                    self.stderr.write(self.style.WARNING(f'{label}: {exc}'))
                    continue
                total += count
                if count:
                    self.stdout.write(f'{label}: {count} kun')
                else:
                    self.stdout.write(f"{label}: hali e'lon qilinmagan")

        self.stdout.write(self.style.SUCCESS(f'Jami saqlandi: {total} kun, xatolar: {failed}'))
        if failed and not total:
            raise CommandError("Manbadan hech narsa yuklab bo'lmadi")
