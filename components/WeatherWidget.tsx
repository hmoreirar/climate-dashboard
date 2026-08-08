"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "@/lib/useLocation";

type WeatherCode = number;

type CurrentWeather = {
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  weather_code: WeatherCode;
  wind_speed_10m: number;
};

type DailyForecast = {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  weather_code: number[];
};

type WeatherData = {
  current: CurrentWeather;
  daily: DailyForecast;
};

function getWeatherIcon(code: WeatherCode, isDay = true): string {
  if (code === 0) return isDay ? "\u2600\uFE0F" : "\u{1F31B}";
  if (code <= 2) return isDay ? "\u26C5" : "\u{1F324}\uFE0F";
  if (code === 3) return "\u2601\uFE0F";
  if (code >= 45 && code <= 48) return "\u{1F32B}\uFE0F";
  if (code >= 51 && code <= 57) return "\u{1F4A7}";
  if (code >= 61 && code <= 65) return "\u{1F327}\uFE0F";
  if (code === 66 || code === 67) return "\u{1F327}\uFE0F";
  if (code >= 71 && code <= 77) return "\u{1F328}\uFE0F";
  if (code >= 80 && code <= 82) return "\u{1F327}\uFE0F";
  if (code >= 95) return "\u26A1";
  return "\u2601\uFE0F";
}

function getWeatherLabel(code: WeatherCode): string {
  if (code === 0) return "Despejado";
  if (code === 1) return "Mayormente despejado";
  if (code === 2) return "Parcialmente nublado";
  if (code === 3) return "Nublado";
  if (code >= 45 && code <= 48) return "Niebla";
  if (code >= 51 && code <= 55) return "Llovizna";
  if (code >= 56 && code <= 57) return "Llovizna helada";
  if (code >= 61 && code <= 65) return "Lluvia";
  if (code === 66 || code === 67) return "Lluvia helada";
  if (code >= 71 && code <= 77) return "Nieve";
  if (code >= 80 && code <= 82) return "Chubascos";
  if (code >= 85 && code <= 86) return "Chubascos de nieve";
  if (code >= 95) return "Tormenta";
  return "Desconocido";
}

function getDayName(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Hoy";
  if (date.toDateString() === tomorrow.toDateString()) return "Mañana";

  return date.toLocaleDateString("es", { weekday: "short" });
}

type Props = {
  indoorTemp?: number | null;
  indoorHumidity?: number | null;
};

