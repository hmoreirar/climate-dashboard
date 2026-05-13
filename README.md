# Climate Monitor System Dashboard

A full-stack IoT climate monitoring dashboard built with ESP32 devices, Next.js and Supabase.

## Features

- Real-time temperature monitoring
- Real-time humidity monitoring
- ESP32 sensor integration
- Supabase cloud database
- Modern Next.js dashboard
- Responsive UI
- Ready for deployment

---

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend / Cloud

- Supabase

### Hardware

- ESP32-WROOM-32
- SHT3X temperature and humidity sensor

---

## System Architecture

```txt
ESP32 + SHT3X Sensor
        ↓
WiFi HTTP Requests
        ↓
Supabase Database
        ↓
Next.js Dashboard
```

---

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Run Locally

Install dependencies:

```bash
pnpm install
```

Start development server:

```bash
pnpm dev
```

Open:

```txt
http://localhost:3000
```

---

## Future Improvements

- Real-time live updates
- Historical charts
- OTA firmware updates
- Multi-device support
- Alerts and notifications
- Device management panel

---

## Author

Developed by Hector Moreira.