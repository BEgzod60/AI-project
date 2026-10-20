"""Raqamli ro'yxatlardagi ikki xatoni tuzatadi (manba — muslim.uz sahifasidagi belgilash):

  • oxirgi band «&nbsp; N.» bilan boshlangani uchun ro'yxatdan tashqarida qolgan edi —
    u ro'yxatga qo'shiladi (G'usl, Tahoratning makruhlari, Tayammum, Namozdagi farz amallar,
    Namozning odoblari, Masjid odoblari);
  • bandlar raqami takrorlangan bo'lsa (Tayammum: 1, 2, 3, 3, 4) — ketma-ket qayta raqamlanadi.

Matnning o'zi o'zgarmaydi. Importer ham tuzatilgan (muslimuz.NUMBERED_RE).
"""
import re

from django.db import migrations

OL = re.compile(r'<ol class="steps">(.*?)</ol>', re.S)
LI_VALUE = re.compile(r'<li value="(\d+)">')
TRAILING_ITEM = re.compile(r'</ol>\s*<p>(?:\s|&nbsp;)*(\d{1,2})\.\s+(.*?)</p>', re.S)


def _absorb_trailing_items(html):
    pos = 0
    while (ol := OL.search(html, pos)):
        values = LI_VALUE.findall(ol.group(1))
        m = TRAILING_ITEM.match(html, ol.end() - len('</ol>'))
        if values and m and int(m.group(1)) == int(values[-1]) + 1:
            html = html[:m.start()] + f'<li value="{m.group(1)}">{m.group(2)}</li></ol>' + html[m.end():]
            continue  # shu ro'yxatni yana tekshiramiz — keyingi band ham tashqarida bo'lishi mumkin
        pos = ol.end()
    return html


def _renumber_duplicates(html):
    def fix(ol):
        values = [int(v) for v in LI_VALUE.findall(ol.group(1))]
        if len(values) == len(set(values)):
            return ol.group(0)
        n = iter(range(values[0], values[0] + len(values)))
        return LI_VALUE.sub(lambda _: f'<li value="{next(n)}">', ol.group(0))
    return OL.sub(fix, html)


def forward(apps, schema_editor):
    Section = apps.get_model('namoz', 'Section')
    for section in Section.objects.filter(content_html__contains='<ol class="steps">'):
        html = _renumber_duplicates(_absorb_trailing_items(section.content_html))
        if html != section.content_html:
            section.content_html = html
            section.save(update_fields=['content_html'])


class Migration(migrations.Migration):
    dependencies = [('namoz', '0014_seed_roza_topics')]
    operations = [migrations.RunPython(forward, migrations.RunPython.noop)]
