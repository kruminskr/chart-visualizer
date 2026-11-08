#!/usr/bin/env bash
# Idempotent local dev setup: deps, local Postgres, .env.local, Prisma schema.
# Safe to run on every session start. Used by .claude/hooks/session-start.sh.
set -euo pipefail
cd "$(dirname "$0")/.."

log() { echo "[dev-setup] $*"; }

# 1. Dependencies — only reinstall when a file that decides the install changed.
#    Hash file lives inside node_modules so it disappears with the packages.
hashes=node_modules/.dev-setup.sha256
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  rm -f "$hashes"
  log "installing npm dependencies"
  npm install --no-audit --no-fund
  sha256sum scripts/dev-setup.sh package.json package-lock.json prisma/schema.prisma > "$hashes" || rm -f "$hashes"
fi

# 2. .env.local (only created if missing — never overwrites real credentials)
if [ ! -f .env.local ]; then
  log "creating .env.local from .env.example (dev auth bypass + local Postgres)"
  cp .env.example .env.local
fi

# 3. Local Postgres (only if .env.local points at localhost)
if grep -q '^DATABASE_URL=.*localhost' .env.local; then
  if command -v pg_isready >/dev/null && ! pg_isready -q -h localhost -p 5432; then
    log "starting local PostgreSQL"
    if command -v service >/dev/null; then
      service postgresql start >/dev/null
    fi
    for _ in $(seq 1 20); do pg_isready -q -h localhost -p 5432 && break; sleep 0.5; done
  fi
  if pg_isready -q -h localhost -p 5432 2>/dev/null; then
    if [ "$(id -u)" = 0 ] && id postgres >/dev/null 2>&1; then
      su postgres -c "psql -qc \"ALTER USER postgres PASSWORD 'postgres';\"" >/dev/null
      su postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='laser_dev'\"" | grep -q 1 \
        || su postgres -c "createdb laser_dev"
    fi
    log "syncing Prisma schema to local DB"
    npx dotenv -e .env.local -- prisma db push --skip-generate >/dev/null
  else
    log "WARNING: local Postgres not reachable — DB-backed pages will fail"
  fi
fi

log "done"
