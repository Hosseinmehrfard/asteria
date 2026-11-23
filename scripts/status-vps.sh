#!/usr/bin/env bash
# Quick deployment diagnosis without changing application state.
set -Eeuo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
require_deployment_env
printf '\nProject path: %s\n' "$PROJECT_ROOT"
printf 'Git revision: '; git rev-parse --short HEAD 2>/dev/null || true
printf 'Configured domain: '; sed -n 's/^DOMAIN=//p' .env | tail -n 1
info 'Docker Compose services'
dc ps
info 'Local API health'
health_response="$(curl -fsS --connect-timeout 3 --max-time 8 http://127.0.0.1:4000/api/health 2>/dev/null || true)"
if [[ "$health_response" == *'"service":"asteria"'* ]]; then
  printf '%s\n' "$health_response"
  printf '\nHealthy\n'
else
  printf 'Local API is unavailable; last 60 app log lines follow.\n' >&2
  dc logs --tail=60 web || true
  exit 1
fi
