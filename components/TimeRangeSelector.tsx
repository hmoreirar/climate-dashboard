import { TIME_RANGES, type TimeRange } from "@/lib/sensor";

type Props = {
  selected: TimeRange;
  onRangeChange: (range: TimeRange) => void;
};

export default function TimeRangeSelector({ selected, onRangeChange }: Props) {
  return (
    <div className="flex gap-1 rounded-lg bg-card p-1 border border-line">
      {TIME_RANGES.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onRangeChange(opt.value)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            selected === opt.value
              ? "bg-zinc-700 dark:bg-zinc-600 text-white font-medium"
              : "text-muted hover:text-content"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
