#!/usr/bin/env bash
set -euo pipefail

# Instala y despliega Climate Monitor en Debian.
# Uso: sudo bash deploy/install.sh  (desde la raíz del proyecto)

if [[ $EUID -ne 0 ]]; then
  echo "Ejecuta con: sudo bash deploy/install.sh" >&2
  exit 1
fi

APP_USER="peter"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
DEST="/opt/climate-dashboard"
ENV_FILE="/etc/climate-dashboard.env"

# Localiza el binario de node del usuario peter (nvm).
NODE_BIN="$(ls -1 /home/peter/.nvm/versions/node/*/bin/node 2>/dev/null | sort -V | tail -1)"
if [[ -z "$NODE_BIN" || ! -x "$NODE_BIN" ]]; then
  echo "No se encontró node para el usuario peter." >&2
  exit 1
fi
NODE_DIR="$(dirname "$NODE_BIN")"
PNPM_BIN="$NODE_DIR/pnpm"

# La API key se toma del firmware (archivo ignorado por git).
INGEST_API_KEY="$(grep -oP '#define INGEST_API_KEY "\K[^"]+' "$SRC/firmware/esp32-sht3x/include/secrets.h" || true)"
if [[ -z "$INGEST_API_KEY" ]]; then
  echo "No se encontró INGEST_API_KEY en firmware/esp32-sht3x/include/secrets.h" >&2
  exit 1
fi

echo "== 1/8 Limpiando destino =="
[[ "$DEST" == /opt/* && "$DEST" != /opt ]] || { echo "Ruta de destino inesperada"; exit 1; }
rm -rf "$DEST"
mkdir -p "$DEST"

echo "== 2/8 Copiando proyecto (sin node_modules/.next/.git/.pio) =="
tar -C "$SRC" \
  --exclude='./node_modules' \
  --exclude='./.next' \
  --exclude='./.git' \
  --exclude='./firmware/esp32-sht3x/.pio' \
  --exclude='./tsconfig.tsbuildinfo' \
  -cf - . | tar -C "$DEST" -xf -
chown -R "$APP_USER:$APP_USER" "$DEST"

echo "== 3/8 Configurando variables de entorno =="
if [[ ! -f "$ENV_FILE" ]]; then
  DB_PASS="$(openssl rand -hex 16)"
  umask 077
  cat > "$ENV_FILE" <<EOF
DATABASE_URL=postgresql://climate_app:${DB_PASS}@127.0.0.1:5432/climate_monitor
DATABASE_SSL=false
INGEST_API_KEY=${INGEST_API_KEY}
NEXT_PUBLIC_DASHBOARD_TIME_ZONE=America/Santiago
EOF
  chown root:root "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "Creado $ENV_FILE"
else
  echo "$ENV_FILE ya existe; se conserva."
fi

echo "== 4/8 Configurando base de datos =="
DB_PASS="$(grep -oP 'climate_app:\K[^@]+' "$ENV_FILE")"
su - postgres -c "psql -v ON_ERROR_STOP=1 -c \"ALTER ROLE climate_app WITH PASSWORD '${DB_PASS}';\"" >/dev/null
if ! su - postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='climate_monitor'\"" | grep -q 1; then
  su - postgres -c "createdb -O climate_app climate_monitor"
  echo "Base de datos climate_monitor creada."
fi

echo "== 5/8 Aplicando migraciones =="
set -a; . "$ENV_FILE"; set +a
for f in 001_create_sensor_data.sql 002_add_firmware_version.sql 003_add_rssi.sql 004_add_hourly_history.sql; do
  echo "  -> $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$DEST/migrations/$f" >/dev/null
done

echo "== 6/8 Compilando aplicación =="
su - "$APP_USER" -c "cd '$DEST' && PATH='$NODE_DIR:$PATH' '$PNPM_BIN' install && PATH='$NODE_DIR:$PATH' '$PNPM_BIN' build"

echo "== 7/8 Instalando servicios systemd =="
sed "s|__NODE_BIN__|$NODE_BIN|" "$DEST/deploy/climate-dashboard.service" > /etc/systemd/system/climate-dashboard.service
cp "$DEST/deploy/climate-history.service" /etc/systemd/system/climate-history.service
cp "$DEST/deploy/climate-history.timer" /etc/systemd/system/climate-history.timer
systemctl daemon-reload
systemctl enable --now climate-dashboard.service climate-history.timer

echo "== 8/8 Verificando =="
sleep 2
systemctl is-active climate-dashboard.service
curl -fsS http://127.0.0.1:3000/api/firmware/latest && echo

echo
echo "Listo. Dashboard disponible en http://192.168.1.4:3000"
