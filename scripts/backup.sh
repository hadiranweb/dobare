#!/usr/bin/env bash
# بکاپ کامل دوباره: دیتابیس + عکس‌های آپلودی
# استفاده:  ./scripts/backup.sh
# بکاپ خودکار شبانه (ساعت ۳ بامداد):
#   crontab -e  و افزودن خط:
#   0 3 * * * cd /path/to/dobare && ./scripts/backup.sh >> backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

# خواندن متغیرها از .env
POSTGRES_USER=$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2)
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' .env | cut -d= -f2)
: "${POSTGRES_USER:=dobare}" "${POSTGRES_DB:=dobare}"

STAMP=$(date +%F-%H%M)
OUT_DIR=${BACKUP_DIR:-backups}
KEEP=14 # تعداد نسخه‌هایی که نگه داشته می‌شوند

mkdir -p "$OUT_DIR"

# ۱) دیتابیس (بدون توقف سرویس)
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$OUT_DIR/db-$STAMP.sql.gz"

# ۲) عکس‌های آپلودی
tar czf "$OUT_DIR/uploads-$STAMP.tar.gz" data/uploads

# ۳) حذف نسخه‌های قدیمی‌تر
ls -1t "$OUT_DIR"/db-*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm
ls -1t "$OUT_DIR"/uploads-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm

echo "✅ بکاپ آماده شد: $OUT_DIR/db-$STAMP.sql.gz و uploads-$STAMP.tar.gz"
