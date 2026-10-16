from django.db import models


class PrayerTime(models.Model):
    """Bir hudud uchun bir kunlik namoz vaqtlari.

    Ma'lumotlar namoz-vaqtlari.more-info.uz API'dan olinib, shu yerda saqlanadi —
    sayt tashqi API ishlamay qolganda ham bazadan javob beradi.
    """

    region = models.CharField('Hudud', max_length=50)
    date = models.DateField('Sana')
    bomdod = models.TimeField('Bomdod')
    quyosh = models.TimeField('Quyosh')
    peshin = models.TimeField('Peshin')
    asr = models.TimeField('Asr')
    shom = models.TimeField('Shom')
    xufton = models.TimeField('Xufton')
    updated_at = models.DateTimeField('Yangilangan', auto_now=True)

    class Meta:
        verbose_name = 'Namoz vaqti'
        verbose_name_plural = 'Namoz vaqtlari'
        ordering = ['region', 'date']
        constraints = [
            models.UniqueConstraint(fields=['region', 'date'], name='unique_prayer_time_region_date'),
        ]

    def __str__(self):
        return f'{self.region} — {self.date}'
