# Climate Monitor System Dashboard

Dashboard full-stack de monitoreo de clima IoT, construido con dispositivos ESP32, Next.js y Neon.

## Features

- Monitoreo de temperatura en tiempo real
- Monitoreo de humedad en tiempo real
- Integración de sensores ESP32
- Base de datos cloud en Neon (Postgres)
- Widget de clima exterior (Open-Meteo) con selector de ubicación
- Widget de calidad del aire (Open-Meteo)
- Gráficos históricos con líneas de umbral
- Comparación de métricas entre hoy y ayer
- Actualización automática cada 10 segundos
- Temas claro/oscuro
- Dashboard moderno en Next.js
- UI responsiva
- Listo para desplegar

---

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Recharts
- Framer Motion

### Backend / Cloud

- Neon (Postgres)

### Hardware

- ESP32-WROOM-32
- Sensor SHT3X de temperatura y humedad

---

## System Architecture

```txt
ESP32 + SHT3X Sensor
        ↓
POST /api/ingest (x-api-key)
        ↓
Neon Database
        ↓
Next.js Dashboard
```

---

## Endpoints

### `POST /api/ingest`

Recibe lecturas desde los dispositivos ESP32.

Requiere el header `x-api-key` con el valor de `INGEST_API_KEY`.

```json
{
  "device_id": "esp32-01",
  "temperature": 22.5,
  "humidity": 55.2
}
```

### `GET /api/sensor-data`

Devuelve las lecturas de sensor en un rango de tiempo.

Query params: `range` (`1h` | `3h` | `6h` | `24h` | `7d` | `custom`), `start`, `end`.

---

## Cadencia de medición

El dispositivo ESP32 envía una lectura cada 1 minuto. A este ritmo se generan unas 1.440 filas por día (~525 mil al año) por dispositivo en Neon. El dashboard consulta nuevos datos cada 60 segundos y marca el dispositivo como fuera de línea si no recibe lecturas durante 5 minutos.

---

## Base de datos

Cree la tabla ejecutando una vez el siguiente archivo en el SQL Editor de Neon:

```txt
migrations/001_create_sensor_data.sql
```

O ejecute manualmente:

```sql
create table if not exists sensor_data (
  id bigint generated always as identity primary key,
  device_id text not null,
  temperature double precision not null,
  humidity double precision not null,
  created_at timestamptz not null default now()
);

create index if not exists sensor_data_created_at_idx
  on sensor_data (created_at desc);

create index if not exists sensor_data_device_idx
  on sensor_data (device_id, created_at desc);
```

## Environment Variables

Cree un archivo `.env.local`:

```env
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
INGEST_API_KEY=your-ingest-api-key
NEXT_PUBLIC_DASHBOARD_TIME_ZONE=America/Santiago
```

- `DATABASE_URL`: cadena de conexión de Neon (https://console.neon.tech)
- `INGEST_API_KEY`: clave de API para la ingesta del dispositivo (puede generarla con `openssl rand -hex 32`)
- `NEXT_PUBLIC_DASHBOARD_TIME_ZONE`: zona horaria del dashboard (opcional, por defecto `America/Santiago`)

---

## Próximas mejoras (pendientes)

- Actualización OTA del firmware del ESP32 (over-the-air). Plan:
  - El dispositivo envía su versión de firmware en el `POST /api/ingest`.
  - Agregar un endpoint `/api/firmware/latest` que sirva el binario `.bin`.
  - El ESP32 consulta si hay versión nueva, descarga el firmware por HTTP y hace reboot.
  - Requiere tabla de particiones OTA (`ota_0`/`ota_1`) en el firmware.
- Configurar el firmware del ESP32 para la cadencia de medición de 1 minuto (pendiente, requiere la placa a mano).

---

## Run Locally

Instalar dependencias:

```bash
pnpm install
```

Iniciar el servidor de desarrollo:

```bash
pnpm dev
```

Abrir:

```txt
http://localhost:3000
```

---

## Author

Developed by Hector Moreira.
