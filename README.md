# Iymon — Islomiy ta'lim platformasi

Iymon — namoz o'rganish, iymon mavzulari, namoz vaqtlari, Qur'on suralari va qibla topish imkoniyatlarini bir joyda jamlagan islomiy ta'lim platformasi.

## Texnologiyalar

### Backend
- **Django 5** + **Django REST Framework** — REST API
- `requests` — tashqi namoz vaqtlari API bilan ishlash

### Frontend
- **React 18** + **TypeScript** — UI
- **Vite** — build tool
- **Tailwind CSS** — uslublar
- **React Router** — sahifalar orasida navigatsiya

## Papka tuzilishi

```
Iymon/
├── designs/      # Claude o'qiydigan UI maketlari
├── backend/      # Django + DRF
│   ├── config/   # Loyiha sozlamalari va routlar
│   └── apps/     # Modular Django applari
└── frontend/     # React + Vite + TypeScript + Tailwind
    └── src/
        ├── components/   # Qayta ishlatiladigan UI
        ├── pages/        # Individual sahifalar
        ├── services/     # API integratsiyasi
        ├── hooks/        # Custom React hooklar
        └── types/        # TypeScript interfeyslari
```

## Ishga tushirish

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8001
```

Backend: http://127.0.0.1:8001 (Vite `/api` so‘rovlarini shu portga yo‘naltiradi)

### PostgreSQL (production)

`DATABASE_URL` berilsa PostgreSQL ishlatiladi, berilmasa — lokal `db.sqlite3`.

```bash
export DATABASE_URL=postgres://user:parol@host:5432/iymon
python manage.py migrate
python manage.py sync_prayer_times --year 2026   # namoz vaqtlarini bazaga yuklash
```

Mavjud SQLite ma'lumotlarini (darslar, namoz bo'limlari, namoz vaqtlari) ko'chirish:

```bash
# 1) SQLite'dan eksport (DATABASE_URL o'rnatilmagan holda)
python manage.py dumpdata --natural-foreign --natural-primary \
  -e contenttypes -e auth.Permission -e sessions -e admin.LogEntry -o data.json
# 2) PostgreSQL'ga import
DATABASE_URL=postgres://... python manage.py migrate
DATABASE_URL=postgres://... python manage.py loaddata data.json
```

Deploy oldidan rasmlarni tekshirish — bazadagi barcha rasm manzillari `frontend/public` dagi fayllarga mos kelishi kerak
(rasmlarning o'zi bazada emas, `frontend/public/images` da va git'da saqlanadi; build ularni `dist/` ga ko'chiradi):

```bash
python manage.py check_images
```

Yaqin masjidlar (Qibla sahifasi) bazadan beriladi — OpenStreetMap'dan bir marta yuklanadi
(Overpass ishlamay qolsa ham sayt ishlaydi; `dumpdata` bilan Neon'ga ham ko'chadi):

```bash
python manage.py sync_mosques                 # O'zbekiston bo'yicha
python manage.py sync_mosques --only-missing  # uzilib qolgan bo'lsa — qolgan kataklar
python manage.py import_masjid_uz             # Toshkent: imom-xatib, manzil, telefon (masjid.uz katalogi)
python manage.py count_masjid_uz              # viloyatlar bo'yicha masjidlar soni (masjid.uz katalogi)
```

Masjid ma'lumotlari faqat manbasi bilan ko'rsatiladi: imom-xatib, manzil, telefon — masjid.uz (Islom.uz);
qurilgan yili va Vikipediya — Wikidata / OSM; O'zbekiston bo'yicha jami soni — Din ishlari bo'yicha qo'mita.
Imom-xatiblar almashib turadi, shuning uchun `import_masjid_uz` ni vaqti-vaqti bilan qayta ishga tushiring.

Masjidlar reytingi — Google Maps'dagi tayyor reyting (ixtiyoriy). `backend/.env` ga `GOOGLE_MAPS_API_KEY` qo'ying:
Google Cloud'da **Places API (New)** yoqilgan, faqat shu API bilan cheklangan kalit. Reyting Nearby Search
Enterprise SKU bo'yicha hisoblanadi (oylik bepul limitdan keyin pullik). Google qoidalariga ko'ra reyting saqlanmaydi
(har so'rovda olinadi) va faqat ro'yxatda «Google Maps» belgisi bilan ko'rsatiladi (OSM xaritasida emas).
Kalit bo'lmasa sahifa ishlayveradi — reyting o'rnida «ma'lumot yo'q» yoziladi.

Namoz vaqtlari kuniga 1 marta yangilanishi uchun cron:

```
0 3 * * * cd /path/to/backend && DATABASE_URL=postgres://... venv/bin/python manage.py sync_prayer_times
# masjidlar — haftasiga bir marta
0 4 * * 1 cd /path/to/backend && DATABASE_URL=postgres://... venv/bin/python manage.py sync_mosques
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

## Asosiy API

- `GET /api/prayer-times/?city=Toshkent` — berilgan hudud uchun kunlik namoz vaqtlari
- `GET /api/prayer-times/month/?city=Toshkent&month=10&year=2026` — oylik jadval
- `GET /api/prayer-times/year/?city=Toshkent&year=2026` — yillik jadval (faqat e'lon qilingan oylar)

Manba: namoz-vaqtlari.more-info.uz (islom.uz ma'lumotlari). Keyingi oylar oldindan e'lon qilinmaydi.

## Namoz bo'limi kontenti

Matnlar O'zbekiston musulmonlari idorasining rasmiy saytidan (https://muslim.uz/uz/c/prayer) import qilinadi:

```bash
python manage.py import_muslimuz            # yangi bo'limlarni qo'shadi (qayta ishga tushirish xavfsiz)
python manage.py import_muslimuz --dry-run  # faqat hisobot
python manage.py import_muslimuz --update   # mavjud bo'limlar matnini manbadan yangilaydi
```

Matn o'zgartirilmaydi, faqat belgilash (ro'yxatlar, ma'nosi) tuziladi. Arab yozuvidagi xatboshilar
sukut bo'yicha olib tashlanadi (lotincha o'qilishi va ma'nosi qoladi); saqlash uchun `--keep-arabic`.
Iymon bo'limi uchun: `python manage.py import_muslimuz --category iymon`. Lotin sahifasida
to'liq bo'lmagan bloklar kirill sahifasidan o'giriladi va admin panelda «Tekshiruv kutilmoqda» holatida qoladi.
