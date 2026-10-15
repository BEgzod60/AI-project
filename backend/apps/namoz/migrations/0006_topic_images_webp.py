"""Barcha 12 mavzu uchun kvadrat, keskinlashtirilgan WebP rasmlar (frontend/public/images/namoz/NN.webp)."""
from django.db import migrations


def set_webp(apps, schema_editor):
    Topic = apps.get_model('namoz', 'Topic')
    for number in range(1, 13):
        # Faqat bo'sh yoki avvalgi standart yo'l — admin qo'lda o'zgartirgan rasmga tegmaymiz
        Topic.objects.filter(number=number, image__in=['', f'/images/namoz/{number:02d}.jpg']).update(
            image=f'/images/namoz/{number:02d}.webp'
        )


def back_to_jpg(apps, schema_editor):
    Topic = apps.get_model('namoz', 'Topic')
    for number in range(1, 13):
        Topic.objects.filter(number=number, image=f'/images/namoz/{number:02d}.webp').update(
            image=f'/images/namoz/{number:02d}.jpg' if number <= 6 else ''
        )


class Migration(migrations.Migration):
    dependencies = [('namoz', '0005_topic_images')]
    operations = [migrations.RunPython(set_webp, back_to_jpg)]
