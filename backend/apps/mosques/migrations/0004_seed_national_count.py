from datetime import date

from django.db import migrations


def seed(apps, schema_editor):
    """Rasmiy ma'lumot: Din ishlari bo'yicha qo'mita brifingi (2025 yil yakunlari, 2026-01-07)."""
    MosqueCount = apps.get_model('mosques', 'MosqueCount')
    MosqueCount.objects.update_or_create(scope='uzbekistan', defaults={
        'label': 'O‘zbekiston',
        'count': 2148,
        'source_title': 'Din ishlari bo‘yicha qo‘mita — 2025 yildagi ishlar bo‘yicha brifing',
        'source_url': 'https://gov.uz/ru/religions/news/view/117161',
        'as_of': date(2026, 1, 7),
    })


class Migration(migrations.Migration):

    dependencies = [
        ('mosques', '0003_mosque_details_directory'),
    ]

    operations = [
        migrations.RunPython(seed, migrations.RunPython.noop),
    ]
