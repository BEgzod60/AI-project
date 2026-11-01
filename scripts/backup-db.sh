#!/usr/bin/env bash
# Postgres zaxirasi (docker ichidagi db konteyneri) -> backups/pg_<sana>.sql.gz
# Ishlatish (loyiha ildizidan):  scripts/backup-db.sh
# Cron namunasi (har kuni 03:00):  0 3 * * * cd /path/to/project && scripts/backup-db.sh
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
KEEP_DAYS="${KEEP_DAYS:-14}"
OUT_DIR="backups"
STAMP="$(date +%Y-%m-%d_%H%M)"
OUT="$OUT_DIR/pg_${STAMP}.sql.gz"

mkdir -p "$OUT_DIR"

# Parol konteyner ichidagi muhitdan olinadi, shuning uchun skriptda hech narsa yozilmaydi
docker compose -f "$COMPOSE_FILE" exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' | gzip > "$OUT"

# Bo'sh yoki buzilgan zaxirani qoldirmaslik
if [ ! -s "$OUT" ] || ! gzip -t "$OUT"; then
  rm -f "$OUT"
  echo "XATO: zaxira yaratilmadi" >&2
  exit 1
fi

# Eski zaxiralarni tozalash (faqat shu skript yaratgan pg_*.sql.gz fayllari)
find "$OUT_DIR" -name 'pg_*.sql.gz' -mtime +"$KEEP_DAYS" -delete

echo "OK: $OUT ($(du -h "$OUT" | cut -f1))"