export default function WeatherWidget({ indoorTemp, indoorHumidity }: Props) {
  const { location, loading: locLoading, error: locError, showPicker, setManual, resetLocation, setShowPicker } = useLocation();
  const [data, setData] = useState<WeatherData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) return;

    const params = new URLSearchParams({
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
      daily: "temperature_2m_max,temperature_2m_min,weather_code",
      timezone: "auto",
      forecast_days: "3",
    });

    fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
      .then((res) => res.json())
      .then((json) => setData(json as WeatherData))
      .catch(() => setFetchError("No se pudieron cargar los datos del clima"));
  }, [location]);

  if (locLoading) {
    return (
      <div className="rounded-2xl border border-line bg-card/80 backdrop-blur-sm p-4 sm:p-5 transition-colors duration-300 hover:border-line-hover">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 rounded bg-card" />
          <div className="h-10 w-32 rounded bg-card" />
          <div className="h-3 w-40 rounded bg-card" />
        </div>
      </div>
    );
  }

  if (!location || showPicker) {
    return (
      <div className="rounded-2xl border border-line bg-card/80 backdrop-blur-sm p-4 sm:p-5 transition-colors duration-300 hover:border-line-hover">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted">Configure su ubicación para ver los datos del clima</p>
          <LocationPicker onSet={setManual} onClose={() => setShowPicker(false)} />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="rounded-2xl border border-line bg-card/80 backdrop-blur-sm p-4 sm:p-5 transition-colors duration-300 hover:border-line-hover">
        <p className="text-sm text-red-400">{fetchError}</p>
        <button onClick={resetLocation} className="mt-2 text-xs text-muted hover:text-content underline">
          Cambiar ubicación
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { current, daily } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-line bg-card/80 backdrop-blur-sm p-4 sm:p-5 transition-colors duration-300 hover:border-line-hover"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-muted">Clima</p>
          <p className="text-xs text-muted font-mono">{location.label}</p>
        </div>
        <button onClick={resetLocation} className="text-xs text-muted hover:text-content underline" title="Cambiar ubicación">
          Cambiar
        </button>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className="text-4xl">{getWeatherIcon(current.weather_code)}</span>
        <div>
          <p className="text-3xl font-bold text-content font-mono tabular-nums">
            {current.temperature_2m.toFixed(1)}°C
          </p>
          <p className="text-xs text-muted">{getWeatherLabel(current.weather_code)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-muted mb-4">
        <div>
          <span className="block">Humedad</span>
          <span className="text-content font-medium">{current.relative_humidity_2m}%</span>
        </div>
        <div>
          <span className="block">Viento</span>
          <span className="text-content font-medium">{current.wind_speed_10m.toFixed(0)} km/h</span>
        </div>
        <div>
          <span className="block">Sensación</span>
          <span className="text-content font-medium">{current.apparent_temperature.toFixed(1)}°C</span>
        </div>
      </div>

      {indoorTemp != null && (
        <div className="border-t border-line pt-3 mb-3">
          <div className="flex items-center justify-around text-xs">
            <div className="text-center">
              <span className="text-muted block">Interior</span>
              <span className="text-content font-medium tabular-nums">
                {indoorTemp.toFixed(1)}°C
              </span>
              {indoorHumidity != null && (
                <span className="text-muted"> / {indoorHumidity.toFixed(0)}%</span>
              )}
            </div>
            <div className="text-muted text-lg">|</div>
            <div className="text-center">
              <span className="text-muted block">Exterior</span>
              <span className="text-content font-medium tabular-nums">
                {current.temperature_2m.toFixed(1)}°C
              </span>
              <span className="text-muted"> / {current.relative_humidity_2m}%</span>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-line pt-3 grid grid-cols-3 gap-2">
        {daily.time.map((day, i) => (
          <div key={day} className="text-center">
            <p className="text-xs text-muted mb-1">{getDayName(day)}</p>
            <span className="text-lg">{getWeatherIcon(daily.weather_code[i], true)}</span>
            <div className="text-xs tabular-nums mt-1">
              <span className="text-content font-medium">{daily.temperature_2m_max[i].toFixed(0)}°</span>
              <span className="text-muted"> / {daily.temperature_2m_min[i].toFixed(0)}°</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function LocationPicker({
  onSet,
  onClose,
}: {
  onSet: (lat: number, lng: number, label: string) => void;
  onClose: () => void;
}) {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [city, setCity] = useState("");

  const handleCitySearch = async () => {
    if (!city.trim()) return;
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
      );
      const json = await res.json();
      if (json.results?.[0]) {
        const r = json.results[0];
        onSet(r.latitude, r.longitude, `${r.name}, ${r.country_code}`);
        return;
      }
    } catch {}
  };

  const handleManualSubmit = () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) return;
    onSet(latNum, lngNum, `${latNum.toFixed(2)}, ${lngNum.toFixed(2)}`);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Buscar ciudad..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCitySearch()}
          className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-line bg-canvas text-content placeholder:text-muted"
        />
        <button
          onClick={handleCitySearch}
          disabled={!city.trim()}
          className="px-3 py-1.5 text-sm rounded-lg bg-zinc-700 dark:bg-zinc-600 text-white disabled:opacity-50"
        >
          Buscar
        </button>
      </div>
      <div className="flex gap-2 items-center">
        <span className="text-xs text-muted">O coordenadas:</span>
        <input
          type="text"
          placeholder="Lat"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          className="w-20 px-2 py-1 text-sm rounded-lg border border-line bg-canvas text-content placeholder:text-muted"
        />
        <input
          type="text"
          placeholder="Lng"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          className="w-20 px-2 py-1 text-sm rounded-lg border border-line bg-canvas text-content placeholder:text-muted"
        />
        <button
          onClick={handleManualSubmit}
          disabled={!lat || !lng}
          className="px-3 py-1.5 text-sm rounded-lg bg-zinc-700 dark:bg-zinc-600 text-white disabled:opacity-50"
        >
          Fijar
        </button>
      </div>
    </div>
  );
}
