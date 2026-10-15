"""Iymon bo'limi uchun 13 ta mavzu (muslim.uz/uz/c/iyman tartibida).

Sarlavhalar manbadagi kabi; tavsif faqat mavzu nimani qamrab olishini bildiradi —
hukm, oyat yoki hadis yo'q. Matnlar `import_muslimuz --category iymon` bilan qo'shiladi.
"""
from django.db import migrations

TOPICS = [
    # (raqam, slug, sarlavha, tavsif, ikonka, rang)
    (1, 'din-va-shariat', 'Din va shariat nima?',
     "Din va shariat tushunchalarining ma’nosi haqida.", 'scroll', 'cream'),
    (2, 'iymon-nima', 'Iymon nima?',
     "Iymon so‘zining ma’nosi va uning asoslari haqida.", 'heart', 'emerald'),
    (3, 'alloh-taologa-iymon', 'Alloh taologa iymon',
     "Alloh taologa iymon keltirishning mazmuni haqida.", 'star8', 'gold'),
    (4, 'farishtalarga-iymon', 'Farishtalarga iymon',
     "Farishtalarga iymon keltirish haqida.", 'wings', 'forest'),
    (5, 'islom-va-iymon-shartlari', 'Islom va imon shartlari',
     "Islom va iymon shartlari haqida qisqacha.", 'pillars', 'sand'),
    (6, 'ilohiy-kitoblarga-iymon', 'Ilohiy kitoblarga iymon',
     "Ilohiy kitoblarga iymon keltirish haqida.", 'book', 'teal'),
    (7, 'paygambarlarga-iymon', 'Payg‘ambarlarga iymon',
     "Payg‘ambarlarga iymon keltirish haqida.", 'lantern', 'sand'),
    (8, 'ohirat-kuniga-iymon', 'Ohirat kuniga iymon',
     "Oxirat kuniga iymon keltirish haqida.", 'horizon', 'teal'),
    (9, 'qadarga-iymon', 'Qadarga iymon',
     "Qadarga iymon keltirish haqida.", 'hourglass', 'cream'),
    (10, 'qayta-tirilishga-iymon', 'O‘lgandan so‘ng qayta tirilishga iymon',
     "O‘lgandan so‘ng qayta tirilishga iymon keltirish haqida.", 'sprout', 'emerald'),
    (11, 'aqida', 'Aqida',
     "Aqida tushunchasi va uning ahamiyati haqida.", 'shield', 'gold'),
    (12, 'ahli-sunna-val-jamoa', 'Ahli sunna val jamoa',
     "Ahli sunna val jamoa tushunchasi haqida.", 'people', 'forest'),
    (13, 'halol-va-harom', 'Halol va harom',
     "Halol va harom tushunchalari haqida.", 'scale', 'cream'),
]


def create_topics(apps, schema_editor):
    Topic = apps.get_model('namoz', 'Topic')
    for number, slug, title, summary, icon, theme in TOPICS:
        Topic.objects.update_or_create(
            category='iymon', slug=slug,
            defaults={'number': number, 'title': title, 'summary': summary, 'icon': icon, 'theme': theme},
        )


def remove_topics(apps, schema_editor):
    apps.get_model('namoz', 'Topic').objects.filter(category='iymon').delete()


class Migration(migrations.Migration):
    dependencies = [('namoz', '0007_topic_category')]
    operations = [migrations.RunPython(create_topics, remove_topics)]
