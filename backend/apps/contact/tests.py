from unittest import mock

from django.core.cache import cache
from django.test import TestCase


@mock.patch.dict('os.environ', {'TELEGRAM_BOT_TOKEN': 'test-token', 'TELEGRAM_CHAT_ID': '42'})
class ContactTests(TestCase):
    url = '/api/aloqa/'

    def setUp(self):
        cache.clear()

    def post(self, **data):
        body = {'name': 'Bekzod', 'contact': '@bekzod', 'message': 'Assalomu alaykum, taklifim bor.', **data}
        return self.client.post(self.url, body, content_type='application/json')

    @mock.patch('apps.contact.telegram.requests.post')
    def test_sends_plain_text_to_telegram(self, post):
        post.return_value = mock.Mock(json=lambda: {'ok': True})
        r = self.post(message='<b>salom</b> *test*')
        self.assertEqual(r.status_code, 200)
        payload = post.call_args.kwargs['json']
        self.assertEqual(payload['chat_id'], '42')
        self.assertNotIn('parse_mode', payload)  # in'ektsiya yo'q — oddiy matn
        self.assertIn('<b>salom</b> *test*', payload['text'])
        self.assertIn('test-token', post.call_args.args[0])
        self.assertNotIn('test-token', r.content.decode())  # token javobda yo'q

    @mock.patch('apps.contact.telegram.requests.post')
    def test_validation_and_honeypot(self, post):
        self.assertEqual(self.post(name='').status_code, 400)
        self.assertEqual(self.post(message='hi').status_code, 400)
        self.assertEqual(self.post(message='x' * 2001).status_code, 400)
        self.assertEqual(self.post(website='spam.example').status_code, 200)
        post.assert_not_called()

    @mock.patch('apps.contact.telegram.requests.post')
    def test_rate_limit(self, post):
        post.return_value = mock.Mock(json=lambda: {'ok': True})
        for _ in range(5):
            self.assertEqual(self.post().status_code, 200)
        self.assertEqual(self.post().status_code, 429)

    @mock.patch('apps.contact.telegram.requests.post')
    def test_upstream_error(self, post):
        post.return_value = mock.Mock(json=lambda: {'ok': False, 'description': 'chat not found'})
        r = self.post()
        self.assertEqual(r.status_code, 502)
        self.assertNotIn('chat not found', r.content.decode())

    def test_not_configured(self):
        with mock.patch.dict('os.environ', {'TELEGRAM_CHAT_ID': ''}):
            self.assertEqual(self.post().status_code, 503)

    def test_get_not_allowed(self):
        self.assertEqual(self.client.get(self.url).status_code, 405)
