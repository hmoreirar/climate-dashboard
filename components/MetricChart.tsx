"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ChartPoint, MetricKey } from "@/lib/sensor";

type Props = {
  color: string;
  data: ChartPoint[];
  metric: MetricKey;
  title: string;
  unit: string;
};

export default function MetricChart({
  color,
  data,
  metric,
  title,
  unit,
}: Props) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="mb-6 text-2xl font-bold">{title}</h2>

      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data}>
            <XAxis dataKey="timeLabel" minTickGap={32} stroke="#a1a1aa" />
            <YAxis
              stroke="#a1a1aa"
              tickFormatter={(value: number) => `${value}${unit}`}
              width={48}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "12px",
                color: "#ffffff",
              }}
              formatter={(value) => {
                if (typeof value === "number") {
                  return `${value}${unit}`;
                }

                return value == null ? "No data" : String(value);
              }}
              labelStyle={{ color: "#d4d4d8" }}
            />
            <Line
              connectNulls={false}
              dataKey={metric}
              dot={false}
              stroke={color}
              strokeWidth={3}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
