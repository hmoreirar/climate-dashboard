"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import MetricChart from "@/components/MetricChart";
import TimeRangeSelector from "@/components/TimeRangeSelector";
import ThemeToggle from "@/components/ThemeToggle";
import AnimatedCounter from "@/components/AnimatedCounter";
import HistoricalAnalytics from "@/components/HistoricalAnalytics";
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

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: {
    transition: { staggerChildren: 0.08 },
  },
};

export default function DashboardContent({ initialData, initialRange }: Props) {
  const [range, setRange] = useState(initialRange);
  const [data, setData] = useState(initialData);

  const fetchData = useCallback(async (r: TimeRange, start?: string, end?: string) => {
    const params = new URLSearchParams({ range: r });
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    try {
      const res = await fetch(`/api/sensor-data?${params}`);
      const json = await res.json();
      if (json.data) setData(json.data);
    } catch {
      // silently fail, next poll will retry
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => fetchData(range), 10000);
    return () => clearInterval(interval);
  }, [range, fetchData]);

  const handleRangeChange = useCallback(
    (newRange: TimeRange, start?: string, end?: string) => {
      setRange(newRange);
      const params = new URLSearchParams({ range: newRange });
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      window.history.replaceState(null, "", `?${params}`);
      fetchData(newRange, start, end);
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
    return "border-line bg-card/80 backdrop-blur-sm";
  };

  const levelText = (level: "normal" | "warning" | "danger") => {
    if (level === "danger") return "text-red-400";
    if (level === "warning") return "text-amber-400";
    return "text-muted";
  };

  const statusColor = isOnline ? "bg-emerald-500" : "bg-amber-500";

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={stagger}
      className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8"
    >
      <motion.header
        variants={fadeUp}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-content">
            Climate Monitor
          </h1>
          <p className="text-sm text-muted mt-1">
            Live temperature and humidity telemetry
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimeRangeSelector selected={range} onRangeChange={handleRangeChange} />
          <p className="text-xs text-muted whitespace-nowrap">{dataCount} lecturas</p>
          <ThemeToggle />
        </div>
      </motion.header>

      <motion.div
        variants={fadeUp}
        className="flex items-center gap-3 mb-8"
      >
        <div className="relative flex items-center justify-center">
          <div className={`h-3 w-3 rounded-full ${statusColor}`} role="status" aria-hidden="true" />
          {isOnline && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className={`h-3 w-3 rounded-full ${statusColor} animate-pulse-ring`} />
            </span>
          )}
        </div>
        <span className="sr-only">
          {isOnline ? "Dispositivo en linea" : "Dispositivo fuera de linea"}
        </span>
        <div className="flex items-baseline gap-2">
          <p className={isOnline ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
            {isOnline ? "Online" : "Offline"}
          </p>
          <span className="text-muted text-xs">
            &mdash; {isOnline
              ? `Actualizado ${formatLastUpdated(latest?.created_at)}`
              : `Sin datos en los ultimos ${ONLINE_WINDOW_MINUTES} minutos`}
          </span>
        </div>
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="grid md:grid-cols-2 gap-6 mb-6"
      >
        <MetricCard
          title="Temperature"
          value={latestTemperature}
          unit="°C"
          level={tempLevel}
          levelText={levelText}
          levelBorder={levelBorder}
          stats={stats.temperature}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25a.75.75 0 01.75.75v11.25a3 3 0 11-1.5 0V3a.75.75 0 01.75-.75z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25a3 3 0 013 3 3 3 0 01-6 0 3 3 0 013-3z" />
            </svg>
          }
        />
        <MetricCard
          title="Humidity"
          value={latestHumidity}
          unit="%"
          level={humLevel}
          levelText={levelText}
          levelBorder={levelBorder}
          stats={stats.humidity}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a7.5 7.5 0 007.5-7.5c0-4.243-7.5-11.25-7.5-11.25S4.5 9.257 4.5 13.5A7.5 7.5 0 0012 21z" />
            </svg>
          }
        />
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="mb-6 rounded-2xl border border-line bg-card/80 backdrop-blur-sm p-4 sm:p-5 md:p-6 transition-colors duration-300 hover:border-line-hover"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted text-sm mb-1">Device</p>
            <p className="text-xl font-semibold text-content font-mono">{latestDevice}</p>
          </div>
          <div className="text-right text-xs text-muted">
            <p>Timezone: {getDashboardTimeZone()}</p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <MetricChart
          color="#f97316"
          data={chartData}
          metric="temperature"
          title="Temperature History"
          unit="°C"
        />
      </motion.div>

      <motion.div variants={fadeUp} className="mt-6">
        <MetricChart
          color="#38bdf8"
          data={chartData}
          metric="humidity"
          title="Humidity History"
          unit="%"
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <HistoricalAnalytics data={data} />
      </motion.div>
    </motion.div>
  );
}

function MetricCard({
  title,
  value,
  unit,
  level,
  levelText,
  levelBorder,
  stats,
  icon,
}: {
  title: string;
  value: number | null;
  unit: string;
  level: "normal" | "warning" | "danger";
  levelText: (l: "normal" | "warning" | "danger") => string;
  levelBorder: (l: "normal" | "warning" | "danger") => string;
  stats: { min: number; max: number; avg: number };
  icon: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 md:p-8 border transition-all duration-300 hover:border-line-hover hover:shadow-lg hover:-translate-y-0.5 ${levelBorder(level)}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-2 ${levelText(level)}`}>
          {icon}
          <p className="text-sm font-medium">{title}</p>
        </div>
        {level !== "normal" && (
          <span className={level === "danger" ? "text-red-400 text-lg" : "text-amber-400 text-lg"}>
            ⚠
          </span>
        )}
      </div>

      {value != null ? (
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-content font-mono tabular-nums leading-tight">
          <AnimatedCounter value={value} decimals={1} suffix={unit} />
        </h2>
      ) : (
        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-muted">
          No data
        </h2>
      )}

      <div className={`mt-4 flex gap-4 text-sm ${levelText(level)}`}>
        <span className="tabular-nums">
          Min <span className="font-medium">{stats.min.toFixed(1)}{unit === "°C" ? "°" : unit}</span>
        </span>
        <span className="tabular-nums">
          Avg <span className="font-medium">{stats.avg.toFixed(1)}{unit === "°C" ? "°" : unit}</span>
        </span>
        <span className="tabular-nums">
          Max <span className="font-medium">{stats.max.toFixed(1)}{unit === "°C" ? "°" : unit}</span>
        </span>
      </div>
    </div>
  );
}
