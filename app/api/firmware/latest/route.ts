const DEFAULT_FIRMWARE_VERSION = "1.0.0";

function parseVersion(version: string): number[] {
  return version
    .split(".")
    .map((part) => parseInt(part, 10) || 0);
}

function compareVersions(left: string, right: string): number {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const current = searchParams.get("current");
  const version = process.env.FIRMWARE_VERSION ?? DEFAULT_FIRMWARE_VERSION;
  const url =
    process.env.FIRMWARE_BIN_URL ??
    `${origin}/firmware/${version}.bin`;

  return Response.json({
    version,
    url,
    updateAvailable: current != null && compareVersions(version, current) > 0,
  });
}