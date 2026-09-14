import { sql } from "@/lib/neon";
import {
  getDateRange,
  toSensorReading,
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

  try {
    const rows = await sql<SensorRow[]>`
      SELECT created_at, device_id, humidity, temperature
      FROM sensor_data
      WHERE created_at >= ${start} AND created_at <= ${end}
      ORDER BY created_at DESC
      LIMIT 12000
    `;
    return Response.json({ data: rows.map(toSensorReading) });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
