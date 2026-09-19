#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="/etc/climate-dashboard.env"
BACKUP_DIR="/var/backups/climate-monitor"
RETENTION_DAYS=14

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Falta $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL no definido en $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y-%m-%d_%H%M%S)"
TARGET="$BACKUP_DIR/climate-monitor-$STAMP.dump"

pg_dump "$DATABASE_URL" -Fc -f "$TARGET"
echo "Backup creado: $TARGET ($(du -h "$TARGET" | cut -f1))"

find "$BACKUP_DIR" -name 'climate-monitor-*.dump' -type f -mtime +"$RETENTION_DAYS" -delete
