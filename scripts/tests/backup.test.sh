#!/usr/bin/env bash
# Verify consistent offline SQLite backup and uploaded asset archive.
set -Eeuo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT
mkdir -p "$scratch/scripts" "$scratch/storage/data" "$scratch/storage/uploads/public"
cp "$root/scripts/common.sh" "$root/scripts/backup-vps.sh" "$scratch/scripts/"
printf 'DOMAIN=example.com\nAPP_ORIGIN=https://example.com\n' > "$scratch/.env"
printf 'services: {}\n' > "$scratch/compose.vps.yaml"
printf 'Uploaded, do not lose\n' > "$scratch/storage/uploads/public/sample.txt"
python3 - "$scratch/storage/data/asteria.sqlite" <<'PY'
import sqlite3, sys
c=sqlite3.connect(sys.argv[1]); c.execute('PRAGMA journal_mode=WAL')
c.execute('CREATE TABLE important (value TEXT)'); c.execute('INSERT INTO important VALUES (?)', ('Customer order',))
c.commit(); c.close()
PY
bash "$scratch/scripts/backup-vps.sh" >/dev/null
python3 - "$scratch" <<'PY'
import glob, os, sqlite3, sys, tarfile
root=sys.argv[1]; backups=root+'/storage/backups/'
files=glob.glob(backups+'*.sqlite'); assert len(files)==1, files
with sqlite3.connect(files[0]) as c:
 assert c.execute('SELECT value FROM important').fetchone()[0]=='Customer order'
archives=glob.glob(backups+'*uploads*.tar.gz'); assert len(archives)==1, archives
with tarfile.open(archives[0]) as tar:
 assert './public/sample.txt' in tar.getnames()
assert os.stat(files[0]).st_mode & 0o077 == 0
assert os.stat(archives[0]).st_mode & 0o077 == 0
print('PASS: offline SQLite backup, uploads and restricted permissions')
PY
