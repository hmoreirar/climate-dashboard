"use client";

import { useState, useEffect, useCallback } from "react";

type Location = {
  latitude: number;
  longitude: number;
  label: string;
};

const STORAGE_KEY = "dashboard-location";

function loadStored(): Location | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function store(loc: Location) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  } catch {}
}

export function useLocation() {
  const [location, setLocation] = useState<Location | null>(() => loadStored());
  const [loading, setLoading] = useState(() => loadStored() === null);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (location) return;

    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: Location = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          label: `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`,
        };
        setLocation(loc);
        store(loc);
        setLoading(false);
      },
      () => {
        setError("Permiso de ubicación denegado");
        setLoading(false);
        setShowPicker(true);
      },
      { timeout: 10000, enableHighAccuracy: false },
    );
  }, [location]);

  const setManual = useCallback((lat: number, lng: number, label: string) => {
    const loc: Location = { latitude: lat, longitude: lng, label };
    setLocation(loc);
    store(loc);
    setShowPicker(false);
    setError(null);
  }, []);

  const resetLocation = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLocation(null);
    setLoading(true);
    setError(null);
    setShowPicker(false);
  }, []);

  return {
    location,
    loading,
    error,
    showPicker,
    setManual,
    resetLocation,
    setShowPicker,
  };
}
