"""masjid.uz (Islom.uz) katalogidan masjidlar haqida faktlarni import qilish.

    python manage.py import_masjid_uz                       # Toshkent shahri
    python manage.py import_masjid_uz --region /toshkent-v/toshkent-sh --bbox 41.15,69.05,41.48,69.55
    python manage.py import_masjid_uz --match-only          # faqat OSM bilan qayta moslashtirish

Olinadi: nom, imom-xatib, manzil, telefon (lotinga o'girilib). Tarix matni va rasmlar olinmaydi.
Katalogdagi masjidlar soni MosqueCount'ga manbasi va sanasi bilan yoziladi.
Imom-xatiblar vaqti-vaqti bilan almashadi — buyruqni davriy ishga tushirish tavsiya etiladi.
"""
import time
from datetime import date

import requests
from django.core.management.base import BaseCommand, CommandError

from apps.mosques import directory
from apps.mosques.models import DirectoryEntry, Mosque, MosqueCount

REGIONS = {
    '/toshkent-v/toshkent-sh': {
        'scope': 'toshkent-sh', 'label': 'Toshkent shahri', 'bbox': (41.15, 69.05, 41.48, 69.55), 'city_code': '71',
    },
}


class Command(BaseCommand):
    help = "masjid.uz katalogidan imom-xatib, manzil va telefonlarni import qiladi"

    def add_arguments(self, parser):
        parser.add_argument('--region', default='/toshkent-v/toshkent-sh')
        parser.add_argument('--pause', type=float, default=1.5, help="So'rovlar orasidagi pauza, soniya")
        parser.add_argument('--match-only', action='store_true')

    def handle(self, *args, **options):
        region_path = options['region'].rstrip('/')
        region = REGIONS.get(region_path)
        if not region:
            raise CommandError(f"Noma'lum hudud. Mavjud: {', '.join(REGIONS)}")

        if not options['match_only']:
            self._crawl(region_path, region, options['pause'])
        self._match(region)

    def _crawl(self, region_path, region, pause):
        sess = directory.session()
        try:
            districts = directory.district_paths(sess, region_path)
        except requests.RequestException as exc:
            raise CommandError(f'masjid.uz ochilmadi: {exc}')

        seen, failed = [], 0
        for district_path in districts:
            district = directory.to_latin(district_path.rsplit('/', 1)[1].replace('-tumani', '')).replace('-', ' ').title()
            time.sleep(pause)
            try:
                paths = directory.mosque_paths(sess, district_path)
            except requests.RequestException as exc:
                self.stderr.write(self.style.WARNING(f'{district}: {exc}'))
                failed += 1
                continue
            for path in paths:
                time.sleep(pause)
                url = f'{directory.BASE}{path}'
                try:
                    facts = directory.parse_mosque_page(directory._get(sess, path))
                except requests.RequestException as exc:
                    self.stderr.write(self.style.WARNING(f'{path}: {exc}'))
                    failed += 1
                    continue
                if not facts['name']:
                    continue
                # Manzil ichida qolgan "tel: ..." har doim olib tashlanadi
                address, extra = directory.split_phone(facts['address'])
                phone = facts['phone'] or extra
                DirectoryEntry.objects.update_or_create(source_url=url, defaults={
                    'region': region['scope'],
                    'district': f'{district} tumani',
                    'name': directory.to_latin(facts['name'])[:255],
                    'imam': directory.to_latin(facts['imam'])[:255],
                    'address': directory.to_latin(address)[:500],
                    'phone': directory.normalize_phone(phone, region['city_code'])[:80] if phone else '',
                })
                seen.append(url)
            self.stdout.write(f'{district} tumani: {len(paths)} ta masjid')

        if failed == 0:
            # Katalogdan olib tashlangan yozuvlar ham o'chiriladi (faqat to'liq muvaffaqiyatli o'qishda)
            DirectoryEntry.objects.filter(region=region['scope']).exclude(source_url__in=seen).delete()
            MosqueCount.objects.update_or_create(scope=region['scope'], defaults={
                'label': region['label'],
                'count': len(seen),
                'source_title': 'masjid.uz (Islom.uz) masjidlar katalogi',
                'source_url': f'{directory.BASE}{region_path}.html',
                'as_of': date.today(),
            })
        self.stdout.write(self.style.SUCCESS(f"Katalogdan o'qildi: {len(seen)} ta masjid, xato: {failed}"))

    def _match(self, region):
        s, w, n, e = region['bbox']
        mosques = list(Mosque.objects.filter(lat__gte=s, lat__lte=n, lon__gte=w, lon__lte=e).values_list('osm_id', 'name'))
        entries = list(DirectoryEntry.objects.filter(region=region['scope']))
        found = directory.match([(x.pk, x.name) for x in entries], mosques)
        by_osm = dict(Mosque.objects.filter(osm_id__in=found.values()).values_list('osm_id', 'pk'))
        for entry in entries:
            osm_id = found.get(entry.pk)
            entry.mosque_id = by_osm.get(osm_id) if osm_id else None
            entry.save(update_fields=['mosque'])
        self.stdout.write(self.style.SUCCESS(
            f"Xaritadagi masjidga moslashtirildi: {len(found)} / {len(entries)} (xaritada {len(mosques)} ta masjid)"
        ))
