"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TIME_RANGES, formatDateInput, type TimeRange } from "@/lib/sensor";

type Props = {
  selected: TimeRange;
  onRangeChange: (range: TimeRange, start?: string, end?: string) => void;
};

export default function TimeRangeSelector({ selected, onRangeChange }: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const handlePresetClick = (value: TimeRange) => {
    if (value === "custom") {
      setShowCustom(!showCustom);
      return;
    }
    setShowCustom(false);
    onRangeChange(value);
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onRangeChange("custom", customStart, customEnd);
      setShowCustom(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 rounded-lg bg-card p-1 border border-line">
        {TIME_RANGES.slice(0, -1).map((opt) => (
          <button
            key={opt.value}
            onClick={() => handlePresetClick(opt.value)}
            className={`relative px-3 py-1.5 text-sm rounded-md transition-colors ${
              selected === opt.value
                ? "text-white font-medium"
                : "text-muted hover:text-content"
            }`}
          >
            {selected === opt.value && (
              <motion.span
                layoutId="range-bg"
                className="absolute inset-0 rounded-md bg-zinc-700 dark:bg-zinc-600 -z-0"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        ))}
        <button
          onClick={() => handlePresetClick("custom")}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            selected === "custom"
              ? "bg-zinc-700 dark:bg-zinc-600 text-white font-medium"
              : "text-muted hover:text-content"
          }`}
        >
          Personalizado
        </button>
      </div>

      {showCustom && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-line bg-card"
        >
          <label className="text-xs text-muted">
            Desde
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              max={customEnd || formatDateInput(new Date())}
              className="ml-2 px-2 py-1 rounded border border-line bg-canvas text-content text-sm"
            />
          </label>
          <label className="text-xs text-muted">
            Hasta
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              max={formatDateInput(new Date())}
              min={customStart}
              className="ml-2 px-2 py-1 rounded border border-line bg-canvas text-content text-sm"
            />
          </label>
          <button
            onClick={handleCustomApply}
            disabled={!customStart || !customEnd}
            className="px-3 py-1.5 text-sm rounded-md bg-zinc-700 dark:bg-zinc-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Aplicar
          </button>
        </motion.div>
      )}
    </div>
  );
}
