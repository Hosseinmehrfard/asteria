#!/usr/bin/env bash
# Back up SQLite online and copy uploads. Keep off-site copies as well.
set -Eeuo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
require_deployment_env
umask 077
mkdir -p storage/backups
info 'Generating SQLite online backup in persistent storage'
dc exec -T web node server/backup.js
STAMP="$(date -u +'%Y%m%dT%H%M%SZ')"
UPLOAD_ARCHIVE="$(pwd)/storage/backups/asteria-uploads-${STAMP}.tar.gz"
info 'Archiving public and private uploads'
if ! tar -czf "$UPLOAD_ARCHIVE" -C storage/uploads . 2>/dev/null; then
  # Uploaded files may be owned by root in the web container.
  rm -f "$UPLOAD_ARCHIVE" 2>/dev/null || true
  if [[ $(id -u) -eq 0 ]]; then
    tar -czf "$UPLOAD_ARCHIVE" -C storage/uploads .
  else
    sudo tar -czf "$UPLOAD_ARCHIVE" -C storage/uploads .
  fi
fi
info "Backup files: $(pwd)/storage/backups"
printf 'Copy both SQLite backups and the uploads archive off the VPS.\n'
