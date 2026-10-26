import { sql } from "@/lib/neon";

const INGEST_API_KEY = process.env.INGEST_API_KEY;

const MAX_BATCH = 60;
const MAX_AGE_SECONDS = 2 * 60 * 60;
const MAX_FUTURE_SECONDS = 5 * 60;

type ReadingInput = {
  temperature?: number;
  humidity?: number;
  measured_at?: number;
  age_seconds?: number;
};

type IngestBody = {
  device_id?: string;
  temperature?: number;
  humidity?: number;
  firmware_version?: string;
  rssi?: number;
  readings?: ReadingInput[];
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function inRange(temperature: number, humidity: number) {
  return (
    temperature >= -80 &&
    temperature <= 100 &&
    humidity >= 0 &&
    humidity <= 100
  );
}

// Devices without a synced clock fall back to age_seconds, so a buffered
// batch still lands at the right offsets instead of all on the same instant.
function resolveCreatedAt(reading: ReadingInput, nowMs: number) {
  const { measured_at, age_seconds } = reading;

  if (isFiniteNumber(measured_at)) {
    const ms = measured_at * 1000;
    const delta = nowMs - ms;
    if (delta <= MAX_AGE_SECONDS * 1000 && delta >= -MAX_FUTURE_SECONDS * 1000) {
      return new Date(ms);
    }
    return new Date(nowMs);
  }

  if (
    isFiniteNumber(age_seconds) &&
    age_seconds >= 0 &&
    age_seconds <= MAX_AGE_SECONDS
  ) {
    return new Date(nowMs - age_seconds * 1000);
  }

  return new Date(nowMs);
}

export async function POST(request: Request) {
  if (!INGEST_API_KEY) {
    return Response.json({ error: "Server misconfiguration: missing INGEST_API_KEY" }, { status: 500 });
  }

  const authHeader = request.headers.get("x-api-key");
  if (authHeader !== INGEST_API_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: IngestBody;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.device_id !== "string" || !body.device_id.trim()) {
    return Response.json(
      { error: "Missing required field: device_id" },
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

  // Accept either a batch or the original single-reading payload.
  const readings: ReadingInput[] = Array.isArray(body.readings)
    ? body.readings
    : [{ temperature: body.temperature, humidity: body.humidity }];

  if (readings.length === 0) {
    return Response.json({ error: "No readings provided" }, { status: 400 });
  }

  if (readings.length > MAX_BATCH) {
    return Response.json(
      { error: `Batch is limited to ${MAX_BATCH} readings` },
      { status: 400 }
    );
  }

  const nowMs = Date.now();
  const deviceIds: string[] = [];
  const temperatures: number[] = [];
  const humidities: number[] = [];
  const versions: (string | null)[] = [];
  const rssis: (number | null)[] = [];
  const timestamps: string[] = [];

  for (const reading of readings) {
    if (
      !isFiniteNumber(reading.temperature) ||
      !isFiniteNumber(reading.humidity)
    ) {
      return Response.json(
        { error: "Each reading needs numeric temperature and humidity" },
        { status: 400 }
      );
    }

    if (!inRange(reading.temperature, reading.humidity)) {
      return Response.json(
        { error: "Temperature or humidity is out of range" },
        { status: 400 }
      );
    }

    deviceIds.push(body.device_id);
    temperatures.push(reading.temperature);
    humidities.push(reading.humidity);
    versions.push(body.firmware_version ?? null);
    rssis.push(body.rssi ?? null);
    timestamps.push(resolveCreatedAt(reading, nowMs).toISOString());
  }

  try {
    // One round trip for the whole batch: fewer wake-ups for the database.
    await sql`
      INSERT INTO sensor_data (
        device_id,
        temperature,
        humidity,
        firmware_version,
        rssi,
        created_at
      )
      SELECT * FROM unnest(
        ${deviceIds}::text[],
        ${temperatures}::float8[],
        ${humidities}::float8[],
        ${versions}::text[],
        ${rssis}::int[],
        ${timestamps}::timestamptz[]
      )
    `;
    return Response.json({ ok: true, inserted: readings.length }, { status: 201 });
  } catch (err) {
    console.error("Failed to insert sensor data:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
