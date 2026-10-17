"""Namoz darslarini muslim.uz matnlaridan qurish (avval `import_muslimuz` bajarilgan bo'lishi kerak).

    python manage.py build_prayer_lessons

Har bir qadam/izoh matni manbadagi bo'limdan BOSH va OXIRGI iboralar orasidan AYNAN kesib
olinadi; ibora topilmasa buyruq to'xtaydi. Suralar/duolar o'qilishi va ma'nosi ham shu
bo'limlardan olinadi (arab yozuvi yo'q). Qayta ishga tushirish xavfsiz (update_or_create).
"""
import html
import re
from datetime import date
from urllib.parse import urljoin

import requests

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.learning.audio_check import check, is_reachable
from apps.learning.step_images import images_for
from apps.learning.models import (
    AudioSource, LessonNote, LessonStep, PrayerCategory, Recitation, ReviewStatus,
)
from apps.namoz.models import Section

BASE = 'https://muslim.uz/uz/c/prayer'
PUBLISHER = 'O‘zbekiston musulmonlari idorasi rasmiy sayti (muslim.uz)'
CHECKED = 'Manba matni bilan aynan solishtirildi (import)'
TANZIL_RECITER, TANZIL_RECITER_NAME = 'afasy', 'Mishari Rashid al-Afasy'
TANZIL_NOTE = (
    "Loyiha egasi qarori: sura audiolari Tanzil Project (tanzil.net) manbasidan, quran.com ishlatilmaydi. "
    "Tanzil audio fayllari uchun alohida foydalanish shartlari hujjatlashtirilmagan."
)

# Rasmiy post: «Namoz saboqlari: Tashahhud, salavot, duo (Audio)» — O'MI matbuot xizmati, 25.11.2019
POST_URL = 'https://muslim.uz/uz/e/post/23574-namoz-saboqlari-tashahhud-salavot-duo-audio'
POST_TITLE = f'{PUBLISHER} \u2014 \u00abNamoz saboqlari: Tashahhud, salavot, duo (Audio)\u00bb (O\u2018MI matbuot xizmati, 25.11.2019)'
# Postdagi <audio src="..."> qiymatlari (nisbiy) — brauzer ularni POST_URL ga nisbatan ochadi
POST_AUDIO = {'tashahhud': 'audios/21.%20Tashahhud.mp3', 'salavotlar': 'audios/22.%20Salavot.mp3',
              'robbana': 'audios/23.%20Duo%20%28Robbana%29.mp3'}
PERMISSION_NOTE = (
    'muslim.uz sahifalari pastidagi shart (2026-10-15 holatiga): \u00abСиз muslim.uz порталидаги маълумотлардан '
    'хоҳлаганча фойдаланишингиз мумкин. ... Фақат ягона шартимиз: ... “Ўзбекистон мусулмонлари идораси расмий '
    'веб-портали хабар беради”, бунда “расмий веб-портали” сўзи устига линк қўйилиб, линк https://muslim.uz '
    'саҳифасига йўналтирилган бўлиши ...\u00bb. Audio yuklab olinmaydi \u2014 asl manzildan eshittiriladi.'
)

# (slug, nomi, tur, blok, sura raqami, zam sura)
RECITATIONS = [
    ('auzu', 'Ta’avvuz (A’uuzu billahi)', 'dua', 'block157', None, False),
    ('sano', 'Sano', 'dua', 'block170', None, False),
    ('fotiha', 'Fotiha surasi', 'sura', 'block158', 1, False),
    ('fiyl', 'Fiyl surasi', 'sura', 'block160', 105, True),
    ('quraysh', 'Quraysh surasi', 'sura', 'block159', 106, True),
    ('maun', 'Ma’un surasi', 'sura', 'block161', 107, True),
    ('kavsar', 'Kavsar surasi', 'sura', 'block162', 108, True),
    ('kafirun', 'Kafirun surasi', 'sura', 'block163', 109, True),
    ('nasr', 'Nasr surasi', 'sura', 'block164', 110, True),
    ('masad', 'Masad surasi', 'sura', 'block165', 111, True),
    ('ixlos', 'Ixlos surasi', 'sura', 'block166', 112, True),
    ('falaq', 'Falaq surasi', 'sura', 'block167', 113, True),
    ('nas', 'Nas surasi', 'sura', 'block168', 114, True),
    ('oyatul-kursiy', 'Oyatul Kursiy', 'dua', 'block169', None, False),
    ('tashahhud', 'Tashahhud (At-tahiyyat)', 'dua', 'block171', None, False),
    ('salavotlar', 'Salavotlar', 'dua', 'block172', None, False),
    ('qunut', 'Qunut duosi', 'dua', 'block173', None, False),
]

