import { supabase } from "@/lib/supabase";
import { getSinceMs, type SensorReading, type TimeRange } from "@/lib/sensor";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") ?? "24h") as TimeRange;
  const since = new Date(Date.now() - getSinceMs(range)).toISOString()

  const { data, error } = await supabase
    .from("sensor_data")
    .select("created_at,device_id,humidity,temperature")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(15000)
    .returns<SensorReading[]>();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}
