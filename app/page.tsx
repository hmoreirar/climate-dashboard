import { sql } from "@/lib/neon";
import DashboardContent from "@/components/DashboardContent";

import {
  getSinceMs,
  type SensorReading,
  type SensorRow,
  type TimeRange,
  toSensorReading,
} from "@/lib/sensor";

export const revalidate = 0;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ range?: TimeRange }>;
}) {
  const { range = "24h" } = await searchParams;

  const since = new Date(Date.now() - getSinceMs(range)).toISOString(); // eslint-disable-line react-hooks/purity

  let data: SensorReading[];
  try {
    const rows = await sql<SensorRow[]>`
      SELECT created_at, device_id, humidity, temperature
      FROM sensor_data
      WHERE created_at >= ${since}
      ORDER BY created_at DESC
      LIMIT 15000
    `;
    data = rows.map(toSensorReading);
  } catch (error) {
    console.error("Failed to load sensor_data", error);

    return (
      <main className="min-h-screen bg-canvas p-4 sm:p-6 md:p-8 text-content">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-red-950 bg-red-950/40 p-8">
            <h1 className="text-3xl font-bold">Climate Monitor Dashboard</h1>
            <p className="mt-3 text-red-100">
              Los datos del sensor no están disponibles temporalmente.
              Verifique la conexión con la base de datos e intente de nuevo.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!data || data.length === 0) {
    return (
      <main className="min-h-screen bg-canvas p-4 sm:p-6 md:p-8 text-content">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-line bg-card p-8 text-center">
            <svg
              className="mx-auto mb-4 h-12 w-12 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <h1 className="text-3xl font-bold">Climate Monitor Dashboard</h1>
            <p className="mt-3 text-muted">
              Esperando datos del sensor...
            </p>
            <p className="mt-2 text-sm text-muted">
              Los primeros datos aparecerán automáticamente cuando el
              dispositivo envíe lecturas.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas text-content">
        <DashboardContent initialData={data} initialRange={range} />
    </main>
  );
}
