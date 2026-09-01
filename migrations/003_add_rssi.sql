-- Climate Monitor: columna RSSI para diagnóstico de señal WiFi.
-- Ejecutar una vez en el SQL Editor de Neon.

alter table sensor_data
  add column if not exists rssi integer;