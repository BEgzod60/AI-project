import json
from pathlib import Path
import re
from unittest import mock

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.exceptions import ValidationError
import tempfile

from django.test import TestCase, override_settings

from apps.quran import audio_files
from apps.quran.models import Surah

from .models import AudioSource, LessonNote, LessonStep, PrayerCategory, Recitation, ReviewStatus


class PrayerCategoryApiTests(TestCase):
    def test_list_has_11_in_order(self):
        data = self.client.get('/api/namoz-organish/').json()
        self.assertEqual([c['number'] for c in data], list(range(1, 11)))
        self.assertNotIn('istigfor', [c['slug'] for c in data])
        self.assertEqual(data[0]['slug'], 'bomdod')

    def test_published_shows_sourced_rakats(self):
        bomdod = self.client.get('/api/namoz-organish/bomdod/').json()
        self.assertEqual(bomdod['review_status'], 'published')
        self.assertEqual(bomdod['rakats'], '2 rakat sunnat, 2 rakat farz')
        self.assertTrue(bomdod['source_url'].startswith('https://muslim.uz/'))
        self.assertNotIn('source_quote', bomdod)

    def test_unverified_hides_religious_details(self):
        PrayerCategory.objects.filter(slug='vitr').update(review_status='awaiting_review')
        vitr = self.client.get('/api/namoz-organish/vitr/').json()
        self.assertEqual(vitr['review_status'], 'awaiting_review')
        self.assertEqual((vitr['description'], vitr['rakats'], vitr['rakat_breakdown'], vitr['source_url']), ('', '', [], ''))

    def test_cannot_publish_without_source_and_reviewer(self):
        cat = PrayerCategory.objects.get(slug='tahajjud')
        cat.reviewed_by = ''
        with self.assertRaises(ValidationError):
            cat.full_clean()

    def test_breakdown_validation(self):
        cat = PrayerCategory.objects.get(slug='asr')
        cat.rakat_breakdown = [{'count': 4, 'kind': 'noma’lum'}]
        with self.assertRaises(ValidationError):
            cat.full_clean()

    def test_read_only_and_hidden(self):
        self.assertEqual(self.client.post('/api/namoz-organish/', {}).status_code, 405)
        PrayerCategory.objects.filter(slug='nafl').update(is_visible=False)
        self.assertEqual(self.client.get('/api/namoz-organish/nafl/').status_code, 404)

    def test_admin_pages_load(self):
        self.client.force_login(User.objects.create_superuser('admin', 'a@example.com', 'x'))
        cat = PrayerCategory.objects.get(slug='bomdod')
        for url in ['/admin/learning/prayercategory/', f'/admin/learning/prayercategory/{cat.pk}/change/']:
            self.assertEqual(self.client.get(url).status_code, 200, url)


ARABIC = re.compile('[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]')


class LessonApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.bomdod = PrayerCategory.objects.get(slug='bomdod')
        pub = dict(review_status=ReviewStatus.PUBLISHED, reviewed_by='T', source_url='https://muslim.uz/uz/c/prayer')
        self.fotiha = Recitation.objects.create(slug='fotiha', name='Fotiha', kind='sura', surah_number=1,
                                                transliteration='Alhamdulillahi', meaning='Hamd', **pub)
        self.ixlos = Recitation.objects.create(slug='ixlos', name='Ixlos', kind='sura', surah_number=112,
                                               transliteration='Qul huvallohu ahad', is_zam_sura=True, **pub)
        self.draft = Recitation.objects.create(slug='qoralama', name='Qoralama', kind='dua', transliteration='x')
        self.audio = AudioSource.objects.create(
            recitation=self.fotiha, provider='tanzil', tanzil_reciter='afasy', source_url='https://tanzil.net/#1:1',
            license_status='project_decision', verification_status='approved', verified_by='T')
        self.pending_audio = AudioSource.objects.create(
            recitation=self.ixlos, provider='tanzil', tanzil_reciter='afasy', source_url='https://tanzil.net/#112:1',
            license_status='project_decision', verification_status='pending')
        step = LessonStep.objects.create(category=self.bomdod, order=1, title='Qiroat', text='Fotiha o‘qiladi.',
                                         text_female='Ayollar ...', zam_sura_choice=True, **pub)
        step.recitations.set([self.fotiha, self.draft])
        LessonStep.objects.create(category=self.bomdod, order=2, title='Yashirin', text='x')
        LessonNote.objects.create(category=self.bomdod, tab='vaqti', title='Vaqti', text='Tong', **pub)

    def lesson(self, slug='bomdod'):
        return self.client.get(f'/api/namoz-organish/{slug}/lesson/').json()

    def test_only_published_content(self):
        d = self.lesson()
        self.assertEqual([s['title'] for s in d['steps']], ['Qiroat'])
        self.assertEqual(d['steps'][0]['recitations'], ['fotiha'])  # qoralama duo chiqmaydi
        self.assertEqual(d['zam_suras'], ['ixlos'])
        self.assertEqual(d['notes']['vaqti'][0]['title'], 'Vaqti')
        self.assertNotIn('qoralama', d['recitations'])

    def test_audio_only_when_approved(self):
        d = self.lesson()
        self.assertEqual(d['recitations']['fotiha']['audio']['modes'], ['verses'])
        self.assertEqual(d['recitations']['fotiha']['audio']['provider'], 'tanzil')
        self.assertIsNone(d['recitations']['ixlos']['audio'])
        r = self.client.get(f'/api/namoz-organish/audio/{self.pending_audio.pk}/')
        self.assertEqual(r.status_code, 404)
        self.assertEqual(r.json()['error']['message'], 'Audio hozircha mavjud emas')

    def test_unpublished_category_has_no_lesson(self):
        PrayerCategory.objects.filter(slug='bomdod').update(review_status='awaiting_review')
        d = self.lesson()
        self.assertEqual((d['steps'], d['recitations']), ([], {}))

    def _surah(self, number=1, verses=7):
        Surah.objects.create(number=number, name_uz='Fotiha', name_simple='Al-Fatiha', name_arabic='الفاتحة',
                             verses_count=verses, revelation='makkiy')

    def test_tanzil_verses_remote_when_not_compressed(self):
        self._surah()
        with tempfile.TemporaryDirectory() as tmp, override_settings(MEDIA_ROOT=Path(tmp)):
            data = self.client.get(f'/api/namoz-organish/audio/{self.audio.pk}/?mode=full').json()
        self.assertEqual(data['mode'], 'verses')  # Tanzil'da butun sura fayli yo'q
        self.assertEqual([v['verse'] for v in data['verses']], list(range(1, 8)))
        self.assertEqual(data['verses'][0]['url'], 'https://tanzil.net/res/audio/afasy/001001.mp3')
        self.assertFalse(any('quran.com' in v['url'] for v in data['verses']))

    def test_tanzil_verses_local_when_compressed(self):
        self._surah()
        with tempfile.TemporaryDirectory() as tmp, override_settings(MEDIA_ROOT=Path(tmp)):
            audio_files.reciter_dir('afasy').mkdir(parents=True)
            (audio_files.reciter_dir('afasy') / audio_files.COMPLETE_MARKER).write_text('6236')
            data = self.client.get(f'/api/namoz-organish/audio/{self.audio.pk}/').json()
        self.assertEqual(data['verses'][6]['url'], '/media/quran/afasy/001007.webm')

    def test_tanzil_without_imported_surahs_is_unavailable(self):
        r = self.client.get(f'/api/namoz-organish/audio/{self.audio.pk}/')
        self.assertEqual((r.status_code, r.json()['error']['message']), (502, 'Audio hozircha mavjud emas'))

    def test_no_arabic_script_in_payload(self):
        self.assertIsNone(ARABIC.search(json.dumps(self.lesson(), ensure_ascii=False)))

    def test_audio_validation_and_admin_approve(self):
        bad = AudioSource(recitation=self.draft, provider='tanzil', tanzil_reciter='afasy', source_url='https://x.uz')
        with self.assertRaises(ValidationError):
            bad.full_clean()  # sura raqami yo'q
        self.client.force_login(User.objects.create_superuser('admin2', 'b@example.com', 'x'))
        unknown = AudioSource.objects.create(recitation=self.ixlos, provider='other', audio_url='https://x.uz/a.mp3',
                                             source_url='https://x.uz', license_status='unknown')
        url = '/admin/learning/audiosource/'
        self.client.post(url, {'action': 'approve', '_selected_action': [unknown.pk]})
        unknown.refresh_from_db()
        self.assertEqual(unknown.verification_status, 'pending')  # ruxsati aniqlanmagan — tasdiqlanmaydi
        # Mavjudligi tekshirilmagan audio tasdiqlanmaydi
        self.client.post(url, {'action': 'approve', '_selected_action': [self.pending_audio.pk]})
        self.pending_audio.refresh_from_db()
        self.assertEqual(self.pending_audio.verification_status, 'pending')
        AudioSource.objects.filter(pk=self.pending_audio.pk).update(last_http_status=200)
        self.client.post(url, {'action': 'approve', '_selected_action': [self.pending_audio.pk]})
        self.pending_audio.refresh_from_db()
        self.assertEqual((self.pending_audio.verification_status, self.pending_audio.verified_by), ('approved', 'admin2'))
        for page in ['/admin/learning/recitation/', '/admin/learning/lessonstep/', '/admin/learning/lessonnote/', url]:
            self.assertEqual(self.client.get(page).status_code, 200, page)


