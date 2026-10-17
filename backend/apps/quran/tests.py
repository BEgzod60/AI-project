import tempfile
from pathlib import Path

from django.test import TestCase, override_settings

from apps.learning.models import Recitation

from . import audio_files
from .models import Ayah, Surah, SurahAudio
from .sources import NAMES_UZ, clean_translation


class TranslationCleanTests(TestCase):
    def test_footnotes_and_letters(self):
        self.assertEqual(clean_translation('Bu kitobda shak-shubha yo`q.<sup foot_note="1">1</sup>'), 'Bu kitobda shak-shubha yo‘q.')
        self.assertEqual(clean_translation('g`ayb va a`lo'), 'g‘ayb va a’lo')
        self.assertEqual(len(NAMES_UZ), 114)


class QuranApiTests(TestCase):
    def setUp(self):
        self.fotiha = Surah.objects.create(number=1, name_uz='Fotiha', name_simple='Al-Fatihah', name_arabic='الفاتحة', verses_count=1, revelation='makkiy', revelation_order=5)
        Ayah.objects.create(surah=self.fotiha, number=1, text_arabic='بِسْمِ', translation_uz='Mehribon...')
        self.ixlos = Surah.objects.create(number=112, name_uz='Ixlos', name_simple='Al-Ikhlas', name_arabic='الإخلاص', verses_count=4, revelation='makkiy')
        Recitation.objects.create(slug='ixlos-t', name='Ixlos surasi', kind=Recitation.Kind.SURA, surah_number=112, transliteration='1. Qul huvallohu ahad', is_zam_sura=True, review_status='published', source_title='muslim.uz', source_url='https://muslim.uz/x')

    def test_list(self):
        data = self.client.get('/api/quran/surahs/').json()
        by_n = {s['number']: s for s in data['surahs']}
        self.assertTrue(by_n[1]['in_prayer'])
        self.assertTrue(by_n[112]['is_zam'] and by_n[112]['in_prayer'] and by_n[112]['has_transliteration'])
        self.assertFalse(by_n[1]['has_audio'])
        self.assertIn('Muhammad Sodiq', data['sources']['translation'])

    def test_detail_and_404(self):
        detail = self.client.get('/api/quran/surahs/1/').json()
        self.assertEqual(detail['ayahs'], [{'number': 1, 'arabic': 'بِسْمِ', 'meaning': 'Mehribon...'}])
        self.assertIsNone(detail['audio'])
        self.assertEqual(detail['ayah_audio']['reciters'][0]['id'], 'afasy')
        self.assertIn('{reciter}', detail['ayah_audio']['url_template'])
        self.assertEqual(self.client.get('/api/quran/surahs/115/').status_code, 404)

    def test_audio_only_when_permitted_and_active(self):
        audio = SurahAudio.objects.create(surah=self.fotiha, audio_url='https://muslim.uz/a.mp3', reciter='Qori', source_title='muslim.uz', source_url='https://muslim.uz/', license_status='unknown', is_active=True)
        self.assertIsNone(self.client.get('/api/quran/surahs/1/').json()['audio'])
        audio.license_status = 'permitted'
        audio.save()
        self.assertEqual(self.client.get('/api/quran/surahs/1/').json()['audio']['reciter'], 'Qori')
        audio.is_active = False
        audio.save()
        self.assertIsNone(self.client.get('/api/quran/surahs/1/').json()['audio'])


class LocalAudioTests(TestCase):
    def test_reciter_local_only_after_complete_marker(self):
        with tempfile.TemporaryDirectory() as tmp, override_settings(MEDIA_ROOT=Path(tmp)):
            self.assertFalse(audio_files.is_local('afasy'))
            audio_files.reciter_dir('afasy').mkdir(parents=True)
            (audio_files.reciter_dir('afasy') / audio_files.COMPLETE_MARKER).write_text('6236')
            self.assertTrue(audio_files.is_local('afasy'))
            self.assertEqual(audio_files.url_template(), '/media/quran/{reciter}/{file}.webm')
            self.assertEqual(audio_files.file_name(2, 255), '002255')
