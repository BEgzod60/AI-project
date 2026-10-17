"""Tanzil manbasidan Qur’on matni, metadata va uz.sodik tarjimasini yuklash."""
from collections import defaultdict
from xml.etree import ElementTree

import requests
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.quran import sources
from apps.quran.models import Ayah, Surah

ARABIC_URL = 'https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&marks=true&sajdah=true&tatweel=true&agree=true'
TRANSLATION_URL = 'https://tanzil.net/trans/?transID=uz.sodik&type=txt-2'
METADATA_URL = 'https://tanzil.net/res/text/metadata/quran-data.xml'
HEADERS = {'User-Agent': 'Iymon/1.0 (Islamic education platform)'}


def parse_ayah_file(text):
    ayahs = defaultdict(dict)
    for line in text.splitlines():
        parts = line.split('|', 2)
        if len(parts) == 3 and parts[0].isdigit() and parts[1].isdigit():
            ayahs[int(parts[0])][int(parts[1])] = parts[2]
    return ayahs


class Command(BaseCommand):
    help = "Tanzil'dan Qur’on suralari va o‘zbekcha tarjimani bazaga yuklaydi"

    def _get(self, url):
        try:
            response = requests.get(url, headers=HEADERS, timeout=60)
            response.raise_for_status()
            response.encoding = 'utf-8'
            return response.text
        except requests.RequestException as exc:
            raise CommandError(f'Manba javob bermadi: {url}') from exc

    def handle(self, *args, **options):
        arabic = parse_ayah_file(self._get(ARABIC_URL))
        translation = parse_ayah_file(self._get(TRANSLATION_URL))
        metadata = ElementTree.fromstring(self._get(METADATA_URL)).find('suras')
        if metadata is None or sum(map(len, arabic.values())) != 6236 or sum(map(len, translation.values())) != 6236:
            raise CommandError('Tanzil fayllaridagi oyatlar soni 6236 ga teng emas.')

        with transaction.atomic():
            Surah.objects.all().delete()
            total = 0
            for item in metadata.findall('sura'):
                number = int(item.attrib['index'])
                count = int(item.attrib['ayas'])
                surah = Surah.objects.create(
                    number=number,
                    name_uz=sources.NAMES_UZ[number - 1],
                    name_simple=item.attrib['tname'],
                    name_arabic=item.attrib['name'],
                    verses_count=count,
                    revelation=Surah.Revelation.MAKKIY if item.attrib['type'] == 'Meccan' else Surah.Revelation.MADANIY,
                    revelation_order=int(item.attrib['order']),
                )
                Ayah.objects.bulk_create([
                    Ayah(surah=surah, number=ayah_number, text_arabic=arabic[number][ayah_number],
                         translation_uz=translation[number][ayah_number])
                    for ayah_number in range(1, count + 1)
                ])
                total += count
                self.stdout.write(f'{number:3}. {surah.name_uz}: {count} oyat')
        self.stdout.write(self.style.SUCCESS(f'Tanzil’dan yuklandi: 114 sura, {total} oyat'))
