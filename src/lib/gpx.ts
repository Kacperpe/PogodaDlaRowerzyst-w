import type { RouteSegment } from "@/types/route-segment";
import { toSegments } from "@/lib/geojson";

export function parseRouteGpx(raw: string, averageSpeedKmh: number): RouteSegment[] {
  const doc = new DOMParser().parseFromString(raw, "application/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new Error("Niepoprawny plik GPX.");

  const trkpts = Array.from(doc.querySelectorAll("trkpt"));
  if (trkpts.length < 2) throw new Error("GPX nie zawiera wystarczającej liczby punktów trasy.");

  const coords: [number, number][] = trkpts.map((pt) => {
    const lat = parseFloat(pt.getAttribute("lat") ?? "");
    const lon = parseFloat(pt.getAttribute("lon") ?? "");
    if (isNaN(lat) || isNaN(lon)) throw new Error("Niepoprawne współrzędne w GPX.");
    return [lon, lat];
  });

  return toSegments(coords, averageSpeedKmh);
}
