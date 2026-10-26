#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Update.h>
#include <Preferences.h>
#include <Adafruit_SHT31.h>
#include <time.h>
#include "esp_task_wdt.h"
#include "esp_system.h"
#include "secrets.h"

#define FIRMWARE_VERSION "1.1.0"

const char* PREFS_NS = "diag";

Adafruit_SHT31 sht31 = Adafruit_SHT31();
WiFiClientSecure client;
HTTPClient http;
Preferences prefs;

// Sample every 5 minutes, upload every 30. Neon suspends after ~5 minutes
// idle, so a 5-minute upload never lets it sleep. Batching 6 readings per
// request lets the database stay asleep between uploads.
const unsigned long MEASURE_INTERVAL_MS = 5UL * 60UL * 1000UL;
const unsigned long UPLOAD_INTERVAL_MS = 30UL * 60UL * 1000UL;
const unsigned long MIN_UPLOAD_GAP_MS = 2UL * 60UL * 1000UL;
const unsigned long OTA_CHECK_INTERVAL_MS = 6UL * 60UL * 60UL * 1000UL;
const int MAX_CONSECUTIVE_FAILURES = 5;

// 24 readings = 2 hours of headroom if uploads keep failing.
const int BUFFER_CAPACITY = 24;

struct Reading {
  float temperature;
  float humidity;
  time_t timestamp;  // 0 when the clock has not been synced yet
};

Reading uploadBuffer[BUFFER_CAPACITY];
int bufferCount = 0;

unsigned long lastMeasurement = 0;
unsigned long lastUpload = 0;
unsigned long lastOtaCheck = 0;
int consecutiveFails = 0;

void feedWatchdog() {
  esp_task_wdt_reset();
}

void savingDiagnostics(int httpCode, int rssi) {
  prefs.putInt("lastHttpError", httpCode);
  prefs.putInt("lastFailCount", consecutiveFails);
  prefs.putInt("lastRSSI", rssi);
}

void printBootBanner() {
  Serial.println();
  Serial.println("========================================");
  Serial.print("Climate Monitor  v");
  Serial.print(FIRMWARE_VERSION);
  Serial.print("  |  device: ");
  Serial.println(DEVICE_ID);
  Serial.print("Reset reason: ");
  Serial.println(esp_reset_reason());
  Serial.printf("Heap libre: %u bytes\n", ESP.getFreeHeap());
  if (prefs.isKey("lastHttpError")) {
    Serial.printf("Diag previo -> ultimo HTTP: %d | failCount: %d | RSSI: %d\n",
                  prefs.getInt("lastHttpError"),
                  prefs.getInt("lastFailCount"),
                  prefs.getInt("lastRSSI"));
  } else {
    Serial.println("Sin diagnostico previo guardado.");
  }
  Serial.println("========================================");
  Serial.println();
}

void connectWiFi() {
  feedWatchdog();
  WiFi.disconnect(false);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 30000UL) {
    delay(500);
    feedWatchdog();
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("WiFi conectado. IP: ");
    Serial.print(WiFi.localIP());
    Serial.print(" | RSSI: ");
    Serial.println(WiFi.RSSI());
  } else {
    Serial.println();
    Serial.println("No se pudo conectar a WiFi");
  }
}

void syncTime() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  configTime(0, 0, "pool.ntp.org", "time.google.com");
  Serial.print("Sincronizando hora NTP");

  unsigned long start = millis();
  while (time(nullptr) < 1600000000 && millis() - start < 15000UL) {
    delay(500);
    feedWatchdog();
    Serial.print(".");
  }

  if (time(nullptr) >= 1600000000) {
    Serial.printf("\nHora sincronizada: %lu\n", (unsigned long)time(nullptr));
  } else {
    Serial.println();
    Serial.println("NTP sin respuesta: se enviaran antiguedades relativas");
  }
}

