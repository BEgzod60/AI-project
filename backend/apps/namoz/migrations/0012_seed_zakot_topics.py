"""Zakot bo'limi uchun 10 ta mavzu (muslim.uz/uz/c/zakot tartibida).

Sarlavhalar manbadagi kabi; tavsif faqat mavzu nimani qamrab olishini bildiradi —
hukm, oyat yoki hadis yo'q. Matnlar `import_muslimuz --category zakot` bilan qo'shiladi.
Rasmlar: frontend/public/images/zakot/NN.webp.
"""
from django.db import migrations

TOPICS = [
    # (raqam, slug, sarlavha, tavsif, ikonka, rang)
    (1, 'zakot-nima', 'Zakot nima?',
     "Zakot so‘zining ma’nosi va uning dindagi o‘rni haqida.", 'hand_coin', 'emerald'),
    (2, 'zakotning-fiqhiy-hukmlari', 'Zakotning fiqhiy hukmlari',
     "Zakotning fiqhiy hukmlari va shartlari haqida.", 'scale', 'cream'),
    (3, 'chorva-hayvonlarining-zakoti', 'Chorva hayvonlarining zakoti',
     "Chorva hayvonlaridan zakot chiqarish haqida.", 'sheep', 'forest'),
    (4, 'tilla-va-kumushning-zakoti', 'Tilla va kumushning zakoti',
     "Tilla va kumushdan zakot chiqarish haqida.", 'coins', 'gold'),
    (5, 'naqd-puldan-olinadigan-zakot', 'Naqd puldan olinadigan zakot',
     "Naqd puldan zakot chiqarish haqida.", 'banknote', 'teal'),
    (6, 'tijorat-molining-zakoti', 'Tijorat molidan qiymatini zakotga chiqarish',
     "Tijorat molining qiymatidan zakot chiqarish haqida.", 'store', 'sand'),
    (7, 'tilla-kumush-buyumlar-zakoti', 'Tilla-kumush buyumlar, idishlar va taqinchoqlarning zakoti',
     "Tilla-kumush buyumlar, idishlar va taqinchoqlarning zakoti haqida.", 'ring', 'cream'),
    (8, 'qimmatbaho-toshlarning-zakoti', 'Qimmatbaho toshlarning zakoti',
     "Qimmatbaho toshlarning zakoti haqida.", 'gem', 'emerald'),
    (9, 'zakot-olishi-mumkin-bolmaganlar', 'Zakot olishi mumkin bo‘lmaganlar',
     "Zakot berilmaydigan kishilar haqida.", 'people', 'gold'),
    (10, 'zakot-beruvchining-vazifalari', 'Zakot beruvchining vazifalari',
     "Zakot beruvchining vazifalari haqida.", 'scroll', 'forest'),
]


def create_topics(apps, schema_editor):
    Topic = apps.get_model('namoz', 'Topic')
    for number, slug, title, summary, icon, theme in TOPICS:
        Topic.objects.update_or_create(
            category='zakot', slug=slug,
            defaults={'number': number, 'title': title, 'summary': summary, 'icon': icon, 'theme': theme,
                      'image': f'/images/zakot/{number:02d}.webp'},
        )


def remove_topics(apps, schema_editor):
    apps.get_model('namoz', 'Topic').objects.filter(category='zakot').delete()


class Migration(migrations.Migration):
    dependencies = [('namoz', '0011_zakot_category')]
    operations = [migrations.RunPython(create_topics, remove_topics)]
