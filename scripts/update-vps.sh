#!/usr/bin/env bash
# Safe fast-forward-only update from the configured GitHub remote.
set -Eeuo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
require_deployment_env
command -v git >/dev/null 2>&1 || fail 'Git is not installed.'
git rev-parse --show-toplevel >/dev/null 2>&1 || fail 'Project must be cloned from GitHub.'
[[ "$(git rev-parse --show-toplevel)" == "$PROJECT_ROOT" ]] || fail 'Wrong repository root.'
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || fail 'Tracked files have uncommitted changes. Commit or stash before updating.'
git remote get-url origin >/dev/null 2>&1 || fail 'Git remote origin is missing.'

info 'Backing up persistent application data before update'
bash scripts/backup-vps.sh
OLD_SHA="$(git rev-parse --short HEAD)"
info 'Downloading and fast-forwarding to the latest commit'
git pull --ff-only
NEW_SHA="$(git rev-parse --short HEAD)"
info "Rebuilding the application ($OLD_SHA -> $NEW_SHA)"
dc up -d --build
info 'Checking app health'
for attempt in {1..30}; do
  if curl -fsS --max-time 4 http://127.0.0.1:4000/api/health; then
    printf '\nUpdated: %s -> %s\n' "$OLD_SHA" "$NEW_SHA"
    printf 'Uploaded files, SQLite database and Caddy TLS data remain in storage/.\n'
    exit 0
  fi
  sleep 2
done
printf '\n' >&2
dc logs --tail=100 web
fail 'Health check failed. Check logs and restore from storage/backups if necessary.'
