import { supabase } from "@/lib/supabase";
import MetricChart from "@/components/MetricChart";
import {
  buildChartSeries,
  formatLastUpdated,
  getDashboardTimeZone,
  isDeviceOnline,
  type SensorReading,
} from "@/lib/sensor";

export const revalidate = 5;
const ONLINE_WINDOW_MINUTES = 10;

export default async function Home() {
  const { data, error } = await supabase
    .from("sensor_data")
    .select("created_at,device_id,humidity,temperature")
    .order("created_at", { ascending: false })
    .limit(300)
    .returns<SensorReading[]>();

  if (error) {
    console.error("Failed to load sensor_data", error);

    return (
      <main className="min-h-screen bg-zinc-950 p-8 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-red-950 bg-red-950/40 p-8">
            <h1 className="text-3xl font-bold">Climate Monitor Dashboard</h1>
            <p className="mt-3 text-red-100">
              Sensor data is temporarily unavailable. Check Supabase connectivity
              and try again.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const latest = data?.[0];
  const chartData = buildChartSeries(data ?? []);
  const isOnline = isDeviceOnline(latest, ONLINE_WINDOW_MINUTES);
  const latestTemperature = latest?.temperature ?? "No data";
  const latestHumidity = latest?.humidity ?? "No data";
  const latestDevice = latest?.device_id ?? "Unknown device";

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mb-2">
          Climate Monitor Dashboard
        </h1>

        <p className="text-zinc-400">
          Reliable temperature and humidity telemetry for your IoT device
        </p>

        <div className="flex items-center gap-2 mb-10 mt-3">
          <div
            className={`h-3 w-3 rounded-full ${
              isOnline ? "bg-emerald-500" : "bg-amber-500"
            }`}
          ></div>

          <p className={isOnline ? "text-emerald-400" : "text-amber-400"}>
            {isOnline
              ? `Device online within ${ONLINE_WINDOW_MINUTES} minutes`
              : `Device offline or stale for more than ${ONLINE_WINDOW_MINUTES} minutes`}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
            <p className="text-zinc-400 mb-2">
              Temperature
            </p>

            <h2 className="text-6xl font-bold">
              {typeof latestTemperature === "number"
                ? `${latestTemperature}°C`
                : latestTemperature}
            </h2>
          </div>

          <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
            <p className="text-zinc-400 mb-2">
              Humidity
            </p>

            <h2 className="text-6xl font-bold">
              {typeof latestHumidity === "number"
                ? `${latestHumidity}%`
                : latestHumidity}
            </h2>
          </div>
        </div>

        <div className="mt-6 bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
          <p className="text-zinc-400 mb-2">
            Device
          </p>

          <p className="text-2xl font-semibold">
            {latestDevice}
          </p>

          <p className="text-zinc-500 mt-4">
            Last update: {formatLastUpdated(latest?.created_at)}
          </p>

          <p className="text-zinc-500 mt-1">
            Dashboard time zone: {getDashboardTimeZone()}
          </p>
        </div>

        <div className="mt-6">
          <MetricChart
            color="#f97316"
            data={chartData}
            metric="temperature"
            title="Temperature History"
            unit="°C"
          />
        </div>
        <div className="mt-6">
          <MetricChart
            color="#38bdf8"
            data={chartData}
            metric="humidity"
            title="Humidity History"
            unit="%"
          />
        </div>
      </div>
    </main>
  );
}
