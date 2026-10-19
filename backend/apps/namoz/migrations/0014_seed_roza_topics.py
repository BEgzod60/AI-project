"""Ro'za bo'limi uchun 2 ta mavzu (muslim.uz/uz/c/fasting tartibida).

Sarlavhalar manbadagi kabi; tavsif faqat mavzu nimani qamrab olishini bildiradi —
hukm, oyat yoki hadis yo'q. Matnlar `import_muslimuz --category roza` bilan qo'shiladi.
Rasmlar: frontend/public/images/roza/NN.webp.
"""
from django.db import migrations

TOPICS = [
    # (raqam, slug, sarlavha, tavsif, ikonka, rang)
    (1, 'roza-qanday-ibodat', 'Ro‘za qanday ibodat?',
     "Ro‘za ibodatining mohiyati va fazilati haqida.", 'moon', 'emerald'),
    (2, 'rozaning-darajalari', 'Ro‘zaning darajalari',
     "Ro‘zaning darajalari haqida.", 'layers', 'gold'),
]


def create_topics(apps, schema_editor):
    Topic = apps.get_model('namoz', 'Topic')
    for number, slug, title, summary, icon, theme in TOPICS:
        Topic.objects.update_or_create(
            category='roza', slug=slug,
            defaults={'number': number, 'title': title, 'summary': summary, 'icon': icon, 'theme': theme,
                      'image': f'/images/roza/{number:02d}.webp'},
        )


def remove_topics(apps, schema_editor):
    apps.get_model('namoz', 'Topic').objects.filter(category='roza').delete()


class Migration(migrations.Migration):
    dependencies = [('namoz', '0013_roza_category')]
    operations = [migrations.RunPython(create_topics, remove_topics)]
