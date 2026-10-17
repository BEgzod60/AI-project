"""«Namoz o'rganish» bo'limi: namoz turlari (kartalar).

Diniy ma'lumot (tavsif, rakatlar) faqat `review_status = PUBLISHED` bo'lsa ko'rsatiladi.
Chop etish uchun manba havolasi, manbadagi aynan jumla va tasdiqlagan shaxs majburiy
(`clean()` — admin formasi buni tekshiradi). Qolgan hollarda saytda «Tekshirilmoqda».
"""
from django.core.exceptions import ValidationError
from django.db import models

from apps.quran.sources import AYAH_AUDIO_RECITERS


class PrayerCategory(models.Model):
    class Icon(models.TextChoices):
        BOMDOD = 'bomdod', 'Tong'
        PESHIN = 'peshin', 'Quyosh (tush)'
        ASR = 'asr', 'Asr'
        SHOM = 'shom', 'Quyosh botishi'
        XUFTON = 'xufton', 'Hilol'
        MOON = 'moon', 'Hilol va yulduz'
        SAJDA = 'sajda', 'Sajda'
        LAYERS = 'layers', 'Qatlamlar'
        MOSQUE = 'mosque', 'Masjid'
        PEOPLE = 'people', 'Jamoa'
        DUA = 'dua', 'Duo'
        DROPLET = 'droplet', 'Tomchi (tahorat)'
        WAVES = 'waves', 'To\u2018lqin (g\u2018usl)'
        CLOCK = 'clock', 'Soat (qazo)'
        SHIELD = 'shield', 'Qalqon (xatolar)'

    class Group(models.TextChoices):
        NAMOZ = 'namoz', 'Namozlar'
        MAVZU = 'mavzu', 'Poklanish va qo\u2018shimcha darslar'

    class ReviewStatus(models.TextChoices):
        DRAFT = 'draft', 'Qoralama'
        AWAITING_REVIEW = 'awaiting_review', 'Tekshirilmoqda'
        PUBLISHED = 'published', 'Tasdiqlangan — chop etilgan'

    number = models.PositiveSmallIntegerField('Tartib raqami', unique=True)
    slug = models.SlugField('URL nomi', max_length=60, unique=True)
    name = models.CharField('Nomi', max_length=100)
    group = models.CharField('Guruh', max_length=10, choices=Group.choices, default=Group.NAMOZ)
    icon = models.CharField('Ikonka', max_length=20, choices=Icon.choices)
    description = models.CharField('Qisqa tavsif', max_length=255, blank=True)
    rakats = models.CharField(
        'Rakatlar', max_length=255, blank=True,
        help_text="Manbadagi kabi, masalan: «2 rakat sunnat, 2 rakat farz».",
    )
    rakat_breakdown = models.JSONField(
        "Rakatlar (tuzilgan)", default=list, blank=True,
        help_text='Kartadagi belgilar uchun: [{"count": 2, "kind": "sunnat"}, {"count": 2, "kind": "farz"}]',
    )
    image = models.CharField('Rasm', max_length=255, blank=True, help_text='Masalan /images/namoz/02.webp')

    source_title = models.CharField('Manba nomi', max_length=255, blank=True)
    source_url = models.URLField('Manba havolasi', blank=True)
    source_quote = models.TextField(
        "Manbadagi aynan jumla", blank=True,
        help_text="Tavsif va rakatlar asoslangan jumla — tekshiruvchi solishtirishi uchun (saytda ko'rsatilmaydi).",
    )
    review_status = models.CharField(
        'Tekshiruv holati', max_length=20, choices=ReviewStatus.choices, default=ReviewStatus.AWAITING_REVIEW
    )
    reviewed_by = models.CharField('Tasdiqlagan', max_length=150, blank=True)
    reviewed_at = models.DateField('Tasdiqlangan sana', null=True, blank=True)
    is_visible = models.BooleanField("Saytda ko'rinadi", default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['number']
        verbose_name = 'Namoz turi'
        verbose_name_plural = 'Namoz turlari'

    def __str__(self):
        return f'{self.number:02d}. {self.name}'

    @property
    def is_published(self):
        return self.review_status == self.ReviewStatus.PUBLISHED

    def clean(self):
        if self.is_published:
            missing = [
                label for field, label in [
                    ('source_url', 'manba havolasi'),
                    ('source_quote', 'manbadagi aynan jumla'),
                    ('reviewed_by', 'tasdiqlagan shaxs'),
                ] if not getattr(self, field)
            ]
            if missing:
                raise ValidationError(
                    {'review_status': "Chop etish uchun to'ldirilishi kerak: " + ', '.join(missing) + '.'}
                )
        for item in self.rakat_breakdown or []:
            if not (isinstance(item, dict) and isinstance(item.get('count'), int) and item.get('kind') in ('farz', 'vojib', 'sunnat', 'nafl')):
                raise ValidationError({'rakat_breakdown': 'Har bir element: {"count": son, "kind": farz|vojib|sunnat|nafl}.'})


class ReviewStatus(models.TextChoices):
    DRAFT = 'draft', 'Qoralama'
    AWAITING_REVIEW = 'awaiting_review', 'Tekshirilmoqda'
    PUBLISHED = 'published', 'Tasdiqlangan — chop etilgan'


class ReviewedContent(models.Model):
    """Diniy mazmun uchun umumiy maydonlar: manba va tekshiruv holati."""

    source_title = models.CharField('Manba nomi', max_length=255, blank=True)
    source_url = models.URLField('Manba havolasi', blank=True)
    review_status = models.CharField(
        'Tekshiruv holati', max_length=20, choices=ReviewStatus.choices, default=ReviewStatus.AWAITING_REVIEW
    )
    reviewed_by = models.CharField('Tasdiqlagan', max_length=150, blank=True)
    reviewed_at = models.DateField('Tasdiqlangan sana', null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    @property
    def is_published(self):
        return self.review_status == ReviewStatus.PUBLISHED

    def clean(self):
        if self.is_published and not (self.source_url and self.reviewed_by):
            raise ValidationError(
                {'review_status': "Chop etish uchun manba havolasi va tasdiqlagan shaxs ko'rsatilishi kerak."}
            )


class Recitation(ReviewedContent):
    """Namozda o'qiladigan sura yoki duo: lotincha o'qilishi va ma'nosi (arab yozuvi saqlanmaydi)."""

    class Kind(models.TextChoices):
        SURA = 'sura', 'Sura'
        DUA = 'dua', 'Duo / zikr'

    slug = models.SlugField(max_length=60, unique=True)
    name = models.CharField('Nomi', max_length=120)
    kind = models.CharField('Turi', max_length=10, choices=Kind.choices)
    surah_number = models.PositiveSmallIntegerField("Sura raqami (Qur'on)", null=True, blank=True)
    transliteration = models.TextField("O'qilishi (lotin)", help_text="Manbadagi kabi, o'zgartirmasdan.")
    meaning = models.TextField("Ma'nosi (o'zbekcha)", blank=True)
    is_zam_sura = models.BooleanField(
        'Zam sura sifatida tanlanadi', default=False,
        help_text="Fotihadan keyin o'qiladigan qisqa suralar ro'yxatida ko'rinadi.",
    )
    order = models.PositiveSmallIntegerField('Tartib', default=0)

    class Meta:
        ordering = ['order', 'id']
        verbose_name = 'Sura / duo'
        verbose_name_plural = 'Suralar va duolar'

    def __str__(self):
        return self.name


class AudioSource(models.Model):
    """Sura/duo audiosi. Saytda faqat tasdiqlangan va foydalanishga ruxsati bor audio chiqadi."""

    class Provider(models.TextChoices):
        TANZIL = 'tanzil', 'Tanzil Project (tanzil.net)'
        MUSLIM_UZ = 'muslim_uz', 'muslim.uz'
        OTHER = 'other', 'Boshqa (to‘g‘ridan-to‘g‘ri havola)'

    class License(models.TextChoices):
        PERMITTED = 'permitted', 'Ruxsat berilgan (hujjat bor)'
        API_TERMS = 'api_terms', 'Rasmiy API shartlari asosida (oqim, yuklab tarqatilmaydi)'
        PROJECT_DECISION = 'project_decision', 'Loyiha egasi qarori (manba shartlari hujjatlashtirilmagan)'
        UNKNOWN = 'unknown', 'Aniqlanmagan'
        NOT_PERMITTED = 'not_permitted', 'Ruxsat yo‘q'

    class Verification(models.TextChoices):
        PENDING = 'pending', 'Tekshirilmoqda'
        APPROVED = 'approved', 'Tasdiqlangan'
        REJECTED = 'rejected', 'Rad etilgan'

    PLAYABLE_LICENSES = (License.PERMITTED, License.API_TERMS, License.PROJECT_DECISION)

    recitation = models.ForeignKey(Recitation, on_delete=models.CASCADE, related_name='audio_sources', verbose_name='Sura / duo')
    provider = models.CharField('Manba turi', max_length=20, choices=Provider.choices)
    audio_url = models.URLField(
        'Audio havolasi', blank=True,
        help_text="Tanzil uchun bo'sh qoldiring — havola sura/oyat raqamidan tuziladi.",
    )
    tanzil_reciter = models.CharField(
        'Tanzil qorisi', max_length=20, choices=AYAH_AUDIO_RECITERS, default='afasy', blank=True,
    )
    qf_surah = models.PositiveSmallIntegerField(
        'Sura raqami (audio uchun)', null=True, blank=True,
        help_text="Bo'sh bo'lsa — sura/duoning o'z raqami. Duo Qur'on oyatidan bo'lsa shu yerda ko'rsating.",
    )
    qf_verse = models.PositiveSmallIntegerField(
        'Oyat raqami', null=True, blank=True, help_text="Faqat bitta oyat tilovati kerak bo'lsa (masalan Robbana — 201).",
    )
    reciter = models.CharField('Qori', max_length=150, blank=True)
    display_note = models.CharField(
        'Saytdagi izoh', max_length=255, blank=True,
        help_text="Pleyer ostida ko'rsatiladi, masalan: «Qur'on tilovati: Baqara surasi, 201-oyat».",
    )
    source_url = models.URLField('Manba sahifasi')
    license_status = models.CharField('Foydalanish ruxsati', max_length=20, choices=License.choices, default=License.UNKNOWN)
    verification_status = models.CharField('Tasdiq holati', max_length=20, choices=Verification.choices, default=Verification.PENDING)
    verified_by = models.CharField('Tasdiqlagan', max_length=150, blank=True)
    permission_note = models.TextField(
        'Ruxsat asosi', blank=True,
        help_text="Foydalanish ruxsati qayerda yozilgan (havola va iqtibos) — masalan saytning foydalanish shartlari.",
    )
    last_checked_at = models.DateTimeField('Oxirgi tekshiruv', null=True, blank=True)
    last_http_status = models.PositiveSmallIntegerField('Oxirgi tekshiruv natijasi (HTTP)', null=True, blank=True)
    notes = models.TextField('Izoh', blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Audio manba'
        verbose_name_plural = 'Audio manbalar'

    def __str__(self):
        return f'{self.recitation} — {self.get_provider_display()}'

    @property
    def surah(self):
        if self.qf_surah:
            return self.qf_surah
        return self.recitation.surah_number if self.recitation_id else None

    @property
    def is_playable(self):
        return (
            self.verification_status == self.Verification.APPROVED
            and self.license_status in self.PLAYABLE_LICENSES
        )

    def clean(self):
        if self.provider == self.Provider.TANZIL:
            if not self.surah:
                raise ValidationError('Tanzil audiosi uchun sura raqami kerak (yozuvda yoki «Sura raqami» maydonida).')
            if not self.tanzil_reciter:
                raise ValidationError({'tanzil_reciter': 'Qori tanlanishi kerak.'})
        elif not self.audio_url:
            raise ValidationError({'audio_url': 'Audio havolasi kerak.'})
        if self.verification_status == self.Verification.APPROVED and not self.verified_by:
            raise ValidationError({'verified_by': 'Tasdiqlagan shaxs ko‘rsatilishi kerak.'})


class LessonStep(ReviewedContent):
    """Namoz tartibidagi bitta qadam. Matn manbadan aynan olinadi."""

    category = models.ForeignKey(PrayerCategory, on_delete=models.CASCADE, related_name='steps', verbose_name='Namoz turi')
    order = models.PositiveSmallIntegerField('Tartib', default=0)
    title = models.CharField('Sarlavha', max_length=120)
    text = models.TextField('Matn (umumiy / erkaklar uchun)')
    text_female = models.TextField(
        'Ayollar uchun farq', blank=True,
        help_text="Faqat manbada tasdiqlangan farq bo'lsa — manbadagi jumla aynan.",
    )
    female_source_url = models.URLField('Ayollar farqi manbasi', blank=True)
    recitations = models.ManyToManyField(Recitation, blank=True, related_name='steps', verbose_name='O‘qiladigan sura/duolar')
    zam_sura_choice = models.BooleanField('Zam surani tanlash mumkin', default=False)
    images = models.JSONField(
        'Rasmlar', default=list, blank=True,
        help_text='[{"src": "/images/namoz/qadam/sajda.webp", "caption": "Sajda"}, ...] — birinchisi asosiy rasm.',
    )

    class Meta:
        ordering = ['category', 'order', 'id']
        verbose_name = 'Dars qadami'
        verbose_name_plural = 'Dars qadamlari'

    def __str__(self):
        return f'{self.category.name}: {self.order}. {self.title}'


class LessonNote(ReviewedContent):
    """Dars sahifasidagi tablar (Ma'lumot, Sunnat va farz, Vaqti, Savol-javob) mazmuni."""

    class Tab(models.TextChoices):
        INFO = 'malumot', "Ma'lumot"
        SUNNAT_FARZ = 'sunnat_farz', 'Sunnat va farz'
        TIME = 'vaqti', 'Vaqti'
        FAQ = 'savol_javob', 'Savol-javob'
        TIPS = 'maslahat', 'Maslahatlar'

    category = models.ForeignKey(PrayerCategory, on_delete=models.CASCADE, related_name='notes', verbose_name='Namoz turi')
    tab = models.CharField('Tab', max_length=20, choices=Tab.choices)
    order = models.PositiveSmallIntegerField('Tartib', default=0)
    title = models.CharField('Sarlavha', max_length=150)
    text = models.TextField('Matn', help_text="Manbadagi jumla aynan.")

    class Meta:
        ordering = ['category', 'tab', 'order', 'id']
        verbose_name = 'Dars izohi'
        verbose_name_plural = 'Dars izohlari (tablar)'

    def __str__(self):
        return f'{self.category.name} / {self.get_tab_display()}: {self.title}'
