import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { data, error } = await supabase
    .from("sensor_data")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

 if (error) {
  return (
    <div>
      <h1>Error loading data</h1>
      <pre>{JSON.stringify(error, null, 2)}</pre>
    </div>
  );
}
  return (
    <main className="p-10">
      <h1 className="text-4xl font-bold mb-6">
        Climate Monitor System
      </h1>

      <div className="grid gap-4">
        {data?.map((row) => (
          <div
            key={row.id}
            className="border rounded-xl p-4 shadow"
          >
            <p>
              <strong>Device:</strong> {row.device_id}
            </p>

            <p>
              <strong>Temperature:</strong> {row.temperature}°C
            </p>

            <p>
              <strong>Humidity:</strong> {row.humidity}%
            </p>

            <p>
              <strong>Created:</strong> {row.created_at}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}