# muslim.uz sahifasidagi SoundCloud treklari — 2026-10-15 da tekshirildi: barchasi 404 (mavjud emas)
DEAD_MUSLIMUZ_AUDIO = {
    'sano': ('525604140', 'Trek 404. Shu ID «Tahoratning odoblari» dagi shahodat kalimasi uchun ham ishlatilgan '
                          '(oEmbed nomi: 28-shaodat-kalimalari) — Sano uchun noto‘g‘ri bo‘lishi mumkin.'),
    'tashahhud': ('513636639', 'Trek 404 (mavjud emas).'),
}

# Ayollar uchun tasdiqlangan farqlar: (blok, boshlanish, tugash)
F_TAKBIR = ('block147', 'Takbir uchun qo‘l ko‘targanda', 'yelka to‘g‘risigacha).')
F_QIYOM = ('block135', 'Ayollar qiyomda', 'siynalari ustiga qo‘yib turadilar.')
F_RUKU = ('block146', 'Ruku’da qo‘l barmoqlarini yoyib', 'tizzalarini biroz bukishadi);')
F_SAJDA = ('block146', 'Sajdada erkaklarning oyoqlari', 'yig‘ilibroq sajda qilishadi);')
F_SIT = ('block146', 'Erkaklarning chap oyoq ustiga o‘tirishi', 'chap dumbasiga o‘tiradi);')

TWO_RAKAT = [  # block140 — Ikki rakatli farz namozini o'qish tartibi
    ('Tayyorgarlik', ('block140', 'Toza kiyim, toza badan', 'namoz o‘qishga kirishiladi.'), None, [], False),
    ('Niyat', ('block140', 'Ka’ba tomonga yuzlanib', 'mazmunida niyat qilinadi.'), None, [], False),
    ('Takbiri tahrima', ('block140', 'Ikki qo‘lning kaftini qiblaga', 'ma’no o‘zgarib, namoz buziladi.'), F_TAKBIR, [], False),
    ('Qiyom va Sano', ('block140', 'Qo‘llarni qovushtirgan holda', '«Subhanakallohumma...») o‘qiladi.'), F_QIYOM, ['sano'], False),
    ('Qiroat', ('block140', 'Ta’avvuz («A’uuzu billahi...»)', 'basmalasiz birorta sura o‘qiladi.'), None, ['auzu', 'fotiha'], True),
    ('Ruku’', ('block140', '«Allohu akbar» deya engashib', '(Ulug‘ Robbim pokdir) , deyiladi.'), F_RUKU, [], False),
    ('Qavma (tik turish)', ('block140', 'Belni tiklayotib', '(Robbimiz, maqtov Sengadir) , deyiladi.'), None, [], False),
    ('Sajda', ('block140', '«Allohu akbar» deb yerga avval tizzalar', '(Oliy Robbim pokdir) , deyiladi.'), F_SAJDA, [], False),
    ('Jalsa va ikkinchi sajda', ('block140', '«Allohu akbar» deb sajdadan bosh ko‘tariladi', 'deb ikkinchi marta sajda qilinadi.'), F_SIT, [], False),
    ('Ikkinchi rakat', ('block140', '«Allohu akbar», deb hech narsaga suyanmay', 'o‘xshash ruku’, sajdalar qilinadi.'), None, ['fotiha'], True),
    ('Qa’da (tashahhud)', ('block140', 'Sajdadan so‘ng o‘ng oyog‘ini tiklab', '(«Robbanaa, aatina...») o‘qiladi.'), F_SIT, ['tashahhud', 'salavotlar', 'robbana'], False),
    ('Salom', ('block140', 'So‘ngra avval tikkadan boshlab', 'shu bilan ikki rakatli namoz yakunlanadi.'), None, [], False),
]

# «Namoz saboqlari» turkumi — O'MI matbuot xizmati (2019). Kalit — manba identifikatori (spec[0]).
POSTS = {
    'p23521': ('https://muslim.uz/uz/e/post/23521-namoz-saboqlari-peshin-asr-shom-xufton-namozi-hamda-qunut-duosi-audio',
               'Namoz saboqlari: Peshin, asr, shom, xufton namozi hamda qunut duosi (Audio)'),
    'p23506': ('https://muslim.uz/uz/e/post/23506-namoz-saboqlari-juma-namozi-janoza-namozi-hamda-hayit-namozi-audio',
               'Namoz saboqlari: Juma namozi, janoza namozi hamda hayit namozi (Audio)'),
    'p23250': ('https://muslim.uz/uz/e/post/23250-namoz-saboqlari-nafl-namozlar-audio',
               'Namoz saboqlari: Nafl namozlar (Audio)'),
}

