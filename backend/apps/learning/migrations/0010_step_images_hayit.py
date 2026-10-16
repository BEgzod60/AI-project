from django.db import migrations

from apps.learning.step_images import images_for


def fill_images(apps, schema_editor):
    """Hayit namozi qadamlariga rasmlar (erkaklar va ayollar uchun)."""
    LessonStep = apps.get_model('learning', 'LessonStep')
    for step in LessonStep.objects.filter(category__slug='hayit'):
        step.images = images_for(step.title, 'hayit')
        step.save(update_fields=['images'])


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0009_step_images_female'),
    ]

    operations = [
        migrations.RunPython(fill_images, migrations.RunPython.noop),
    ]
