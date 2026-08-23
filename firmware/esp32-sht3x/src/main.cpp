#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Adafruit_SHT31.h>
#include "secrets.h"

Adafruit_SHT31 sht31 = Adafruit_SHT31();

const unsigned long MEASURE_INTERVAL_MS = 60UL * 1000UL;
unsigned long lastMeasurement = 0;

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
                   ",\"humidity\":" + String(humidity, 2) + "}";

  int code = http.POST(payload);
  http.end();

  return code == 201 || code == 200;
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
