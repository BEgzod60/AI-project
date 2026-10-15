"""11 ta namoz turi.

Tavsif va rakatlar O'zbekiston musulmonlari idorasi sayti (muslim.uz/uz/c/prayer) dagi
jumlalarga asoslangan; har bir yozuvda o'sha jumla `source_quote` da aynan saqlanadi.
«Istig'for» uchun manbada mos namoz bo'limi topilmadi — yozuv «Tekshirilmoqda» holatida.
"""
from django.db import migrations

BASE = 'https://muslim.uz/uz/c/prayer'
PUBLISHER = 'O‘zbekiston musulmonlari idorasi rasmiy sayti (muslim.uz)'
CHECKED = 'Manba matni bilan aynan solishtirildi (import)'

RAKATLAR = (
    'Namoz rakatlardan iboratdir. Ularning tartibi quyidagicha: Bomdod – 2 rakat sunnat, 2 rakat farz. '
    'Peshin – 4 rakat sunnat, 4 rakat farz, 2 rakat sunnat. Asr – 4 rakat farz. Shom – 3 rakat farz, '
    '2 rakat sunnat. Xufton – 4 rakat farz, 2 rakat sunnat. Vitr – 3 rakat vojib.'
)
TURLARI = (
    'Farz namozlari – … besh vaqt namoz (bomdod, peshin, asr, shom, xufton) va juma namozi … '
    'Vojib namozlar – har kuni xuftondan so‘ng o‘qiladigan vitr namozi, ramazon va qurbon hayiti namozlari …'
)


def r(*pairs):
    return [{'count': c, 'kind': k} for c, k in pairs]


CATEGORIES = [
    # (raqam, slug, nomi, ikonka, rasm, tavsif, rakatlar, tuzilgan, manba nomi, langar, jumla)
    (1, 'bomdod', 'Bomdod', 'bomdod', '02', "Besh vaqt farz namozidan biri.",
     '2 rakat sunnat, 2 rakat farz', r((2, 'sunnat'), (2, 'farz')), 'Namoz rakatlari', 'block138', RAKATLAR + ' | ' + TURLARI),
    (2, 'peshin', 'Peshin', 'peshin', '04', "Besh vaqt farz namozidan biri.",
     '4 rakat sunnat, 4 rakat farz, 2 rakat sunnat', r((4, 'sunnat'), (4, 'farz'), (2, 'sunnat')), 'Namoz rakatlari', 'block138', RAKATLAR + ' | ' + TURLARI),
    (3, 'asr', 'Asr', 'asr', '08', "Besh vaqt farz namozidan biri.",
     '4 rakat farz', r((4, 'farz')), 'Namoz rakatlari', 'block138', RAKATLAR + ' | ' + TURLARI),
    (4, 'shom', 'Shom', 'shom', '03', "Besh vaqt farz namozidan biri.",
     '3 rakat farz, 2 rakat sunnat', r((3, 'farz'), (2, 'sunnat')), 'Namoz rakatlari', 'block138', RAKATLAR + ' | ' + TURLARI),
    (5, 'xufton', 'Xufton', 'xufton', '06', "Besh vaqt farz namozidan biri.",
     '4 rakat farz, 2 rakat sunnat', r((4, 'farz'), (2, 'sunnat')), 'Namoz rakatlari', 'block138', RAKATLAR + ' | ' + TURLARI),
    (6, 'vitr', 'Vitr', 'moon', '13', "Har kuni xuftondan so‘ng o‘qiladigan vojib namoz.",
     '3 rakat vojib, bir salom bilan', r((3, 'vojib')), 'Vitr namozi', 'block181',
     'Vitr namozi uch rakat bo‘lib, bir salom bilan o‘qiladi. | ' + RAKATLAR + ' | ' + TURLARI),
    (7, 'tahajjud', 'Tahajjud', 'sajda', '07', "Kechasi bir uxlab turib o‘qiladigan nafl namoz.",
     'Ozi ikki, ko‘pi sakkiz rakat', [], 'Tahajjud namozi', 'block199',
     'Bu namozning ozi ikki, ko‘pi sakkiz rakatdir. … Kechasi bir uxlab turib o‘qiladigan namoz '
     '«tahajjud namozi» deb ataladi.'),
    (8, 'nafl', 'Nafl', 'layers', '11', "Farzga qo‘shimcha tarzda, o‘z ixtiyori bilan o‘qiladigan namozlar.",
     'Kunduzgilari to‘rt rakatdan, kechqurungilari ikki rakatdan', [], 'Nafl namozlarini o‘qish tartibi', 'block201',
     '«Nafl namozi» deb kishi o‘z ixtiyori bilan farzga qo‘shimcha tarzda o‘qiydigan namozga aytiladi. '
     '(block190) | Kunduzgi nafl namozlarini to‘rt rakatdan, kechqurungi nafllarni esa ikki rakatdan o‘qish '
     'sunnat amallardandir. (block201)'),
    (9, 'juma', 'Juma', 'mosque', '10', "Juma kuni jamoat bo‘lib ado etiladigan farz namoz.",
     '2 rakat farz; oldidan 4 va keyin 4 rakat sunnat', r((4, 'sunnat'), (2, 'farz'), (4, 'sunnat')), 'Juma namozi', 'block184',
     'Shu kuni jamoat bo‘lib ado etiladigan namoz esa «juma namozi» deyiladi. … imom qavm bilan ikki rakat '
     'juma namozini o‘qiydi. Juma namozidan oldin bir salom bilan to‘rt rakat, undan keyin ham to‘rt rakat namoz '
     'o‘qish sunnati muakkadalardan hisoblanadi.'),
    (10, 'hayit', 'Hayit', 'people', '12', "Ramazon va Qurbon hayitlarida o‘qiladigan vojib namozlar.",
     'Har biri 2 rakat vojib', r((2, 'vojib')), 'Ikki iyd (hayit) namozlari', 'block185',
     'Ramazon hayitida ikki rakat «iydul fitr» namozini ado etish vojibdir. … Vojib bo‘lgan ikki rakatli '
     'qurbon hayiti namozi bu tartibda o‘qiladi.'),
]


def create(apps, schema_editor):
    PrayerCategory = apps.get_model('learning', 'PrayerCategory')
    for number, slug, name, icon, img, desc, rakats, breakdown, src, anchor, quote in CATEGORIES:
        PrayerCategory.objects.update_or_create(slug=slug, defaults=dict(
            number=number, name=name, icon=icon, image=f'/images/namoz/{img}.webp',
            description=desc, rakats=rakats, rakat_breakdown=breakdown,
            source_title=f'{PUBLISHER} — «{src}»', source_url=f'{BASE}#{anchor}', source_quote=quote,
            review_status='published', reviewed_by=CHECKED,
        ))
    # Manbada «Istig'for» nomli namoz bo'limi yo'q — taxmin qilinmaydi, tekshiruvga qoldiriladi
    PrayerCategory.objects.update_or_create(slug='istigfor', defaults=dict(
        number=11, name='Istig‘for', icon='dua', image='/images/namoz/05.webp',
        review_status='awaiting_review',
    ))


def remove(apps, schema_editor):
    apps.get_model('learning', 'PrayerCategory').objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [('learning', '0001_initial')]
    operations = [migrations.RunPython(create, remove)]
