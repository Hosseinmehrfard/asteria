#!/usr/bin/env bash
# Idempotent GitHub VPS bootstrap: clone only when absent, otherwise update.
# Usage: bash scripts/bootstrap-vps.sh example.com
# Remote single line: curl -fsSL RAW_URL | bash -s -- example.com
set -Eeuo pipefail

DOMAIN="${1:-}"
REPO_URL="${ASTERIA_REPO_URL:-https://github.com/Hosseinmehrfard/asteria.git}"
TARGET="${ASTERIA_DIR:-/opt/asteria}"

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
info() { printf '\n==> %s\n' "$*"; }

[[ "$DOMAIN" =~ ^([a-zA-Z0-9][a-zA-Z0-9-]*\.)+[a-zA-Z]{2,63}$ ]] || fail 'Pass only your domain, e.g. example.com (without https://).'
[[ "$TARGET" == /* ]] || fail 'ASTERIA_DIR must be an absolute path.'
command -v git >/dev/null 2>&1 || {
  command -v apt-get >/dev/null 2>&1 || fail 'Git is missing. Install git manually.'
  info 'Installing git'
  if [[ $(id -u) -eq 0 ]]; then apt-get update && apt-get install -y git; else sudo apt-get update && sudo apt-get install -y git; fi
}

if [[ -d "$TARGET/.git" ]]; then
  info "Using existing repository in $TARGET (no second git clone)"
  origin="$(git -C "$TARGET" remote get-url origin 2>/dev/null || true)"
  [[ -n "$origin" ]] || fail "Existing Git repo has no origin remote: $TARGET"
  # Allow both HTTPS and SSH URLs for the same repository.
  normalize() { printf '%s' "$1" | sed -E 's#^git@github.com:#https://github.com/#;s#/$##;s#\.git$##'; }
  [[ "$(normalize "$origin")" == "$(normalize "$REPO_URL")" ]] || fail "Existing repo points to $origin instead of $REPO_URL; refusing to overwrite it."
  [[ -z "$(git -C "$TARGET" status --porcelain --untracked-files=no)" ]] || fail 'Tracked files changed locally. Review them before continuing.'
  cd "$TARGET"
  if [[ -f .env ]]; then
    installed_domain="$(sed -n 's/^DOMAIN=//p' .env | tail -n 1)"
    [[ "$installed_domain" == "$DOMAIN" ]] || fail "Installed domain is '$installed_domain', not '$DOMAIN'. Edit .env deliberately if you need a change."
    # If an earlier installation stopped halfway, its .env may exist without a
    # working Docker web service. Repair it with the installer (after backup).
    web_running=0
    if command -v docker >/dev/null 2>&1; then
      if docker info >/dev/null 2>&1 && docker compose -f compose.yaml -f compose.vps.yaml ps --status running --services web 2>/dev/null | grep -qx web; then
        web_running=1
      elif command -v sudo >/dev/null 2>&1 && sudo docker info >/dev/null 2>&1 && sudo docker compose -f compose.yaml -f compose.vps.yaml ps --status running --services web 2>/dev/null | grep -qx web; then
        web_running=1
      fi
    fi
    if [[ "$web_running" == 1 ]]; then
      info 'Running deployment detected. Backing up and applying update.'
      bash scripts/update-vps.sh
    else
      info 'Existing VPS config found, but the web service is stopped. Backing up, pulling and repairing installation.'
      bash scripts/backup-vps.sh
      git pull --ff-only
      bash scripts/install-vps.sh "$DOMAIN"
    fi
  else
    info 'Repository exists but no VPS config exists. Pulling and installing.'
    git pull --ff-only
    bash scripts/install-vps.sh "$DOMAIN"
  fi
else
  if [[ -e "$TARGET" && -n "$(ls -A "$TARGET" 2>/dev/null)" ]]; then
    fail "Directory $TARGET is not empty and is not an Asteria git clone. Nothing was deleted."
  fi
  info "Cloning $REPO_URL into $TARGET"
  if [[ ! -d "$TARGET" ]]; then
    parent="$(dirname "$TARGET")"
    if [[ -w "$parent" ]]; then
      mkdir -p "$TARGET"
    else
      command -v sudo >/dev/null 2>&1 || fail "Cannot create $TARGET without sudo."
      sudo mkdir -p "$TARGET"
      sudo chown "$(id -u):$(id -g)" "$TARGET"
    fi
  fi
  git clone "$REPO_URL" "$TARGET"
  cd "$TARGET"
  bash scripts/install-vps.sh "$DOMAIN"
fi
