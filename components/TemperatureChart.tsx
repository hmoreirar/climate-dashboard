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
    temperature: number;
    created_at: string;
  }[];
};

export default function TemperatureChart({ data }: Props) {
  const formattedData = data.map((item) => ({
    temperature: item.temperature,
    time: new Date(item.created_at).toLocaleString([], {
  hour: "2-digit",
  minute: "2-digit",
}),
  }));

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
      <h2 className="text-2xl font-bold mb-6">
        Temperature History
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
              dataKey="temperature"
              stroke="#ffffff"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}