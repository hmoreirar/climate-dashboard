import { sql } from "@/lib/neon";

const CRON_SECRET = process.env.CRON_SECRET;

// Hourly rollup + retention. Replaces the systemd timer that ran
// migrations/005_maintain_sensor_history.sql on the Debian host.
//
// The rollup window covers every complete hour still backed by raw rows
// instead of just the last two hours, so the job stays correct no matter
// how often it is scheduled (Vercel Hobby only allows daily crons).
export async function GET(request: Request) {
  if (!CRON_SECRET) {
    return Response.json(
      { error: "Server misconfiguration: missing CRON_SECRET" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rolled = await sql`
      INSERT INTO sensor_hourly (
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
      SELECT
        device_id,
        date_trunc('hour', created_at) AS bucket,
        min(temperature),
        avg(temperature),
        max(temperature),
        min(humidity),
        avg(humidity),
        max(humidity),
        count(*)::integer
      FROM sensor_data
      WHERE created_at < date_trunc('hour', now())
      GROUP BY device_id, date_trunc('hour', created_at)
      ON CONFLICT (device_id, bucket) DO UPDATE SET
        temperature_min = excluded.temperature_min,
        temperature_avg = excluded.temperature_avg,
        temperature_max = excluded.temperature_max,
        humidity_min = excluded.humidity_min,
        humidity_avg = excluded.humidity_avg,
        humidity_max = excluded.humidity_max,
        reading_count = excluded.reading_count
      RETURNING 1
    `;

    const pruned = await sql`
      DELETE FROM sensor_data
      WHERE created_at < now() - interval '30 days'
      RETURNING 1
    `;

    return Response.json({
      ok: true,
      buckets: rolled.length,
      pruned: pruned.length,
    });
  } catch (error) {
    console.error("Sensor history maintenance failed:", error);
    return Response.json({ error: "Maintenance failed" }, { status: 500 });
  }
}
