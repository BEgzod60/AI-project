"""12 ta mavzuni yaratadi.

Faqat sarlavha va mavzu nimani qamrab olishini bildiruvchi neytral tavsif kiritiladi.
Hukmlar, oyatlar va hadislar bu yerda YO'Q — ular admin panel orqali, mutaxassis
tekshiruvi va manbasi bilan qo'shiladi (Section / SourceReference).
"""
from django.db import migrations

TOPICS = [
    # (raqam, slug, sarlavha, tavsif, ikonka, rang)
    (1, 'namozga-poklanish', 'Namozga poklanish',
     "Namozdan oldingi poklik: najosatdan tozalanish, poklik turlari va ularning ahamiyati.", 'droplet', 'cream'),
    (2, 'gusl', "G‘usl",
     "G‘uslning farzlari, sunnatlari va uni ado etish tartibi.", 'waves', 'emerald'),
    (3, 'tahorat', 'Tahorat',
     "Tahoratning farzlari, sunnatlari, tartibi va uni buzadigan holatlar.", 'hands_water', 'gold'),
    (4, 'tayammum', 'Tayammum',
     "Tayammumning shartlari, farzlari va qilinish tartibi.", 'earth', 'forest'),
    (5, 'namoz', 'Namoz',
     "Namozning shartlari, farzlari, vojiblari, sunnatlari va o‘qilish tartibi.", 'mosque', 'sand'),
    (6, 'namozda-oqiladigan-suralar-va-duolar', "Namozda o‘qiladigan kichik suralar va duolar",
     "Namozda o‘qiladigan qisqa suralar va duolar: arabcha matni, o‘qilishi va ma’nosi.", 'book', 'teal'),
    (7, 'namozdan-song-duolar', "Namozdan so‘ng o‘qiladigan duolar",
     "Farz namozlaridan keyin o‘qiladigan zikr va duolar.", 'dua', 'sand'),
    (8, 'qazo-namozlari', "Qazo namozlarini ado etish",
     "O‘z vaqtida o‘qilmagan namozlarni qazo qilish tartibi.", 'clock', 'teal'),
    (9, 'turli-namozlar', 'Turli namozlar',
     "Juma, hayit, janoza, vitr, tarovih va boshqa namozlar haqida.", 'layers', 'cream'),
    (10, 'etikof', "E’tikof o‘tirish",
     "E’tikofning turlari, shartlari va odoblari.", 'moon', 'emerald'),
    (11, 'tilovat-sajdasi', 'Tilovat sajdasi',
     "Sajda oyatlari va tilovat sajdasini ado etish tartibi.", 'sajda', 'gold'),
    (12, 'ibratli-namozlar', 'Ibratli namozlar',
     "Salaf solihlar va ulamolarning namozga munosabati haqidagi ibratli voqealar.", 'lantern', 'forest'),
]


def create_topics(apps, schema_editor):
    Topic = apps.get_model('namoz', 'Topic')
    for number, slug, title, summary, icon, theme in TOPICS:
        Topic.objects.update_or_create(
            slug=slug,
            defaults={'number': number, 'title': title, 'summary': summary, 'icon': icon, 'theme': theme},
        )


def remove_topics(apps, schema_editor):
    Topic = apps.get_model('namoz', 'Topic')
    Topic.objects.filter(slug__in=[t[1] for t in TOPICS]).delete()


class Migration(migrations.Migration):
    dependencies = [('namoz', '0001_initial')]
    operations = [migrations.RunPython(create_topics, remove_topics)]
