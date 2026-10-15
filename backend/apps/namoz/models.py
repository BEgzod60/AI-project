"""Namoz bo'limi kontenti.

Diniy ma'lumot faqat tekshiruvdan o'tgan va manbasi ko'rsatilgan holda chop etiladi:
bo'lim (Section) saytda ko'rinishi uchun status = PUBLISHED bo'lishi VA kamida bitta
manbaga (SourceReference) ega bo'lishi shart. Qolgan hollarda mavzu sahifasida
"tekshiruv kutilmoqda" holati ko'rsatiladi.
"""
from django.db import models


class Topic(models.Model):
    """Bo'lim (Namoz, Iymon, ...) mavzusi — kartochka va batafsil sahifa."""

    class Category(models.TextChoices):
        NAMOZ = 'namoz', 'Namoz'
        IYMON = 'iymon', 'Iymon'

    class Icon(models.TextChoices):
        DROPLET = 'droplet', 'Tomchi (poklanish)'
        WAVES = 'waves', "To'lqin (g'usl)"
        HANDS_WATER = 'hands_water', "Qo'llar (tahorat)"
        EARTH = 'earth', 'Tuproq (tayammum)'
        MOSQUE = 'mosque', 'Masjid (namoz)'
        BOOK = 'book', 'Kitob (suralar)'
        DUA = 'dua', 'Duo'
        CLOCK = 'clock', 'Soat (qazo)'
        LAYERS = 'layers', 'Qatlamlar (turli namozlar)'
        MOON = 'moon', "Oy (e'tikof)"
        SAJDA = 'sajda', 'Sajda'
        LANTERN = 'lantern', 'Chiroq (ibrat)'
        # Iymon bo'limi
        SCROLL = 'scroll', "O'ram (din va shariat)"
        HEART = 'heart', 'Qalb (iymon)'
        STAR8 = 'star8', 'Sakkiz qirrali yulduz'
        WINGS = 'wings', 'Qanotlar (farishtalar)'
        PILLARS = 'pillars', 'Ustunlar (shartlar)'
        HORIZON = 'horizon', 'Ufq (oxirat)'
        HOURGLASS = 'hourglass', 'Qum soat (qadar)'
        SPROUT = 'sprout', 'Nihol (qayta tirilish)'
        SHIELD = 'shield', 'Qalqon (aqida)'
        PEOPLE = 'people', 'Jamoa'
        SCALE = 'scale', 'Tarozi (halol va harom)'

    class Theme(models.TextChoices):
        EMERALD = 'emerald', 'Zumrad'
        CREAM = 'cream', 'Krem'
        FOREST = 'forest', "To'q yashil"
        GOLD = 'gold', 'Oltin'
        TEAL = 'teal', 'Firuza'
        SAND = 'sand', 'Qum'

    category = models.CharField(
        "Bo'lim", max_length=20, choices=Category.choices, default=Category.NAMOZ, db_index=True
    )
    number = models.PositiveSmallIntegerField('Tartib raqami')
    slug = models.SlugField('URL nomi', max_length=80)
    title = models.CharField('Sarlavha', max_length=150)
    summary = models.CharField(
        'Qisqa tavsif',
        max_length=255,
        help_text="Mavzu nimani qamrab olishi haqida neytral tavsif. Hukm yoki dalil yozilmaydi.",
    )
    icon = models.CharField('Ikonka', max_length=20, choices=Icon.choices)
    theme = models.CharField('Rang uslubi', max_length=20, choices=Theme.choices)
    image = models.CharField(
        'Rasm', max_length=255, blank=True,
        help_text="Kartochka rasmi manzili, masalan /images/namoz/01.jpg (frontend/public ichida).",
    )
    is_visible = models.BooleanField("Saytda ko'rinadi", default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category', 'number']
        verbose_name = 'Mavzu'
        verbose_name_plural = 'Mavzular'
        constraints = [
            models.UniqueConstraint(fields=['category', 'number'], name='topic_unique_number_per_category'),
            models.UniqueConstraint(fields=['category', 'slug'], name='topic_unique_slug_per_category'),
        ]

    def __str__(self):
        return f'{self.number:02d}. {self.title}'


class Section(models.Model):
    """Mavzu sahifasidagi tuzilgan bo'lim."""

    class Kind(models.TextChoices):
        TEXT = 'text', 'Matn'
        STEPS = 'steps', 'Bosqichlar (tartib)'
        CARDS = 'cards', "Ma'lumot kartalari"
        NOTE = 'note', 'Muhim eslatma'

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Qoralama'
        AWAITING_REVIEW = 'awaiting_review', 'Tekshiruv kutilmoqda'
        PUBLISHED = 'published', 'Tekshirilgan — chop etilgan'

    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='sections', verbose_name='Mavzu')
    order = models.PositiveSmallIntegerField('Tartib', default=0)
    title = models.CharField('Sarlavha', max_length=200)
    kind = models.CharField("Ko'rinish turi", max_length=10, choices=Kind.choices, default=Kind.TEXT)
    body = models.TextField(
        'Matn',
        blank=True,
        help_text="Qisqa kirish matni. Har bir xatboshi yangi qatordan.",
    )
    content_html = models.TextField(
        'Formatlangan matn (HTML)',
        blank=True,
        help_text=(
            "Manbadan olingan formatlangan matn. Ruxsat etilgan teglar: p, strong, em, h3, ol, ul, li, "
            "br; arabcha matn uchun <p class=\"arabic\" dir=\"rtl\">. Chiqarishda tozalanadi."
        ),
    )
    source_key = models.CharField(
        'Manbadagi ID', max_length=60, blank=True, db_index=True,
        help_text="Import qilingan bo'limning manbadagi identifikatori (masalan muslim.uz:block120).",
    )
    status = models.CharField('Holati', max_length=20, choices=Status.choices, default=Status.AWAITING_REVIEW)
    reviewed_by = models.CharField('Tekshirgan mutaxassis', max_length=150, blank=True)
    reviewed_at = models.DateField('Tekshirilgan sana', null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['topic__category', 'topic__number', 'order', 'id']
        verbose_name = "Bo'lim"
        verbose_name_plural = "Bo'limlar"

    def __str__(self):
        return f'{self.topic.title} — {self.title}'


class SectionItem(models.Model):
    """Bosqich (steps) yoki ma'lumot kartasi (cards) elementi."""

    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='items', verbose_name="Bo'lim")
    order = models.PositiveSmallIntegerField('Tartib', default=0)
    title = models.CharField('Sarlavha', max_length=200)
    body = models.TextField('Matn', blank=True)

    class Meta:
        ordering = ['order', 'id']
        verbose_name = 'Element'
        verbose_name_plural = 'Elementlar (bosqich yoki karta)'

    def __str__(self):
        return self.title


class SourceReference(models.Model):
    """Bo'lim ma'lumotlarining manbasi: kitob, oyat yoki hadis to'plami."""

    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='sources', verbose_name="Bo'lim")
    title = models.CharField('Manba nomi', max_length=255, help_text="Masalan: kitob nomi yoki Qur'on surasi")
    author = models.CharField('Muallif', max_length=255, blank=True)
    reference = models.CharField(
        "Aniq joyi", max_length=255, blank=True, help_text="Jild, bet, bob, hadis raqami yoki oyat raqami"
    )
    url = models.URLField('Havola', blank=True)

    class Meta:
        ordering = ['id']
        verbose_name = 'Manba'
        verbose_name_plural = 'Manbalar'

    def __str__(self):
        return self.title
