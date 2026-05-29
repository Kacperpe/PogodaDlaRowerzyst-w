import type { RouteSegment } from "@/types/route-segment";

type Coordinates = [number, number];

function haversineKm(a: Coordinates, b: Coordinates) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function toSegments(points: Coordinates[], averageSpeedKmh: number) {
  const segments: RouteSegment[] = [];
  let totalMinutes = 0;

  for (let i = 0; i < points.length - 1; i += 1) {
    const from = points[i];
    const to = points[i + 1];
    const distanceKm = Number(haversineKm(from, to).toFixed(2));
    const segmentMinutes = (distanceKm / averageSpeedKmh) * 60;
    totalMinutes += segmentMinutes;

    segments.push({
      id: `S-${String(i + 1).padStart(3, "0")}`,
      from,
      to,
      distanceKm,
      etaMinutesFromStart: Math.round(totalMinutes),
    });
  }

  return segments;
}

function parseRouteGeoJson(raw: string, averageSpeedKmh: number) {
  const data = JSON.parse(raw) as
    | {
        type: "FeatureCollection";
        features?: Array<{
          geometry?: { type?: string; coordinates?: Coordinates[] };
        }>;
      }
    | { type?: string; coordinates?: Coordinates[] };

  if (data.type === "LineString" && Array.isArray(data.coordinates)) {
    return toSegments(data.coordinates, averageSpeedKmh);
  }

  if (
    data.type === "FeatureCollection" &&
    "features" in data &&
    Array.isArray(data.features)
  ) {
    const line = data.features.find(
      (f: { geometry?: { type?: string; coordinates?: Coordinates[] } }) =>
        f.geometry?.type === "LineString" && Array.isArray(f.geometry.coordinates),
    );

    if (line?.geometry?.coordinates) {
      return toSegments(line.geometry.coordinates, averageSpeedKmh);
    }
  }

  throw new Error(
    "Niepoprawny GeoJSON: oczekiwany LineString lub FeatureCollection z LineString.",
  );
}

function parseRouteGpx(raw: string, averageSpeedKmh: number) {
  const matches = [...raw.matchAll(/<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>/g)];
  const points: Coordinates[] = matches
    .map((m) => [Number(m[2]), Number(m[1])] as Coordinates)
    .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));

  if (points.length < 2) {
    throw new Error("Niepoprawny GPX: brak punktow trasy (trkpt).");
  }

  return toSegments(points, averageSpeedKmh);
}

export function parseRouteFile(raw: string, filename: string, averageSpeedKmh: number) {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".gpx")) {
    return parseRouteGpx(raw, averageSpeedKmh);
  }

  return parseRouteGeoJson(raw, averageSpeedKmh);
}
