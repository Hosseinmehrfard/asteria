#!/usr/bin/env bash
set -Eeuo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
require_deployment_env
# Choose "web" or "caddy" to inspect a specific service.
service="${1:-web}"
[[ "$service" == web || "$service" == caddy ]] || fail 'Service must be web or caddy.'
dc logs --tail=150 "$service"
