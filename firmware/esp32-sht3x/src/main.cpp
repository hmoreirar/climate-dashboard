#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Update.h>
#include <Preferences.h>
#include <Adafruit_SHT31.h>
#include "esp_task_wdt.h"
#include "esp_system.h"
#include "secrets.h"

#define FIRMWARE_VERSION "1.0.1"

const char* PREFS_NS = "diag";

Adafruit_SHT31 sht31 = Adafruit_SHT31();
WiFiClientSecure client;
HTTPClient http;
Preferences prefs;

const unsigned long MEASURE_INTERVAL_MS = 60UL * 1000UL;
const unsigned long OTA_CHECK_INTERVAL_MS = 6UL * 60UL * 60UL * 1000UL;
const int MAX_CONSECUTIVE_FAILURES = 5;

unsigned long lastMeasurement = 0;
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

bool postReading(float temperature, float humidity) {
  if (WiFi.status() != WL_CONNECTED) {
    savingDiagnostics(-1, -1);
    return false;
  }

  String payload = String("{\"device_id\":\"") + DEVICE_ID +
                   "\",\"temperature\":" + String(temperature, 2) +
                   ",\"humidity\":" + String(humidity, 2) +
                   ",\"firmware_version\":\"" + FIRMWARE_VERSION + "\"" +
                   ",\"rssi\":" + String(WiFi.RSSI()) + "}";

  int code;
  if (!http.begin(client, INGEST_URL)) {
    savingDiagnostics(-1, WiFi.RSSI());
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", INGEST_API_KEY);
  code = http.POST(payload);
  http.end();

  savingDiagnostics(code, WiFi.RSSI());

  return code == 201 || code == 200;
}

int compareVersions(String current, String latest) {
  int cMajor = 0, cMinor = 0, cPatch = 0;
  int lMajor = 0, lMinor = 0, lPatch = 0;
  sscanf(current.c_str(), "%d.%d.%d", &cMajor, &cMinor, &cPatch);
  sscanf(latest.c_str(), "%d.%d.%d", &lMajor, &lMinor, &lPatch);
  if (lMajor != cMajor) return lMajor > cMajor ? 1 : -1;
  if (lMinor != cMinor) return lMinor > cMinor ? 1 : -1;
  if (lPatch != cPatch) return lPatch > cPatch ? 1 : -1;
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

  if (compareVersions(FIRMWARE_VERSION, latestVersion) >= 0) {
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

  if (!sht31.begin(0x44)) {
    Serial.println("SHT3X no encontrado en 0x44");
  } else {
    Serial.println("SHT3X inicializado");
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

  if (now - lastMeasurement < MEASURE_INTERVAL_MS) {
    return;
  }
  lastMeasurement = now;

  if (WiFi.status() != WL_CONNECTED) {
    consecutiveFails = 0;
    connectWiFi();
  }

  float temperature = sht31.readTemperature();
  float humidity = sht31.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Lectura del sensor fallida");
    return;
  }

  bool sent = false;
  for (int attempt = 0; attempt < 3 && !sent; attempt++) {
    feedWatchdog();
    sent = postReading(temperature, humidity);
    if (!sent) {
      delay(2000);
    }
  }

  if (sent) {
    consecutiveFails = 0;
    Serial.printf("OK %.2f C  %.2f %%  | RSSI %d dBm\n",
                  temperature, humidity, WiFi.RSSI());
  } else {
    consecutiveFails++;
    Serial.printf("POST fallido tras reintentos (fallos consec: %d)\n", consecutiveFails);
    if (consecutiveFails >= MAX_CONSECUTIVE_FAILURES) {
      Serial.println("Demasiados fallos seguidos -> renovando conexión WiFi");
      connectWiFi();
      consecutiveFails = 0;
    }
  }
}