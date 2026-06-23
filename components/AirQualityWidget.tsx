"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "@/lib/useLocation";

type AirQualityCurrent = {
  european_aqi: number;
  pm2_5: number;
  pm10: number;
  nitrogen_dioxide: number;
  ozone: number;
};

type AirQualityData = {
  current: AirQualityCurrent;
};

function getAqiLevel(aqi: number): { label: string; color: string; text: string } {
  if (aqi <= 20) return { label: "Good", color: "bg-emerald-500", text: "text-emerald-400" };
  if (aqi <= 40) return { label: "Fair", color: "bg-yellow-500", text: "text-yellow-400" };
  if (aqi <= 60) return { label: "Moderate", color: "bg-orange-500", text: "text-orange-400" };
  if (aqi <= 80) return { label: "Poor", color: "bg-red-500", text: "text-red-400" };
  if (aqi <= 100) return { label: "Very Poor", color: "bg-purple-500", text: "text-purple-400" };
  return { label: "Extreme", color: "bg-rose-700", text: "text-rose-400" };
}

export default function AirQualityWidget() {
  const { location } = useLocation();
  const [data, setData] = useState<AirQualityData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) return;

    const params = new URLSearchParams({
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      current: "european_aqi,pm2_5,pm10,nitrogen_dioxide,ozone",
    });

    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`)
      .then((res) => res.json())
      .then((json) => setData(json as AirQualityData))
      .catch(() => setError("Failed to load air quality data"));
  }, [location]);

  if (!location) return null;

  if (error) {
    return (
      <div className="rounded-2xl border border-line bg-card/80 backdrop-blur-sm p-4 sm:p-5 transition-colors duration-300 hover:border-line-hover">
        <p className="text-xs text-muted mb-1">Air Quality</p>
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-line bg-card/80 backdrop-blur-sm p-4 sm:p-5 transition-colors duration-300 hover:border-line-hover">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-20 rounded bg-card" />
          <div className="h-8 w-16 rounded bg-card" />
          <div className="h-3 w-36 rounded bg-card" />
        </div>
      </div>
    );
  }

  const aqi = data.current.european_aqi;
  const level = getAqiLevel(aqi);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-line bg-card/80 backdrop-blur-sm p-4 sm:p-5 transition-colors duration-300 hover:border-line-hover"
    >
      <p className="text-xs text-muted mb-3">Air Quality</p>

      <div className="flex items-center gap-3 mb-4">
        <div className={`h-10 w-10 rounded-full ${level.color} flex items-center justify-center text-white text-sm font-bold`}>
          {aqi.toFixed(0)}
        </div>
        <div>
          <p className={`text-lg font-bold ${level.text}`}>{level.label}</p>
          <p className="text-xs text-muted">European AQI</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-line p-2">
          <span className="text-muted">PM2.5</span>
          <p className="text-content font-medium tabular-nums">{data.current.pm2_5.toFixed(1)} µg/m³</p>
        </div>
        <div className="rounded-lg border border-line p-2">
          <span className="text-muted">PM10</span>
          <p className="text-content font-medium tabular-nums">{data.current.pm10.toFixed(1)} µg/m³</p>
        </div>
        <div className="rounded-lg border border-line p-2">
          <span className="text-muted">NO₂</span>
          <p className="text-content font-medium tabular-nums">{data.current.nitrogen_dioxide.toFixed(1)} µg/m³</p>
        </div>
        <div className="rounded-lg border border-line p-2">
          <span className="text-muted">O₃</span>
          <p className="text-content font-medium tabular-nums">{data.current.ozone.toFixed(1)} µg/m³</p>
        </div>
      </div>
    </motion.div>
  );
}
