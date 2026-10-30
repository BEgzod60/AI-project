"""
Django settings for config project.
"""
import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Muhit yoki loyiha ildizidagi `.env.local` (neon env pull shu yerga yozadi)
load_dotenv(BASE_DIR / '..' / '.env.local')
load_dotenv(BASE_DIR / '.env')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DJANGO_DEBUG', 'false').lower() in ('true', '1', 'yes')

# SECURITY WARNING: keep the secret key used in production secret!
_secret = os.environ.get('DJANGO_SECRET_KEY', '')
if _secret:
    SECRET_KEY = _secret
elif DEBUG:
    SECRET_KEY = 'django-insecure-dev-only-key-change-in-production'
else:
    raise RuntimeError(
        'DJANGO_SECRET_KEY muhit o\'zgaruvchisi production\'da o\'rnatilishi shart!'
    )

# ALLOWED_HOSTS: localhost, trycloudflare.com va maningiymonim.uz domeningiz
ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get(
        'DJANGO_ALLOWED_HOSTS',
        '127.0.0.1,localhost,backend,maningiymonim.uz,www.maningiymonim.uz,.trycloudflare.com'
    ).split(',')
    if h.strip()
]

# CSRF Trusted Origins (HTTPS so'rovlar uchun shart)
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        'DJANGO_CSRF_TRUSTED_ORIGINS',
        'https://maningiymonim.uz,https://www.maningiymonim.uz,http://localhost:5173,http://localhost:8090,https://*.trycloudflare.com'
    ).split(',')
    if origin.strip()
]

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'apps.prayer_times',
    'apps.namoz',
    'apps.learning',
    'apps.ai',
    'apps.mosques',
    'apps.quran',
    'apps.contact',
    'apps.developer',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Database

# DATABASE_URL berilsa (masalan, postgres://user:parol@host:5432/iymon) — PostgreSQL,
# aks holda lokal ishlab chiqish uchun SQLite.
DATABASES = {
    'default': dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Password validation

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization

LANGUAGE_CODE = 'uz'
TIME_ZONE = 'Asia/Tashkent'
USE_I18N = True
USE_TZ = True

# Static files

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'static'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Review deployment must not silently start without its private audio bucket.
if os.environ.get('R2_AUDIO_ENABLED', '').lower() in ('1', 'true', 'yes'):
    required_r2 = ('R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME')
    if any(not os.environ.get(name) for name in required_r2):
        raise RuntimeError('R2_AUDIO_ENABLED requires all private R2 connection settings')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': None,
    # Faqat AI endpointlari uchun (apps.ai.views); qolgan API'lar cheklanmaydi.
    'DEFAULT_THROTTLE_RATES': {
        'ai': os.environ.get('AI_RATE_LIMIT', '10/min'),
        'ai_daily': os.environ.get('AI_DAILY_LIMIT', '100/day'),
    },
}

# AI yordamchi — sukut bo'yicha O'CHIRILGAN. Yoqilganda ham faqat tizimga kirgan
# foydalanuvchilar (admin) murojaat qila oladi va so'rovlar tezlik bo'yicha cheklanadi.
# Provayder kaliti (AI_API_KEY / NEON_AI_GATEWAY_TOKEN) alohida talab qilinadi.
AI_ENABLED = os.environ.get('AI_ENABLED', 'false').lower() in ('true', '1', 'yes')

# Reverse proxy orqasida (Nginx HTTPS) ishlaganda HTTPS ni to'g'ri aniqlash uchun
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# CORS (frontend dev server va production)
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        'DJANGO_CORS_ALLOWED_ORIGINS',
        'http://localhost:5173,http://127.0.0.1:5173,https://maningiymonim.uz,https://www.maningiymonim.uz'
    ).split(',')
    if origin.strip()
]
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.trycloudflare\.com$",
]

# ── Production xavfsizlik sozlamalari ─────────────────────────────────────
if not DEBUG:
    SECURE_SSL_REDIRECT = True             # reverse proxy HTTPS ni X-Forwarded-Proto orqali bildiradi
    SESSION_COOKIE_SECURE = True          # session cookie faqat HTTPS orqali
    CSRF_COOKIE_SECURE = True             # CSRF cookie faqat HTTPS orqali
    SECURE_CONTENT_TYPE_NOSNIFF = True    # X-Content-Type-Options: nosniff
    X_FRAME_OPTIONS = 'DENY'              # clickjacking himoya
    # Domen va HTTPS barcha yo'llarda tekshirilmaguncha 0 bo'lib qoladi.
    SECURE_HSTS_SECONDS = int(os.environ.get('DJANGO_SECURE_HSTS_SECONDS', '0'))