# Ikki rakatli namozning batafsil harakatlari (block140) — boshqa namozlar ham shu asosda
B_PREP, B_NIYAT, B_TAKBIR, B_QIYOM, B_QIROAT, B_RUKU, B_QAVMA, B_SAJDA, B_JALSA, B_RAKAT2, B_QADA, B_SALOM = TWO_RAKAT
FIRST_TWO_RAKATS = [B_TAKBIR, B_QIYOM, B_QIROAT, B_RUKU, B_QAVMA, B_SAJDA, B_JALSA, B_RAKAT2]

# To'rt rakatli farzning 3–4-rakatlari (block141)
FOUR_TAIL = [
    ('Birinchi qa’da', ('block141', 'Ikkinchi rakat sajdasidan so‘ng', 'takbir bilan uchinchi rakatga turiladi.'), F_SIT, ['tashahhud'], False),
    ('Uchinchi rakat', ('block141', 'Uchinchi rakatda ham Fotiha surasi', 'ruku’ga boriladi, ikki marta sajda qilinadi.'), None, ['fotiha'], False),
    ('To‘rtinchi rakat', ('block141', 'Takbir bilan to‘rtinchi rakatga turiladi', 'Takbir bilan ruku’ va ikki marta sajda qilinadi.'), None, ['fotiha'], False),
    ('Qa’dai oxir va salom', ('block141', 'Keyin chap oyoq ustiga o‘tirib', 'ikki tomonga salom beriladi.'), F_SIT, ['tashahhud', 'salavotlar', 'robbana'], False),
]


def four_rakat(niyat_spec):
    return [B_PREP, ('Niyat', niyat_spec, None, [], False), *FIRST_TWO_RAKATS, *FOUR_TAIL]


PESHIN = four_rakat(('block141', '«To‘rt rakatli peshin namozining farzini', 'mazmunida niyat qilinadi.'))
ASR = four_rakat(('p23521', 'Niyatda «...shu vaqt asr namozining farzini...» deyiladi.',
                  'Niyatda «...shu vaqt asr namozining farzini...» deyiladi.'))
XUFTON = four_rakat(('p23521', 'Xufton namozining to‘rt rakat farzi peshin namozining',
                     '...Shu vaqt xufton namozining farzini... deyiladi.'))

SHOM = [  # p23521 (niyat) + block140 (avvalgi ikki rakat) + block142 (qolgani)
    B_PREP,
    ('Niyat', ('p23521', 'Niyat. Niyatda «...shu vaqt shom namozining farzini...» deyiladi.',
               'Niyat. Niyatda «...shu vaqt shom namozining farzini...» deyiladi.'), None, [], False),
    *FIRST_TWO_RAKATS,
    ('Avvalgi qa’da', ('block142', 'Ikkinchi rakatdan so‘ng', '«Allohu akbar» deb turiladi.'), F_SIT, ['tashahhud'], False),
    ('Uchinchi rakat', ('block142', 'Uchinchi rakatda «Bismillah...»', 'ruku’ va sajda qilinadi.'), None, ['fotiha'], False),
    ('Oxirgi qa’da va salom', ('block142', '«Oxirgi qa’da»da o‘tirib', 'salom berib namoz yakunlanadi.'), F_SIT, ['tashahhud', 'salavotlar', 'robbana'], False),
]

VITR = [  # p23521 (niyat va tartib) + block140 (harakatlar tafsiloti)
    ('Uch rakat, bir salom', ('block181', 'Vitr namozi uch rakat', 'ikki rakatli namozlar kabi ado etiladi.'), None, [], False),
    ('Niyat', ('p23521', 'Niyat. Niyatda ... shu vaqt vitr vojib namozini ... deyiladi.',
               'Niyat. Niyatda ... shu vaqt vitr vojib namozini ... deyiladi.'), None, [], False),
    *FIRST_TWO_RAKATS,
    ('Birinchi qa’da', ('p23521', 'So‘ng cho‘kka o‘tirib, tashahhud o‘qiladi.', 'So‘ng cho‘kka o‘tirib, tashahhud o‘qiladi.',
                        'Vitr namozi bu tartibda ado etiladi'), F_SIT, ['tashahhud'], False),
    ('Uchinchi rakat va Qunut', ('p23521', 'Uchinchi rakatga turib “Bismillah” aytilib',
                                'kindik ostida tutiladi va Qunut duosi o‘qiladi.'), F_TAKBIR, ['fotiha', 'qunut'], True),
    ('Ruku’, sajda, qa’da va salom', ('p23521', 'So‘ng ruku Va ikki marta sajda qilinadi va cho‘kka o‘tirib',
                                     'Shu bilan namoz tugaydi va duo qilinadi.'), F_SIT, ['tashahhud', 'salavotlar', 'robbana'], False),
]

