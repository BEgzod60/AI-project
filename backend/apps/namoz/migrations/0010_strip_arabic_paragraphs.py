"""Bo'lim matnlaridan arab yozuvidagi xatboshilarni olib tashlaydi — saytda faqat lotincha matn qoladi.

Lotincha o'qilishi, «Ma'nosi» izohlari va tilovat pleyerlari saqlanadi. Qaytarish uchun:
`python manage.py import_muslimuz --update --keep-arabic` (har bir bo'lim uchun).
"""
import re

from django.db import migrations

ARABIC_P = re.compile(r'<p class="arabic"[^>]*>(.*?)</p>\s*', re.S)
IFRAME = re.compile(r'<iframe\b.*?</iframe>', re.S)


def strip(apps, schema_editor):
    Section = apps.get_model('namoz', 'Section')
    for section in Section.objects.filter(content_html__contains='class="arabic"'):
        section.content_html = ARABIC_P.sub(
            lambda m: ''.join(f'{f}\n' for f in IFRAME.findall(m.group(1))), section.content_html
        ).strip()
        section.save(update_fields=['content_html'])


class Migration(migrations.Migration):
    dependencies = [('namoz', '0009_iymon_topic_images')]
    operations = [migrations.RunPython(strip, migrations.RunPython.noop)]
