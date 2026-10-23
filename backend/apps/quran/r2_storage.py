"""Private R2 access for Quran audio. No public bucket URL is used here."""
import os
from functools import lru_cache


REQUIRED = ('R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME')


def configured():
    return all(os.environ.get(name) for name in REQUIRED)


def enabled():
    return os.environ.get('R2_AUDIO_ENABLED', '').lower() in ('1', 'true', 'yes') and configured()


def bucket_name():
    return os.environ['R2_BUCKET_NAME']


def object_key(reciter, file):
    return f'quran/{reciter}/{file}.webm'


@lru_cache(maxsize=1)
def client():
    if not configured():
        raise RuntimeError('R2 configuration is incomplete')
    import boto3
    from botocore.config import Config

    return boto3.client(
        's3',
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
        region_name='auto',
        config=Config(signature_version='s3v4', retries={'max_attempts': 5, 'mode': 'standard'}),
    )
