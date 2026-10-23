"""Read-only inventory of local audio and the database's media references."""
import csv
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlparse

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.learning.models import AudioSource
from apps.quran.models import Surah, SurahAudio

AUDIO_EXTENSIONS = {'.webm', '.mp3', '.m4a', '.ogg', '.opus', '.wav', '.aac', '.flac'}


def digest(path):
    hash_ = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            hash_.update(block)
    return hash_.hexdigest()


class Command(BaseCommand):
    help = 'Inventory local audio, duplicate bytes, Quran coverage and DB media references; never writes to the DB.'

    def add_arguments(self, parser):
        parser.add_argument('--output-dir', default='reports/audio-r2')

    def handle(self, *args, output_dir, **options):
        root = Path(settings.MEDIA_ROOT)
        output = Path(output_dir)
        output.mkdir(parents=True, exist_ok=True)
        rows = []
        duplicate_hashes = defaultdict(list)
        extensions = Counter()
        for path in sorted(root.rglob('*')):
            if not path.is_file() or path.suffix.lower() not in AUDIO_EXTENSIONS:
                continue
            relative = path.relative_to(root).as_posix()
            sha = digest(path)
            row = {
                'path': relative, 'bytes': path.stat().st_size,
                'extension': path.suffix.lower(), 'sha256': sha,
                'source': 'Tanzil Project / Afasy' if relative.startswith('quran/afasy/') else 'unclassified',
                'rights': 'unverified' if relative.startswith('quran/afasy/') else 'review-required',
            }
            rows.append(row)
            duplicate_hashes[sha].append(relative)
            extensions[row['extension']] += 1

        with (output / 'audio-files.csv').open('w', newline='', encoding='utf-8') as stream:
            writer = csv.DictWriter(stream, fieldnames=('path', 'bytes', 'extension', 'sha256', 'source', 'rights'))
            writer.writeheader()
            writer.writerows(rows)

        actual = {row['path'] for row in rows}
        expected = {
            f'quran/afasy/{surah.number:03d}{ayah:03d}.webm'
            for surah in Surah.objects.only('number', 'verses_count')
            for ayah in range(1, surah.verses_count + 1)
        }
        local_refs = []
        external_refs = Counter()
        for model, field in ((AudioSource, 'audio_url'), (SurahAudio, 'audio_url')):
            for value in model.objects.exclude(**{field: ''}).values_list(field, flat=True):
                parsed = urlparse(value)
                if parsed.path.startswith('/media/') and not parsed.netloc:
                    local_refs.append(parsed.path[len('/media/'):])
                elif parsed.netloc:
                    external_refs[parsed.netloc] += 1

        report = {
            'file_count': len(rows), 'total_bytes': sum(row['bytes'] for row in rows),
            'extensions': dict(extensions),
            'duplicate_groups': [paths for paths in duplicate_hashes.values() if len(paths) > 1],
            'duplicate_file_count': sum(len(paths) - 1 for paths in duplicate_hashes.values() if len(paths) > 1),
            'expected_afasy_files': len(expected), 'missing_afasy_files': sorted(expected - actual),
            'unexpected_afasy_files': sorted(p for p in actual if p.startswith('quran/afasy/') and p not in expected),
            'database_references': {
                'tanzil_symbolic': AudioSource.objects.filter(provider='tanzil').count(),
                'local_url_count': len(local_refs),
                'missing_local_urls': sorted(set(local_refs) - actual),
                'external_url_domains': dict(external_refs),
                'surah_audio_rows': SurahAudio.objects.count(),
            },
            'rights': 'Audio redistribution permission is not documented; upload blocked pending review.',
        }
        (output / 'summary.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        self.stdout.write(f"{len(rows)} audio files, {report['total_bytes']} bytes; report: {output}")
