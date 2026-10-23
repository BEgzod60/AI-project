"""Same-origin, private audio gateway with byte ranges for HTML audio players."""
import re

from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings
from django.http import Http404, HttpResponse, StreamingHttpResponse
from django.views.decorators.http import require_http_methods

from . import r2_storage
from .sources import AYAH_AUDIO_RECITERS

RANGE_RE = re.compile(r'^bytes=(\d*)-(\d*)$')
CHUNK_SIZE = 64 * 1024


def _range(header, size):
    if not header:
        return 0, size - 1, False
    match = RANGE_RE.fullmatch(header.strip())
    if not match or (not match[1] and not match[2]) or size == 0:
        return None
    first, last = match.groups()
    if not first:
        length = int(last)
        if length == 0:
            return None
        start, end = max(0, size - length), size - 1
    else:
        start = int(first)
        end = min(int(last), size - 1) if last else size - 1
    if start >= size or end < start:
        return None
    return start, end, True


def _headers(response, size, start, end, partial, etag=None):
    response['Accept-Ranges'] = 'bytes'
    response['Content-Type'] = 'audio/webm'
    response['Content-Length'] = str(end - start + 1)
    response['Cache-Control'] = 'private, max-age=300'
    response['X-Content-Type-Options'] = 'nosniff'
    if partial:
        response['Content-Range'] = f'bytes {start}-{end}/{size}'
    if etag:
        response['ETag'] = etag if etag.startswith('"') else f'"{etag}"'
    return response


def _invalid_range(size):
    response = HttpResponse(status=416)
    response['Content-Range'] = f'bytes */{size}'
    response['Accept-Ranges'] = 'bytes'
    response['Cache-Control'] = 'no-store'
    return response


def _stream_local(path, start, end):
    with path.open('rb') as stream:
        stream.seek(start)
        left = end - start + 1
        while left:
            chunk = stream.read(min(CHUNK_SIZE, left))
            if not chunk:
                break
            left -= len(chunk)
            yield chunk


def _stream_r2(body):
    try:
        for chunk in body.iter_chunks(chunk_size=CHUNK_SIZE):
            if chunk:
                yield chunk
    finally:
        body.close()


@require_http_methods(['GET', 'HEAD'])
def quran_audio(request, reciter, file):
    if reciter not in dict(AYAH_AUDIO_RECITERS):
        raise Http404
    path = settings.MEDIA_ROOT / r2_storage.object_key(reciter, file)
    local_exists = path.is_file()
    size = None
    etag = None
    use_r2 = r2_storage.enabled()

    if use_r2:
        try:
            head = r2_storage.client().head_object(Bucket=r2_storage.bucket_name(), Key=r2_storage.object_key(reciter, file))
            size = head['ContentLength']
            etag = head.get('ETag')
        except ClientError as exc:
            if exc.response.get('Error', {}).get('Code') not in ('404', 'NoSuchKey', 'NotFound') and not local_exists:
                return HttpResponse(status=502)
            use_r2 = False
        except BotoCoreError:
            if not local_exists:
                return HttpResponse(status=502)
            use_r2 = False

    if not use_r2:
        if not local_exists:
            raise Http404
        size = path.stat().st_size

    if etag and request.headers.get('If-None-Match') == etag and 'Range' not in request.headers:
        response = HttpResponse(status=304)
        response['ETag'] = etag
        response['Cache-Control'] = 'private, max-age=300'
        return response

    span = _range(request.headers.get('Range'), size)
    if span is None:
        return _invalid_range(size)
    start, end, partial = span
    if request.method == 'HEAD':
        return _headers(HttpResponse(status=206 if partial else 200), size, start, end, partial, etag)

    if use_r2:
        try:
            obj = r2_storage.client().get_object(
                Bucket=r2_storage.bucket_name(), Key=r2_storage.object_key(reciter, file),
                Range=f'bytes={start}-{end}',
            )
            stream = _stream_r2(obj['Body'])
        except (ClientError, BotoCoreError):
            if not local_exists:
                return HttpResponse(status=502)
            size = path.stat().st_size
            span = _range(request.headers.get('Range'), size)
            if span is None:
                return _invalid_range(size)
            start, end, partial = span
            etag = None
            stream = _stream_local(path, start, end)
    else:
        stream = _stream_local(path, start, end)
    return _headers(StreamingHttpResponse(stream, status=206 if partial else 200), size, start, end, partial, etag)
