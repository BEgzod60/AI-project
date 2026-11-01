# maningiymonim.uz — Serverga Deploy Qilish Yo'riqnomasi

Loyihaning barcha konfiguratsiyalari `maningiymonim.uz` domeni uchun to'liq moslashtirildi.

---

## 1. Domen (DNS) sozlamalari

Domeningiz ro'yxatdan o'tgan panelda (masalan, cPanel, Cloudflare, Webname yoki Eskiz) quyidagi **A yozuvlarini** VPS serveringizning ommaviy IP manziliga yo'naltiring:

| Type | Name | Content / Target | TTL |
|------|------|------------------|-----|
| A    | @    | `SERVER_IP_MANZILI` | Auto / 3600 |
| A    | www  | `SERVER_IP_MANZILI` | Auto / 3600 |

*(Eslatma: DNS o'zgarishlari 5–30 daqiqa ichida faollashadi)*

---

## 2. Serverda (VPS) Docker va Nginx orqali ishga tushirish

### 1-qadam: Kodni serverga yuklash
```bash
git clone <LOYIHA_GIT_URL> /var/www/iymon
cd /var/www/iymon
```

### 2-qadam: Muhit o'zgaruvchilari (.env)
`backend/.env.example` dan `backend/.env` yarating va haqiqiy qiymatlarni faqat shu Git tomonidan kuzatilmaydigan faylga kiriting. Docker Compose aynan `backend/.env` ni o‘qiydi; root `.env` yoki shell o‘zgaruvchilari uning ustidan yozmaydi. Kalit yaratish uchun `python3 -c "import secrets; print(secrets.token_urlsafe(64))"` ishlating:
```env
TELEGRAM_BOT_TOKEN=<BotFather-dan yangi token>
TELEGRAM_CHAT_ID=<Telegram chat ID>

DJANGO_SECRET_KEY=<uzun tasodifiy maxfiy kalit>
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost,backend,maningiymonim.uz,www.maningiymonim.uz
DJANGO_CSRF_TRUSTED_ORIGINS=https://maningiymonim.uz,https://www.maningiymonim.uz
DJANGO_CORS_ALLOWED_ORIGINS=https://maningiymonim.uz,https://www.maningiymonim.uz
```

### 2.1-qadam: Neon PostgreSQL (baza)
`backend/.env` ga Neon havolasini qo'shing (qiymat Neon Console → Connect yoki lokal `.env.local` da):
```env
DATABASE_URL=postgresql://<user>:<parol>@<host>-pooler.<region>.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```
Birinchi ishga tushishda `migrate` avtomatik bajariladi. Ma'lumotlarni SQLite'dan ko'chirish `README.md` dagi
«PostgreSQL (production)» bo'limida (`dumpdata` → `loaddata`; `loaddata` uchun `-pooler` siz havola qulayroq).
AI yordamchi uchun (ixtiyoriy): bepul Groq ishlating — `AI_ENABLED=true`, `AI_BASE_URL=https://api.groq.com/openai/v1`, `AI_API_KEY`, `AI_MODEL`, `AI_VISION_MODEL`. `NEON_AI_GATEWAY_*` kerak emas (Neon AI Gateway pullik rejani talab qiladi).

### 3-qadam: Docker konteynerlarni ko'tarish
```bash
docker compose up -d --build
```
Konteynerlar holatini tekshirish:
```bash
docker compose ps
```

---

## 3. Server Nginx va HTTPS (SSL) sozlash

Saytdagi Qibla kompas va geolokatsiya xaritasi to'g'ri ishlashi uchun **HTTPS majburiy**.

1. VPS serverning o'zida Nginx va Certbot o'rnating (agar o'rnatilmagan bo'lsa):
   ```bash
   sudo apt update
   sudo apt install -y nginx certbot python3-certbot-nginx
   ```

2. Tayyorlab qo'yilgan Nginx konfiguratsiyasini nusxalang:
   ```bash
   sudo cp docs/host-nginx.conf /etc/nginx/sites-available/maningiymonim.uz
   sudo ln -s /etc/nginx/sites-available/maningiymonim.uz /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. Let's Encrypt orqali bepul SSL sertifikat oling:
   ```bash
   sudo certbot --nginx -d maningiymonim.uz -d www.maningiymonim.uz
   ```
   *(Certbot avtomatik ravishda HTTPS va HTTP-dan HTTPS-ga redirect qo'shadi)*

---

## 4. Boshqaruv va ma'lumotlarni sinxronlash (Cron)

Namoz vaqtlari va masjidlar doimiy yangilanib turishi uchun serverda `crontab -e` ga quyidagilarni qo'shing:

```bash
# Har kuni soat 03:00 da namoz vaqtlarini tekshirish / yangilash
0 3 * * * cd /var/www/iymon && docker compose exec -T backend python manage.py sync_prayer_times

# Har dushanba soat 04:00 da masjidlar ma'lumotlarini tekshirish
0 4 * * 1 cd /var/www/iymon && docker compose exec -T backend python manage.py sync_mosques
```


## Production xavfsizlik tekshiruvi

- `backend/.env` va ma’lumotlar bazasi nusxalarini Git'ga qo‘shmang. Yo‘riqnomadagi ilgari yozilgan Telegram tokeni va Django kaliti Git tarixiga yoki boshqalarga tarqalgan bo‘lsa, ularni oshkor bo‘lgan deb hisoblang: BotFather orqali tokenni bekor qilib yangisini oling, Django kalitini yangilang va faol sessiyalar qayta kirishini kuting. Git tarixidan o‘chirishning o‘zi kalitni xavfsiz qilmaydi.
- Serverda `backend/db.sqlite3` faylini va `backend/media/` papkasini konteynerni ishga tushirishdan oldin mavjud qiling; ularni muntazam zaxiralang. Agar `DATABASE_URL` berilsa, migratsiya va zaxira rejasi PostgreSQL uchun mos bo‘lsin.
- Compose frontend portini faqat `127.0.0.1` ga ulaydi. Tashqi trafik host Nginx orqali kiradi; Nginx `X-Forwarded-Proto` ni o‘zi `$scheme` dan belgilaydi. Django HTTPS redirect va secure cookie sozlamalarini qo‘llaydi.
- `DJANGO_SECURE_HSTS_SECONDS` qiymatini `0` holida qoldiring. DNS, TLS sertifikat, HTTP→HTTPS yo‘naltirish, admin/API va `www` domeni ishlashini real serverda tekshirgandan keyin avval qisqa muddat (`300`), keyin bosqichma-bosqich oshiring.
- HTTPS yoqilgach `curl -I http://maningiymonim.uz` va `curl -I https://maningiymonim.uz` bilan redirect hamda sertifikatni tekshiring; deploydan oldin DNS yoki serverni o‘zgartirmang.
