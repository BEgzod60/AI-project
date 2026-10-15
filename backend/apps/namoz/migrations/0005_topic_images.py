"""01–06 mavzularga designs/01–06 rasmlarini biriktiradi (frontend/public/images/namoz/)."""
from django.db import migrations


def set_images(apps, schema_editor):
    Topic = apps.get_model('namoz', 'Topic')
    for number in range(1, 7):
        Topic.objects.filter(number=number, image='').update(image=f'/images/namoz/{number:02d}.jpg')


def unset_images(apps, schema_editor):
    Topic = apps.get_model('namoz', 'Topic')
    Topic.objects.filter(image__startswith='/images/namoz/').update(image='')


class Migration(migrations.Migration):
    dependencies = [('namoz', '0004_topic_image')]
    operations = [migrations.RunPython(set_images, unset_images)]
