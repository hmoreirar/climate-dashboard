# Firmware ESP32 + SHT3X

Monitorea temperatura y humedad cada 5 minutos y envía las lecturas en lote cada 30 minutos a `POST /api/ingest`.

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

Mide cada 5 minutos y guarda la lectura en un buffer en RAM. Sube el lote cada 30 minutos (6 lecturas por POST). Ante fallo, reintenta hasta 3 veces con espera progresiva y conserva las lecturas para el siguiente ciclo.

El buffer aguanta 24 lecturas (2 horas). Vive en RAM, así que se pierde si el equipo se reinicia.

La hora se sincroniza por NTP al arrancar. Si NTP no responde, cada lectura envía `age_seconds` en lugar de `measured_at`.

El lote de 30 minutos no es cosmético: Neon suspende el compute tras ~5 minutos de inactividad, así que escribir cada 5 minutos lo mantiene despierto 24/7 y agota la cuota gratuita en unos 16 días.

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

> **Aviso de seguridad.** La clave de ingesta se compila dentro del binario como `#define`. Cualquier `firmware.bin` servido públicamente la expone a `strings(1)`, así que publicar un binario equivale a publicar la clave. Por eso `public/firmware/` está vacío: el OTA queda desactivado y la actualización se hace por USB. Para reactivarlo hay que mover la clave a NVS, añadir verificación SHA-256 del binario y fijar el certificado TLS (hoy se usa `setInsecure()`).
