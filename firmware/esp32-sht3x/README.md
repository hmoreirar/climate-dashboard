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
| `OTA_CHECK_URL`    | URL del endpoint `GET /api/firmware/latest`    |
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

## Actualización OTA

El firmware consulta `GET /api/firmware/latest?current=<version>` cada 6 horas. Si hay una versión más nueva, descarga el binario y aplica la actualización por aire sin reflashear por USB.

Para publicar una actualización:

1. Bumpéa `FIRMWARE_VERSION` en `src/main.cpp`.
2. Compilá el firmware:

```bash
pio run
```

3. Alojá el binario resultante (`firmware/esp32-sht3x/.pio/build/esp32dev/firmware.bin`) en una URL accesible y configurala como `FIRMWARE_BIN_URL`, o subilo a `public/firmware/<version>.bin`.
4. Publicá el cambio (Vercel) y asegurate de que `FIRMWARE_VERSION` en el entorno coincida con la nueva versión.

> Requiere tabla de particiones OTA (`ota_0`/`ota_1`) en el firmware, ya configurada en `partitions_ota.csv`.
