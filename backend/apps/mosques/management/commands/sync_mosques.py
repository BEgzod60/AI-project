"""Masjidlarni OpenStreetMap'dan (Overpass) bazaga yuklash.

    python manage.py sync_mosques                  # O'zbekiston bo'yicha (2°×2° kataklar)
    python manage.py sync_mosques --only-missing   # faqat hali yuklanmagan kataklar (uzilgan joydan davom)
    python manage.py sync_mosques --bbox 41,69,42,70

Deploy'dan keyin bir marta, so'ng haftasiga bir marta (cron) ishga tushirish tavsiya etiladi:
    0 4 * * 1 cd /path/to/backend && venv/bin/python manage.py sync_mosques
Overpass band bo'lsa katak qayta uriniladi; muvaffaqiyatsiz kataklar keyingi ishga tushirishda yuklanadi.
"""
import time

from django.core.management.base import BaseCommand, CommandError

from apps.mosques import services
from apps.mosques.models import Mosque, MosqueArea


class Command(BaseCommand):
    help = "Masjidlarni OpenStreetMap'dan bazaga yuklaydi"

    def add_arguments(self, parser):
        parser.add_argument('--bbox', help="janub,g'arb,shimol,sharq (sukut: O'zbekiston)")
        parser.add_argument('--only-missing', action='store_true', help='Faqat hali yuklanmagan kataklar')
        parser.add_argument('--pause', type=float, default=3, help="So'rovlar orasidagi pauza, soniya")
        parser.add_argument('--retries', type=int, default=3)

    def handle(self, *args, **options):
        if options['bbox']:
            try:
                south, west, north, east = (float(x) for x in options['bbox'].split(','))
            except ValueError:
                raise CommandError("--bbox formati: janub,g'arb,shimol,sharq")
        else:
            south, west, north, east = services.UZBEKISTAN_BBOX

        tiles = services.tiles_for(south, west, north, east)
        if options['only_missing']:
            done = set(MosqueArea.objects.values_list('south', 'west'))
            tiles = [t for t in tiles if (float(t[0]), float(t[1])) not in done]
        self.stdout.write(f'{len(tiles)} ta katak yuklanadi...')

        total, failed = 0, []
        for i, (s, w) in enumerate(tiles, 1):
            label = f'[{i}/{len(tiles)}] {s},{w}'
            for attempt in range(1, options['retries'] + 1):
                try:
                    count = services.sync_tile(s, w)
                except services.MosqueServiceError as exc:
                    self.stderr.write(self.style.WARNING(f'{label}: {exc} (urinish {attempt})'))
                    time.sleep(options['pause'] * attempt * 3)
                    continue
                total += count
                self.stdout.write(f'{label}: {count} ta masjid')
                break
            else:
                failed.append((s, w))
            time.sleep(options['pause'])

        self.stdout.write(self.style.SUCCESS(
            f'Yuklandi: {total} ta masjid; bazada jami {Mosque.objects.count()} ta. Xato kataklar: {len(failed)}'
        ))
        if failed:
            self.stdout.write('Qolganlarini yuklash: python manage.py sync_mosques --only-missing')