class AudioCheckTests(TestCase):
    def setUp(self):
        cache.clear()
        rec = Recitation.objects.create(slug='robbana', name='Robbana', kind='dua', transliteration='Robbana atina')
        self.audio = AudioSource.objects.create(
            recitation=rec, provider='muslim_uz', audio_url='https://muslim.uz/uz/e/post/audios/23.mp3',
            source_url='https://muslim.uz/uz/e/post/23574', license_status='permitted')

    @mock.patch('apps.learning.audio_check.requests.head')
    def test_check_records_status(self, head):
        from .audio_check import check, is_reachable

        head.return_value = mock.Mock(status_code=404)
        self.assertEqual(check(self.audio), 404)
        self.audio.refresh_from_db()
        self.assertEqual(self.audio.last_http_status, 404)
        self.assertIsNotNone(self.audio.last_checked_at)
        self.assertFalse(is_reachable(self.audio))

    @mock.patch('apps.learning.audio_check.requests.get')
    @mock.patch('apps.learning.audio_check.requests.head')
    def test_head_not_allowed_falls_back_to_range_get(self, head, get):
        from .audio_check import http_status

        head.return_value = mock.Mock(status_code=405)
        get.return_value = mock.Mock(status_code=206)
        self.assertEqual(http_status('https://x.uz/a.mp3'), 206)
        self.assertEqual(get.call_args.kwargs['headers']['Range'], 'bytes=0-0')

    @mock.patch('apps.learning.audio_check.requests.head')
    def test_admin_check_action(self, head):
        import requests as rq

        head.side_effect = rq.ConnectionError('down')
        self.client.force_login(User.objects.create_superuser('admin3', 'c@example.com', 'x'))
        self.client.post('/admin/learning/audiosource/', {'action': 'check_availability', '_selected_action': [self.audio.pk]})
        self.audio.refresh_from_db()
        self.assertEqual(self.audio.last_http_status, 0)
        self.assertEqual(self.client.get(f'/admin/learning/audiosource/{self.audio.pk}/change/').status_code, 200)

    def test_unapproved_dua_audio_is_not_exposed(self):
        self.assertFalse(self.audio.is_playable)
        self.assertEqual(self.client.get(f'/api/namoz-organish/audio/{self.audio.pk}/').status_code, 404)


