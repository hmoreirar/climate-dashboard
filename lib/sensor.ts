export type SensorReading = {
  created_at: string;
  device_id: string | null;
  humidity: number | null;
  temperature: number | null;
};

export type MetricKey = "temperature" | "humidity";

export type PeriodStats = {
  min: number;
  max: number;
  avg: number;
};

export type DashboardStats = Record<MetricKey, PeriodStats>;

export type ThresholdLevel = "normal" | "warning" | "danger";

export type ThresholdConfig = {
  warningMin: number;
  warningMax: number;
  dangerMin: number;
  dangerMax: number;
};

export type ComparisonResult = {
  change: number;
  direction: "up" | "down" | "stable";
  percentage: number;
};

export type HistoricalComparison = {
  current: DashboardStats;
  previous: DashboardStats;
  temperatureChange: ComparisonResult;
  humidityChange: ComparisonResult;
};

export const THRESHOLDS: Record<MetricKey, ThresholdConfig> = {
  temperature: {
    warningMin: 10,
    warningMax: 35,
    dangerMin: 5,
    dangerMax: 40,
  },
  humidity: {
    warningMin: 20,
    warningMax: 80,
    dangerMin: 10,
    dangerMax: 90,
  },
};

export function getThresholdLevel(
  value: number | null | undefined,
  metric: MetricKey
): ThresholdLevel {
  if (value == null) return "normal";

  const t = THRESHOLDS[metric];

  if (value <= t.dangerMin || value >= t.dangerMax) return "danger";
  if (value <= t.warningMin || value >= t.warningMax) return "warning";

  return "normal";
}

export function computeStats(data: SensorReading[]): DashboardStats {
  const temps = data
    .filter((r) => r.temperature != null)
    .map((r) => r.temperature!);
  const hums = data
    .filter((r) => r.humidity != null)
    .map((r) => r.humidity!);

  return {
    temperature: {
      min: temps.length > 0 ? Math.min(...temps) : 0,
      max: temps.length > 0 ? Math.max(...temps) : 0,
      avg: temps.length > 0 ? avg(temps) : 0,
    },
    humidity: {
      min: hums.length > 0 ? Math.min(...hums) : 0,
      max: hums.length > 0 ? Math.max(...hums) : 0,
      avg: hums.length > 0 ? avg(hums) : 0,
    },
  };
}

export type TimeRange = "1h" | "3h" | "6h" | "24h" | "custom";

export const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "1h", label: "1h" },
  { value: "3h", label: "3h" },
  { value: "6h", label: "6h" },
  { value: "24h", label: "24h" },
  { value: "custom", label: "Personalizado" },
];

export function getSinceMs(range: TimeRange): number {
  const map: Record<string, number> = {
    "1h": 3_600_000,
    "3h": 10_800_000,
    "6h": 21_600_000,
    "24h": 86_400_000,
  };
  return map[range] ?? 86_400_000;
}

export function getDateRange(range: TimeRange, customStart?: string | null, customEnd?: string | null) {
  const now = Date.now();
  if (range === "custom" && customStart) {
    return {
      start: new Date(customStart).toISOString(),
      end: customEnd ? new Date(customEnd).toISOString() : new Date(now).toISOString(),
    };
  }
  return {
    start: new Date(now - getSinceMs(range)).toISOString(),
    end: new Date(now).toISOString(),
  };
}

export type ChartPoint = {
  humidity: number | null;
  temperature: number | null;
  timeLabel: string;
  timestamp: string;
};

const DASHBOARD_LOCALE = "es-CL";
const DASHBOARD_TIME_ZONE =
  process.env.NEXT_PUBLIC_DASHBOARD_TIME_ZONE ?? "America/Santiago";

const axisTickFormatter = new Intl.DateTimeFormat(DASHBOARD_LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: DASHBOARD_TIME_ZONE,
});

const chartTimeFormatter = new Intl.DateTimeFormat(DASHBOARD_LOCALE, {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  timeZone: DASHBOARD_TIME_ZONE,
});

