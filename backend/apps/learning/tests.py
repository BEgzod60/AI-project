import json
import re
from unittest import mock

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.test import TestCase

from . import quran_audio
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
            recitation=self.fotiha, provider='quran_foundation', qf_recitation_id=7, source_url='https://quran.com/1',
            license_status='api_terms', verification_status='approved', verified_by='T')
        self.pending_audio = AudioSource.objects.create(
            recitation=self.ixlos, provider='quran_foundation', qf_recitation_id=7, source_url='https://quran.com/112',
            license_status='api_terms', verification_status='pending')
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
        self.assertEqual(d['recitations']['fotiha']['audio']['modes'], ['full', 'verses'])
        self.assertIsNone(d['recitations']['ixlos']['audio'])
        r = self.client.get(f'/api/namoz-organish/audio/{self.pending_audio.pk}/')
        self.assertEqual(r.status_code, 404)
        self.assertEqual(r.json()['error']['message'], 'Audio hozircha mavjud emas')

    def test_unpublished_category_has_no_lesson(self):
        PrayerCategory.objects.filter(slug='bomdod').update(review_status='awaiting_review')
        d = self.lesson()
        self.assertEqual((d['steps'], d['recitations']), ([], {}))

    @mock.patch('apps.learning.quran_audio.requests.get')
    def test_audio_full_and_verses(self, get):
        def fake(url, **kw):
            resp = mock.Mock(raise_for_status=lambda: None)
            if 'chapter_recitations' in url:
                resp.json.return_value = {'audio_file': {'audio_url': 'https://download.quranicaudio.com/qdc/x/1.mp3'}}
            else:
                resp.json.return_value = {'audio_files': [{'verse_key': '1:2', 'url': 'Alafasy/mp3/001002.mp3'},
                                                          {'verse_key': '1:1', 'url': '//verses.quran.com/Alafasy/mp3/001001.mp3'}],
                                          'pagination': {'next_page': None}}
            return resp
        get.side_effect = fake
        full = self.client.get(f'/api/namoz-organish/audio/{self.audio.pk}/?mode=full').json()
        self.assertEqual(full['url'], 'https://download.quranicaudio.com/qdc/x/1.mp3')
        verses = self.client.get(f'/api/namoz-organish/audio/{self.audio.pk}/?mode=verses').json()['verses']
        self.assertEqual([v['verse'] for v in verses], [1, 2])
        self.assertTrue(all(v['url'].startswith('https://verses.quran.com/') for v in verses))

    @mock.patch('apps.learning.quran_audio.requests.get')
    def test_audio_upstream_error_and_unexpected_host(self, get):
        import requests as rq
        get.side_effect = rq.ConnectionError('down')
        r = self.client.get(f'/api/namoz-organish/audio/{self.audio.pk}/')
        self.assertEqual((r.status_code, r.json()['error']['message']), (502, 'Audio hozircha mavjud emas'))
        cache.clear()
        get.side_effect = None
        get.return_value = mock.Mock(raise_for_status=lambda: None,
                                     json=lambda: {'audio_file': {'audio_url': 'https://evil.example/a.mp3'}})
        self.assertEqual(self.client.get(f'/api/namoz-organish/audio/{self.audio.pk}/').status_code, 502)

    @mock.patch.dict('os.environ', {'QF_CLIENT_ID': 'cid', 'QF_CLIENT_SECRET': 'sec'})
    @mock.patch('apps.learning.quran_audio.requests.post')
    @mock.patch('apps.learning.quran_audio.requests.get')
    def test_credentials_use_oauth_and_stay_server_side(self, get, post):
        post.return_value = mock.Mock(raise_for_status=lambda: None, json=lambda: {'access_token': 'tok', 'expires_in': 3600})
        get.return_value = mock.Mock(raise_for_status=lambda: None,
                                     json=lambda: {'audio_file': {'audio_url': 'https://download.quranicaudio.com/q/1.mp3'}})
        body = self.client.get(f'/api/namoz-organish/audio/{self.audio.pk}/').content.decode()
        self.assertTrue(get.call_args.args[0].startswith(quran_audio.QF_BASE))
        self.assertEqual(get.call_args.kwargs['headers'], {'x-auth-token': 'tok', 'x-client-id': 'cid'})
        self.assertNotIn('sec', body)
        self.assertNotIn('tok', body)

    def test_no_arabic_script_in_payload(self):
        self.assertIsNone(ARABIC.search(json.dumps(self.lesson(), ensure_ascii=False)))

    def test_audio_validation_and_admin_approve(self):
        bad = AudioSource(recitation=self.draft, provider='quran_foundation', qf_recitation_id=7, source_url='https://x.uz')
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
            recitation=rec, provider='quran_foundation', qf_recitation_id=7, qf_surah=2, qf_verse=201,
            source_url='https://quran.com/2/201', license_status='api_terms', verification_status='approved',
            verified_by='T', display_note='Baqara surasi, 201-oyat')

    def test_valid_without_recitation_surah(self):
        self.audio.full_clean()  # sura raqami audio yozuvida ko'rsatilgan

    @mock.patch('apps.learning.quran_audio.requests.get')
    def test_single_ayah_url(self, get):
        get.return_value = mock.Mock(raise_for_status=lambda: None,
                                     json=lambda: {'audio_files': [{'verse_key': '2:201', 'url': 'Alafasy/mp3/002201.mp3'}]})
        data = self.client.get(f'/api/namoz-organish/audio/{self.audio.pk}/?mode=verses').json()
        self.assertEqual(data, {'mode': 'full', 'url': 'https://verses.quran.com/Alafasy/mp3/002201.mp3'})
        self.assertIn('/by_ayah/2:201', get.call_args.args[0])


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
