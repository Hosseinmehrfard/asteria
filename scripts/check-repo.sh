#!/usr/bin/env bash
# Check that operational data is not accidentally tracked by Git.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
if [[ ! -d .git ]]; then echo 'No .git directory: initialize your GitHub repository first.'; exit 0; fi
bad="$(git ls-files | grep -E '(^|/)(\.env($|\.)|storage/|node_modules/|backups/|server/data/|server/uploads/)|\.(sqlite|sqlite-wal|sqlite-shm)$' | grep -Ev '(^|/)\.env(\.[A-Za-z0-9_-]+)?\.example$' || true)"
if [[ -n "$bad" ]]; then printf 'Do not commit runtime/secret files:\n%s\n' "$bad"; exit 1; fi
printf 'No private runtime files appear in tracked Git files.\n'