JUMA = [  # p23506 + block184; farzi bomdod farzi kabi (block140)
    ('Juma namozi tarkibi', ('p23506', 'Juma namozi ikki rakat farzdir.', 'to‘rt rakat sunnat o‘qiladi.'), None, [], False),
    ('Farzdan oldingi to‘rt rakat sunnat', ('p23506', 'Juma farzidan oldin va keyingi sunnatlar',
                                           'to‘rt rakat sunnatlari kabi o‘qiladi.'), None, ['sano', 'fotiha'], True),
    ('Xutba', ('p23506', 'Juma namozida farzdan oldingi', 'imom minbarda xutba qiladi.'), None, [], False),
    ('Ikki rakat farz', ('p23506', 'Jumaning ikki rakat farzi', 'bomdod namozining farzi kabi o‘qiladi.'), None, [], False),
    *FIRST_TWO_RAKATS, B_QADA, B_SALOM,
    ('Farzdan keyingi to‘rt rakat sunnat', ('block184', 'Juma namozidan oldin bir salom bilan to‘rt rakat',
                                           'sunnati muakkadalardan hisoblanadi.'), None, [], False),
]

HAYIT = [  # p23506 — Hayit namozi
    ('Niyat', ('p23506', 'Har bir namozni boshlashdan avval', 'o‘qishni niyat qildim», deyiladi.', 'HAYIT NAMOZI'), None, [], False),
    ('Iftitoh takbiri', ('p23506', 'So‘ng imom « Allohu akbar », deya iftitoh takbirini',
                         'ichlarida o‘zlari eshitadigan darajada aytadi.', 'HAYIT NAMOZI'), F_TAKBIR, [], False),
    ('Sano', ('p23506', 'So‘ng hamma ichida, o‘zi eshitadigan darajada sano o‘qiydi.',
              'So‘ng hamma ichida, o‘zi eshitadigan darajada sano o‘qiydi.', 'HAYIT NAMOZI'), F_QIYOM, ['sano'], False),
    ('Uch zoid takbir', ('p23506', 'So‘ng imom ketma-ket qo‘llarini', 'qo‘llar bog‘lanib, kindik ostida tutiladi.',
                         'HAYIT NAMOZI'), None, [], False),
    ('Qiroat, ruku’ va sajda', ('p23506', 'So‘ng imom ichida «A’uzu»ni', 'ruku va ikki marta sajda qilinadi.',
                               'HAYIT NAMOZI'), None, ['auzu', 'fotiha'], True),
    ('Ikkinchi rakat va takbirlar', ('p23506', 'Ruku va sajdadan so‘ng ikkinchi rakatga turiladi.',
                                    'rukuga boriladi va ikki marta sajda qilinadi.', 'HAYIT NAMOZI'), None, ['fotiha'], True),
    ('Qa’da va salom', ('p23506', 'So‘ng cho‘kka o‘tirib tashahhud, salavot, duo o‘qilib salom beriladi',
                        'va namoz tugaydi.', 'HAYIT NAMOZI'), F_SIT, ['tashahhud', 'salavotlar', 'robbana'], False),
    ('Xutba', ('p23506', 'Keyin imom minbarga chiqib xutba qiladi', 'so‘ng duo qilinadi.', 'HAYIT NAMOZI'), None, [], False),
]

# Tahajjud va nafl: manbada harakatma-harakat tartib yo'q — faqat manbadagi qoidalar
TAHAJJUD = [
    ('Tahajjud nima?', ('p23250', 'Kechasi bir uxlab turib o‘qiladigan namoz', '«tahajjud namozi» deb ataladi.',
                        'Tahajjud namozi'), None, [], False),
    ('Rakatlari', ('p23250', 'Bu namozning ozi ikki, ko‘pi sakkiz rakatdir.', 'Bu namozning ozi ikki, ko‘pi sakkiz rakatdir.',
                   'Tahajjud namozi'), None, [], False),
    ('Kechki nafllar ikki rakatdan', ('p23250', 'Kunduzgi nafl namozlarini to‘rt rakatdan', 'sunnat amallardan.'), None, [], False),
    ('Vaqti', ('p23250', 'Tahajjud namozini xuftondan so‘ng uxlab', 'o‘qib olsa ham joiz.'), None, [], False),
]

NAFL = [
    ('Nafl namoz nima?', ('p23250', 'Kishi o‘z ixtiyori bilan farzga', 'ixtiyoriy tarzda ado etiladi.'), None, [], False),
    ('Turlari', ('p23250', 'Nafl namozlari ikki xil bo‘ladi:', 'hojat so‘rash kabilar kiradi.'), None, [], False),
    ('Rakatlar', ('p23250', 'Kunduzgi nafl namozlarini to‘rt rakatdan', 'sunnat amallardan.'), None, [], False),
    ('O‘tirib o‘qish', ('p23250', 'Qiyomda turishga qodir bo‘la turib', 'o‘ng oyog‘ini tik qiladi.'), None, [], False),
    ('Namoz buzilsa', ('p23250', 'Nafl o‘qishga kirishgan kishining namozi', 'qazosini o‘qishi vojib.'), None, [], False),
]

