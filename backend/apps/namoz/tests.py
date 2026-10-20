import io

from django.test import TestCase
from rest_framework.test import APIClient

from .models import Section, SourceReference, Topic


class NamozApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.topic = Topic.objects.get(slug='tahorat')  # 0002_seed_topics migratsiyasidan

    def _section(self, **kwargs):
        defaults = {'topic': self.topic, 'title': "Bo'lim", 'status': Section.Status.PUBLISHED, 'reviewed_by': 'Mutaxassis'}
        defaults.update(kwargs)
        return Section.objects.create(**defaults)

    def test_list_has_12_seeded_topics_in_order(self):
        data = self.client.get('/api/namoz/topics/').json()
        self.assertEqual([t['number'] for t in data], list(range(1, 13)))
        self.assertFalse(any(t['has_content'] for t in data))

    def test_section_without_source_is_hidden(self):
        self._section()
        data = self.client.get('/api/namoz/topics/tahorat/').json()
        self.assertEqual(data['sections'], [])
        self.assertEqual(data['awaiting_review'], 1)

    def test_section_without_reviewer_is_hidden(self):
        section = self._section(reviewed_by='')
        SourceReference.objects.create(section=section, title='Manba')
        self.assertEqual(self.client.get('/api/namoz/topics/tahorat/').json()['sections'], [])

    def test_unpublished_section_is_hidden(self):
        section = self._section(status=Section.Status.AWAITING_REVIEW)
        SourceReference.objects.create(section=section, title='Manba')
        self.assertEqual(self.client.get('/api/namoz/topics/tahorat/').json()['sections'], [])

    def test_published_sourced_section_is_shown_once(self):
        section = self._section()
        SourceReference.objects.create(section=section, title='Manba 1')
        SourceReference.objects.create(section=section, title='Manba 2')
        detail = self.client.get('/api/namoz/topics/tahorat/').json()
        self.assertEqual(len(detail['sections']), 1)
        self.assertEqual(len(detail['sections'][0]['sources']), 2)
        self.assertEqual(detail['awaiting_review'], 0)
        listed = {t['slug']: t['has_content'] for t in self.client.get('/api/namoz/topics/').json()}
        self.assertTrue(listed['tahorat'])

    def test_neighbours_and_hidden_topics(self):
        detail = self.client.get('/api/namoz/topics/tahorat/').json()
        self.assertEqual(detail['previous']['slug'], 'gusl')
        self.assertEqual(detail['next']['slug'], 'tayammum')
        Topic.objects.filter(slug='tayammum').update(is_visible=False)
        self.assertEqual(self.client.get('/api/namoz/topics/tahorat/').json()['next']['slug'], 'namoz')
        self.assertEqual(self.client.get('/api/namoz/topics/tayammum/').status_code, 404)

    def test_read_only(self):
        self.assertEqual(self.client.post('/api/namoz/topics/', {}).status_code, 405)


class NamozAdminTests(TestCase):
    def setUp(self):
        from django.contrib.auth.models import User

        self.client.force_login(User.objects.create_superuser('admin', 'a@example.com', 'x'))
        self.topic = Topic.objects.get(slug='tahorat')

    def _post_section(self, sources):
        data = {
            'topic': self.topic.pk, 'order': 0, 'title': "Bo'lim", 'kind': 'text', 'body': '',
            'status': 'published', 'reviewed_by': 'Mutaxassis', 'reviewed_at': '',
            'items-TOTAL_FORMS': 0, 'items-INITIAL_FORMS': 0,
            'sources-TOTAL_FORMS': len(sources), 'sources-INITIAL_FORMS': 0,
        }
        for i, title in enumerate(sources):
            data.update({f'sources-{i}-title': title, f'sources-{i}-author': '', f'sources-{i}-reference': '', f'sources-{i}-url': ''})
        return self.client.post('/admin/namoz/section/add/', data)

    def test_admin_pages_load(self):
        for url in ['/admin/namoz/topic/', f'/admin/namoz/topic/{self.topic.pk}/change/', '/admin/namoz/section/add/']:
            self.assertEqual(self.client.get(url).status_code, 200, url)

    def test_publishing_without_source_is_reverted(self):
        self.assertEqual(self._post_section([]).status_code, 302)
        self.assertEqual(Section.objects.get().status, Section.Status.AWAITING_REVIEW)

    def test_publishing_with_source_is_kept(self):
        self.assertEqual(self._post_section(['Manba']).status_code, 302)
        self.assertEqual(Section.objects.get().status, Section.Status.PUBLISHED)


