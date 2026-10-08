import { sql } from "@/lib/neon";
import {
  getDateRange,
  hourlyRowToReading,
  toSensorReading,
  type HourlySensorRow,
  type SensorRow,
  type TimeRange,
} from "@/lib/sensor";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedRange = searchParams.get("range") ?? "24h";
  const validRanges: TimeRange[] = ["1h", "3h", "6h", "24h", "7d", "custom"];
  if (!validRanges.includes(requestedRange as TimeRange)) {
    return Response.json({ error: "Invalid range" }, { status: 400 });
  }
  const range = requestedRange as TimeRange;
  const customStart = searchParams.get("start");
  const customEnd = searchParams.get("end");

  const { start, end } = getDateRange(range, customStart, customEnd);

  const startDate = new Date(start);
  const endDate = new Date(end);
  const rangeMs = endDate.getTime() - startDate.getTime();
  if (!Number.isFinite(rangeMs) || rangeMs > 90 * 86_400_000) {
    return Response.json({ error: "Range is limited to 90 days" }, { status: 400 });
  }

  try {
    if (rangeMs > 24 * 86_400_000) {
      const rows = await sql<HourlySensorRow[]>`
        SELECT bucket, device_id, temperature_min, temperature_avg,
               temperature_max, humidity_min, humidity_avg, humidity_max,
               reading_count
        FROM sensor_hourly
        WHERE bucket >= ${start} AND bucket <= ${end}
        ORDER BY bucket DESC
        LIMIT 1000
      `;
      return Response.json({ data: rows.map(hourlyRowToReading) }, {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      });
    }

    const rows = await sql<SensorRow[]>`
      SELECT created_at, device_id, humidity, temperature
      FROM sensor_data
      WHERE created_at >= ${start} AND created_at <= ${end}
      ORDER BY created_at DESC
      LIMIT 500
    `;
    return Response.json({ data: rows.map(toSensorReading) }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("Failed to read sensor_data:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
