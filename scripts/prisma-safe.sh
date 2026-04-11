#!/bin/bash
# =============================================================================
# scripts/prisma-safe.sh — Safe wrapper for Prisma CLI
#
# BLOCKS --force-reset unconditionally.
# --force-reset drops and recreates ALL tables → permanent data loss.
# Use "prisma migrate dev" for schema changes on local dev.
# Use "prisma migrate deploy" for production deployments.
# =============================================================================

set -e

# ── Block --force-reset ───────────────────────────────────────────────────────
if echo "$*" | grep -q "\-\-force-reset"; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  🚨  --force-reset IS PERMANENTLY DISABLED                  ║"
  echo "║                                                              ║"
  echo "║  This flag DROPS ALL TABLES and destroys every row.         ║"
  echo "║  It caused a complete data loss on 2026-04-11.              ║"
  echo "║                                                              ║"
  echo "║  Use migrations instead:                                     ║"
  echo "║    Local dev:   npm run db:migrate                          ║"
  echo "║    Production:  npm run db:deploy                           ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  exit 1
fi

# ── Block direct db push against production URL ───────────────────────────────
if echo "$*" | grep -q "db push"; then
  # Load DATABASE_URL from .env if available
  if [ -f ".env" ]; then
    DB_URL=$(grep "^DATABASE_URL=" .env | head -1 | sed 's/DATABASE_URL=//' | tr -d '"' | tr -d "'")
  fi
  DB_URL="${DATABASE_URL:-$DB_URL}"

  # Detect Supabase production host
  if echo "$DB_URL" | grep -qE "supabase\.(co|com)"; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  ⚠️   PRODUCTION DATABASE DETECTED                          ║"
    echo "║                                                              ║"
    echo "║  'prisma db push' on production is dangerous.               ║"
    echo "║  Use 'npm run db:deploy' (prisma migrate deploy) instead.  ║"
    echo "║                                                              ║"
    echo "║  To override (local dev with Supabase), set:               ║"
    echo "║    ALLOW_DB_PUSH=1 npm run db:push                         ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""

    if [ "$ALLOW_DB_PUSH" != "1" ]; then
      exit 1
    fi

    echo "⚠️  ALLOW_DB_PUSH=1 set — proceeding with db push..."
    echo ""
  fi
fi

# ── Run Prisma normally ───────────────────────────────────────────────────────
exec npx prisma "$@"
