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

Query params: `range` (`1h` | `3h` | `6h` | `24h` | `custom`), `start`, `end`.

---

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
