#!/bin/bash
# SessionStart hook (cloud sessions only): deps, local Postgres, .env.local, Prisma schema.
# All steps are idempotent and skip work already done. See scripts/dev-setup.sh.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"
./scripts/dev-setup.sh
