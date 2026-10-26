import { sql } from "@/lib/neon";
import { parseSensorTimestamp, type SensorRow } from "@/lib/sensor";

const ONLINE_WINDOW_MINUTES = 40;

// Compact snapshot for Android/iOS widgets. One indexed row instead of the
// 500-row payload that /api/sensor-data returns.
//
// Cache note: age_seconds and online are computed per response, so the cache
// TTL bounds how stale they can be. Ten minutes keeps that honest. Compute
// cost is driven by the widget refresh interval, not by this TTL: a widget
// polling every 30 min costs two origin queries per hour either way.
const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const device = searchParams.get("device");

  try {
    const rows = device
      ? await sql<SensorRow[]>`
          SELECT created_at, device_id, humidity, temperature
          FROM sensor_data
          WHERE device_id = ${device}
          ORDER BY created_at DESC
          LIMIT 1
        `
      : await sql<SensorRow[]>`
          SELECT created_at, device_id, humidity, temperature
          FROM sensor_data
          ORDER BY created_at DESC
          LIMIT 1
        `;

    const row = rows[0];
    if (!row) {
      return Response.json(
        {
          device_id: null,
          temperature: null,
          humidity: null,
          created_at: null,
          age_seconds: null,
          online: false,
        },
        { headers: CACHE_HEADERS }
      );
    }

    const createdAt =
      typeof row.created_at === "string"
        ? row.created_at
        : row.created_at.toISOString();
    const measuredAt = parseSensorTimestamp(createdAt).getTime();
    const ageSeconds = Number.isNaN(measuredAt)
      ? null
      : Math.max(0, Math.floor((Date.now() - measuredAt) / 1000));
    const online =
      ageSeconds !== null && ageSeconds <= ONLINE_WINDOW_MINUTES * 60;

    return Response.json(
      {
        device_id: row.device_id,
        temperature: row.temperature,
        humidity: row.humidity,
        created_at: createdAt,
        age_seconds: ageSeconds,
        online,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Failed to read latest reading:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