class AyahAudioTests(TestCase):
    def setUp(self):
        cache.clear()
        rec = Recitation.objects.create(slug='robbana', name='Robbana', kind='dua', transliteration='Robbana atina',
                                        review_status=ReviewStatus.PUBLISHED, reviewed_by='T',
                                        source_url='https://muslim.uz/uz/e/post/23574')
        self.audio = AudioSource.objects.create(
            recitation=rec, provider='tanzil', tanzil_reciter='afasy', qf_surah=2, qf_verse=201,
            source_url='https://tanzil.net/#2:201', license_status='project_decision', verification_status='approved',
            verified_by='T', display_note='Baqara surasi, 201-oyat')

    def test_valid_without_recitation_surah(self):
        self.audio.full_clean()  # sura raqami audio yozuvida ko'rsatilgan

    def test_single_ayah_url(self):
        with tempfile.TemporaryDirectory() as tmp, override_settings(MEDIA_ROOT=Path(tmp)):
            data = self.client.get(f'/api/namoz-organish/audio/{self.audio.pk}/?mode=verses').json()
        self.assertEqual(data, {'mode': 'full', 'url': 'https://tanzil.net/res/audio/afasy/002201.mp3'})


class AudioReferenceTests(TestCase):
    def test_unavailable_audio_keeps_official_article_link(self):
        bomdod = PrayerCategory.objects.get(slug='bomdod')
        rec = Recitation.objects.create(slug='tashahhud', name='Tashahhud', kind='dua', transliteration='Attahiyyatu',
                                        review_status=ReviewStatus.PUBLISHED, reviewed_by='T',
                                        source_url='https://muslim.uz/uz/c/prayer')
        post = 'https://muslim.uz/uz/e/post/23574-namoz-saboqlari-tashahhud-salavot-duo-audio'
        AudioSource.objects.create(recitation=rec, provider='muslim_uz', source_url=post,
                                   audio_url='https://muslim.uz/uz/e/post/audios/21.%20Tashahhud.mp3',
                                   license_status='permitted', verification_status='rejected', last_http_status=404,
                                   display_note='Rasmiy maqola')
        step = LessonStep.objects.create(category=bomdod, order=1, title='Qa\u2019da', text='...',
                                         review_status=ReviewStatus.PUBLISHED, reviewed_by='T', source_url=post)
        step.recitations.set([rec])
        r = self.client.get('/api/namoz-organish/bomdod/lesson/').json()['recitations']['tashahhud']
        self.assertIsNone(r['audio'])
        self.assertEqual(r['audio_reference'], {'url': post, 'title': 'Rasmiy maqola'})


class StepImageFilesTests(TestCase):
    """Qadam rasmlari frontend/public ichida bo'lishi shart — aks holda deploy'da sahifada bo'sh joy chiqadi."""

    PUBLIC = Path(__file__).resolve().parents[3] / 'frontend' / 'public'

    def test_all_step_image_files_exist(self):
        from .step_images import FEMALE, IMAGES, _image

        missing = []
        for key in IMAGES:
            image = _image(key)
            for src in (image['src'], image.get('src_female')):
                if src and not (self.PUBLIC / src.lstrip('/')).is_file():
                    missing.append(src)
        self.assertEqual(missing, [], f"Rasm fayllari topilmadi: {missing}")
        self.assertTrue(FEMALE <= set(IMAGES))

    def test_six_prayers_and_hayit_have_images(self):
        from .step_images import images_for

        self.assertEqual([i['caption'] for i in images_for('Salom', 'bomdod')], ['O‘ng tomonga salom', 'Chap tomonga salom'])
        self.assertTrue(images_for('Uch zoid takbir', 'hayit'))
        self.assertEqual(images_for('Xutba', 'hayit'), [])
        self.assertEqual(images_for('Rakatlari', 'tahajjud'), [])
        # Juma — faqat erkaklar rasmlari
        juma = images_for('Salom', 'juma')
        self.assertEqual(len(juma), 2)
        self.assertFalse(any('src_female' in i for i in juma))
