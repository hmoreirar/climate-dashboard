# Firmware ESP32 + SHT3X

Monitorea temperatura y humedad y las envía cada 1 minuto a `POST /api/ingest`.

## Requisitos

- [PlatformIO](https://platformio.org/) (extensión para VS Code).
- ESP32-WROOM-32.
- Sensor SHT3X (I2C: SDA=GPIO21, SCL=GPIO22).

## Configuración

1. Copia `include/secrets.example.h` a `include/secrets.h`:

```bash
cp include/secrets.example.h include/secrets.h
```

2. Edita `include/secrets.h` con tus valores:

| Constante          | Descripción                                    |
| ------------------ | ---------------------------------------------- |
| `WIFI_SSID`        | Nombre de la red WiFi (repetidor)              |
| `WIFI_PASSWORD`    | Contraseña WiFi                                |
| `INGEST_URL`       | URL del endpoint de ingesta                    |
| `INGEST_API_KEY`   | Clave definida en Vercel como `INGEST_API_KEY` |
| `DEVICE_ID`        | Identificador del dispositivo (`trueno-01`)    |

> `secrets.h` está ignorado por git. No lo subas al repositorio.

## Compilar y flashear

```bash
pio run -t upload
```

## Ver salida serie

```bash
pio device monitor
```

## Cadencia

Una lectura + POST cada 60 segundos. Ante fallo, reintenta hasta 3 veces con espera de 2 s.
