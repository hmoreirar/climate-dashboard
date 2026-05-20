"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import MetricChart from "@/components/MetricChart";
import TimeRangeSelector from "@/components/TimeRangeSelector";
import ThemeToggle from "@/components/ThemeToggle";
import {
  buildChartSeries,
  computeStats,
  formatLastUpdated,
  getDashboardTimeZone,
  getThresholdLevel,
  isDeviceOnline,
  type SensorReading,
  type TimeRange,
} from "@/lib/sensor";

const ONLINE_WINDOW_MINUTES = 10;

type Props = {
  initialData: SensorReading[];
  initialRange: TimeRange;
};

export default function DashboardContent({ initialData, initialRange }: Props) {
  const [range, setRange] = useState(initialRange);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (r: TimeRange, showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`/api/sensor-data?range=${r}`);
      const json = await res.json();
      if (json.data) setData(json.data);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => fetchData(range), 10000);
    return () => clearInterval(interval);
  }, [range, fetchData]);

  const handleRangeChange = useCallback(
    (newRange: TimeRange) => {
      setRange(newRange);
      window.history.replaceState(null, "", `?range=${newRange}`);
      fetchData(newRange, true);
    },
    [fetchData]
  );

  const latest = data[0];
  const chartData = useMemo(() => buildChartSeries(data), [data]);
  const stats = useMemo(() => computeStats(data), [data]);
  const isOnline = isDeviceOnline(latest, ONLINE_WINDOW_MINUTES);
  const dataCount = data.length;

  const latestTemperature = latest?.temperature ?? null;
  const latestHumidity = latest?.humidity ?? null;
  const latestDevice = latest?.device_id ?? "Unknown device";

  const tempLevel = getThresholdLevel(latestTemperature, "temperature");
  const humLevel = getThresholdLevel(latestHumidity, "humidity");

  const levelBorder = (level: "normal" | "warning" | "danger") => {
    if (level === "danger") return "border-red-800 bg-red-950/20";
    if (level === "warning") return "border-amber-700 bg-amber-950/20";
    return "border-line bg-card";
  };

  const levelText = (level: "normal" | "warning" | "danger") => {
    if (level === "danger") return "text-red-400";
    if (level === "warning") return "text-amber-400";
    return "text-muted";
  };

  return (
    <>
      <div className="flex items-center justify-between mt-6 mb-6">
        <div className="flex items-center gap-3">
          <TimeRangeSelector selected={range} onRangeChange={handleRangeChange} />
          <p className="text-xs text-muted">{dataCount} lecturas</p>
        </div>
        <ThemeToggle />
      </div>

      <div className="flex items-center gap-2 mb-10">
        <div
          className={`h-3 w-3 rounded-full ${
            isOnline ? "bg-emerald-500" : "bg-amber-500"
          }`}
          role="status"
          aria-hidden="true"
        ></div>
        <span className="sr-only">
          {isOnline ? "Dispositivo en línea" : "Dispositivo fuera de línea"}
        </span>
        <p className={isOnline ? "text-emerald-400" : "text-amber-400"}>
          {isOnline
            ? `Device online within ${ONLINE_WINDOW_MINUTES} minutes`
            : `Device offline or stale for more than ${ONLINE_WINDOW_MINUTES} minutes`}
        </p>
      </div>

      <div className={`grid md:grid-cols-2 gap-6 transition-opacity duration-300 ${loading ? "opacity-50" : "opacity-100"}`}>
        <div
          className={`rounded-2xl p-4 sm:p-5 md:p-8 border transition-colors duration-300 hover:border-line-hover ${levelBorder(tempLevel)}`}
        >
          <div className="flex items-center justify-between">
            <p className={`mb-2 ${levelText(tempLevel)}`}>Temperature</p>
            {tempLevel === "danger" && <span className="text-red-400 text-xl">⚠</span>}
            {tempLevel === "warning" && <span className="text-amber-400 text-xl">⚠</span>}
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-content">
            {latestTemperature != null ? `${latestTemperature}°C` : "No data"}
          </h2>
          <div className={`mt-3 flex gap-4 text-sm ${levelText(tempLevel)}`}>
            <span>Min {stats.temperature.min.toFixed(1)}°</span>
            <span>Avg {stats.temperature.avg.toFixed(1)}°</span>
            <span>Max {stats.temperature.max.toFixed(1)}°</span>
          </div>
        </div>

        <div
          className={`rounded-2xl p-4 sm:p-5 md:p-8 border transition-colors duration-300 hover:border-line-hover ${levelBorder(humLevel)}`}
        >
          <div className="flex items-center justify-between">
            <p className={`mb-2 ${levelText(humLevel)}`}>Humidity</p>
            {humLevel === "danger" && <span className="text-red-400 text-xl">⚠</span>}
            {humLevel === "warning" && <span className="text-amber-400 text-xl">⚠</span>}
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-content">
            {latestHumidity != null ? `${latestHumidity}%` : "No data"}
          </h2>
          <div className={`mt-3 flex gap-4 text-sm ${levelText(humLevel)}`}>
            <span>Min {stats.humidity.min.toFixed(1)}%</span>
            <span>Avg {stats.humidity.avg.toFixed(1)}%</span>
            <span>Max {stats.humidity.max.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-card rounded-2xl p-4 sm:p-5 md:p-6 border border-line transition-colors duration-300 hover:border-line-hover">
        <p className="text-muted mb-2">Device</p>
        <p className="text-2xl font-semibold text-content">{latestDevice}</p>
        <p className="text-muted mt-4">
          Last update: {formatLastUpdated(latest?.created_at)}
        </p>
        <p className="text-muted mt-1">
          Dashboard time zone: {getDashboardTimeZone()}
        </p>
      </div>

      <div className={`mt-6 transition-opacity duration-300 ${loading ? "opacity-50" : "opacity-100"}`}>
        <MetricChart
          color="#f97316"
          data={chartData}
          metric="temperature"
          title="Temperature History"
          unit="°C"
        />
      </div>
      <div className={`mt-6 transition-opacity duration-300 ${loading ? "opacity-50" : "opacity-100"}`}>
        <MetricChart
          color="#38bdf8"
          data={chartData}
          metric="humidity"
          title="Humidity History"
          unit="%"
        />
      </div>
    </>
  );
}
