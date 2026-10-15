"""Iymon bo'limining 1–13 mavzulariga designs/01–13 rasmlari (frontend/public/images/namoz/NN.webp)."""
from django.db import migrations


def set_images(apps, schema_editor):
    Topic = apps.get_model('namoz', 'Topic')
    for number in range(1, 14):
        # Faqat rasmi bo'sh mavzular — admin qo'lda o'rnatgan rasmga tegmaymiz
        Topic.objects.filter(category='iymon', number=number, image='').update(
            image=f'/images/namoz/{number:02d}.webp'
        )


def unset_images(apps, schema_editor):
    Topic = apps.get_model('namoz', 'Topic')
    for number in range(1, 14):
        Topic.objects.filter(category='iymon', number=number, image=f'/images/namoz/{number:02d}.webp').update(image='')


class Migration(migrations.Migration):
    dependencies = [('namoz', '0008_seed_iymon_topics')]
    operations = [migrations.RunPython(set_images, unset_images)]
