# Neon PostgreSQL'ga o'tish rejasi (maningiymonim.uz)

Maxfiy qiymatlar (parol, token) bu faylda yozilmaydi. Havola `.env.local` da (`DATABASE_URL_UNPOOLED`).

## Holat (2026-10-30)
- Neon: PG 18.6, 46 migratsiya qo'llangan, **10 tasi kutilmoqda**:
  `developer` 0001-0002, `quran` 0012-0013 va `0002_ayah_translation_ru`, `namoz` 0011-0015.
- Neon jadvallari bo'sh (masjidlar 0). Ma'lumotlar SQLite'da: 10 668 namoz vaqti, 5 027 masjid, 38 mavzu, 114 sura.
- Zaxira (lokal, gitignore'da, `backups/`): SQLite nusxasi va `dumpdata` JSON.

## Tartib (har bosqichdan oldin tasdiq)
1. **Neon zaxirasi:** Neon Console → Branches → joriy branch'dan child branch (yoki PITR oynasi). `pg_dump` lokal 16 versiya, server 18 — mos emas.
2. **Sayt to'xtamaydi:** hozir ishlayotgan sayt SQLite'da. `DATABASE_URL` ni faqat o'tish tayyor bo'lganda `backend/.env` ga qo'shing.
3. **Sxema:** `DATABASE_URL=<unpooled> python manage.py migrate` (10 migratsiya; `namoz/0015_fix_numbered_lists` ma'lumotni o'zgartiradi).
4. **Ma'lumot:** Neon topic PK'lari SQLite'dan farq qiladi, shuning uchun `python manage.py flush --noinput`, so'ng
   `loaddata backups/data_<sana>.json` (≈10k+ yozuv, tarmoq orqali sekin).
5. **Tekshiruv:** yozuvlar soni SQLite bilan tengligi, `check_images`, `/healthz/`, namoz vaqtlari/qibla/masjidlar sahifalari.
6. **Almashtirish:** `backend/.env` ga pooled `DATABASE_URL` → `docker compose up -d`. Muammo bo'lsa: qatorni olib tashlab qayta ishga tushirish = SQLite'ga qaytish.
7. **Cron:** `sync_prayer_times` (kunlik), `sync_mosques` (haftalik).

## Production `backend/.env`
Majburiy: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=false`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS`,
`DJANGO_CORS_ALLOWED_ORIGINS`, `DATABASE_URL`.
Ixtiyoriy: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `GOOGLE_MAPS_API_KEY`, `R2_*`, `DJANGO_SECURE_HSTS_SECONDS=0`.
Kerak emas: `AI_ENABLED` (false), `AI_*`, `NEON_AI_GATEWAY_*`.
