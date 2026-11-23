#!/usr/bin/env bash
# Usage: bash scripts/install-vps.sh astro.example.com
set -Eeuo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

DOMAIN_NAME="${1:-}"
[[ "$DOMAIN_NAME" =~ ^([a-zA-Z0-9][a-zA-Z0-9-]*\.)+[a-zA-Z]{2,63}$ ]] || fail 'Provide a valid DNS hostname, e.g. bash scripts/install-vps.sh astro.example.com (no https:// or slash).'
[[ "$DOMAIN_NAME" != *'..'* ]] || fail 'Invalid domain.'
for label in ${DOMAIN_NAME//./ }; do
  [[ "${#label}" -le 63 && "$label" != -* && "$label" != *- ]] || fail 'Invalid DNS label.'
done

# Install missing components only. Never remove or replace an existing Docker CE installation.
needs_docker=0
needs_compose=0
needs_buildx=0
needs_curl=0
command -v docker >/dev/null 2>&1 || needs_docker=1
if [[ "$needs_docker" == 0 ]]; then
  docker compose version >/dev/null 2>&1 || needs_compose=1
  docker buildx version >/dev/null 2>&1 || needs_buildx=1
else
  needs_compose=1
  needs_buildx=1
fi
command -v curl >/dev/null 2>&1 || needs_curl=1
if ((needs_docker || needs_compose || needs_buildx || needs_curl)); then
  if [[ -r /etc/os-release ]]; then source /etc/os-release; else fail 'Cannot identify Linux distribution.'; fi
  [[ "${ID:-}" == 'ubuntu' && "${VERSION_ID:-}" == '24.04' ]] || fail 'Automatic dependency installation is supported only on Ubuntu 24.04.'
  command -v sudo >/dev/null 2>&1 || [[ $(id -u) -eq 0 ]] || fail 'sudo is required to install missing packages.'
  packages=(ca-certificates curl)
  if ((needs_docker)); then
    packages+=(docker.io docker-compose-v2 docker-buildx)
  else
    using_docker_ce=0
    if dpkg-query -W -f='${Status}' docker-ce 2>/dev/null | grep -q 'install ok installed'; then using_docker_ce=1; fi
    if ((needs_compose)); then
      if ((using_docker_ce)); then packages+=(docker-compose-plugin); else packages+=(docker-compose-v2); fi
    fi
    if ((needs_buildx)); then
      if ((using_docker_ce)); then packages+=(docker-buildx-plugin); else packages+=(docker-buildx); fi
    fi
  fi
  info 'Installing missing dependencies from the already-configured APT repositories'
  if [[ $(id -u) -eq 0 ]]; then
    apt-get update && apt-get install -y "${packages[@]}"
  else
    sudo apt-get update && sudo apt-get install -y "${packages[@]}"
  fi
fi
command -v docker >/dev/null 2>&1 || fail 'Docker CLI is unavailable.'
docker compose version >/dev/null 2>&1 || fail 'Docker Compose v2 is unavailable.'
docker buildx version >/dev/null 2>&1 || fail 'Docker Buildx is unavailable.'
command -v curl >/dev/null 2>&1 || fail 'curl is unavailable.'
if ! docker info >/dev/null 2>&1 && ! { command -v sudo >/dev/null 2>&1 && sudo docker info >/dev/null 2>&1; }; then
  info 'Starting the Docker daemon'
  if [[ $(id -u) -eq 0 ]]; then systemctl enable --now docker; else sudo systemctl enable --now docker; fi
fi
if ! docker info >/dev/null 2>&1 && ! { command -v sudo >/dev/null 2>&1 && sudo docker info >/dev/null 2>&1; }; then
  fail 'Docker daemon is not reachable (check systemctl status docker).'
fi

if [[ -e .env ]]; then
  existing_origin="$(sed -n 's/^APP_ORIGIN=//p' .env | tail -n 1)"
  existing_domain="$(sed -n 's/^DOMAIN=//p' .env | tail -n 1)"
  [[ "$existing_origin" == "https://$DOMAIN_NAME" && "$existing_domain" == "$DOMAIN_NAME" ]] || fail 'Existing .env does not match requested domain. Edit it manually; this script will not overwrite it.'
else
  info 'Creating the server-only environment file'
  umask 077
  printf 'DOMAIN=%s\nAPP_ORIGIN=https://%s\n' "$DOMAIN_NAME" "$DOMAIN_NAME" > .env
  chmod 600 .env
fi

mkdir -p storage/data storage/uploads/public storage/uploads/private storage/backups storage/caddy-data storage/caddy-config

dc config --quiet
info 'Building and starting the web application and HTTPS proxy'
dc up -d --build

info 'Verifying the application health endpoint'
healthy=0
for attempt in {1..30}; do
  health_response="$(curl -fsS --max-time 4 http://127.0.0.1:4000/api/health 2>/dev/null || true)"
  if [[ "$health_response" == *'"service":"asteria"'* ]]; then healthy=1; printf '%s\n' "$health_response"; break; fi
  sleep 2
done
printf '\n'
[[ "$healthy" == 1 ]] || { dc logs --tail=80 web; fail 'Application failed health check.'; }

info 'Current services'
dc ps
printf '\nSite: https://%s\n' "$DOMAIN_NAME"
printf 'Admin: https://%s/admin\n' "$DOMAIN_NAME"
printf 'Required: point the DNS A/AAAA record to this VPS and allow inbound TCP ports 80/443.\n'
printf 'The first issuance of a TLS certificate depends on public DNS and network access.\n'

if [[ -t 0 && -t 1 ]]; then
  printf '\nCreate administrator account now? [y/N] '
  read -r answer
  if [[ "$answer" =~ ^[Yy]$ ]]; then
    dc exec web node server/setup-admin.js
  else
    printf 'Later: docker compose -f compose.yaml -f compose.vps.yaml exec web node server/setup-admin.js\n'
  fi
else
  printf 'Create admin interactively over SSH: docker compose -f compose.yaml -f compose.vps.yaml exec web node server/setup-admin.js\n'
fi
