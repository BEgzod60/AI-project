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
    image = models.URLField(
        'Rasm', max_length=500, blank=True,
        help_text="OSM teglaridagi rasm (Wikimedia Commons'ning kichik nusxasi). O'ylab topilmaydi.",
    )
    built = models.CharField('Qurilgan', max_length=60, blank=True, help_text="Wikidata (P571) yoki OSM start_date")
    wikipedia = models.URLField('Vikipediya', max_length=500, blank=True)
    website = models.URLField('Veb-sayt', max_length=500, blank=True)
    phone = models.CharField('Telefon (OSM)', max_length=80, blank=True)
    opening_hours = models.CharField(
        'Ish vaqti (OSM)', max_length=255, blank=True, help_text='OSM opening_hours formatida, masalan Mo-Su 05:00-22:00',
    )
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


class DirectoryEntry(models.Model):
    """Masjidlar katalogidagi yozuv (masjid.uz — Islom.uz). Faqat faktlar: imom-xatib, manzil, telefon.

    Katalogda koordinata yo'q — OSM'dagi masjidga nom bo'yicha moslashtiriladi (`mosque`).
    Matn va rasmlar ko'chirilmaydi; batafsil ma'lumot uchun manba sahifasiga havola beriladi.
    """

    source_url = models.URLField('Manba sahifasi', max_length=500, unique=True)
    region = models.CharField('Hudud', max_length=60, help_text='Masalan toshkent-sh')
    district = models.CharField('Tuman', max_length=80, blank=True)
    name = models.CharField('Nomi', max_length=255)
    imam = models.CharField('Imom-xatib', max_length=255, blank=True)
    address = models.CharField('Manzil', max_length=500, blank=True)
    phone = models.CharField('Telefon', max_length=80, blank=True)
    mosque = models.OneToOneField(
        Mosque, null=True, blank=True, on_delete=models.SET_NULL, related_name='directory', verbose_name='Xaritadagi masjid',
    )
    fetched_at = models.DateTimeField('Olingan', auto_now=True)

    class Meta:
        verbose_name = 'Katalog yozuvi (masjid.uz)'
        verbose_name_plural = 'Katalog yozuvlari (masjid.uz)'
        ordering = ['region', 'district', 'name']

    def __str__(self):
        return self.name


class MosqueCount(models.Model):
    """Masjidlar soni — faqat manbasi ko'rsatilgan rasmiy yoki katalog ma'lumoti."""

    scope = models.CharField('Hudud', max_length=60, unique=True, help_text="uzbekistan, toshkent-sh, ...")
    label = models.CharField('Nomi', max_length=120)
    count = models.PositiveIntegerField('Soni')
    source_title = models.CharField('Manba', max_length=255)
    source_url = models.URLField('Manba havolasi', max_length=500)
    as_of = models.DateField('Sana')

    class Meta:
        verbose_name = 'Masjidlar soni'
        verbose_name_plural = 'Masjidlar soni'

    def __str__(self):
        return f'{self.label}: {self.count}'
