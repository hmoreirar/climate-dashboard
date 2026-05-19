export type SensorReading = {
  created_at: string;
  device_id: string | null;
  humidity: number | null;
  temperature: number | null;
};

export type MetricKey = "temperature" | "humidity";

export type TimeRange = "1h" | "3h" | "6h" | "24h";

export const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "1h", label: "1h" },
  { value: "3h", label: "3h" },
  { value: "6h", label: "6h" },
  { value: "24h", label: "24h" },
];

export function getSinceMs(range: TimeRange): number {
  const map: Record<TimeRange, number> = {
    "1h": 3_600_000,
    "3h": 10_800_000,
    "6h": 21_600_000,
    "24h": 86_400_000,
  };
  return map[range];
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

function avg(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
