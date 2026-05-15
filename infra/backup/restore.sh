#!/usr/bin/env sh
set -eu

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/infra/docker/docker-compose.yml}"
DB_SERVICE="${DB_SERVICE:-db}"
DB_NAME="${DB_NAME:-operationhub}"
DB_USER="${DB_USER:-operationhub}"
UPLOAD_DIR="${UPLOAD_DIR:-$ROOT_DIR/apps/api/uploads}"

usage() {
  echo "Usage: $0 --confirm /path/to/operationhub-backup-YYYYmmddTHHMMSSZ.tar.gz"
  echo
  echo "This restore replaces the current database content and upload files."
}

if [ "${1:-}" != "--confirm" ] || [ -z "${2:-}" ]; then
  usage
  exit 2
fi

archive="$2"
if [ ! -f "$archive" ]; then
  echo "Backup archive not found: $archive" >&2
  exit 1
fi

work_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$work_dir"
}
trap cleanup EXIT

echo "Extracting backup archive..."
tar -xzf "$archive" -C "$work_dir"

if [ ! -f "$work_dir/database.sql" ] || [ ! -f "$work_dir/uploads.tar" ]; then
  echo "Invalid backup archive: expected database.sql and uploads.tar" >&2
  exit 1
fi

echo "Stopping API while restoring database..."
docker compose -f "$COMPOSE_FILE" stop api >/dev/null

echo "Restoring PostgreSQL..."
docker compose -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" psql \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 \
  < "$work_dir/database.sql"

echo "Restoring uploaded evidence and reports..."
mkdir -p "$UPLOAD_DIR"
find "$UPLOAD_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -C "$UPLOAD_DIR" -xf "$work_dir/uploads.tar"

echo "Starting API..."
docker compose -f "$COMPOSE_FILE" up -d api >/dev/null

echo "Restore complete from: $archive"
