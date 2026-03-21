#!/bin/bash
# Backup de la base de datos Sara Medical
# Uso: ./scripts/backup-db.sh
# El backup se guarda en /var/backups/sara-medical/

set -e

BACKUP_DIR="/var/backups/sara-medical"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/sara_backup_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

# Cargar DATABASE_URL desde .env
ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
  export $(grep "^DATABASE_URL=" "$ENV_FILE" | sed 's/DATABASE_URL="\(.*\)"/DATABASE_URL=\1/' | sed 's/?pgbouncer=true//')
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL no encontrada en .env"
  exit 1
fi

echo "Iniciando backup: $BACKUP_FILE"
pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$BACKUP_FILE"

echo "Backup completado: $BACKUP_FILE"
echo "Tamaño: $(du -sh "$BACKUP_FILE" | cut -f1)"

# Borrar backups con más de 30 días
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
echo "Backups anteriores (>30 días) eliminados."
