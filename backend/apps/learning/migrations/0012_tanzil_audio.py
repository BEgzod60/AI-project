"""Sura audiolari quran.com (Quran Foundation) o'rniga Tanzil Project (tanzil.net) dan."""
from django.db import migrations, models

PERMISSION_NOTE = (
    "Loyiha egasi qarori (2026-10-17): sura audiolari O'zbekistonda ochiq Tanzil Project (tanzil.net) "
    "manbasidan olinadi, quran.com ishlatilmaydi. Tanzil audio fayllari uchun alohida foydalanish shartlari "
    "hujjatlashtirilmagan — ommaga chiqarishdan oldin tekshirilsin."
)


def to_tanzil(apps, schema_editor):
    AudioSource = apps.get_model('learning', 'AudioSource')
    for audio in AudioSource.objects.filter(provider='quran_foundation').select_related('recitation'):
        surah = audio.qf_surah or audio.recitation.surah_number
        audio.provider = 'tanzil'
        audio.tanzil_reciter = 'afasy'
        audio.reciter = 'Mishari Rashid al-Afasy'
        audio.source_url = f'https://tanzil.net/#{surah}:{audio.qf_verse or 1}'
        audio.license_status = 'project_decision'
        audio.permission_note = PERMISSION_NOTE
        audio.verified_by = f'Sura raqami ({surah}) Tanzil fayl nomi bilan mos (migratsiya)'
        audio.notes = 'Oyatma-oyat tilovat: tanzil.net yoki o‘zimizda siqib saqlangan nusxa (media/quran).'
        audio.last_checked_at = None
        audio.last_http_status = None
        audio.save()


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0011_step_images_juma'),
    ]

    operations = [
        migrations.AddField(
            model_name='audiosource',
            name='tanzil_reciter',
            field=models.CharField(blank=True, choices=[('afasy', 'Mishari Rashid al-Afasy'), ('husary', 'Mahmud Xalil al-Husariy'), ('minshawi', 'Muhammad Siddiq al-Minshoviy'), ('abdulbasit', 'Abdulbosit Abdussamad'), ('sudais', 'Abdurrahmon as-Sudays'), ('ghamadi', 'Sa’d al-G‘omidiy')], default='afasy', max_length=20, verbose_name='Tanzil qorisi'),
        ),
        migrations.AlterField(
            model_name='audiosource',
            name='license_status',
            field=models.CharField(choices=[('permitted', 'Ruxsat berilgan (hujjat bor)'), ('api_terms', 'Rasmiy API shartlari asosida (oqim, yuklab tarqatilmaydi)'), ('project_decision', 'Loyiha egasi qarori (manba shartlari hujjatlashtirilmagan)'), ('unknown', 'Aniqlanmagan'), ('not_permitted', 'Ruxsat yo‘q')], default='unknown', max_length=20, verbose_name='Foydalanish ruxsati'),
        ),
        migrations.RunPython(to_tanzil, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='audiosource',
            name='qf_recitation_id',
        ),
        migrations.AlterField(
            model_name='audiosource',
            name='audio_url',
            field=models.URLField(blank=True, help_text="Tanzil uchun bo'sh qoldiring — havola sura/oyat raqamidan tuziladi.", verbose_name='Audio havolasi'),
        ),
        migrations.AlterField(
            model_name='audiosource',
            name='provider',
            field=models.CharField(choices=[('tanzil', 'Tanzil Project (tanzil.net)'), ('muslim_uz', 'muslim.uz'), ('other', 'Boshqa (to‘g‘ridan-to‘g‘ri havola)')], max_length=20, verbose_name='Manba turi'),
        ),
    ]
