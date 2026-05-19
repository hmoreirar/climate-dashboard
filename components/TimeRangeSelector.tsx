"use client";

import { useRouter } from "next/navigation";
import { TIME_RANGES, type TimeRange } from "@/lib/sensor";

type Props = {
  selected: TimeRange;
};

export default function TimeRangeSelector({ selected }: Props) {
  const router = useRouter();

  return (
    <div className="flex gap-1 rounded-lg bg-zinc-900 p-1 border border-zinc-800">
      {TIME_RANGES.map((opt) => (
        <button
          key={opt.value}
          onClick={() => router.push(`?range=${opt.value}`, { scroll: false })}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            selected === opt.value
              ? "bg-zinc-700 text-white font-medium"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
