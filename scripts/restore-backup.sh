#!/bin/bash
# =============================================================================
# scripts/restore-backup.sh — Restore a pg_dump backup
#
# Usage:
#   ./scripts/restore-backup.sh <backup_file.sql.gz>
#
# The backup file can be downloaded from:
#   GitHub → Actions → Daily Database Backup → Artifacts
# =============================================================================

set -e

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  echo ""
  echo "Download backups from:"
  echo "  GitHub → Actions → Daily Database Backup → Artifacts"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ File not found: $BACKUP_FILE"
  exit 1
fi

# Load DATABASE_URL
ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
  export $(grep "^DATABASE_DIRECT_URL=" "$ENV_FILE" | sed 's/DATABASE_DIRECT_URL=//' | tr -d '"')
fi

DB_URL="${DATABASE_DIRECT_URL:-$DATABASE_URL}"
if [ -z "$DB_URL" ]; then
  echo "❌ DATABASE_DIRECT_URL not found in .env"
  exit 1
fi

CLEAN_URL=$(echo "$DB_URL" | sed 's/\?.*$//')

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ⚠️   YOU ARE ABOUT TO RESTORE A DATABASE BACKUP            ║"
echo "║                                                              ║"
echo "║  This will OVERWRITE existing data in the database.         ║"
echo "║  Make sure you have a recent backup of the current state.   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Backup file : $BACKUP_FILE"
echo "Target DB   : $(echo "$CLEAN_URL" | sed 's/:\/\/.*@/:\\/\\/<credentials>@/')"
echo ""
read -p "Type 'RESTORE' to confirm: " CONFIRM

if [ "$CONFIRM" != "RESTORE" ]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "Restoring..."
gunzip -c "$BACKUP_FILE" | psql "$CLEAN_URL" --no-password

echo ""
echo "✅ Restore completed."
