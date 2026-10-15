"""«Istig'for» namoz turi olib tashlanadi: muslim.uz da bunday namoz bo'yicha manba topilmadi
(namoz bo'limida ham, sayt qidiruvida ham — 2026-10-15 tekshiruvi)."""
from django.db import migrations


def remove(apps, schema_editor):
    apps.get_model('learning', 'PrayerCategory').objects.filter(slug='istigfor').delete()


class Migration(migrations.Migration):
    dependencies = [('learning', '0003_lessons_recitations_audio')]
    operations = [migrations.RunPython(remove, migrations.RunPython.noop)]