const lastUpdatedFormatter = new Intl.DateTimeFormat(DASHBOARD_LOCALE, {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "long",
  second: "2-digit",
  timeZone: DASHBOARD_TIME_ZONE,
  year: "numeric",
});

const tableTimeFormatter = new Intl.DateTimeFormat(DASHBOARD_LOCALE, {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  second: "2-digit",
  timeZone: DASHBOARD_TIME_ZONE,
  year: "numeric",
});

const dateInputFormatter = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "short",
  timeZone: DASHBOARD_TIME_ZONE,
});

export function parseSensorTimestamp(value: string) {
  const normalizedValue =
    /(?:[zZ]|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;

  return new Date(normalizedValue);
}

export function formatChartTick(isoString: string): string {
  return axisTickFormatter.format(parseSensorTimestamp(isoString));
}

export function formatChartTooltipLabel(isoString: string): string {
  return chartTimeFormatter.format(parseSensorTimestamp(isoString));
}

export function formatTableDate(isoString: string): string {
  return tableTimeFormatter.format(parseSensorTimestamp(isoString));
}

export function formatDateInput(date: Date): string {
  return dateInputFormatter.format(date);
}

export function getDashboardTimeZone() {
  return DASHBOARD_TIME_ZONE;
}

export function isDeviceOnline(
  reading: SensorReading | null | undefined,
  staleAfterMinutes = 10
) {
  if (!reading?.created_at) {
    return false;
  }

  const lastReadingAt = parseSensorTimestamp(reading.created_at).getTime();

  if (Number.isNaN(lastReadingAt)) {
    return false;
  }

  return Date.now() - lastReadingAt <= staleAfterMinutes * 60_000;
}

export function formatLastUpdated(createdAt: string | null | undefined) {
  if (!createdAt) {
    return "No data";
  }

  const date = parseSensorTimestamp(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "Invalid timestamp";
  }

  return lastUpdatedFormatter.format(date);
}

export function buildChartSeries(data: SensorReading[], maxPoints = 500) {
  const sorted = [...data].sort(
    (left, right) =>
      parseSensorTimestamp(left.created_at).getTime() -
      parseSensorTimestamp(right.created_at).getTime()
  );

  if (sorted.length <= maxPoints) {
    return sorted.map<ChartPoint>((item) => ({
      humidity: item.humidity,
      temperature: item.temperature,
      timeLabel: chartTimeFormatter.format(parseSensorTimestamp(item.created_at)),
      timestamp: item.created_at,
    }));
  }

  const bucketSize = Math.ceil(sorted.length / maxPoints);
  const result: ChartPoint[] = [];

  for (let i = 0; i < sorted.length; i += bucketSize) {
    const bucket = sorted.slice(i, i + bucketSize);
    const temps = bucket.filter((r) => r.temperature != null).map((r) => r.temperature!);
    const hums = bucket.filter((r) => r.humidity != null).map((r) => r.humidity!);
    const mid = bucket[Math.floor(bucket.length / 2)];

    result.push({
      temperature: temps.length > 0 ? avg(temps) : null,
      humidity: hums.length > 0 ? avg(hums) : null,
      timeLabel: chartTimeFormatter.format(parseSensorTimestamp(mid.created_at)),
      timestamp: mid.created_at,
    });
  }

  return result;
}

export function computeComparison(
  current: SensorReading[],
  previous: SensorReading[]
): HistoricalComparison {
  const currentStats = computeStats(current);
  const previousStats = computeStats(previous);

  return {
    current: currentStats,
    previous: previousStats,
    temperatureChange: computeChange(currentStats.temperature.avg, previousStats.temperature.avg),
    humidityChange: computeChange(currentStats.humidity.avg, previousStats.humidity.avg),
  };
}

function computeChange(current: number, previous: number): ComparisonResult {
  if (previous === 0) {
    return { change: current, direction: current > 0 ? "up" : "stable", percentage: 0 };
  }
  const diff = current - previous;
  const pct = ((diff / previous) * 100);
  return {
    change: diff,
    direction: diff > 0.1 ? "up" : diff < -0.1 ? "down" : "stable",
    percentage: pct,
  };
}

function avg(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
