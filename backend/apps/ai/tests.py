import tempfile
from pathlib import Path
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings

from . import services


class AiDisabledTests(TestCase):
    """Production sukut bo'yicha: AI o'chirilgan, endpointlar 404 va boshqa API'lar ishlaydi."""

    def test_all_ai_endpoints_are_404_when_disabled(self):
        for url in ('status/', 'models/'):
            self.assertEqual(self.client.get(f'/api/ai/{url}').status_code, 404)
        for url in ('chat/', 'chat/stream/', 'describe-image/'):
            self.assertEqual(self.client.post(f'/api/ai/{url}', {'question': 'x'}).status_code, 404)

    def test_health_endpoint_unaffected(self):
        self.assertEqual(self.client.get('/healthz/').status_code, 200)

    def test_services_not_configured_without_env(self):
        with mock.patch.dict('os.environ', {}, clear=True):
            self.assertFalse(services.is_configured())


@override_settings(AI_ENABLED=True)
class AiEnabledTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_requires_login(self):
        response = self.client.post('/api/ai/chat/', {'question': 'salom'}, content_type='application/json')
        self.assertIn(response.status_code, (401, 403))

    def test_logged_in_without_provider_returns_503(self):
        user = get_user_model().objects.create_user('admin1', password='x')
        self.client.force_login(user)
        with mock.patch.dict('os.environ', {}, clear=True):
            response = self.client.post('/api/ai/chat/', {'question': 'salom'}, content_type='application/json')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()['error']['code'], 'ai_not_configured')

    def test_burst_throttle(self):
        from .views import AiBurstThrottle

        user = get_user_model().objects.create_user('admin2', password='x')
        self.client.force_login(user)
        with mock.patch.object(AiBurstThrottle, 'THROTTLE_RATES', {'ai': '2/min', 'ai_daily': '100/day'}), \
                mock.patch.dict('os.environ', {}, clear=True):
            codes = [
                self.client.post('/api/ai/chat/', {'question': 'q'}, content_type='application/json').status_code
                for _ in range(3)
            ]
        self.assertEqual(codes, [503, 503, 429])


class DescribeImagePathTests(TestCase):
    def test_path_outside_media_root_is_rejected(self):
        with tempfile.TemporaryDirectory() as media, tempfile.TemporaryDirectory() as other:
            secret = Path(other) / 'secret.png'
            secret.write_bytes(b'x')
            with override_settings(MEDIA_ROOT=media):
                for bad in (str(secret), '../' + secret.parent.name + '/secret.png'):
                    with self.assertRaises(services.AiError) as ctx:
                        services.describe_image(bad)
                    self.assertEqual(ctx.exception.code, 'image_not_found')
