#!/usr/bin/env sh
set -eu

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/infra/docker/docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DB_SERVICE="${DB_SERVICE:-db}"
DB_NAME="${DB_NAME:-operationhub}"
DB_USER="${DB_USER:-operationhub}"
UPLOAD_DIR="${UPLOAD_DIR:-$ROOT_DIR/apps/api/uploads}"

timestamp="$(date -u +"%Y%m%dT%H%M%SZ")"
work_dir="$BACKUP_DIR/.operationhub-backup-$timestamp"
archive="$BACKUP_DIR/operationhub-backup-$timestamp.tar.gz"

mkdir -p "$BACKUP_DIR" "$work_dir"

cleanup() {
  rm -rf "$work_dir"
}
trap cleanup EXIT

echo "Creating PostgreSQL dump..."
docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" pg_dump \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  > "$work_dir/database.sql"

echo "Copying uploaded evidence and reports..."
mkdir -p "$work_dir/uploads"
if [ -d "$UPLOAD_DIR" ]; then
  tar -C "$UPLOAD_DIR" -cf "$work_dir/uploads.tar" .
else
  tar -C "$work_dir/uploads" -cf "$work_dir/uploads.tar" .
fi

cat > "$work_dir/manifest.txt" <<EOF
OperationHub backup
created_at_utc=$timestamp
database=$DB_NAME
db_service=$DB_SERVICE
upload_dir=$UPLOAD_DIR
host=$(hostname)
EOF

tar -C "$work_dir" -czf "$archive" database.sql uploads.tar manifest.txt
chmod 600 "$archive"

echo "Backup written: $archive"

if [ "$RETENTION_DAYS" -gt 0 ] 2>/dev/null; then
  echo "Applying local retention: $RETENTION_DAYS day(s)"
  find "$BACKUP_DIR" -type f -name "operationhub-backup-*.tar.gz" -mtime "+$RETENTION_DAYS" -print -delete
fi
