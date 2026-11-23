#!/usr/bin/env bash
# Internal helpers. Run scripts from anywhere; paths resolve from their location.
set -Eeuo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"
COMPOSE_FILES=(-f compose.yaml -f compose.vps.yaml)

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
info() { printf '\n==> %s\n' "$*"; }

# Supports users both with and without permission to access Docker's daemon.
dc() {
  if docker info >/dev/null 2>&1; then
    docker compose "${COMPOSE_FILES[@]}" "$@"
  else
    command -v sudo >/dev/null 2>&1 || fail 'Docker daemon permission is denied. Install/configure sudo.'
    sudo docker compose "${COMPOSE_FILES[@]}" "$@"
  fi
}

require_deployment_env() {
  [[ -f .env ]] || fail 'Missing .env. Run scripts/install-vps.sh first.'
  [[ -f compose.vps.yaml ]] || fail 'Missing compose.vps.yaml.'
}
