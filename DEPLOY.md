# Deploy (VPS, Docker) — test.iymanim.uz

Portlar standart + 2000 (boshqa loyihalar bilan to'qnashmasligi uchun):

| Servis   | Ichki port | Host port               |
|----------|-----------:|-------------------------|
| web      | 80         | `127.0.0.1:2080`        |
| backend  | 10000      | — (faqat docker tarmog'i) |
| postgres | 5432       | `127.0.0.1:7432`        |

Sxema: `internet → host nginx (80/443, SSL) → 127.0.0.1:2080 (web: React + /api,/admin proxy) → backend:10000 (gunicorn) → db`

## 1. Birinchi deploy

```bash
# DNS: test.iymanim.uz  A  <VPS IP>
git clone <repo-url> /opt/iymon && cd /opt/iymon
cp .env.prod.example .env
nano .env   # DJANGO_SECRET_KEY, POSTGRES_PASSWORD, AI kalitlari
# Secret key: python3 -c "import secrets; print(secrets.token_urlsafe(50))"

docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

Migratsiya va `collectstatic` backend ishga tushganda avtomatik bajariladi.

## 2. Host nginx + SSL

```bash
sudo cp deploy/nginx-test.iymanim.uz.conf /etc/nginx/sites-available/test.iymanim.uz
sudo ln -s /etc/nginx/sites-available/test.iymanim.uz /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d test.iymanim.uz
```

## 3. Ma'lumotlarni yuklash

Yangi baza bo'sh (faqat migratsiyadagi seed). Mavjud bazadan ko'chirish:

```bash
# Lokal: python manage.py dumpdata --natural-foreign --natural-primary \
#   -e contenttypes -e auth.Permission -e sessions -e admin.LogEntry -o data.json
docker compose -f docker-compose.prod.yml cp data.json backend:/app/data.json
docker compose -f docker-compose.prod.yml exec backend python manage.py loaddata data.json
```

Yoki manbalardan to'ldirish:

```bash
dc="docker compose -f docker-compose.prod.yml exec backend python manage.py"
$dc sync_prayer_times --year 2026
$dc import_muslimuz && $dc import_muslimuz --category iymon
$dc sync_mosques && $dc import_masjid_uz
```

## 4. Yangilash

```bash
cd /opt/iymon && git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## 5. Cron (host crontab)

```
0 3 * * * cd /opt/iymon && docker compose -f docker-compose.prod.yml exec -T backend python manage.py sync_prayer_times
0 4 * * 1 cd /opt/iymon && docker compose -f docker-compose.prod.yml exec -T backend python manage.py sync_mosques
```

## Foydali buyruqlar

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
# Backup
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U iymon iymon | gzip > backup_$(date +%F).sql.gz
```
