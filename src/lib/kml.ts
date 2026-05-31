import { unzipSync } from "fflate";
import type { RouteSegment } from "@/types/route-segment";
import { toSegments } from "@/lib/geojson";

type Coord = [number, number];

function parseKmlCoordinates(text: string): Coord[] {
  return text
    .trim()
    .split(/\s+/)
    .map((token) => {
      const [lonStr, latStr] = token.split(",");
      const lon = parseFloat(lonStr ?? "");
      const lat = parseFloat(latStr ?? "");
      return [lon, lat] as Coord;
    })
    .filter(([lon, lat]) => !isNaN(lon) && !isNaN(lat));
}

function extractCoords(doc: Document): Coord[] {
  // LineString (standard routes)
  for (const el of doc.querySelectorAll("LineString > coordinates, LineString coordinates")) {
    const coords = parseKmlCoordinates(el.textContent ?? "");
    if (coords.length >= 2) return coords;
  }

  // gx:Track (Google Earth recorded tracks)
  const gxCoords = Array.from(doc.querySelectorAll("gx\\:coord, coord"));
  if (gxCoords.length >= 2) {
    return gxCoords
      .map((el) => {
        const parts = (el.textContent ?? "").trim().split(/\s+/);
        return [parseFloat(parts[0] ?? ""), parseFloat(parts[1] ?? "")] as Coord;
      })
      .filter(([lon, lat]) => !isNaN(lon) && !isNaN(lat));
  }

  // Point placemarks as fallback (ordered waypoints)
  const points = Array.from(doc.querySelectorAll("Point > coordinates"));
  if (points.length >= 2) {
    return points.flatMap((el) => parseKmlCoordinates(el.textContent ?? ""));
  }

  return [];
}

function fromKmlText(text: string, speedKmh: number): RouteSegment[] {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Niepoprawny plik KML.");
  const coords = extractCoords(doc);
  if (coords.length < 2) throw new Error("KML nie zawiera wystarczającej liczby punktów trasy.");
  return toSegments(coords, speedKmh);
}

export function parseRouteKml(text: string, speedKmh: number): RouteSegment[] {
  return fromKmlText(text, speedKmh);
}

export function parseRouteKmz(buffer: ArrayBuffer, speedKmh: number): RouteSegment[] {
  const unzipped = unzipSync(new Uint8Array(buffer));
  const kmlKey = Object.keys(unzipped).find((k) => k.endsWith(".kml"));
  if (!kmlKey) throw new Error("KMZ nie zawiera pliku KML.");
  const text = new TextDecoder().decode(unzipped[kmlKey]);
  return fromKmlText(text, speedKmh);
}
