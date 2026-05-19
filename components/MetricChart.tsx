"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatChartTick,
  formatChartTooltipLabel,
  type ChartPoint,
  type MetricKey,
} from "@/lib/sensor";

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
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5 md:p-6">
        <h2 className="mb-6 text-2xl font-bold">{title}</h2>
        <div className="flex h-[320px] items-center justify-center text-zinc-500">
          <div className="text-center">
            <svg className="mx-auto mb-2 h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <p>No hay datos históricos disponibles</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5 md:p-6">
      <h2 className="mb-6 text-2xl font-bold">{title}</h2>

      <div
        className="h-[320px] w-full"
        role="img"
        aria-label={`Gráfico de ${title}. ${data.length} puntos de datos.`}
      >
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data}>
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatChartTick}
              minTickGap={48}
              stroke="#a1a1aa"
            />
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
              labelFormatter={(value) => formatChartTooltipLabel(value as string)}
              labelStyle={{ color: "#d4d4d8" }}
            />
            <Line
              animationDuration={300}
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
