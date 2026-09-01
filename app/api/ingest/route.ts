import { sql } from "@/lib/neon";

const INGEST_API_KEY = process.env.INGEST_API_KEY;

export async function POST(request: Request) {
  if (!INGEST_API_KEY) {
    return Response.json({ error: "Server misconfiguration: missing INGEST_API_KEY" }, { status: 500 });
  }

  const authHeader = request.headers.get("x-api-key");
  if (authHeader !== INGEST_API_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    device_id?: string;
    temperature?: number;
    humidity?: number;
    firmware_version?: string;
    rssi?: number;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.device_id || body.temperature == null || body.humidity == null) {
    return Response.json(
      { error: "Missing required fields: device_id, temperature, humidity" },
      { status: 400 }
    );
  }

  if (body.firmware_version != null && typeof body.firmware_version !== "string") {
    return Response.json(
      { error: "firmware_version must be a string" },
      { status: 400 }
    );
  }

  if (body.rssi != null && typeof body.rssi !== "number") {
    return Response.json({ error: "rssi must be a number" }, { status: 400 });
  }

  try {
    await sql`
      INSERT INTO sensor_data (
        device_id,
        temperature,
        humidity,
        firmware_version,
        rssi
      )
      VALUES (
        ${body.device_id},
        ${body.temperature},
        ${body.humidity},
        ${body.firmware_version ?? null},
        ${body.rssi ?? null}
      )
    `;
    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("Failed to insert sensor data:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
