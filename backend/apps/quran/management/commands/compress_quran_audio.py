"""Tanzil'dagi oyatma-oyat tilovatni yuklab, Opus'ga siqib MEDIA_ROOT/quran/<qori>/ ga saqlaydi.

Qayta ishga tushirilsa, mavjud fayllar o'tkazib yuboriladi — to'xtab qolgan joyidan davom etadi.
Hamma 6236 oyat tayyor bo'lgach `.complete` belgisi yoziladi va sayt shu qorini o'zimizdan o'ynaydi.
"""
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from django.core.management.base import BaseCommand, CommandError

from apps.quran import audio_files, sources
from apps.quran.models import Surah

HEADERS = {'User-Agent': 'Iymon/1.0 (Islamic education platform)'}


def ffmpeg_exe():
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except (ImportError, RuntimeError) as exc:
        raise CommandError('ffmpeg topilmadi: `pip install imageio-ffmpeg` yoki tizimga ffmpeg o‘rnating.') from exc


class Command(BaseCommand):
    help = "Tanzil tilovatini siqib (Opus, mono) media papkaga saqlaydi"

    def add_arguments(self, parser):
        parser.add_argument('reciters', nargs='*', help='Qori ID lari (masalan afasy). Bo‘sh — hammasi.')
        parser.add_argument('--bitrate', default=audio_files.BITRATE, help='Opus bitreyti (standart: %(default)s)')
        parser.add_argument('--workers', type=int, default=6, help='Bir vaqtda nechta oyat (standart: %(default)s)')

    def handle(self, *args, reciters, bitrate, workers, **options):
        known = dict(sources.AYAH_AUDIO_RECITERS)
        unknown = [r for r in reciters if r not in known]
        if unknown:
            raise CommandError(f"Noma'lum qori: {', '.join(unknown)}. Mavjud: {', '.join(known)}")

        counts = dict(Surah.objects.values_list('number', 'verses_count'))
        if len(counts) != 114:
            raise CommandError('Avval suralarni yuklang: python manage.py import_quran')
        files = [audio_files.file_name(s, a) for s, n in sorted(counts.items()) for a in range(1, n + 1)]

        self.ffmpeg = ffmpeg_exe()
        self.bitrate = bitrate
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

        for reciter in reciters or list(known):
            self._reciter(reciter, known[reciter], files, workers)

    def _reciter(self, reciter, name, files, workers):
        folder = audio_files.reciter_dir(reciter)
        folder.mkdir(parents=True, exist_ok=True)
        todo = [f for f in files if not (folder / f'{f}.{audio_files.EXT}').exists()]
        self.stdout.write(f'{name}: {len(files) - len(todo)}/{len(files)} tayyor, {len(todo)} ta qoldi')

        failed = []
        with ThreadPoolExecutor(max_workers=workers) as pool:
            jobs = {pool.submit(self._one, reciter, folder, f): f for f in todo}
            for done, job in enumerate(as_completed(jobs), 1):
                try:
                    job.result()
                except Exception as exc:  # noqa: BLE001 — bitta oyat xatosi butun ishni to'xtatmasin
                    failed.append(jobs[job])
                    self.stderr.write(f'  {jobs[job]}: {exc}')
                if done % 250 == 0:
                    self.stdout.write(f'  {done}/{len(todo)}')

        if failed:
            self.stdout.write(self.style.WARNING(f'{name}: {len(failed)} ta oyat xato — buyruqni qayta ishga tushiring.'))
            return
        (folder / audio_files.COMPLETE_MARKER).write_text(f'{len(files)}\n')
        size = sum(p.stat().st_size for p in folder.glob(f'*.{audio_files.EXT}')) / 1024 / 1024
        self.stdout.write(self.style.SUCCESS(f'{name}: {len(files)} oyat, {size:.0f} MB → {folder}'))

    def _one(self, reciter, folder, file):
        url = sources.AYAH_AUDIO_URL.format(reciter=reciter, file=file)
        response = self.session.get(url, timeout=60)
        response.raise_for_status()
        target = folder / f'{file}.{audio_files.EXT}'
        tmp = target.with_suffix('.part')
        subprocess.run(
            [self.ffmpeg, '-v', 'error', '-y', '-i', 'pipe:0', '-map_metadata', '-1',
             '-ac', '1', '-c:a', 'libopus', '-b:a', self.bitrate, '-f', 'webm', str(tmp)],
            input=response.content, check=True, capture_output=True,
        )
        tmp.replace(target)
