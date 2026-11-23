#!/usr/bin/env bash
# Online SQLite backup for a running site; safe offline fallback if service is stopped.
set -Eeuo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
require_deployment_env
umask 077
mkdir -p storage/backups storage/uploads
STAMP="$(date -u +'%Y%m%dT%H%M%SZ')"
DB_FILE="$(pwd)/storage/data/asteria.sqlite"
DB_BACKUP="$(pwd)/storage/backups/asteria-${STAMP}.sqlite"
UPLOAD_ARCHIVE="$(pwd)/storage/backups/asteria-uploads-${STAMP}.tar.gz"

info 'Backing up SQLite'
if [[ -n "$(dc ps --status running --services web 2>/dev/null || true)" ]]; then
  # The application creates a consistent SQLite backup inside the mounted backups directory.
  dc exec -T web node server/backup.js
elif [[ -f "$DB_FILE" ]]; then
  # The web container is not running; use SQLite's backup API, not a raw file copy (WAL-safe).
  command -v python3 >/dev/null 2>&1 || fail 'Application is stopped and python3 is unavailable. Cannot safely back up SQLite.'
  python3 - "$DB_FILE" "$DB_BACKUP" <<'PY'
import sqlite3, sys
source = sqlite3.connect(f'file:{sys.argv[1]}?mode=ro', uri=True)
target = sqlite3.connect(sys.argv[2])
try:
    with target:
        source.backup(target)
finally:
    source.close()
    target.close()
PY
  chmod 600 "$DB_BACKUP"
  info "Offline SQLite backup: $DB_BACKUP"
else
  info 'No existing database; skipping SQLite backup on initial deployment'
fi

info 'Backing up uploaded files'
if ! tar -czf "$UPLOAD_ARCHIVE" -C storage/uploads . 2>/dev/null; then
  rm -f "$UPLOAD_ARCHIVE" 2>/dev/null || true
  if [[ $(id -u) -eq 0 ]]; then
    tar -czf "$UPLOAD_ARCHIVE" -C storage/uploads .
  else
    sudo tar -czf "$UPLOAD_ARCHIVE" -C storage/uploads .
  fi
fi
chmod 600 "$UPLOAD_ARCHIVE" 2>/dev/null || sudo chmod 600 "$UPLOAD_ARCHIVE"
info "Backup complete in $(pwd)/storage/backups"
printf 'IMPORTANT: copy database and uploads backup files off the VPS.\n'
