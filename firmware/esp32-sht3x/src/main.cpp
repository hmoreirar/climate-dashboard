#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Update.h>
#include <Adafruit_SHT31.h>
#include "secrets.h"

#define FIRMWARE_VERSION "1.0.0"

Adafruit_SHT31 sht31 = Adafruit_SHT31();

const unsigned long MEASURE_INTERVAL_MS = 60UL * 1000UL;
const unsigned long OTA_CHECK_INTERVAL_MS = 6UL * 60UL * 60UL * 1000UL;

unsigned long lastMeasurement = 0;
unsigned long lastOtaCheck = 0;

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 30000UL) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("WiFi conectado. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("No se pudo conectar a WiFi");
  }
}

bool postReading(float temperature, float humidity) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  if (!http.begin(client, INGEST_URL)) {
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", INGEST_API_KEY);

  String payload = String("{\"device_id\":\"") + DEVICE_ID +
                   "\",\"temperature\":" + String(temperature, 2) +
                   ",\"humidity\":" + String(humidity, 2) +
                   ",\"firmware_version\":\"" + FIRMWARE_VERSION + "\"}";

  int code = http.POST(payload);
  http.end();

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

bool checkForOTA() {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
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

  Serial.println("Descargando actualización OTA...");
  http.begin(client, binUrl);
  code = http.GET();
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
  size_t written = Update.writeStream(*stream);
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

void setup() {
  Serial.begin(115200);
  delay(200);

  Wire.begin(SDA_PIN, SCL_PIN);
  connectWiFi();

  if (!sht31.begin(0x44)) {
    Serial.println("SHT3X no encontrado en 0x44");
  } else {
    Serial.println("SHT3X inicializado");
  }
}

void loop() {
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
    sent = postReading(temperature, humidity);
    if (!sent) {
      delay(2000);
    }
  }

  if (sent) {
    Serial.print("OK ");
    Serial.print(temperature, 2);
    Serial.print(" C  ");
    Serial.print(humidity, 2);
    Serial.println(" %");
  } else {
    Serial.println("POST fallido tras reintentos");
  }
}