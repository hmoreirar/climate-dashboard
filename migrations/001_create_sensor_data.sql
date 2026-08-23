-- Climate Monitor: tabla de lecturas de sensores.
-- Ejecutar una vez en el SQL Editor de Neon.

create table if not exists sensor_data (
  id bigint generated always as identity primary key,
  device_id text not null,
  temperature double precision not null,
  humidity double precision not null,
  created_at timestamptz not null default now()
);

create index if not exists sensor_data_created_at_idx
  on sensor_data (created_at desc);

create index if not exists sensor_data_device_idx
  on sensor_data (device_id, created_at desc);
