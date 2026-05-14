export type SensorReading = {
  created_at: string;
  device_id: string | null;
  humidity: number | null;
  temperature: number | null;
};

export type MetricKey = "temperature" | "humidity";

export type ChartPoint = {
  humidity: number | null;
  temperature: number | null;
  timeLabel: string;
  timestamp: string;
};

const DASHBOARD_LOCALE = "es-CL";
const DASHBOARD_TIME_ZONE =
  process.env.NEXT_PUBLIC_DASHBOARD_TIME_ZONE ?? "America/Santiago";

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

function parseSensorTimestamp(value: string) {
  const normalizedValue =
    /(?:[zZ]|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;

  return new Date(normalizedValue);
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

export function buildChartSeries(data: SensorReading[]) {
  return [...data]
    .sort(
      (left, right) =>
        parseSensorTimestamp(left.created_at).getTime() -
        parseSensorTimestamp(right.created_at).getTime()
    )
    .map<ChartPoint>((item) => ({
      humidity: item.humidity,
      temperature: item.temperature,
      timeLabel: chartTimeFormatter.format(parseSensorTimestamp(item.created_at)),
      timestamp: item.created_at,
    }));
}
