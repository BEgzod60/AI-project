from django.db import migrations

from apps.learning.step_images import images_for


def fill_images(apps, schema_editor):
    """Juma namozi qadamlariga rasmlar (faqat erkaklar uchun)."""
    LessonStep = apps.get_model('learning', 'LessonStep')
    for step in LessonStep.objects.filter(category__slug='juma'):
        step.images = images_for(step.title, 'juma')
        step.save(update_fields=['images'])


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0010_step_images_hayit'),
    ]

    operations = [
        migrations.RunPython(fill_images, migrations.RunPython.noop),
    ]
