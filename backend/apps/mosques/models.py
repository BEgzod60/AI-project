from django.db import models


class Mosque(models.Model):
    """OpenStreetMap'dagi masjid (amenity=place_of_worship + religion=muslim).

    Ma'lumotlar `sync_mosques` buyrug'i bilan Overpass'dan yuklanadi — sayt tashqi xizmat
    ishlamay qolganda ham bazadan javob beradi. Hech narsa o'ylab topilmaydi: nom/manzil
    OSM'da bo'lmasa bo'sh qoladi.
    """

    osm_id = models.CharField('OSM ID', max_length=40, unique=True, help_text='Masalan node/123 yoki way/456')
    name = models.CharField('Nomi', max_length=255, blank=True)
    address = models.CharField('Manzil', max_length=255, blank=True)
    lat = models.FloatField('Kenglik', db_index=True)
    lon = models.FloatField('Uzunlik', db_index=True)
    updated_at = models.DateTimeField('Yangilangan', auto_now=True)

    class Meta:
        verbose_name = 'Masjid'
        verbose_name_plural = 'Masjidlar'
        ordering = ['name']

    def __str__(self):
        return self.name or self.osm_id


class MosqueArea(models.Model):
    """To'liq yuklangan hudud (to'rtburchak). Shu hudud ichidagi so'rovlarga faqat bazadan javob beriladi."""

    south = models.FloatField()
    west = models.FloatField()
    north = models.FloatField()
    east = models.FloatField()
    count = models.PositiveIntegerField('Masjidlar soni', default=0)
    synced_at = models.DateTimeField('Yuklangan', auto_now=True)

    class Meta:
        verbose_name = 'Yuklangan hudud'
        verbose_name_plural = 'Yuklangan hududlar'
        unique_together = [('south', 'west', 'north', 'east')]

    def __str__(self):
        return f'{self.south},{self.west} — {self.north},{self.east}'
