#!/bin/bash
# Never block next start. UI must boot even if DB is missing or slow.
set -u
log() { echo "[dobare] pre-start $*"; }
log "begin pwd=$(pwd)"
log "DATABASE_URL set: $([ -n "${DATABASE_URL:-}" ] && echo yes || echo no)"
if [ -z "${DATABASE_URL:-}" ]; then
  log "skip migrations: DATABASE_URL missing. Next will still start."
  exit 0
fi
if [ ! -f scripts/apply-migrations.mjs ]; then
  log "skip migrations: scripts/apply-migrations.mjs not in this image."
  exit 0
fi
if command -v timeout >/dev/null 2>&1; then
  timeout 12s node scripts/apply-migrations.mjs \
    && log "migrations done" \
    || log "migrations failed or timed out; continuing so UI can start"
else
  node scripts/apply-migrations.mjs \
    && log "migrations done" \
    || log "migrations failed; continuing so UI can start"
fi
mkdir -p "${UPLOAD_DIR:-$(pwd)/data/uploads}" 2>/dev/null || true
exit 0