class MuslimUzImportTests(TestCase):
    """apps/namoz/muslimuz.py va import_muslimuz buyrug'i (tarmoqsiz, kichik namunalar bilan)."""

    @staticmethod
    def _page(articles):
        out = ['<div class="cd-articles ">']
        for blocks in articles:
            out.append('<article>')
            for key, title, body in blocks:
                out.append(
                    f'<div class="in_block"><div class="row"><h2 id={key} class="title_block">{title}</h2>'
                    f'<div class="text_islom">{body}</div>\n</div>\n</div>'
                )
            out.append('</article>')
        return ''.join(out) + '</div>'

    def test_transform_keeps_text_and_structures_lists(self):
        from . import muslimuz as mu

        body = (
            '<p>Farzlari:</p><p>1. Birinchi.</p><p>2. Ikkinchi.</p><p>&nbsp;</p>'
            '<p>a) alif;</p><p>b) be.</p><p dir="rtl">بِسْمِ اللَّهِ</p>'
            '<p><strong>Ma&rsquo;nosi:</strong> izoh</p><p>Shuningdеk</p>'
        )
        fixed = mu.fix_homoglyphs(body)
        out = mu.transform(fixed)
        self.assertIn('<ol class="steps"><li value="1">Birinchi.</li><li value="2">Ikkinchi.</li></ol>', out)
        self.assertIn('<ul class="letters"><li>a) alif;</li><li>b) be.</li></ul>', out)
        self.assertIn('<p class="arabic" dir="rtl" lang="ar">', out)
        self.assertIn('<p class="meaning">', out)
        self.assertIn('Shuningdek', out)  # kirillcha «е» lotinga almashgan
        self.assertEqual(mu.transformed_plain_text(out), mu.source_plain_text(fixed))

    def test_transform_keeps_nbsp_prefixed_last_item_in_list(self):
        from . import muslimuz as mu

        body = '<p>1. Birinchi.</p><p>2. Ikkinchi.</p><p>&nbsp; 3. Uchinchi.</p>'
        out = mu.transform(body)
        self.assertEqual(out, '<ol class="steps"><li value="1">Birinchi.</li><li value="2">Ikkinchi.</li><li value="3">Uchinchi.</li></ol>')
        self.assertEqual(mu.transformed_plain_text(out), mu.source_plain_text(body))

    def test_transliteration(self):
        from .muslimuz import cyr_to_lat

        self.assertEqual(cyr_to_lat('Ғусл ва ўқиш, Ер, ЕР'), 'G‘usl va o‘qish, Yer, YER')

    def test_sanitizer(self):
        from .sanitize import clean_html

        out = clean_html(
            '<p class="arabic x" onclick="a">t</p><script>x</script>'
            '<iframe src="https://evil.example/"></iframe>'
            '<iframe src="https://w.soundcloud.com/player/?url=1"></iframe>'
        )
        self.assertEqual(out, '<p class="arabic">t</p><iframe src="https://w.soundcloud.com/player/?url=1"></iframe>')

    def test_command_imports_publishes_and_falls_back(self):
        import tempfile
        from pathlib import Path

        from django.core.management import call_command

        topics = list(Topic.objects.filter(category='namoz').order_by('number'))
        uz_articles = [[(f'block{t.number}', t.title.upper(), '<p>1. Bir.</p><p>2. Ikki.</p>')] for t in topics]
        oz_articles = [[(f'block{t.number}', 'X', '<p>1. Бир.</p><p>2. Икки.</p>')] for t in topics]
        # 2-mavzu: lotin matni juda qisqa -> kirilldan o'giriladi va tekshiruvda qoladi
        uz_articles[1][0] = ('block2', topics[1].title.upper(), '<p>Qisqa.</p>')
        oz_articles[1][0] = ('block2', 'X', '<p>Бу анча узун ва тўлиқ матн бўлиб, лотин нусхасида йўқ.</p>')

        with tempfile.TemporaryDirectory() as tmp:
            uz, oz = Path(tmp, 'uz.html'), Path(tmp, 'oz.html')
            uz.write_text(self._page(uz_articles), encoding='utf-8')
            oz.write_text(self._page(oz_articles), encoding='utf-8')
            call_command('import_muslimuz', uz_file=str(uz), oz_file=str(oz), stdout=open('/dev/null', 'w'))
            call_command('import_muslimuz', uz_file=str(uz), oz_file=str(oz), stdout=open('/dev/null', 'w'))

        self.assertEqual(Section.objects.count(), 12)  # qayta ishga tushirish dublikat yaratmaydi
        tahorat = self.client.get('/api/namoz/topics/tahorat/').json()
        self.assertIn('<ol class="steps">', tahorat['sections'][0]['content_html'])
        fallback = Section.objects.get(source_key='muslim.uz:block2')
        self.assertEqual(fallback.status, Section.Status.AWAITING_REVIEW)
        self.assertIn('lotin nusxasida', fallback.content_html)
        self.assertEqual(self.client.get('/api/namoz/topics/gusl/').json()['sections'], [])


