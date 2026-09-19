-- Run hourly from cron or a systemd timer after 004 has been applied.
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
where created_at >= date_trunc('hour', now()) - interval '2 hours'
group by device_id, date_trunc('hour', created_at)
on conflict (device_id, bucket) do update set
  temperature_min = excluded.temperature_min,
  temperature_avg = excluded.temperature_avg,
  temperature_max = excluded.temperature_max,
  humidity_min = excluded.humidity_min,
  humidity_avg = excluded.humidity_avg,
  humidity_max = excluded.humidity_max,
  reading_count = excluded.reading_count;

delete from sensor_data
where created_at < now() - interval '30 days';