STEPS = {
    'bomdod': TWO_RAKAT, 'peshin': PESHIN, 'asr': ASR, 'shom': SHOM, 'xufton': XUFTON, 'vitr': VITR,
    'tahajjud': TAHAJJUD, 'nafl': NAFL, 'juma': JUMA, 'hayit': HAYIT,
}

T = LessonNote.Tab
RAKAT_DEF = ('block138', 'Namozda qiyom', '«rakat» deyiladi.')
NOTES = {
    'bomdod': [
        (T.INFO, 'Rakat nima?', RAKAT_DEF),
        (T.INFO, 'Bomdod rakatlari', ('block138', 'Bomdod – 2 rakat sunnat', '2 rakat farz.')),
        (T.SUNNAT_FARZ, 'Sunnatning o‘qilishi', ('block140', 'Ikki rakatli sunnat namozlarini', 'Faqat niyatda farq bo‘ladi.')),
        (T.TIME, 'Bomdod vaqti', ('block137', '1. Bomdod namozining vaqti', 'kun chiqqunchadir.')),
        (T.TIME, 'Mustahab vaqti', ('block137', 'Bomdod namozini tong yorishganda', 'mustahab vaqtiga muvofiq bo‘ladi.')),
    ],
    'peshin': [
        (T.INFO, 'Rakat nima?', RAKAT_DEF),
        (T.INFO, 'Peshin rakatlari', ('block138', 'Peshin – 4 rakat sunnat', '2 rakat sunnat.')),
        (T.SUNNAT_FARZ, 'Farzning uchinchi va to‘rtinchi rakati', ('block141', 'Uchinchi rakatda ham Fotiha surasi (zam surasiz)', 'Fotiha surasining o‘zi qiroat qilinadi.')),
        (T.SUNNAT_FARZ, 'Sunnatning uchinchi va to‘rtinchi rakati', ('block143', 'Uchinchi rakatda ham Fotiha surasi va zam sura', 'Fotiha surasi va zam sura qiroat qilinadi.')),
        (T.TIME, 'Peshin vaqti', ('block137', '2. Peshin namozining vaqti', 'ikki baravar ortguniga qadar.')),
        (T.TIME, 'Mustahab vaqti', ('block137', 'Peshin namozini yoz faslida', 'o‘qish mustahabdir.')),
    ],
    'asr': [
        (T.INFO, 'Rakat nima?', RAKAT_DEF),
        (T.INFO, 'Asr rakatlari', ('block138', 'Asr – 4 rakat farz.', 'Asr – 4 rakat farz.')),
        (T.TIME, 'Asr vaqti', ('block137', '3. Asr namozining vaqti', 'quyosh botgunchadir.')),
        (T.TIME, 'Mustahab vaqti', ('block137', 'Asr namozini quyosh tig‘ini', 'o‘qish mustahabdir.')),
    ],
    'shom': [
        (T.INFO, 'Rakat nima?', RAKAT_DEF),
        (T.INFO, 'Shom rakatlari', ('block138', 'Shom – 3 rakat farz', '2 rakat sunnat.')),
        (T.TIME, 'Shom vaqti', ('block137', '4. Shom namozining vaqti', 'g‘oyib bo‘lgunchadir.')),
        (T.TIME, 'Mustahab vaqti', ('block137', 'Shom namozini doimo', 'o‘qish mustahabdir.')),
    ],
    'xufton': [
        (T.INFO, 'Rakat nima?', RAKAT_DEF),
        (T.INFO, 'Xufton rakatlari', ('block138', 'Xufton – 4 rakat farz', '2 rakat sunnat.')),
        (T.TIME, 'Xufton vaqti', ('block137', '5. Xufton namozining vaqti', 'shafaq batamom yo‘qolgandan keyin kiradi.')),
        (T.TIME, 'Afzal vaqti', ('block137', 'Xufton namozini kechaning', 'nihoyatda a’lo bo‘ladi.')),
    ],
    'tahajjud': [
        (T.INFO, 'Afzalligi', ('p23250', 'Tahajjud nafl namozlarining eng afzalidir.', 'ixlosga yaqin bo‘ladi.')),
        (T.TIME, 'Tahajjud vaqti', ('p23250', 'Tahajjud namozini xuftondan so‘ng uxlab', 'o‘qib olsa ham joiz.')),
    ],
    'nafl': [
        (T.INFO, 'Turlari', ('p23250', 'Nafl namozlari ikki xil bo‘ladi:', 'hojat so‘rash kabilar kiradi.')),
        (T.SUNNAT_FARZ, 'Rakatlar', ('p23250', 'Kunduzgi nafl namozlarini to‘rt rakatdan', 'sunnat amallardan.')),
    ],
    'juma': [
        (T.INFO, 'Juma namozi tarkibi', ('p23506', 'Juma namozi ikki rakat farzdir.', 'to‘rt rakat sunnat o‘qiladi.')),
        (T.SUNNAT_FARZ, 'Sunnatlari', ('block184', 'Juma namozidan oldin bir salom bilan to‘rt rakat', 'sunnati muakkadalardan hisoblanadi.')),
        (T.SUNNAT_FARZ, 'Farzi', ('p23506', 'Jumaning ikki rakat farzi', 'bomdod namozining farzi kabi o‘qiladi.')),
    ],
    'hayit': [
        (T.INFO, 'Hukmi', ('block136', 'Vojib namozlar –', 'ramazon va qurbon hayiti namozlari')),
        (T.TIME, 'Hayit namozi vaqti', ('block185', 'Iyd namozlarining vaqti', 'tikkadan oqqunchadir.')),
    ],
    'vitr': [
        (T.INFO, 'Vitr rakatlari', ('block138', 'Vitr – 3 rakat vojib.', 'Vitr – 3 rakat vojib.')),
        (T.SUNNAT_FARZ, 'Hukmi', ('block136', 'Vojib namozlar –', 'har kuni xuftondan so‘ng o‘qiladigan vitr namozi')),
        (T.TIME, 'Vitr vaqti', ('block137', 'Vitr namozi vaqti esa', 'subhi sodiqqacha o‘qisa bo‘ladi.')),
    ],
}


