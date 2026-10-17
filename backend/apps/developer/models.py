"""Dasturchilar uchun API kalitlari.

Kalitning o'zi bazada saqlanmaydi — faqat SHA-256 xeshi. To'liq kalit foydalanuvchiga
bir marta (yaratilganda) ko'rsatiladi; yo'qolsa yangisini olish kerak.
"""
import hashlib
import secrets

from django.db import models
from django.db.models import F
from django.utils import timezone

PREFIX = 'iym_'


def hash_key(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


class ApiKey(models.Model):
    name = models.CharField('Ilova nomi', max_length=80)
    email = models.EmailField('Email')
    prefix = models.CharField("Kalit boshi (ko'rsatish uchun)", max_length=12, unique=True)
    key_hash = models.CharField('Kalit xeshi (SHA-256)', max_length=64, unique=True)
    daily_limit = models.PositiveIntegerField('Kunlik limit (so‘rov)', default=1000)
    is_active = models.BooleanField('Faol', default=True)
    created_at = models.DateTimeField('Yaratilgan', auto_now_add=True)
    created_ip = models.GenericIPAddressField('Yaratilgan IP', null=True, blank=True)
    last_used_at = models.DateTimeField('Oxirgi ishlatilgan', null=True, blank=True)
    usage_day = models.DateField('Hisob kuni', null=True, blank=True)
    usage_count = models.PositiveIntegerField('Bugungi so‘rovlar', default=0)
    total_requests = models.PositiveBigIntegerField('Jami so‘rovlar', default=0)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'API kalit'
        verbose_name_plural = 'API kalitlar'

    def __str__(self):
        return f'{self.name} ({PREFIX}{self.prefix}…)'

    @classmethod
    def issue(cls, **fields):
        """Yangi kalit: (obyekt, to'liq kalit). To'liq kalit faqat shu yerda qaytadi."""
        while True:
            raw = PREFIX + secrets.token_urlsafe(32)
            prefix = raw[len(PREFIX):len(PREFIX) + 8]
            if not cls.objects.filter(prefix=prefix).exists():
                break
        return cls.objects.create(prefix=prefix, key_hash=hash_key(raw), **fields), raw

    @classmethod
    def find(cls, raw: str):
        if not raw or not raw.startswith(PREFIX):
            return None
        return cls.objects.filter(key_hash=hash_key(raw.strip())).first()

    def consume(self) -> int:
        """Bugungi hisobga bitta so'rov qo'shadi va yangi qiymatni qaytaradi (atomik)."""
        today = timezone.localdate()
        now = timezone.now()
        updated = ApiKey.objects.filter(pk=self.pk, usage_day=today).update(
            usage_count=F('usage_count') + 1, total_requests=F('total_requests') + 1, last_used_at=now,
        )
        if not updated:
            ApiKey.objects.filter(pk=self.pk).update(
                usage_day=today, usage_count=1, total_requests=F('total_requests') + 1, last_used_at=now,
            )
        return ApiKey.objects.values_list('usage_count', flat=True).get(pk=self.pk)
