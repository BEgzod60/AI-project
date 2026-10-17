"""«Birga o'qish» ketma-ketligi testlari."""
from django.test import TestCase

from apps.quran.models import Ayah, Surah

from . import birga
from .models import LessonStep, PrayerCategory, Recitation

PUB = 'published'


class SequenceTests(TestCase):
    def setUp(self):
        self.cat = PrayerCategory.objects.create(number=50, slug='test-peshin', name='Peshin', icon='peshin', review_status=PUB)
        rec = lambda slug, order, **kw: Recitation.objects.create(  # noqa: E731
            slug=slug, name=slug.title(), kind=kw.pop('kind', 'dua'), transliteration=f'{slug} matni', order=order, review_status=PUB, **kw)
        self.sano, self.auzu = rec('sano', 1), rec('auzu', 2)
        self.fotiha = rec('fotiha', 3, kind='sura', surah_number=1)
        self.qunut, self.tashahhud = rec('qunut', 4), rec('tashahhud', 5)
        self.ixlos = rec('ixlos', 6, kind='sura', surah_number=112, is_zam_sura=True)
        self.order = 0

    def step(self, title, recs=(), zam=False, status=PUB):
        self.order += 1
        s = LessonStep.objects.create(category=self.cat, order=self.order, title=title, text=f'{title} matni', zam_sura_choice=zam, review_status=status)
        s.recitations.set(recs)
        return s

    def four_rakat(self):
        self.step('Tayyorgarlik')
        self.step('Niyat')
        self.step('Takbiri tahrima')
        self.step('Qiyom va Sano', [self.sano])
        self.step('Qiroat', [self.auzu, self.fotiha], zam=True)
        self.step('Ruku’')
        self.step('Qavma (tik turish)')
        self.step('Sajda')
        self.step('Jalsa va ikkinchi sajda')
        self.step('Ikkinchi rakat', [self.fotiha], zam=True)
        self.step('Birinchi qa’da', [self.tashahhud])
        self.step('Uchinchi rakat', [self.fotiha])
        self.step('To‘rtinchi rakat', [self.fotiha])
        self.step('Qa’dai oxir va salom', [self.tashahhud])

    def sequence(self):
        return birga.build_sequence(birga._published(self.cat.steps.prefetch_related('recitations')))

    @staticmethod
    def labels(stages):
        return [s['recitation'] or ('zam' if s['zam'] else s['title']) for s in stages]

    def test_four_rakat_sequence_is_deterministic(self):
        self.four_rakat()
        stages, rakats = self.sequence()
        postures = ['Ruku’', 'Qavma (tik turish)', 'Sajda', 'Jalsa va ikkinchi sajda']
        self.assertEqual(rakats, 4)
        self.assertEqual(self.labels(stages), [
            'Niyat', 'Takbiri tahrima', 'sano', 'auzu', 'fotiha', 'Amiyn', 'zam', *postures,
            'fotiha', 'Amiyn', 'zam', *postures, 'tashahhud',
            'fotiha', 'Amiyn', *postures,
            'fotiha', 'Amiyn', *postures, 'tashahhud', 'O‘ngga salom', 'Chapga salom',
        ])
        self.assertEqual([s['index'] for s in stages], list(range(len(stages))))
        self.assertEqual(stages[0]['rakat'], 1)
        self.assertEqual({s['rakat'] for s in stages if s['title'] == 'Uchinchi rakat'}, {3})
        self.assertEqual(stages, self.sequence()[0])  # har safar bir xil

    def test_preparation_before_niyat_is_skipped(self):
        self.four_rakat()
        self.assertNotIn('Tayyorgarlik', self.labels(self.sequence()[0]))

    def test_vitr_zam_comes_before_qunut_and_postures_follow(self):
        self.step('Niyat')
        self.step('Qiroat', [self.auzu, self.fotiha], zam=True)
        self.step('Ruku’')
        self.step('Sajda')
        self.step('Ikkinchi rakat', [self.fotiha], zam=True)
        self.step('Uchinchi rakat va Qunut', [self.fotiha, self.qunut], zam=True)
        self.step('Ruku’, sajda, qa’da va salom', [self.tashahhud])
        stages, rakats = self.sequence()
        self.assertEqual(rakats, 3)
        self.assertEqual(self.labels(stages)[-9:], ['fotiha', 'Amiyn', 'zam', 'qunut', 'Ruku’', 'Sajda', 'tashahhud',
                                                  'O‘ngga salom', 'Chapga salom'])

    def test_timings(self):
        self.four_rakat()
        by_title = {s['title']: s['timing'] for s in self.sequence()[0] if s['kind'] == 'posture'}
        self.assertEqual(by_title['Ruku’'], (4, 6))
        self.assertEqual(by_title['Sajda'], (4, 6))
        self.assertEqual(by_title['Qavma (tik turish)'], (3, 5))
        self.assertEqual(by_title['Jalsa va ikkinchi sajda'], (7, 11))
        self.assertTrue(all(s['timing'] is None for s in self.sequence()[0] if s['kind'] == 'recitation'))

    def test_unrecognised_structure_is_not_supported(self):
        self.step('Juma namozi tarkibi')
        self.step('Xutba')
        self.assertEqual(self.sequence(), ([], 0))
        data = self.client.get('/api/namoz-organish/test-peshin/birga/').json()
        self.assertFalse(data['supported'])
        self.assertTrue(data['reason'])

    def test_unpublished_steps_are_excluded(self):
        self.four_rakat()
        self.step('Tekshirilmagan qadam', status='awaiting_review')
        self.assertNotIn('Tekshirilmagan qadam', self.labels(self.sequence()[0]))

    def test_api_payload_has_arabic_without_basmala_for_zam(self):
        self.four_rakat()
        surah = Surah.objects.create(number=112, name_uz='Ixlos', name_simple='Al-Ikhlas', name_arabic='الإخلاص', verses_count=1, revelation='makkiy')
        Ayah.objects.create(surah=surah, number=1, text_arabic='بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ قُلْ هُوَ ٱللَّهُ أَحَدٌ')
        data = self.client.get('/api/namoz-organish/test-peshin/birga/').json()
        self.assertTrue(data['supported'])
        self.assertEqual(data['rakats'], 4)
        self.assertEqual(data['zam_suras'], ['ixlos'])
        self.assertEqual(data['recitations']['ixlos']['arabic'], ['قُلْ هُوَ ٱللَّهُ أَحَدٌ'])
        self.assertIsNone(data['recitations']['sano']['arabic'])
        self.assertIn('defaults', data['settings'])
        self.assertIn('Hanafiy', data['safety_notice'])

    def test_zikr_extracted_from_source_text(self):
        z = birga.extract_zikr('«Allohu akbar» deya engashib ruku’ga boriladi, bunda eng kami uch marta '
                               '«Subhana robbiyal-’aziym» (Ulug‘ Robbim pokdir) , deyiladi.')
        self.assertEqual(z, [
            {'text': 'Allohu akbar', 'meaning': '', 'times': 1, 'label': ''},
            {'text': 'Subhana Robbiyal-’aziym', 'meaning': 'Ulug‘ Robbim pokdir', 'times': 3, 'label': ''},
        ])

    def test_action_shows_only_what_is_said(self):
        takbir = self.step('Takbiri tahrima')
        takbir.text = ('Qo‘llar ko‘tarilib, «Allohu akbar» deb takbir aytish bilan namoz boshlanadi. «Allohu akbar» aytishda '
                       '«Alloh» lafzining «alif»i «Aalloh» deb cho‘zilmaydi.')
        self.assertEqual([(z['label'], z['text']) for z in birga.action_zikr(takbir)], [('Takbir', 'Allohu akbar')])
        niyat = self.step('Niyat')
        niyat.text = '«To‘rt rakatli peshin namozining farzini xolis Alloh uchun o‘qishga niyat qildim» mazmunida niyat qilinadi.'
        self.assertEqual(birga.action_zikr(niyat)[0]['label'], 'Niyat mazmuni')
        niyat.text = 'Niyatda «...shu vaqt asr namozining farzini...» deyiladi.'
        self.assertEqual(birga.action_zikr(niyat), [])  # manbada to'liq emas — o'zimizdan to'ldirilmaydi
        salom = self.step('Salom')
        salom.text = 'O‘ng tarafga, keyin chap tarafga «Assalomu alaykum va rohmatulloh», deb salom beradi.'
        self.assertEqual(birga.action_zikr(salom)[0]['label'], 'Avval o‘ngga, so‘ng chapga')

    def test_jalsa_split_and_second_sajda_uses_sajda_tasbeh_not_ruku(self):
        self.step('Niyat')
        self.step('Qiroat', [self.fotiha], zam=True)
        ruku = self.step('Ruku’')
        qavma = self.step('Qavma (tik turish)')
        qavma.text = ('Belni tiklayotib «Sami’allohu liman hamidah» (Alloh O‘ziga hamd aytgan kishini eshitadi) , deyiladi. '
                      'To‘la tiklanib bo‘lgach «Robbanaa, lakal hamd» (Robbimiz, maqtov Sengadir) , deyiladi.')
        qavma.save()
        ruku.text = '«Allohu akbar» deya ruku’ga boriladi, eng kami uch marta «Subhana robbiyal-’aziym» (Ulug‘ Robbim pokdir) , deyiladi.'
        ruku.images = [{'src': '/ruku.webp', 'caption': 'Ruku’'}]
        ruku.save()
        sajda = self.step('Sajda')
        sajda.text = '«Allohu akbar» deb sajda qilinadi. Sajdada kamida uch marta «Subhana Robbiyal-a’lo» (Oliy Robbim pokdir) , deyiladi.'
        sajda.images = [{'src': '/sajda.webp', 'caption': 'Sajda'}]
        sajda.save()
        jalsa = self.step('Jalsa va ikkinchi sajda')
        jalsa.text = '«Allohu akbar» deb sajdadan bosh ko‘tariladi va o‘tiriladi. «Allohu akbar» deb ikkinchi marta sajda qilinadi.'
        jalsa.images = [{'src': '/otirish.webp', 'caption': 'O‘tirish'}, {'src': '/sajda.webp', 'caption': 'Sajda'}]
        jalsa.save()
        self.step('Ikkinchi rakat', [self.fotiha])
        stages = {s['title']: s for s in self.sequence()[0] if s['kind'] == 'posture'}
        self.assertIn('Jalsa', stages)
        self.assertNotIn('Jalsa va ikkinchi sajda', stages)
        second = stages['Ikkinchi sajda']
        said = lambda st: [(z['label'], z['text']) for z in st['zikr']]  # noqa: E731
        self.assertEqual(said(second), [('Borishda', 'Allohu akbar'), ('Sajdada', 'Subhana Robbiyal-a’lo'), ('Turishda', 'Allohu akbar')])
        self.assertEqual(said(stages['Ruku’']), [('Borishda', 'Allohu akbar'), ('Ruku’da', 'Subhana Robbiyal-’aziym'),
                                                ('Turishda', 'Sami’allohu liman hamidah')])
        self.assertEqual(said(stages['Qavma (tik turish)']), [('Tik turgach', 'Robbanaa, lakal hamd')])
        self.assertEqual(said(stages['Sajda']), [('Borishda', 'Allohu akbar'), ('Sajdada', 'Subhana Robbiyal-a’lo'), ('Turishda', 'Allohu akbar')])
        self.assertEqual(second['images'][0]['src'], '/sajda.webp')
        self.assertEqual(second['timing'], (4, 6))
        self.assertEqual(stages['Jalsa']['zikr'], [])  # turishdagi takbir sajdada ko'rsatiladi
        self.assertEqual(stages['Jalsa']['timing'], (3, 5))
        self.assertEqual(stages['Sajda']['zikr'][1], {'text': 'Subhana Robbiyal-a’lo', 'meaning': 'Oliy Robbim pokdir', 'times': 3, 'label': 'Sajdada'})

    def test_amiyn_after_every_fotiha(self):
        self.four_rakat()
        labels = self.labels(self.sequence()[0])
        self.assertEqual(labels.count('fotiha'), 4)
        self.assertTrue(all(labels[i + 1] == 'Amiyn' for i, x in enumerate(labels) if x == 'fotiha'))
        amiyn = next(s for s in self.sequence()[0] if s['title'] == 'Amiyn')
        self.assertEqual(amiyn['zikr'][0]['label'], 'Ohista')

    def test_salom_split_right_then_left(self):
        self.four_rakat()
        last = self.cat.steps.get(title='Qa’dai oxir va salom')
        last.images = [{'src': '/otirish.webp'}, {'src': '/salom-ong.webp'}, {'src': '/salom-chap.webp'}]
        last.save()
        stages = self.sequence()[0]
        right, left = stages[-2], stages[-1]
        self.assertEqual((right['title'], left['title']), ('O‘ngga salom', 'Chapga salom'))
        self.assertEqual(right['zikr'][0]['text'], 'Assalomu alaykum va rohmatulloh')
        self.assertEqual((right['images'][0]['src'], left['images'][0]['src']), ('/salom-ong.webp', '/salom-chap.webp'))
        self.assertEqual(stages[-3]['images'][0]['src'], '/otirish.webp')  # tashahhud o'tirib o'qiladi

    def test_after_farz_istigfor_dua_amiyn(self):
        self.four_rakat()
        self.cat.rakat_breakdown = [{'count': 4, 'kind': 'farz'}]
        self.cat.save()
        data = self.client.get('/api/namoz-organish/test-peshin/birga/').json()
        tail = data['stages'][-5:]
        self.assertEqual([s['recitation'] or s['title'] for s in tail],
                         ['O‘ngga salom', 'Chapga salom', 'istigfor', 'antas-salom', 'Amiyn'])
        self.assertEqual((tail[2]['zikr'][0]['text'], tail[2]['zikr'][0]['times']), ('Astag‘firulloh', 3))
        self.assertTrue(tail[3]['zikr'][0]['text'].startswith('Allohumma, antas-salom'))
        self.assertIn('muslim.uz', data['recitations']['istigfor']['source_url'])
        self.assertIn('muslim.uz', data['recitations']['antas-salom']['source_url'])
        self.assertEqual([s['index'] for s in data['stages']], list(range(len(data['stages']))))

    def test_vojib_has_no_after_farz(self):
        self.four_rakat()
        self.cat.rakat_breakdown = [{'count': 3, 'kind': 'vojib'}]
        self.cat.save()
        data = self.client.get('/api/namoz-organish/test-peshin/birga/').json()
        self.assertEqual(data['stages'][-1]['title'], 'Chapga salom')

    def _parts_category(self):
        self.four_rakat()
        niyat = self.cat.steps.get(title='Niyat')
        niyat.text = '«To‘rt rakatli peshin namozining farzini xolis Alloh uchun o‘qishga niyat qildim» mazmunida niyat qilinadi.'
        niyat.save()
        self.cat.rakat_breakdown = [{'count': 4, 'kind': 'sunnat'}, {'count': 4, 'kind': 'farz'}, {'count': 2, 'kind': 'sunnat'}]
        self.cat.save()

    def _part(self, qism=None):
        url = '/api/namoz-organish/test-peshin/birga/' + (f'?qism={qism}' if qism is not None else '')
        return self.client.get(url).json()

    def test_parts_listed_and_farz_is_default(self):
        self._parts_category()
        data = self._part()
        self.assertEqual([p['label'] for p in data['parts']], ['4 rakat sunnat', '4 rakat farz', '2 rakat sunnat'])
        self.assertEqual((data['part'], data['rakats']), (1, 4))
        self.assertIn('istigfor', data['recitations'])

    def test_four_rakat_sunnat_has_zam_in_every_rakat(self):
        self._parts_category()
        data = self._part(0)
        labels = [s['recitation'] or ('zam' if s['zam'] else s['title']) for s in data['stages'] if s['kind'] != 'posture']
        for rakat in (1, 2, 3, 4):
            rec = [s['recitation'] or ('zam' if s['zam'] else s['title']) for s in data['stages'] if s['rakat'] == rakat]
            self.assertIn('zam', rec, rakat)
        self.assertIn('tashahhud', labels[:labels.index('fotiha', labels.index('fotiha') + 1) + 5])  # o'rta qa'da bor
        self.assertEqual(labels[-2:], ['O‘ngga salom', 'Chapga salom'])  # farzdan keyingi duo yo'q
        self.assertIn('sunnatini', data['stages'][0]['zikr'][0]['text'])
        self.assertNotIn('farzini', data['stages'][0]['text'])
        self.assertEqual([s['index'] for s in data['stages']], list(range(len(data['stages']))))

    def test_two_rakat_sunnat_from_four_rakat_lesson(self):
        self._parts_category()
        data = self._part(2)
        self.assertEqual(data['rakats'], 2)
        self.assertEqual(max(s['rakat'] for s in data['stages']), 2)
        labels = [s['recitation'] or ('zam' if s['zam'] else s['title']) for s in data['stages'] if s['kind'] != 'posture']
        self.assertEqual(labels.count('fotiha'), 2)
        self.assertEqual(labels.count('tashahhud'), 1)  # o'rta qa'da yo'q, faqat oxirgisi
        self.assertEqual(labels[-3:], ['tashahhud', 'O‘ngga salom', 'Chapga salom'])
        self.assertEqual(data['stages'][0]['zikr'][0]['text'],
                         'Ikki rakatli peshin namozining sunnatini xolis Alloh uchun o‘qishga niyat qildim')

    def test_invalid_part_falls_back_to_farz(self):
        self._parts_category()
        self.assertEqual(self._part(9)['part'], 1)
        self.assertEqual(self.client.get('/api/namoz-organish/test-peshin/birga/?qism=abc').json()['part'], 1)

    def test_lesson_payload_flags_support(self):
        self.four_rakat()
        self.assertTrue(self.client.get('/api/namoz-organish/test-peshin/lesson/').json()['birga_supported'])

    def test_unpublished_category(self):
        self.cat.review_status = 'awaiting_review'
        self.cat.save()
        self.four_rakat()
        data = self.client.get('/api/namoz-organish/test-peshin/birga/').json()
        self.assertFalse(data['supported'])
        self.assertEqual(data['stages'], [])
