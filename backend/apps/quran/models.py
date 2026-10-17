"""Qur'on suralari bazada saqlanadi.

Arabcha matn — Tanzil Project (CC BY 3.0), o‘zbekcha kirill ma’no tarjimasi —
Muhammad Sodiq Muhammad Yusuf (`uz.sodik`, notijoriy foydalanish uchun).
"""
from django.db import models


class Surah(models.Model):
    class Revelation(models.TextChoices):
        MAKKIY = 'makkiy', 'Makkiy'
        MADANIY = 'madaniy', 'Madaniy'

    number = models.PositiveSmallIntegerField('Tartib raqami', unique=True)
    name_uz = models.CharField('Nomi (o‘zbekcha)', max_length=60)
    name_simple = models.CharField('Nomi (lotin transliteratsiya)', max_length=60)
    name_arabic = models.CharField('Nomi (arabcha)', max_length=60)
    verses_count = models.PositiveSmallIntegerField('Oyatlar soni')
    revelation = models.CharField('Nozil bo‘lgan joyi', max_length=10, choices=Revelation.choices)
    revelation_order = models.PositiveSmallIntegerField('Nozil bo‘lish tartibi', null=True, blank=True)

    class Meta:
        ordering = ['number']
        verbose_name = 'Sura'
        verbose_name_plural = 'Suralar'

    def __str__(self):
        return f'{self.number}. {self.name_uz}'


class Ayah(models.Model):
    surah = models.ForeignKey(Surah, on_delete=models.CASCADE, related_name='ayahs', verbose_name='Sura')
    number = models.PositiveSmallIntegerField('Oyat raqami')
    text_arabic = models.TextField('Arabcha matn')
    translation_uz = models.TextField('Ma’nosi (o‘zbekcha)', blank=True)

    class Meta:
        ordering = ['surah__number', 'number']
        constraints = [models.UniqueConstraint(fields=['surah', 'number'], name='unique_surah_ayah')]
        verbose_name = 'Oyat'
        verbose_name_plural = 'Oyatlar'

    def __str__(self):
        return f'{self.surah.number}:{self.number}'


class SurahAudio(models.Model):
    """Sura audiosi — faqat O'zbekiston manbasidan va foydalanishga ruxsati hujjatlashtirilgan bo'lsa saytda chiqadi."""

    class License(models.TextChoices):
        PERMITTED = 'permitted', 'Ruxsat berilgan (hujjat bor)'
        UNKNOWN = 'unknown', 'Aniqlanmagan'
        NOT_PERMITTED = 'not_permitted', 'Ruxsat yo‘q'

    surah = models.ForeignKey(Surah, on_delete=models.CASCADE, related_name='audios', verbose_name='Sura')
    audio_url = models.URLField('Audio havolasi (mp3)', max_length=500)
    reciter = models.CharField('Qori', max_length=120)
    source_title = models.CharField('Manba', max_length=255, help_text='Masalan: O‘zbekiston musulmonlari idorasi (muslim.uz)')
    source_url = models.URLField('Manba sahifasi', max_length=500)
    license_status = models.CharField('Foydalanish ruxsati', max_length=20, choices=License.choices, default=License.UNKNOWN)
    permission_note = models.TextField('Ruxsat haqida', blank=True, help_text='Ruxsat xati / shartnoma raqami va sanasi')
    is_active = models.BooleanField('Saytda ko‘rsatilsin', default=False)

    class Meta:
        verbose_name = 'Sura audiosi'
        verbose_name_plural = 'Sura audiolari'

    def __str__(self):
        return f'{self.surah} — {self.reciter}'

    @property
    def is_playable(self):
        return self.is_active and self.license_status == self.License.PERMITTED
