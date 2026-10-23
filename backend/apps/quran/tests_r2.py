import csv
import hashlib
import json
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

from botocore.exceptions import ClientError
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, override_settings


class R2MigrationTests(SimpleTestCase):
    def test_dry_run_and_upload_confirmation(self):
        with tempfile.TemporaryDirectory() as tmp, override_settings(MEDIA_ROOT=Path(tmp)):
            audio = Path(tmp) / 'quran/afasy/001001.webm'
            audio.parent.mkdir(parents=True)
            audio.write_bytes(b'audio')
            manifest = Path(tmp) / 'manifest.csv'
            with manifest.open('w', newline='') as stream:
                writer = csv.DictWriter(stream, fieldnames=['path', 'bytes', 'extension', 'sha256', 'source', 'rights'])
                writer.writeheader()
                writer.writerow({'path': 'quran/afasy/001001.webm', 'bytes': 5, 'extension': '.webm',
                                 'sha256': hashlib.sha256(b'audio').hexdigest(), 'source': 'Tanzil', 'rights': 'unverified'})
            report = Path(tmp) / 'report.json'
            call_command('migrate_audio_r2', manifest=str(manifest), report=str(report))
            self.assertEqual(json.loads(report.read_text())['counts'], {'ready': 1})
            with self.assertRaises(CommandError):
                call_command('migrate_audio_r2', manifest=str(manifest), report=str(report), upload=True)

            client = MagicMock()
            missing = ClientError({'Error': {'Code': 'NoSuchKey'}}, 'HeadObject')
            matched = {'ContentLength': 5, 'ETag': '"' + hashlib.md5(b'audio', usedforsecurity=False).hexdigest() + '"',
                       'Metadata': {'sha256': hashlib.sha256(b'audio').hexdigest()}}
            client.head_object.side_effect = [missing, matched]
            with patch('apps.quran.r2_storage.configured', return_value=True), \
                 patch('apps.quran.r2_storage.bucket_name', return_value='private-review'), \
                 patch('apps.quran.r2_storage.client', return_value=client):
                call_command('migrate_audio_r2', manifest=str(manifest), report=str(report), upload=True,
                             rights_confirmed=True, approved_bucket='private-review')
            self.assertEqual(json.loads(report.read_text())['counts'], {'uploaded': 1})
            self.assertEqual(client.put_object.call_args.kwargs['ContentType'], 'audio/webm')
            self.assertTrue(audio.exists())

            client.head_object.side_effect = None
            client.head_object.return_value = matched
            with patch('apps.quran.r2_storage.configured', return_value=True), \
                 patch('apps.quran.r2_storage.bucket_name', return_value='private-review'), \
                 patch('apps.quran.r2_storage.client', return_value=client):
                call_command('migrate_audio_r2', manifest=str(manifest), report=str(report), upload=True,
                             rights_confirmed=True, approved_bucket='private-review')
            self.assertEqual(json.loads(report.read_text())['counts'], {'skipped': 1})
