#!/usr/bin/env bash
# Offline integration test for idempotent Git bootstrap; Docker is not required.
set -Eeuo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT
export GIT_CONFIG_GLOBAL=/dev/null
export GIT_CONFIG_SYSTEM=/dev/null
mkdir "$scratch/seed"
cd "$scratch/seed"
git init -q -b main
git config user.email test@example.test
git config user.name Test
mkdir -p scripts
cat > scripts/install-vps.sh <<'SCRIPT'
#!/usr/bin/env bash
set -Eeuo pipefail
printf 'DOMAIN=%s\nAPP_ORIGIN=https://%s\n' "$1" "$1" > .env
printf 'installed\n' >> deployment.log
SCRIPT
cat > scripts/update-vps.sh <<'SCRIPT'
#!/usr/bin/env bash
set -Eeuo pipefail
printf 'updated\n' >> deployment.log
SCRIPT
cat > scripts/backup-vps.sh <<'SCRIPT'
#!/usr/bin/env bash
set -Eeuo pipefail
printf 'backedup\n' >> deployment.log
SCRIPT
printf 'source code\n' > index.txt
git add .
git commit -qm initial
git init -q --bare "$scratch/remote.git"
git remote add origin "$scratch/remote.git"
git push -q -u origin main
# Bare repo HEAD must reference main for a clean clone.
git --git-dir="$scratch/remote.git" symbolic-ref HEAD refs/heads/main

target="$scratch/target"
ASTERIA_REPO_URL="$scratch/remote.git" ASTERIA_DIR="$target" bash "$root/scripts/bootstrap-vps.sh" example.com >/dev/null
[[ -d "$target/.git" ]] || { echo 'FAIL: no clone' >&2; exit 1; }
[[ -f "$target/.env" ]] || { echo 'FAIL: missing config' >&2; exit 1; }
[[ "$(cat "$target/deployment.log")" == installed ]] || { echo 'FAIL: wrong initial deployment' >&2; exit 1; }
printf 'PRESERVE\n' > "$target/customer-data.example"
# Simulate an already running Compose web service without requiring Docker.
mkdir -p "$scratch/mockbin"
cat > "$scratch/mockbin/docker" <<'SCRIPT'
#!/usr/bin/env bash
if [[ "$1" == info ]]; then exit 0; fi
if [[ "$1" == compose ]]; then printf 'web\n'; exit 0; fi
exit 1
SCRIPT
chmod +x "$scratch/mockbin/docker"
PATH="$scratch/mockbin:$PATH" ASTERIA_REPO_URL="$scratch/remote.git" ASTERIA_DIR="$target" bash "$root/scripts/bootstrap-vps.sh" example.com >/dev/null
[[ "$(tail -1 "$target/deployment.log")" == updated ]] || { echo 'FAIL: running service did not update' >&2; exit 1; }
# With no running Docker, rerunning must backup and repair instead of failing.
ASTERIA_REPO_URL="$scratch/remote.git" ASTERIA_DIR="$target" bash "$root/scripts/bootstrap-vps.sh" example.com >/dev/null
[[ "$(tail -2 "$target/deployment.log")" == $'backedup\ninstalled' ]] || { echo 'FAIL: stopped service not backed up and repaired' >&2; exit 1; }
[[ "$(cat "$target/customer-data.example")" == PRESERVE ]] || { echo 'FAIL: existing data changed' >&2; exit 1; }
if ASTERIA_REPO_URL="$scratch/remote.git" ASTERIA_DIR="$target" bash "$root/scripts/bootstrap-vps.sh" wrong.example.com >"$scratch/error" 2>&1; then
  echo 'FAIL: mismatch domain accepted' >&2; exit 1
fi
mkdir "$scratch/not-a-repo"
printf 'DO NOT DELETE\n' > "$scratch/not-a-repo/important"
if ASTERIA_REPO_URL="$scratch/remote.git" ASTERIA_DIR="$scratch/not-a-repo" bash "$root/scripts/bootstrap-vps.sh" example.com >"$scratch/error" 2>&1; then
  echo 'FAIL: non-empty unrelated directory accepted' >&2; exit 1
fi
[[ -f "$scratch/not-a-repo/important" ]] || { echo 'FAIL: unrelated data removed' >&2; exit 1; }
printf 'PASS: clone, running update, stopped repair with backup, preservation, domain and path guards\n'
