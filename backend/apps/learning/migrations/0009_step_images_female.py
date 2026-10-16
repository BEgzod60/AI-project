from django.db import migrations

from apps.learning.step_images import images_for


def fill_images(apps, schema_editor):
    """Qadam rasmlariga ayollar varianti (src_female) qo'shiladi."""
    LessonStep = apps.get_model('learning', 'LessonStep')
    for step in LessonStep.objects.select_related('category'):
        step.images = images_for(step.title, step.category.slug)
        step.save(update_fields=['images'])


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0008_step_images'),
    ]

    operations = [
        migrations.RunPython(fill_images, migrations.RunPython.noop),
    ]
