#!/bin/bash
set -u
echo "[dobare] post-build pwd=$(pwd)"
STANDALONE=".next/standalone"
if [ ! -d "$STANDALONE" ]; then
  echo "[dobare] post-build: standalone dir missing; skip copy"
  exit 0
fi
mkdir -p "$STANDALONE/scripts" "$STANDALONE/src/db/migrations"
if [ -f scripts/apply-migrations.mjs ]; then
  cp -f scripts/apply-migrations.mjs "$STANDALONE/scripts/"
fi
if [ -d src/db/migrations ]; then
  cp -f src/db/migrations/*.sql "$STANDALONE/src/db/migrations/" 2>/dev/null || true
fi
exit 0