class IymonApiTests(TestCase):
    def test_iymon_topics_are_separate_from_namoz(self):
        iymon = self.client.get('/api/iymon/topics/').json()
        namoz = self.client.get('/api/namoz/topics/').json()
        self.assertEqual([t['number'] for t in iymon], list(range(1, 14)))
        self.assertEqual(len(namoz), 12)
        self.assertFalse({t['slug'] for t in iymon} & {t['slug'] for t in namoz})

    def test_detail_and_neighbours_stay_in_category(self):
        detail = self.client.get('/api/iymon/topics/iymon-nima/').json()
        self.assertEqual(detail['previous']['slug'], 'din-va-shariat')
        self.assertEqual(detail['next']['slug'], 'alloh-taologa-iymon')
        # Namoz mavzusi iymon manzili orqali ochilmaydi
        self.assertEqual(self.client.get('/api/iymon/topics/tahorat/').status_code, 404)
        last = self.client.get('/api/iymon/topics/halol-va-harom/').json()
        self.assertIsNone(last['next'])


class StripArabicTests(TestCase):
    def test_strip_arabic_keeps_text_and_audio(self):
        from .muslimuz import strip_arabic

        body = (
            '<p dir="rtl">بِسْمِ اللَّهِ</p>'
            '<p dir="rtl">اللَّهُمَّ <iframe src="https://w.soundcloud.com/player/?url=1"></iframe></p>'
            '<p><strong>Bismillah</strong></p><p>Ma’nosi: izoh</p>'
        )
        out = strip_arabic(body)
        self.assertNotRegex(out, '[؀-ۿ]')
        self.assertIn('<iframe src="https://w.soundcloud.com/player/?url=1"></iframe>', out)
        self.assertIn('<p><strong>Bismillah</strong></p><p>Ma’nosi: izoh</p>', out)

    def test_import_drops_arabic_by_default(self):
        import tempfile
        from pathlib import Path

        from django.core.management import call_command

        topics = list(Topic.objects.filter(category='iymon').order_by('number'))
        page = MuslimUzImportTests._page(
            [[(f'block{t.number}', t.title.upper(), '<p dir="rtl">بِسْمِ اللَّهِ</p><p>Matn.</p>')] for t in topics]
        )
        with tempfile.TemporaryDirectory() as tmp:
            f = Path(tmp, 'p.html')
            f.write_text(page, encoding='utf-8')
            call_command('import_muslimuz', category='iymon', uz_file=str(f), oz_file=str(f), stdout=open('/dev/null', 'w'))
        html = self.client.get('/api/iymon/topics/aqida/').json()['sections'][0]['content_html']
        self.assertNotRegex(html, '[؀-ۿ]')
        self.assertIn('Matn.', html)

    def test_import_zakot_fixes_caps_ye_and_links_source(self):
        import tempfile
        from pathlib import Path

        from django.core.management import call_command

        topics = list(Topic.objects.filter(category='zakot').order_by('number'))
        self.assertEqual(len(topics), 10)
        # Manbadagi lotin sarlavhasi: «Е» -> «Ye» (BYeRUVChI)
        titles = {10: 'ZAKOT BYeRUVChINING VAZIFALARI'}
        page = MuslimUzImportTests._page(
            [[(f'block{98 + t.number}', titles.get(t.number, t.title.upper()), '<p>Matn.</p>')] for t in topics]
        )
        with tempfile.TemporaryDirectory() as tmp:
            f = Path(tmp, 'p.html')
            f.write_text(page, encoding='utf-8')
            call_command('import_muslimuz', category='zakot', uz_file=str(f), oz_file=str(f), stdout=open('/dev/null', 'w'))
        section = self.client.get('/api/zakot/topics/zakot-beruvchining-vazifalari/').json()['sections'][0]
        self.assertEqual(section['title'], 'Zakot beruvchining vazifalari')
        self.assertEqual(section['sources'][0]['url'], 'https://muslim.uz/uz/c/zakot#block108')

    def test_import_roza_links_fasting_page(self):
        import tempfile
        from pathlib import Path

        from django.core.management import call_command

        topics = list(Topic.objects.filter(category='roza').order_by('number'))
        self.assertEqual([t.slug for t in topics], ['roza-qanday-ibodat', 'rozaning-darajalari'])
        page = MuslimUzImportTests._page(
            [[(f'block{208 + t.number}', t.title.upper(), '<p>Matn.</p>')] for t in topics]
        )
        with tempfile.TemporaryDirectory() as tmp:
            f = Path(tmp, 'p.html')
            f.write_text(page, encoding='utf-8')
            call_command('import_muslimuz', category='roza', uz_file=str(f), oz_file=str(f), stdout=open('/dev/null', 'w'))
        section = self.client.get('/api/roza/topics/rozaning-darajalari/').json()['sections'][0]
        self.assertEqual(section['sources'][0]['url'], 'https://muslim.uz/uz/c/fasting#block210')


