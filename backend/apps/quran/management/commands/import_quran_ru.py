"""Qur'on ma'nolarining ruscha tarjimasi (Elmir Kuliyev, Tanzil `ru.kuliev`) — mavjud oyatlarga yoziladi.

    python manage.py import_quran_ru
"""
import requests
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.quran.management.commands.import_quran import HEADERS, parse_ayah_file
from apps.quran.models import Ayah

URL = 'https://tanzil.net/trans/?transID=ru.kuliev&type=txt-2'


class Command(BaseCommand):
    help = "Tanzil'dan Qur'on ma'nolarining ruscha tarjimasini (Kuliyev) yuklaydi"

    def handle(self, *args, **options):
        try:
            resp = requests.get(URL, headers=HEADERS, timeout=60)
            resp.raise_for_status()
            resp.encoding = 'utf-8'
        except requests.RequestException as exc:
            raise CommandError(f'Tanzil javob bermadi: {exc}') from exc
        data = parse_ayah_file(resp.text)
        if sum(map(len, data.values())) != 6236:
            raise CommandError('Tarjimadagi oyatlar soni 6236 ga teng emas.')
        ayahs = list(Ayah.objects.select_related('surah'))
        if len(ayahs) != 6236:
            raise CommandError('Avval suralarni yuklang: python manage.py import_quran')
        for ayah in ayahs:
            ayah.translation_ru = data[ayah.surah.number][ayah.number].strip()
        with transaction.atomic():
            Ayah.objects.bulk_update(ayahs, ['translation_ru'], batch_size=500)
        self.stdout.write(self.style.SUCCESS('Ruscha tarjima (Kuliyev) yuklandi: 6236 oyat'))
