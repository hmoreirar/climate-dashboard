-- Hourly rollups keep long-term history small and cheap to query.
create table if not exists sensor_hourly (
  device_id text not null,
  bucket timestamptz not null,
  temperature_min double precision not null,
  temperature_avg double precision not null,
  temperature_max double precision not null,
  humidity_min double precision not null,
  humidity_avg double precision not null,
  humidity_max double precision not null,
  reading_count integer not null,
  primary key (device_id, bucket)
);

create index if not exists sensor_hourly_bucket_idx
  on sensor_hourly (bucket desc);

-- Rebuild recent buckets safely; running this more than once is harmless.
insert into sensor_hourly (
  device_id,
  bucket,
  temperature_min,
  temperature_avg,
  temperature_max,
  humidity_min,
  humidity_avg,
  humidity_max,
  reading_count
)
select
  device_id,
  date_trunc('hour', created_at) as bucket,
  min(temperature),
  avg(temperature),
  max(temperature),
  min(humidity),
  avg(humidity),
  max(humidity),
  count(*)::integer
from sensor_data
where created_at >= now() - interval '31 days'
group by device_id, date_trunc('hour', created_at)
on conflict (device_id, bucket) do update set
  temperature_min = excluded.temperature_min,
  temperature_avg = excluded.temperature_avg,
  temperature_max = excluded.temperature_max,
  humidity_min = excluded.humidity_min,
  humidity_avg = excluded.humidity_avg,
  humidity_max = excluded.humidity_max,
  reading_count = excluded.reading_count;
