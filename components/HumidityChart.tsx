"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  data: {
    humidity: number;
    created_at: string;
  }[];
};

export default function HumidityChart({ data }: Props) {
  const formattedData = data.map((item) => ({
    humidity: item.humidity,
    time: new Date(item.created_at).toLocaleString([], {
  hour: "2-digit",
  minute: "2-digit",
}),
  }));

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
      <h2 className="text-2xl font-bold mb-6">
        Humidity History
      </h2>

      <div className="w-full h-[320px]">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={formattedData}>
<XAxis
  dataKey="time"
  minTickGap={40}
/>
            <YAxis />
            <Tooltip
  contentStyle={{
    backgroundColor: "#18181b",
    border: "1px solid #27272a",
    borderRadius: "12px",
    color: "#ffffff",
  }}
/>

            <Line
              type="monotone"
              dataKey="humidity"
              stroke="#ffffff"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}