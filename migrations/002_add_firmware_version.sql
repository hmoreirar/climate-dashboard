-- Climate Monitor: columna de versión de firmware para OTA.
-- Ejecutar una vez en el SQL Editor de Neon.

alter table sensor_data
  add column if not exists firmware_version text;