from unittest import mock

from django.core.cache import cache
from django.test import TestCase

from apps.quran.models import Surah

from .models import ApiKey, hash_key


@mock.patch('apps.contact.telegram.send_message')
class ApiKeyTests(TestCase):
    def setUp(self):
        cache.clear()
        Surah.objects.create(number=1, name_uz='Fotiha', name_simple='Al-Fatiha', name_arabic='الفاتحة', verses_count=7, revelation='makkiy')

    def issue(self, **data):
        body = {'name': 'Mening ilovam', 'email': 'dev@example.com', 'agree': True, **data}
        return self.client.post('/api/dev/keys/', body, content_type='application/json')

    def test_issue_returns_key_once_and_stores_only_hash(self, notify):
        r = self.issue()
        self.assertEqual(r.status_code, 201)
        raw = r.json()['key']
        self.assertTrue(raw.startswith('iym_'))
        key = ApiKey.objects.get()
        self.assertEqual(key.key_hash, hash_key(raw))
        self.assertNotIn(raw, str(ApiKey.objects.values().get()))  # to'liq kalit bazada yo'q
        notify.assert_called_once()
        self.assertNotIn(raw, notify.call_args.args[0])  # Telegram xabarida ham faqat boshi

    def test_issue_validation(self, notify):
        self.assertEqual(self.issue(name='x').status_code, 400)
        self.assertEqual(self.issue(email='notanemail').status_code, 400)
        self.assertEqual(self.issue(agree=False).status_code, 400)
        self.assertEqual(self.issue(website='bot').status_code, 400)
        self.assertEqual(ApiKey.objects.count(), 0)

    def test_issue_rate_limit_per_ip(self, notify):
        for i in range(3):
            self.assertEqual(self.issue(email=f'd{i}@example.com').status_code, 201)
        self.assertEqual(self.issue(email='d9@example.com').status_code, 429)

    def test_v1_requires_valid_active_key(self, notify):
        self.assertEqual(self.client.get('/api/v1/surahs/').status_code, 401)
        self.assertEqual(self.client.get('/api/v1/surahs/', HTTP_X_API_KEY='iym_wrong').status_code, 401)
        raw = self.issue().json()['key']
        r = self.client.get('/api/v1/surahs/', HTTP_X_API_KEY=raw)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['surahs'][0]['name_uz'], 'Fotiha')
        self.assertEqual(r['Access-Control-Allow-Origin'], '*')
        self.assertEqual(r['X-RateLimit-Remaining'], '999')
        self.assertEqual(self.client.get('/api/v1/surahs/1/', HTTP_AUTHORIZATION=f'Bearer {raw}').status_code, 200)
        ApiKey.objects.update(is_active=False)
        self.assertEqual(self.client.get('/api/v1/surahs/', HTTP_X_API_KEY=raw).status_code, 403)

    def test_daily_limit(self, notify):
        raw = self.issue().json()['key']
        ApiKey.objects.update(daily_limit=2)
        codes = [self.client.get('/api/v1/surahs/', HTTP_X_API_KEY=raw).status_code for _ in range(3)]
        self.assertEqual(codes, [200, 200, 429])
        me = ApiKey.objects.get()
        self.assertEqual((me.usage_count, me.total_requests), (3, 3))

    def test_preflight_and_methods(self, notify):
        r = self.client.options('/api/v1/surahs/')
        self.assertEqual(r.status_code, 204)
        self.assertIn('X-API-Key', r['Access-Control-Allow-Headers'])
        raw = self.issue().json()['key']
        self.assertEqual(self.client.post('/api/v1/surahs/', HTTP_X_API_KEY=raw).status_code, 405)

    def test_me_and_topics(self, notify):
        raw = self.issue().json()['key']
        me = self.client.get('/api/v1/me/', HTTP_X_API_KEY=raw).json()
        self.assertEqual((me['name'], me['used_today']), ('Mening ilovam', 1))
        self.assertEqual(self.client.get('/api/v1/topics/namoz/', HTTP_X_API_KEY=raw).status_code, 200)
        self.assertEqual(self.client.get('/api/v1/prayers/', HTTP_X_API_KEY=raw).status_code, 200)

    def test_internal_api_unchanged(self, notify):
        self.assertEqual(self.client.get('/api/quran/surahs/').status_code, 200)  # sayt uchun kalitsiz
