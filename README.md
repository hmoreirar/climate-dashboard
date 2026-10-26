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
- Actualización automática del dashboard cada 5 minutos
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

Lote de lecturas, la forma que usa el firmware:

```json
{
  "device_id": "trueno-01",
  "firmware_version": "1.1.0",
  "rssi": -52,
  "readings": [
    { "temperature": 22.5, "humidity": 55.2, "measured_at": 1793026800 },
    { "temperature": 22.6, "humidity": 55.0, "measured_at": 1793027100 }
  ]
}
```

`measured_at` es epoch en segundos. Si el dispositivo no tiene reloj sincronizado puede enviar `age_seconds` por lectura en su lugar.

También acepta el formato de lectura única:

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

### `GET /api/latest`

Snapshot compacto de la última lectura, pensado para widgets móviles.

Query params: `device` (opcional, filtra por dispositivo).

```json
{
  "device_id": "trueno-01",
  "temperature": 24.17,
  "humidity": 56.07,
  "created_at": "2026-10-26T14:49:46.070Z",
  "age_seconds": 120,
  "online": true
}
```

`online` usa la misma ventana de 40 minutos que el dashboard. Caché de 10 minutos: no añadas parámetros anti-caché desde el widget, o cada refresco despertará la base de datos.

### `GET /api/firmware/latest`

Informa la versión más reciente del firmware para OTA.

Query params: `current` (versión instalada en el dispositivo).

Respuesta:

```json
{
  "version": "1.0.1",
  "url": "https://host/firmware/1.0.1.bin",
  "updateAvailable": true
}
```

---

## Cadencia de medición

El dispositivo mide cada 5 minutos y acumula las lecturas en un buffer en RAM. Las sube en lote cada 30 minutos (6 lecturas por POST).

El lote importa: Neon suspende el compute tras ~5 minutos de inactividad, así que una escritura cada 5 minutos lo mantiene despierto 24/7 y agota la cuota gratuita de 100 CU-horas en unos 16 días. Con lotes de 30 minutos el consumo baja a ~33 CU-h/mes.

El buffer guarda hasta 24 lecturas (2 horas) y vive en RAM, así que un fallo de red no pierde datos pero un reinicio del equipo sí vacía el buffer. Los datos crudos se conservan 30 días y el historial anterior se consulta mediante agregados horarios. El dashboard refresca cada 30 minutos mientras la pestaña está visible.

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
   firmware_version text,
   rssi integer,
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

- El firmware mide cada 5 minutos y sube en lote cada 30 para no mantener despierto el compute de Neon.
- Mover la clave de ingesta a NVS si se quiere reactivar el OTA.

> El OTA está desactivado a propósito: la clave de ingesta se compila dentro del binario, así que publicar un `firmware.bin` la expone a `strings(1)`. `public/firmware/` está vacío y las actualizaciones se hacen por USB. Reactivarlo exige clave en NVS, verificación SHA-256 del binario y pinning del certificado TLS (hoy se usa `setInsecure()`).

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