void pushReading(float temperature, float humidity) {
  time_t nowEpoch = time(nullptr);
  if (nowEpoch < 1600000000) {
    nowEpoch = 0;
  }

  if (bufferCount >= BUFFER_CAPACITY) {
    for (int i = 1; i < bufferCount; i++) {
      uploadBuffer[i - 1] = uploadBuffer[i];
    }
    bufferCount--;
    Serial.println("Buffer lleno: se descarta la lectura mas antigua");
  }

  uploadBuffer[bufferCount].temperature = temperature;
  uploadBuffer[bufferCount].humidity = humidity;
  uploadBuffer[bufferCount].timestamp = nowEpoch;
  bufferCount++;
}

bool postBatch() {
  if (bufferCount == 0) {
    return true;
  }

  if (WiFi.status() != WL_CONNECTED) {
    savingDiagnostics(-1, -1);
    return false;
  }

  int pending = bufferCount;
  String payload = String("{\"device_id\":\"") + DEVICE_ID +
                   "\",\"firmware_version\":\"" + FIRMWARE_VERSION + "\"" +
                   ",\"rssi\":" + String(WiFi.RSSI()) +
                   ",\"readings\":[";

  for (int i = 0; i < bufferCount; i++) {
    if (i > 0) {
      payload += ",";
    }
    payload += String("{\"temperature\":") + String(uploadBuffer[i].temperature, 2) +
               ",\"humidity\":" + String(uploadBuffer[i].humidity, 2);
    if (uploadBuffer[i].timestamp > 0) {
      payload += String(",\"measured_at\":") +
                 String((unsigned long)uploadBuffer[i].timestamp);
    } else {
      // No clock: express the reading as an age relative to upload time.
      unsigned long ageSeconds =
          (unsigned long)(bufferCount - 1 - i) * (MEASURE_INTERVAL_MS / 1000UL);
      payload += String(",\"age_seconds\":") + String(ageSeconds);
    }
    payload += "}";
  }
  payload += "]}";

  if (!http.begin(client, INGEST_URL)) {
    savingDiagnostics(-1, WiFi.RSSI());
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", INGEST_API_KEY);
  int code = http.POST(payload);
  http.end();

  savingDiagnostics(code, WiFi.RSSI());

  if (code != 201 && code != 200) {
    return false;
  }

  bufferCount = 0;
  Serial.printf("UPLOAD OK  %d lecturas  | RSSI %d dBm\n", pending, WiFi.RSSI());
  return true;
}

// Returns > 0 when `offered` is newer than `installed`, 0 when they match,
// and < 0 when `offered` is older. Callers must never install an older build.
int compareVersions(String installed, String offered) {
  int iMajor = 0, iMinor = 0, iPatch = 0;
  int oMajor = 0, oMinor = 0, oPatch = 0;
  sscanf(installed.c_str(), "%d.%d.%d", &iMajor, &iMinor, &iPatch);
  sscanf(offered.c_str(), "%d.%d.%d", &oMajor, &oMinor, &oPatch);
  if (oMajor != iMajor) return oMajor > iMajor ? 1 : -1;
  if (oMinor != iMinor) return oMinor > iMinor ? 1 : -1;
  if (oPatch != iPatch) return oPatch > iPatch ? 1 : -1;
  return 0;
}

bool performOTA(const String& url) {
  Serial.println("Descargando actualización OTA...");
  if (!http.begin(client, url)) {
    Serial.println("OTA: no se pudo iniciar descarga");
    return false;
  }
  int code = http.GET();
  if (code != HTTP_CODE_OK) {
    Serial.printf("OTA descarga HTTP %d\n", code);
    http.end();
    return false;
  }

  int contentLength = http.getSize();
  if (contentLength <= 0) {
    Serial.println("OTA: longitud de firmware inválida");
    http.end();
    return false;
  }

  Serial.printf("Firmware: %d bytes | Aplicando...\n", contentLength);

  if (!Update.begin(contentLength)) {
    Update.printError(Serial);
    http.end();
    return false;
  }

  WiFiClient* stream = http.getStreamPtr();
  size_t written = 0;
  unsigned long lastFeed = millis();
  while (stream->connected() && (stream->available() > 0 || millis() - lastFeed < 10000)) {
    if (stream->available() > 0) {
      written += Update.writeStream(*stream);
      lastFeed = millis();
      feedWatchdog();
    } else {
      delay(5);
    }
  }
  http.end();

  if (written != (size_t)contentLength || !Update.end()) {
    Update.printError(Serial);
    return false;
  }

  Serial.println("OTA completado. Reiniciando...");
  delay(1000);
  ESP.restart();
  return true;
}

bool checkForOTA() {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  String url = String(OTA_CHECK_URL) + "?current=" + FIRMWARE_VERSION;

  if (!http.begin(client, url)) {
    return false;
  }
  http.addHeader("x-api-key", INGEST_API_KEY);
  int code = http.GET();

  if (code != HTTP_CODE_OK) {
    Serial.printf("OTA check HTTP %d\n", code);
    http.end();
    return false;
  }

  String body = http.getString();
  http.end();

  int versionIdx = body.indexOf("\"version\":\"");
  if (versionIdx < 0) {
    return false;
  }

  String latestVersion = body.substring(versionIdx + 10, body.indexOf('"', versionIdx + 10));
  int urlIdx = body.indexOf("\"url\":\"");
  if (urlIdx < 0) {
    return false;
  }
  String binUrl = body.substring(urlIdx + 7, body.indexOf('"', urlIdx + 7));

  Serial.print("Firmware actual: ");
  Serial.print(FIRMWARE_VERSION);
  Serial.print(" | disponible: ");
  Serial.println(latestVersion);

  // Upgrade only. The server can advertise an older build than the one
  // currently running, and installing it would silently downgrade the
  // device -- which also reverts the ingest key baked into the binary.
  if (compareVersions(FIRMWARE_VERSION, latestVersion) <= 0) {
    Serial.println("Firmware al día, sin actualización");
    return false;
  }

  return performOTA(binUrl);
}

void setup() {
  Serial.begin(115200);
  delay(200);

  Wire.begin(SDA_PIN, SCL_PIN);

  esp_task_wdt_init(60, true);
  esp_task_wdt_add(NULL);
  feedWatchdog();

  prefs.begin(PREFS_NS, false);
  client.setInsecure();
  WiFi.setSleep(false);

  printBootBanner();
  connectWiFi();
  syncTime();

  if (!sht31.begin(0x44)) {
    Serial.println("SHT3X no encontrado en 0x44");
  } else {
    Serial.println("SHT3X inicializado");
  }
}

void uploadWithRetries() {
  if (bufferCount == 0) {
    return;
  }

  bool sent = false;
  for (int attempt = 0; attempt < 3 && !sent; attempt++) {
    feedWatchdog();
    sent = postBatch();
    if (!sent) {
      delay((attempt + 1) * 5000UL);
    }
  }

  if (sent) {
    consecutiveFails = 0;
    return;
  }

  consecutiveFails++;
  Serial.printf("UPLOAD fallido: %d lecturas en buffer (fallos consec: %d)\n",
                bufferCount, consecutiveFails);

  if (consecutiveFails >= MAX_CONSECUTIVE_FAILURES) {
    Serial.println("Demasiados fallos seguidos -> renovando conexion WiFi");
    connectWiFi();
    consecutiveFails = 0;
  }
}

void loop() {
  feedWatchdog();
  unsigned long now = millis();

  if (now - lastOtaCheck >= OTA_CHECK_INTERVAL_MS) {
    lastOtaCheck = now;
    if (WiFi.status() != WL_CONNECTED) {
      connectWiFi();
    }
    checkForOTA();
  }

  if (now - lastMeasurement >= MEASURE_INTERVAL_MS) {
    lastMeasurement = now;

    if (WiFi.status() != WL_CONNECTED) {
      connectWiFi();
    }

    float temperature = sht31.readTemperature();
    float humidity = sht31.readHumidity();

    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("Lectura del sensor fallida");
    } else {
      pushReading(temperature, humidity);
      Serial.printf("MED %.2f C  %.2f %%  | buffer %d/%d\n",
                    temperature, humidity, bufferCount, BUFFER_CAPACITY);
    }
  }

  bool due = now - lastUpload >= UPLOAD_INTERVAL_MS ||
             bufferCount >= BUFFER_CAPACITY;
  if (due && bufferCount > 0 && now - lastUpload >= MIN_UPLOAD_GAP_MS) {
    lastUpload = now;
    uploadWithRetries();
  }
}
