from unittest import mock

import requests
from django.core.cache import cache
from django.test import TestCase

from . import services

OVERPASS = {
    'elements': [
        {'type': 'node', 'id': 1, 'lat': 41.3115, 'lon': 69.2795,
         'tags': {'amenity': 'place_of_worship', 'religion': 'muslim', 'name': 'Uzoqroq masjid',
                  'addr:street': 'Navoiy ko‘chasi', 'addr:housenumber': '5'}},
        {'type': 'way', 'id': 2, 'center': {'lat': 41.3112, 'lon': 69.2792},
         'tags': {'amenity': 'place_of_worship', 'religion': 'muslim'}},
        # radiusdan tashqarida — chiqmasligi kerak
        {'type': 'node', 'id': 3, 'lat': 41.5, 'lon': 69.5, 'tags': {'name': 'Juda uzoq'}},
    ]
}


def _response(status=200, payload=None):
    r = mock.Mock(status_code=status)
    r.json.return_value = payload if payload is not None else OVERPASS
    return r


class NearbyMosquesApiTests(TestCase):
    url = '/api/qibla/mosques/'

    def setUp(self):
        cache.clear()

    @mock.patch('apps.mosques.services.requests.post')
    def test_returns_real_osm_data_sorted_by_distance(self, post):
        post.return_value = _response()
        res = self.client.get(self.url, {'lat': '41.31111', 'lon': '69.27911', 'radius': '1000'})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['count'], 2)
        self.assertEqual([m['id'] for m in data['mosques']], ['way/2', 'node/1'])
        # Nomi yo'q masjidga nom o'ylab topilmaydi
        self.assertEqual(data['mosques'][0]['name'], '')
        self.assertEqual(data['mosques'][1]['address'], 'Navoiy ko‘chasi 5')
        # Overpass'ga foydalanuvchi nuqtasi emas, ~1 km lik katak markazi yuboriladi
        query = post.call_args.kwargs['data']['data']
        self.assertIn('around:1800,41.31,69.28', query)

    @mock.patch('apps.mosques.services.requests.post')
    def test_same_area_uses_one_overpass_request(self, post):
        post.return_value = _response()
        a = self.client.get(self.url, {'lat': '41.3111', 'lon': '69.2791', 'radius': '1000'}).json()
        b = self.client.get(self.url, {'lat': '41.3089', 'lon': '69.2812', 'radius': '1000'}).json()
        self.assertEqual(post.call_count, 1)
        # Masofa har kim uchun o'z nuqtasidan hisoblanadi
        self.assertNotEqual(a['mosques'][0]['distance_m'], b['mosques'][0]['distance_m'])

    def test_user_agent_is_ascii(self):
        # HTTP sarlavhalari latin-1 bo'lishi shart — o'zbekcha ’ belgisi so'rovni buzadi
        services.USER_AGENT.encode('ascii')

    @mock.patch('apps.mosques.services.requests.post')
    def test_validation(self, post):
        self.assertEqual(self.client.get(self.url, {'lat': 'x', 'lon': '1'}).status_code, 400)
        self.assertEqual(self.client.get(self.url, {'lat': '95', 'lon': '1'}).status_code, 400)
        self.assertEqual(self.client.get(self.url, {'lat': '41', 'lon': '69', 'radius': '2000'}).status_code, 400)
        post.assert_not_called()

    @mock.patch('apps.mosques.services.requests.post')
    def test_rate_limit_falls_back_then_caches_failure(self, post):
        post.return_value = _response(429)
        res = self.client.get(self.url, {'lat': '41.3', 'lon': '69.2'})
        self.assertEqual(res.status_code, 503)
        self.assertEqual(post.call_count, len(services.OVERPASS_URLS))
        # Qayta so'rov Overpass'ga bormaydi (xato qisqa muddat keshlangan)
        self.assertEqual(self.client.get(self.url, {'lat': '41.3', 'lon': '69.2'}).status_code, 503)
        self.assertEqual(post.call_count, len(services.OVERPASS_URLS))

    @mock.patch('apps.mosques.services.requests.post')
    def test_timeout(self, post):
        post.side_effect = requests.exceptions.Timeout
        self.assertEqual(self.client.get(self.url, {'lat': '41.3', 'lon': '69.2'}).status_code, 504)

    @mock.patch('apps.mosques.services.requests.post')
    def test_overpass_runtime_error_is_not_reported_as_empty(self, post):
        post.return_value = _response(200, {'elements': [], 'remark': 'runtime error: Query timed out in "query" at line 1'})
        res = self.client.get(self.url, {'lat': '41.3', 'lon': '69.2'})
        self.assertEqual(res.status_code, 504)

    @mock.patch('apps.mosques.services.requests.post')
    def test_mirror_used_when_first_fails(self, post):
        post.side_effect = [_response(429), _response()]
        res = self.client.get(self.url, {'lat': '41.31111', 'lon': '69.27911', 'radius': '1000'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['count'], 2)


class MosqueDatabaseTests(TestCase):
    """Masjidlar bazada: Overpass ishlamasa ham sayt javob beradi."""

    url = '/api/qibla/mosques/'

    def setUp(self):
        cache.clear()

    @mock.patch('apps.mosques.services.requests.post')
    def test_synced_area_served_from_db_without_overpass(self, post):
        post.return_value = _response()
        self.assertEqual(services.sync_tile(40, 68), 3)  # 3 ta element, hammasi 40–42 / 68–70 katagida
        post.reset_mock()
        post.side_effect = AssertionError("Overpass'ga so'rov yuborilmasligi kerak")
        res = self.client.get(self.url, {'lat': '41.31111', 'lon': '69.27911', 'radius': '1000'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual([m['id'] for m in res.json()['mosques']], ['way/2', 'node/1'])

    @mock.patch('apps.mosques.services.requests.post')
    def test_overpass_down_returns_previously_saved(self, post):
        post.return_value = _response()
        self.client.get(self.url, {'lat': '41.31111', 'lon': '69.27911', 'radius': '1000'})
        cache.clear()  # kesh tozalangan (masalan, server qayta ishga tushgan)
        post.return_value = _response(503)
        res = self.client.get(self.url, {'lat': '41.31111', 'lon': '69.27911', 'radius': '1000'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['count'], 2)

    @mock.patch('apps.mosques.services.requests.post')
    def test_sync_removes_mosques_deleted_from_osm(self, post):
        from .models import Mosque

        post.return_value = _response()
        services.sync_tile(40, 68)
        self.assertTrue(Mosque.objects.filter(osm_id='node/1').exists())
        post.return_value = _response(200, {'elements': [OVERPASS['elements'][1]]})
        services.sync_tile(40, 68)
        self.assertEqual(list(Mosque.objects.values_list('osm_id', flat=True)), ['way/2'])

    @mock.patch('apps.mosques.services.requests.post')
    def test_failed_sync_keeps_existing_data(self, post):
        from .models import Mosque, MosqueArea

        post.return_value = _response()
        services.sync_tile(40, 68)
        post.return_value = _response(429)
        with self.assertRaises(services.MosqueServiceBusy):
            services.sync_tile(40, 68)
        self.assertEqual(Mosque.objects.count(), 3)
        self.assertEqual(MosqueArea.objects.count(), 1)


class MosqueImageTests(TestCase):
    """Rasm faqat OSM teglarida bo'lsa ko'rsatiladi — o'ylab topilmaydi."""

    def test_image_sources(self):
        thumb = 'https://commons.wikimedia.org/wiki/Special:FilePath/Minor_mosque.jpg?width=320'
        self.assertEqual(services._image({'wikimedia_commons': 'File:Minor mosque.jpg'}), thumb)
        self.assertEqual(services._image({'image': 'https://commons.wikimedia.org/wiki/File:Minor_mosque.jpg'}), thumb)
        self.assertEqual(services._image({'image': 'https://example.org/a.jpg'}), 'https://example.org/a.jpg')
        self.assertEqual(services._image({'image': 'http://example.org/a.jpg'}), '')  # faqat https
        self.assertEqual(services._image({'image': 'https://example.org/page'}), '')
        self.assertEqual(services._image({}), '')

    @mock.patch('apps.mosques.services.requests.get')
    @mock.patch('apps.mosques.services.requests.post')
    def test_wikidata_image_resolved_on_sync(self, post, get):
        from .models import Mosque

        post.return_value = _response(200, {'elements': [
            {'type': 'node', 'id': 7, 'lat': 41.3, 'lon': 69.2, 'tags': {'name': 'Masjid', 'wikidata': 'Q42'}},
            {'type': 'node', 'id': 8, 'lat': 41.3, 'lon': 69.21, 'tags': {'name': 'Rasmsiz'}},
        ]})
        get.return_value = _response(200, {'entities': {'Q42': {'claims': {'P18': [
            {'mainsnak': {'datavalue': {'value': 'Some Mosque.jpg'}}}]}}}})
        services.sync_tile(40, 68)
        self.assertTrue(Mosque.objects.get(osm_id='node/7').image.endswith('Some_Mosque.jpg?width=320'))
        self.assertEqual(Mosque.objects.get(osm_id='node/8').image, '')
        res = self.client.get('/api/qibla/mosques/', {'lat': '41.300', 'lon': '69.200', 'radius': '1000'})
        self.assertEqual(res.json()['mosques'][0]['image'][:40], 'https://commons.wikimedia.org/wiki/Speci')
        self.assertNotIn('wikidata', res.json()['mosques'][0])
