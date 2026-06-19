"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type SensorReading,
  formatTableDate,
  computeComparison,
} from "@/lib/sensor";

type Props = {
  data: SensorReading[];
};

export default function HistoricalAnalytics({ data }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const yesterdayData = useMemo(() => {
    const now = new Date();
    const dayMs = 86_400_000;
    const nowTs = now.getTime();
    const todayStart = new Date(nowTs - dayMs).toISOString();
    const yesterdayStart = new Date(nowTs - 2 * dayMs).toISOString();

    const today = data.filter((r) => r.created_at >= todayStart);
    const yesterday = data.filter(
      (r) => r.created_at >= yesterdayStart && r.created_at < todayStart
    );
    return { today, yesterday };
  }, [data]);

  const comparison = useMemo(
    () => computeComparison(yesterdayData.today, yesterdayData.yesterday),
    [yesterdayData]
  );

  const recentReadings = useMemo(
    () => [...data].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 50),
    [data]
  );

  return (
    <div className="mt-8 rounded-2xl border border-line bg-card transition-colors duration-300 hover:border-line-hover">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 sm:p-5 md:p-6 text-left"
        aria-expanded={isOpen}
      >
        <h2 className="text-xl font-bold text-content">Historical Analytics</h2>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="h-5 w-5 text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ComparisonCard
                  label="Temperature"
                  current={comparison.current.temperature.avg}
                  previous={comparison.previous.temperature.avg}
                  change={comparison.temperatureChange}
                  unit="°C"
                />
                <ComparisonCard
                  label="Humidity"
                  current={comparison.current.humidity.avg}
                  previous={comparison.previous.humidity.avg}
                  change={comparison.humidityChange}
                  unit="%"
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-muted mb-3">
                  Recent Readings (last 50)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-muted">
                        <th className="text-left py-2 pr-4 font-medium">Time</th>
                        <th className="text-right px-2 font-medium">Temp</th>
                        <th className="text-right px-2 font-medium">Humidity</th>
                        <th className="text-right pl-4 font-medium">Device</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentReadings.map((reading) => (
                        <tr
                          key={reading.created_at}
                          className="border-b border-line/50 hover:bg-line/20 transition-colors"
                        >
                          <td className="py-2 pr-4 text-muted whitespace-nowrap font-mono text-xs">
                            {formatTableDate(reading.created_at)}
                          </td>
                          <td className="text-right px-2 py-2 text-content font-mono tabular-nums">
                            {reading.temperature != null
                              ? `${reading.temperature.toFixed(1)}°C`
                              : "—"}
                          </td>
                          <td className="text-right px-2 py-2 text-content font-mono tabular-nums">
                            {reading.humidity != null
                              ? `${reading.humidity.toFixed(1)}%`
                              : "—"}
                          </td>
                          <td className="text-right pl-4 py-2 text-muted text-xs">
                            {reading.device_id ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {recentReadings.length === 0 && (
                  <p className="text-muted text-sm py-4 text-center">
                    No hay datos disponibles
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ComparisonCard({
  label,
  current,
  previous,
  change,
  unit,
}: {
  label: string;
  current: number;
  previous: number;
  change: { direction: string; percentage: number; change: number };
  unit: string;
}) {
  const isUp = change.direction === "up";
  const isDown = change.direction === "down";

  return (
    <div className="rounded-xl border border-line p-4">
      <p className="text-sm text-muted mb-2">{label}</p>
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold text-content font-mono tabular-nums">
          {current.toFixed(1)}{unit}
        </span>
        <span className="text-sm text-muted">vs {previous.toFixed(1)}{unit}</span>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        {isUp && (
          <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        )}
        {isDown && (
          <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
        {change.direction === "stable" && (
          <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
          </svg>
        )}
        <span
          className={`text-sm font-medium ${
            isUp ? "text-red-400" : isDown ? "text-emerald-400" : "text-muted"
          }`}
        >
          {change.direction === "stable"
            ? "Sin cambio"
            : `${change.change > 0 ? "+" : ""}${change.change.toFixed(1)}${unit} (${change.percentage > 0 ? "+" : ""}${change.percentage.toFixed(1)}%)`}
        </span>
      </div>
    </div>
  );
}