class SearchTests(TestCase):
    def setUp(self):
        from django.core.cache import cache

        cache.clear()
        topic = Topic.objects.get(category='namoz', slug='gusl')
        self.published = Section.objects.create(
            topic=topic, title='G‘uslning farzlari', content_html='<p>Og‘izni chayish va <strong>burunga</strong> suv olish.</p>',
            status=Section.Status.PUBLISHED, reviewed_by='Mutaxassis',
        )
        SourceReference.objects.create(section=self.published, title='Manba')
        hidden = Section.objects.create(
            topic=topic, title='Yashirin', content_html='<p>maxfiysoz matn</p>', status=Section.Status.AWAITING_REVIEW,
        )
        SourceReference.objects.create(section=hidden, title='Manba')

    def _search(self, q, **extra):
        return self.client.get('/api/search/', {'q': q, **extra}).json()

    def test_apostrophe_and_case_insensitive(self):
        for q in ["g'usl farzlari", 'G‘USL FARZLARI', 'gʻusl farzlari']:
            results = self._search(q)['results']
            self.assertTrue(any(r['section_id'] == self.published.id for r in results), q)

    def test_snippet_and_link_fields(self):
        r = next(r for r in self._search('burunga')['results'] if r['section_id'] == self.published.id)
        self.assertEqual((r['category'], r['slug']), ('namoz', 'gusl'))
        self.assertIn('burunga', r['snippet'])
        self.assertNotIn('<', r['snippet'])

    def test_unpublished_hidden_and_short_query_ignored(self):
        self.assertEqual(self._search('maxfiysoz')['results'], [])
        self.assertEqual(self._search('a')['results'], [])

    def test_topic_match_and_category_filter(self):
        results = self._search('qadarga')['results']
        self.assertEqual((results[0]['type'], results[0]['slug']), ('topic', 'qadarga-iymon'))
        self.assertTrue(all(r['category'] == 'namoz' for r in self._search('iymon', category='namoz')['results']))


