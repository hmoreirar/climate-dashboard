"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import MetricChart from "@/components/MetricChart";
import WeatherWidget from "@/components/WeatherWidget";
import AirQualityWidget from "@/components/AirQualityWidget";
import TimeRangeSelector from "@/components/TimeRangeSelector";
import ThemeToggle from "@/components/ThemeToggle";
import AnimatedCounter from "@/components/AnimatedCounter";
import HistoricalAnalytics from "@/components/HistoricalAnalytics";
import {
  buildChartSeries,
  computeStats,
  formatRelativeTime,
  getThresholdLevel,
  isDeviceOnline,
  type SensorReading,
  type TimeRange,
} from "@/lib/sensor";

const ONLINE_WINDOW_MINUTES = 5;
const REFRESH_INTERVAL_MS = 60_000;

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
  const [refreshing, setRefreshing] = useState(false);
  const [refError, setRefError] = useState(false);

  const fetchData = useCallback(async (r: TimeRange, start?: string, end?: string) => {
    setRefreshing(true);
    const params = new URLSearchParams({ range: r });
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    try {
      const res = await fetch(`/api/sensor-data?${params}`);
      const json = await res.json();
      if (json.data) setData(json.data);
      setRefError(false);
    } catch {
      setRefError(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => fetchData(range), REFRESH_INTERVAL_MS);
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
  const latestDevice = latest?.device_id ?? "Dispositivo desconocido";

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
      className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto"
    >
      <motion.header
        variants={fadeUp}
        className="col-span-1 md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-content">
            Climate Monitor
          </h1>
          <p className="text-sm text-muted mt-1">
            Telemetría en vivo de temperatura y humedad
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimeRangeSelector selected={range} onRangeChange={handleRangeChange} />
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                refreshing
                  ? "bg-blue-400 animate-pulse"
                  : refError
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
              title={refreshing ? "Actualizando..." : refError ? "Error al actualizar" : "En vivo"}
            />
            <p className="text-xs text-muted whitespace-nowrap">{dataCount} lecturas</p>
          </div>
          <ThemeToggle />
        </div>
      </motion.header>

      <motion.div
        variants={fadeUp}
        className="col-span-1 md:col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1"
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
          {isOnline ? "Dispositivo en línea" : "Dispositivo fuera de línea"}
        </span>
        <div className="flex items-baseline gap-2">
          <p className={isOnline ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
            {isOnline ? "En línea" : "Fuera de línea"}
          </p>
          <span className="text-muted text-xs">
            &mdash; {isOnline
              ? `Actualizado ${formatRelativeTime(latest?.created_at)}`
              : `Sin datos en los últimos ${ONLINE_WINDOW_MINUTES} minutos`}
          </span>
        </div>
        <span className="text-muted text-xs">·</span>
        <span className="text-muted text-xs font-mono" title="Dispositivo">
          {latestDevice}
        </span>
      </motion.div>

      <MetricCard
        title="Temperatura"
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
        title="Humedad"
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

      <motion.div variants={fadeUp} className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
        <WeatherWidget indoorTemp={latestTemperature} indoorHumidity={latestHumidity} />
        <AirQualityWidget />
      </motion.div>

      <motion.div variants={fadeUp} className="col-span-1 md:col-span-2">
        <MetricChart
          color="#f97316"
          data={chartData}
          metric="temperature"
          title="Historial de Temperatura"
          unit="°C"
        />
      </motion.div>

      <motion.div variants={fadeUp} className="col-span-1 md:col-span-2">
        <MetricChart
          color="#38bdf8"
          data={chartData}
          metric="humidity"
          title="Historial de Humedad"
          unit="%"
        />
      </motion.div>

      <motion.div variants={fadeUp} className="col-span-1 md:col-span-2">
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
          Sin datos
        </h2>
      )}

      <div className={`mt-4 flex gap-4 text-sm ${levelText(level)}`}>
        <span className="tabular-nums">
          Mín <span className="font-medium">{stats.min.toFixed(1)}{unit === "°C" ? "°" : unit}</span>
        </span>
        <span className="tabular-nums">
          Prom <span className="font-medium">{stats.avg.toFixed(1)}{unit === "°C" ? "°" : unit}</span>
        </span>
        <span className="tabular-nums">
          Máx <span className="font-medium">{stats.max.toFixed(1)}{unit === "°C" ? "°" : unit}</span>
        </span>
      </div>
    </div>
  );
}
