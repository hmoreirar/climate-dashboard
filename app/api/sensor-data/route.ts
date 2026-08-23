import { sql } from "@/lib/neon";
import {
  getDateRange,
  toSensorReading,
  type SensorRow,
  type TimeRange,
} from "@/lib/sensor";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") ?? "24h") as TimeRange;
  const customStart = searchParams.get("start");
  const customEnd = searchParams.get("end");

  const { start, end } = getDateRange(range, customStart, customEnd);

  try {
    const rows = await sql<SensorRow[]>`
      SELECT created_at, device_id, humidity, temperature
      FROM sensor_data
      WHERE created_at >= ${start} AND created_at <= ${end}
      ORDER BY created_at DESC
      LIMIT 15000
    `;
    return Response.json({ data: rows.map(toSensorReading) });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
