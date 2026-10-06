# Debian deployment

The application and PostgreSQL run on the same Debian host. Keep PostgreSQL bound to
localhost; the ESP32 sends data to the Next.js API, never directly to PostgreSQL.

## One-shot install

From the project root, run:

```bash
sudo bash deploy/install.sh
```

It cleans `/opt/climate-dashboard`, copies the source (excluding build artifacts),
creates `/etc/climate-dashboard.env`, resets the `climate_app` database role, applies
migrations, builds the app as `peter`, and installs + starts the systemd services.

## Prerequisites

- Node.js + pnpm installed for user `peter` (via nvm).
- PostgreSQL 15 running (`systemctl is-active postgresql`).
- `climate_app` role and `climate_monitor` database created:

```bash
sudo -u postgres createuser --pwprompt climate_app
sudo -u postgres createdb -O climate_app climate_monitor
```

(The install script resets the role password to match the generated env file, so the
password you pick here is overwritten.)

## Environment file

`/etc/climate-dashboard.env` is created with `DATABASE_URL`, `INGEST_API_KEY`
(derived from the firmware `secrets.h`), and `NEXT_PUBLIC_DASHBOARD_TIME_ZONE`.
It is root-only (mode 600).

## Services

- `climate-dashboard.service` — Next.js on `0.0.0.0:3000`.
- `climate-history.timer` — runs `migrations/005_maintain_sensor_history.sql` hourly
  (rolls up `sensor_hourly`, prunes raw data older than 30 days).

Useful commands:

```bash
systemctl status climate-dashboard
journalctl -u climate-dashboard -f
systemctl list-timers climate-history.timer
```

The dashboard is available on the LAN at `http://SERVER_LAN_IP:3000`.
