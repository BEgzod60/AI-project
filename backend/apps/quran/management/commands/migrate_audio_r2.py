"""Resumable, manifest-driven upload to a private R2 Standard bucket."""
import base64
import csv
import hashlib
import json
import time
from collections import Counter
from pathlib import Path

from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.quran import r2_storage

MIME_TYPES = {'.webm': 'audio/webm', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg',
              '.opus': 'audio/ogg', '.wav': 'audio/wav', '.aac': 'audio/aac', '.flac': 'audio/flac'}


def hashes(path):
    sha, md5 = hashlib.sha256(), hashlib.md5(usedforsecurity=False)
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            sha.update(block)
            md5.update(block)
    return sha.hexdigest(), md5.hexdigest(), base64.b64encode(md5.digest()).decode('ascii')


def object_matches(head, size, sha, md5):
    if head['ContentLength'] != size:
        return False
    etag = head.get('ETag', '').strip('"')
    if etag and '-' not in etag and etag != md5:
        return False
    metadata_sha = head.get('Metadata', {}).get('sha256')
    if metadata_sha:
        return metadata_sha == sha
    # R2 single-PUT ETags are MD5; multipart ETags are not and cannot be compared here.
    return etag == md5


class Command(BaseCommand):
    help = 'Dry-run by default; upload only with explicit bucket and rights confirmation.'

    def add_arguments(self, parser):
        parser.add_argument('--manifest', default='reports/audio-r2/audio-files.csv')
        parser.add_argument('--report', default='reports/audio-r2/migration.json')
        parser.add_argument('--batch-size', type=int, default=100)
        parser.add_argument('--max-retries', type=int, default=4)
        parser.add_argument('--upload', action='store_true')
        parser.add_argument('--approved-bucket', default='')
        parser.add_argument('--rights-confirmed', action='store_true')

    def handle(self, *args, manifest, report, batch_size, max_retries, upload, approved_bucket,
               rights_confirmed, **options):
        if batch_size < 1 or max_retries < 1:
            raise CommandError('batch-size and max-retries must be positive')
        if upload and (not rights_confirmed or not approved_bucket):
            raise CommandError('Upload requires --rights-confirmed and --approved-bucket=<exact bucket name>')
        if upload and (not r2_storage.configured() or approved_bucket != r2_storage.bucket_name()):
            raise CommandError('R2 configuration is incomplete or approved bucket does not match R2_BUCKET_NAME')
        source = Path(manifest)
        if not source.is_file():
            raise CommandError('Audio manifest not found; run audit_audio_media first')
        root = Path(settings.MEDIA_ROOT).resolve()
        with source.open(newline='', encoding='utf-8') as stream:
            records = list(csv.DictReader(stream))
        if not records:
            raise CommandError('Audio manifest is empty')

        client = r2_storage.client() if upload else None
        result = {'mode': 'upload' if upload else 'dry-run', 'bucket': approved_bucket if upload else None,
                  'total_files': len(records), 'counts': {}, 'files': []}
        destination = Path(report)
        destination.parent.mkdir(parents=True, exist_ok=True)
        for index, record in enumerate(records, 1):
            relative = record['path']
            path = (root / relative).resolve()
            if not path.is_relative_to(root) or path.suffix.lower() not in MIME_TYPES or not path.is_file():
                status, note = 'invalid_manifest', 'Missing or unsafe local audio path'
            else:
                size = path.stat().st_size
                sha, md5, md5_base64 = hashes(path)
                if size != int(record['bytes']) or sha != record['sha256']:
                    status, note = 'changed', 'Local file differs from audited manifest'
                elif not upload:
                    status, note = 'ready', ''
                else:
                    status, note = self._upload_one(client, relative, path, size, sha, md5, md5_base64, max_retries)
            result['files'].append({'path': relative, 'status': status, 'note': note})
            if index % batch_size == 0:
                self._write_report(destination, result)
        self._write_report(destination, result)
        self.stdout.write(f"{result['mode']}: {result['counts']} — {destination}")
        if any(item['status'] in ('failed', 'changed', 'invalid_manifest', 'conflict') for item in result['files']):
            raise CommandError('Some audio files need attention; see migration report')

    def _upload_one(self, client, key, path, size, sha, md5, md5_base64, max_retries):
        bucket = r2_storage.bucket_name()
        for attempt in range(max_retries):
            try:
                try:
                    head = client.head_object(Bucket=bucket, Key=key)
                except ClientError as exc:
                    if exc.response.get('Error', {}).get('Code') not in ('404', 'NoSuchKey', 'NotFound'):
                        raise
                    head = None
                if head:
                    return ('skipped', '') if object_matches(head, size, sha, md5) else ('conflict', 'Remote object differs')
                with path.open('rb') as stream:
                    client.put_object(
                        Bucket=bucket, Key=key, Body=stream, ContentLength=size,
                        ContentType=MIME_TYPES[path.suffix.lower()], ContentMD5=md5_base64,
                        CacheControl='private, max-age=300', Metadata={'sha256': sha}, StorageClass='STANDARD',
                    )
                head = client.head_object(Bucket=bucket, Key=key)
                if object_matches(head, size, sha, md5):
                    return 'uploaded', ''
                return 'failed', 'Remote size/checksum verification failed'
            except (ClientError, BotoCoreError, OSError) as exc:
                if attempt + 1 == max_retries:
                    return 'failed', type(exc).__name__
                time.sleep(min(2 ** attempt, 16))
        return 'failed', 'Retries exhausted'

    @staticmethod
    def _write_report(destination, result):
        result['counts'] = dict(Counter(item['status'] for item in result['files']))
        temporary = destination.with_suffix(destination.suffix + '.tmp')
        temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        temporary.replace(destination)