class NamozXatolarTests(TestCase):
    """«Namozdagi xatolar» — muslim.uz bo'limlaridan, matn o'zgartirilmasdan."""

    def test_split_items_keeps_source_text(self):
        from apps.namoz.management.commands.build_namoz_xatolar import split_items
        intro, items = split_items(
            '<p>Namoz ichida harom bo‘lgan amallar quyidagilar:&nbsp;</p>'
            '<ol class="steps"><li value="1">Yuzni o‘ng va chap tarafga qaratish.&nbsp;</li><li value="2">Osmonga qarash.</li></ol>'
        )
        self.assertEqual(intro, 'Namoz ichida harom bo‘lgan amallar quyidagilar:')
        self.assertEqual(items, ['Yuzni o‘ng va chap tarafga qaratish.', 'Osmonga qarash.'])
        intro, items = split_items('<p>Quyidagilar makruh:</p><p>&ndash; eski ish kiyimi bilan namoz o‘qish;</p>')
        self.assertEqual(items, ['eski ish kiyimi bilan namoz o‘qish;'])

    def test_offline_build_from_imported_sections(self):
        from django.core.management import call_command
        source_topic = Topic.objects.create(category='namoz', number=90, slug='manba', title='Namoz', summary='x', icon='mosque', theme='sand')
        bodies = {
            'block150': '<ol class="steps"><li value="1">Namozda gapirish.</li><li value="2">Kishiga salom berish.</li></ol>',
            'block148': '<p>Harom amallar:</p><ol class="steps"><li value="1">Osmonga qarash.</li></ol>',
            'block151': '<p>Makruh amallar:</p><p>&ndash; eski ish kiyimi bilan namoz o‘qish;</p>',
            'block155': '<p>Sajdai sahv vojib bo‘ladi.</p>',
        }
        for n, (key, body) in enumerate(bodies.items()):
            Section.objects.create(topic=source_topic, order=n, title=key, content_html=body, source_key=f'muslim.uz:{key}', status='published')
        call_command('build_namoz_xatolar', '--offline', stdout=io.StringIO())
        topic = Topic.objects.get(category='namoz', slug='namozdagi-xatolar')
        sections = list(topic.sections.all())
        self.assertEqual([s.title for s in sections][:3], ['Namozni buzuvchi amallar', 'Namozdagi harom amallar', 'Namozdagi makruh amallar'])
        self.assertEqual([i.title for i in sections[0].items.all()], ['Namozda gapirish.', 'Kishiga salom berish.'])
        self.assertTrue(all(s.status == 'published' and s.sources.filter(url__startswith='https://muslim.uz/uz/c/prayer#block').exists() for s in sections))
        data = self.client.get('/api/namoz/topics/namozdagi-xatolar/').json()
        self.assertEqual(len(data['sections']), 4)
        call_command('build_namoz_xatolar', '--offline', stdout=io.StringIO())  # qayta ishga tushirish xavfsiz
        self.assertEqual(Topic.objects.filter(slug='namozdagi-xatolar').count(), 1)
        self.assertEqual(topic.sections.count(), 4)