def _plain(content_html):
    text = re.sub(r'<iframe\b.*?</iframe>', ' ', content_html, flags=re.S)
    text = html.unescape(re.sub(r'<[^>]+>', ' ', text)).replace(' ', ' ').replace('­', '')
    return ' '.join(text.split())


class Command(BaseCommand):
    help = "Namoz darslari (qadamlar, izohlar, suralar va audio) ni muslim.uz matnlaridan quradi."

    def handle(self, *args, **opts):
        self.texts = {}
        post_text = self._fetch_post()
        with transaction.atomic():
            recs = self._recitations()
            recs['robbana'] = self._robbana(post_text)
            self._post_audio(recs)
            steps = self._steps(recs)
            notes = self._notes()
        self._check_audio()
        self.stdout.write(self.style.SUCCESS(
            f'Sura/duolar: {len(recs)}, qadamlar: {steps}, izohlar: {notes}, '
            f"audio: {AudioSource.objects.count()} (tasdiqlangan: {sum(a.is_playable for a in AudioSource.objects.all())})"
        ))

    # --- rasmiy post: Robbana duosi va audio ------------------------------------
    def _fetch_post(self):
        try:
            resp = requests.get(POST_URL, timeout=30, headers={'User-Agent': 'Mozilla/5.0 (Iymon importer)'})
            resp.raise_for_status()
        except requests.RequestException as exc:
            raise CommandError(f'{POST_URL} yuklanmadi: {exc}') from exc
        resp.encoding = 'utf-8'
        page = resp.text
        for slug, src in POST_AUDIO.items():
            if f'src="{src}"' not in page:
                raise CommandError(f'Postda {slug} audiosi ({src}) topilmadi \u2014 sahifa o\u2018zgargan.')
        return _plain(re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', page, flags=re.S))

    def _between(self, text, start, end):
        i = text.find(start)
        j = text.find(end, i) if i >= 0 else -1
        if i < 0 or j < 0:
            raise CommandError(f'Postda \u00ab{start[:30]}\u2026\u00bb topilmadi.')
        return text[i:j + len(end)]

    def _robbana(self, post_text):
        rec, _ = Recitation.objects.update_or_create(slug='robbana', defaults=dict(
            name='Robbana duosi', kind='dua', surah_number=None, is_zam_sura=False, order=len(RECITATIONS),
            transliteration=self._between(post_text, 'Robbana atina fid dunya', 'va qina \u2019azaban nar.'),
            meaning=self._between(post_text, '\u00abEy Rabbimiz', 'do\u2018zax azobidan saqlagin\u00bb'),
            source_title=POST_TITLE, source_url=POST_URL,
            review_status=ReviewStatus.PUBLISHED, reviewed_by=CHECKED, reviewed_at=date.today(),
        ))
        return rec

    def _post_audio(self, recs):
        # Robbana — Qur'on oyati (Baqara, 201): Tanzil'dan shu oyat tilovati; duo shu oyat ichida.
        AudioSource.objects.update_or_create(
            recitation=recs['robbana'], provider=AudioSource.Provider.TANZIL,
            defaults=dict(
                tanzil_reciter=TANZIL_RECITER, qf_surah=2, qf_verse=201, reciter=TANZIL_RECITER_NAME,
                source_url='https://tanzil.net/#2:201', license_status=AudioSource.License.PROJECT_DECISION,
                permission_note=TANZIL_NOTE,
                verification_status=AudioSource.Verification.APPROVED,
                verified_by='Oyat (Baqara, 201) duo bilan solishtirildi (import)',
                display_note="Qur\u2019on tilovati: Baqara surasi, 201-oyat. Duo shu oyatning \u00abRobbana\u2026\u00bb qismidir.",
                notes='Oyat boshida \u00abulardan ba\u2019zilari aytadi\u00bb qismi ham bor \u2014 shuning uchun izoh bilan ko\u2018rsatiladi.',
            ),
        )
        for slug, src in POST_AUDIO.items():
            AudioSource.objects.update_or_create(
                recitation=recs[slug], provider=AudioSource.Provider.MUSLIM_UZ, source_url=POST_URL,
                defaults=dict(
                    audio_url=urljoin(POST_URL, src), reciter='',
                    display_note='Rasmiy maqola: \u00abNamoz saboqlari: Tashahhud, salavot, duo (Audio)\u00bb',
                    license_status=AudioSource.License.PERMITTED, permission_note=PERMISSION_NOTE,
                    notes=('Rasmiy postdagi <audio src="' + src + '"> nisbiy manzili. Eski sayt nusxasida ham '
                           '(http://old.muslim.uz/audios/...) 2026-10-15 da 404.'),
                ),
            )

    def _check_audio(self):
        """Barcha audio ochilishini tekshiradi; ochilmaydigan muslim.uz audiosi tasdiqlanmaydi."""
        for audio in AudioSource.objects.select_related('recitation'):
            status = check(audio)
            if not is_reachable(audio) and audio.provider == AudioSource.Provider.MUSLIM_UZ:
                audio.verification_status = AudioSource.Verification.REJECTED
                note = f'{date.today():%Y-%m-%d} tekshiruvi: HTTP {status or "tarmoq xatosi"} \u2014 fayl ochilmaydi.'
                if note not in audio.notes:
                    audio.notes = f'{audio.notes}\n{note}'.strip()
                audio.save(update_fields=['verification_status', 'notes', 'updated_at'])
            self.stdout.write(f'  audio: {audio.recitation.slug:12} {audio.provider:17} HTTP {status}')

    # --- yordamchilar ---------------------------------------------------------
    def _section(self, block):
        s = Section.objects.filter(source_key=f'muslim.uz:{block}').first()
        if not s:
            raise CommandError(f'muslim.uz:{block} topilmadi — avval `import_muslimuz` ni bajaring.')
        return s

    def _plain(self, src):
        """Manba matni: 'blockNNN' — import qilingan bo'lim, 'pNNNNN' — «Namoz saboqlari» posti."""
        if src not in self.texts:
            if src in POSTS:
                self.texts[src] = self._fetch_page_text(POSTS[src][0])
            else:
                self.texts[src] = _plain(self._section(src).content_html)
        return self.texts[src]

    def _fetch_page_text(self, url):
        try:
            resp = requests.get(url, timeout=30, headers={'User-Agent': 'Mozilla/5.0 (Iymon importer)'})
            resp.raise_for_status()
        except requests.RequestException as exc:
            raise CommandError(f'{url} yuklanmadi: {exc}') from exc
        resp.encoding = 'utf-8'
        page = re.sub(r'<!--.*?-->|<(script|style)[^>]*>.*?</\1>', ' ', resp.text, flags=re.S)
        return _plain(page)

    def _cut(self, spec):
        """(manba, boshlanish, tugash[, shu ibora keyin qidirish]) — matn AYNAN kesib olinadi."""
        src, start, end = spec[:3]
        text = self._plain(src)
        offset = text.find(spec[3]) if len(spec) > 3 else 0
        if offset < 0:
            raise CommandError(f'{src}: «{spec[3]}» topilmadi.')
        i = text.find(start, offset)
        j = text.find(end, i) if i >= 0 else -1
        if i < 0 or j < 0:
            raise CommandError(f'{src}: «{start[:40]}…» / «{end[:40]}» manbada topilmadi.')
        return text[i:j + len(end)]

    def _meta(self, src):
        """Manba nomi va havolasi."""
        if src in POSTS:
            url, title = POSTS[src]
            return f'{PUBLISHER} — «{title}» (O‘MI matbuot xizmati)', url
        return f'{PUBLISHER} — «{self._section(src).title}»', f'{BASE}#{src}'

    def _published(self, src, title=None):
        source_title, source_url = self._meta(src)
        return dict(
            source_title=source_title, source_url=source_url,
            review_status=ReviewStatus.PUBLISHED, reviewed_by=CHECKED, reviewed_at=date.today(),
        )

    # --- suralar va duolar ----------------------------------------------------
    def _parse_recitation(self, block):
        h = self._section(block).content_html
        paras = re.findall(r'<p\b([^>]*)>(.*?)</p>', re.sub(r'<iframe\b.*?</iframe>', '', h, flags=re.S), re.S)
        translit, meaning, in_meaning = [], [], False
        for attrs, inner in paras:
            text = _plain(inner)
            if 'class="meaning"' in attrs:
                in_meaning = True
                meaning.append(re.sub(r'^Ma[’‘\']nosi:\s*', '', text))
            elif in_meaning and inner.strip().startswith('<em>'):
                meaning.append(text)
            elif not in_meaning and '<strong>' in inner:
                if 'dir="rtl"' in attrs and text.startswith('.'):
                    text = text[1:] + '.'  # manbadagi RTL ko'rinish uchun boshga o'tib qolgan nuqta
                translit.append(text)
            elif in_meaning:
                break
        if not translit:
            raise CommandError(f'{block}: o‘qilishi topilmadi.')
        return '\n'.join(translit), '\n'.join(meaning)

    def _recitations(self):
        recs = {}
        for order, (slug, name, kind, block, surah, zam) in enumerate(RECITATIONS):
            translit, meaning = self._parse_recitation(block)
            recs[slug], _ = Recitation.objects.update_or_create(slug=slug, defaults=dict(
                name=name, kind=kind, surah_number=surah, transliteration=translit, meaning=meaning,
                is_zam_sura=zam, order=order, **self._published(block, self._section(block).title),
            ))
            if surah:
                AudioSource.objects.update_or_create(
                    recitation=recs[slug], provider=AudioSource.Provider.TANZIL,
                    defaults=dict(
                        tanzil_reciter=TANZIL_RECITER, reciter=TANZIL_RECITER_NAME,
                        source_url=f'https://tanzil.net/#{surah}:1',
                        license_status=AudioSource.License.PROJECT_DECISION, permission_note=TANZIL_NOTE,
                        verification_status=AudioSource.Verification.APPROVED,
                        verified_by=f'Sura raqami ({surah}) Tanzil fayl nomi bilan mos (import)',
                        notes='Oyatma-oyat tilovat: tanzil.net yoki o‘zimizda siqib saqlangan nusxa (media/quran).',
                    ),
                )
            if slug in DEAD_MUSLIMUZ_AUDIO:
                track, note = DEAD_MUSLIMUZ_AUDIO[slug]
                AudioSource.objects.update_or_create(
                    recitation=recs[slug], provider=AudioSource.Provider.MUSLIM_UZ, source_url=f'{BASE}#{block}',
                    defaults=dict(
                        audio_url=f'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/{track}',
                        reciter='',
                        license_status=AudioSource.License.UNKNOWN,
                        verification_status=AudioSource.Verification.REJECTED,
                        notes=f'2026-10-15 tekshiruvi: {note}',
                    ),
                )
        return recs

    # --- qadamlar va izohlar ---------------------------------------------------
    def _steps(self, recs):
        count = 0
        for slug, steps in STEPS.items():
            category = PrayerCategory.objects.get(slug=slug)
            keep = []
            for order, (title, spec, female, rec_slugs, zam) in enumerate(steps, start=1):
                step, _ = LessonStep.objects.update_or_create(category=category, order=order, defaults=dict(
                    title=title, text=self._cut(spec),
                    text_female=self._cut(female) if female else '',
                    female_source_url=self._meta(female[0])[1] if female else '',
                    zam_sura_choice=zam, images=images_for(title, slug), **self._published(spec[0]),
                ))
                step.recitations.set([recs[s] for s in rec_slugs])
                keep.append(step.pk)
                count += 1
            LessonStep.objects.filter(category=category).exclude(pk__in=keep).delete()
        return count

    def _notes(self):
        count = 0
        for slug, notes in NOTES.items():
            category = PrayerCategory.objects.get(slug=slug)
            keep = []
            for order, (tab, title, spec) in enumerate(notes, start=1):
                note, _ = LessonNote.objects.update_or_create(category=category, tab=tab, title=title, defaults=dict(
                    order=order, text=self._cut(spec), **self._published(spec[0]),
                ))
                keep.append(note.pk)
                count += 1
            LessonNote.objects.filter(category=category).exclude(pk__in=keep).delete()
        return count
