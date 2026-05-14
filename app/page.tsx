import { supabase } from "@/lib/supabase";
import TemperatureChart from "@/components/TemperatureChart";
import HumidityChart from "@/components/HumidityChart";

export const revalidate = 5;

export default async function Home() {
  const { data, error } = await supabase
    .from("sensor_data")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    return (
      <main className="p-10">
        <h1>Error loading data</h1>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </main>
    );
  }

  const latest = data?.[0];

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mb-2">
          Climate Monitor System
        </h1>

        <p className="text-zinc-400">
          Real-time IoT climate monitoring dashboard
        </p>

        <div className="flex items-center gap-2 mb-10 mt-3">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>

          <p className="text-green-400">
            Device online
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
            <p className="text-zinc-400 mb-2">
              Temperature
            </p>

            <h2 className="text-6xl font-bold">
              {latest?.temperature}°C
            </h2>
          </div>

          <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
            <p className="text-zinc-400 mb-2">
              Humidity
            </p>

            <h2 className="text-6xl font-bold">
              {latest?.humidity}%
            </h2>
          </div>
        </div>

        <div className="mt-6 bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
          <p className="text-zinc-400 mb-2">
            Device
          </p>

          <p className="text-2xl font-semibold">
            {latest?.device_id}
          </p>

          <p className="text-zinc-500 mt-4">
            Last update:{" "}
            {latest
              ? new Date(latest.created_at).toLocaleString()
              : "No data"}
          </p>
        </div>

        <div className="mt-6">
          <TemperatureChart data={data || []} />
        </div>
        <div className="mt-6">
  <HumidityChart data={data || []} />
</div>
      </div>
    </main>
  );
}