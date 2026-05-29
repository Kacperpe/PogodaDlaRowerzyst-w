import type { NextRequest } from "next/server";
import type { Poi, PoiCategory } from "@/types/poi";

const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

// in-memory server-side cache, TTL 1h
const poiCache = new Map<string, { pois: Poi[]; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000;

type OverpassElement = {
  type: string;
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
};

function classifyCategory(tags: Record<string, string>): PoiCategory | null {
  const amenity = tags.amenity ?? "";
  const tourism = tags.tourism ?? "";
  const shop = tags.shop ?? "";

  if (["restaurant", "cafe", "bar", "pub", "fast_food", "food_court", "biergarten"].includes(amenity))
    return "restaurant";
  if (["hotel", "hostel", "guest_house", "motel", "apartment"].includes(tourism))
    return "accommodation";
  if (amenity === "toilets") return "toilet";
  if (tourism === "camp_site") return "campsite";
  if (["attraction", "viewpoint", "museum", "gallery"].includes(tourism)) return "attraction";
  if (["supermarket", "convenience", "grocery", "general"].includes(shop)) return "shop";
  if (amenity === "drinking_water") return "water";

  return null;
}

function buildQuery(bbox: string): string {
  return `
[out:json][timeout:30];
(
  node["amenity"="restaurant"](${bbox});
  node["amenity"="cafe"](${bbox});
  node["amenity"="bar"](${bbox});
  node["amenity"="pub"](${bbox});
  node["amenity"="fast_food"](${bbox});
  node["amenity"="toilets"](${bbox});
  node["amenity"="drinking_water"](${bbox});
  node["tourism"="hotel"](${bbox});
  node["tourism"="hostel"](${bbox});
  node["tourism"="guest_house"](${bbox});
  node["tourism"="motel"](${bbox});
  node["tourism"="camp_site"](${bbox});
  node["tourism"="attraction"](${bbox});
  node["tourism"="viewpoint"](${bbox});
  node["tourism"="museum"](${bbox});
  node["shop"="supermarket"](${bbox});
  node["shop"="convenience"](${bbox});
);
out body 1500;
`.trim();
}

async function fetchOverpass(query: string): Promise<{ elements: OverpassElement[] }> {
  let lastError = "";
  for (let i = 0; i < OVERPASS_URLS.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 2000));
    const url = OVERPASS_URLS[i];
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "MapaPogodyRowerowanie/1.0",
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (res.status === 429 || res.status === 504) {
        lastError = `HTTP ${res.status} z ${url}`;
        continue;
      }
      if (!res.ok) {
        lastError = `HTTP ${res.status} z ${url}`;
        continue;
      }
      return (await res.json()) as { elements: OverpassElement[] };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(lastError);
}

function roundBbox(minLat: string, minLon: string, maxLat: string, maxLon: string): string {
  // round to 2 decimal places (~1km precision) to improve cache hit rate
  const r = (v: string) => Math.round(parseFloat(v) * 100) / 100;
  return `${r(minLat)},${r(minLon)},${r(maxLat)},${r(maxLon)}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const minLat = searchParams.get("minLat");
  const minLon = searchParams.get("minLon");
  const maxLat = searchParams.get("maxLat");
  const maxLon = searchParams.get("maxLon");

  if (!minLat || !minLon || !maxLat || !maxLon) {
    return Response.json({ ok: false, error: "Brak parametrow bbox" }, { status: 400 });
  }

  const cacheKey = roundBbox(minLat, minLon, maxLat, maxLon);
  const cached = poiCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Response.json({ ok: true, pois: cached.pois, cached: true }, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  }

  const bbox = cacheKey;

  try {
    const data = await fetchOverpass(buildQuery(bbox));
    const elements = data.elements ?? [];

    const pois: Poi[] = [];
    for (const el of elements) {
      if (el.type !== "node" || el.lat == null || el.lon == null || !el.tags) continue;
      const category = classifyCategory(el.tags);
      if (!category) continue;
      pois.push({ id: el.id, lat: el.lat, lon: el.lon, category, name: el.tags.name });
    }

    poiCache.set(cacheKey, { pois, ts: Date.now() });

    return Response.json({ ok: true, pois }, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Nieznany blad";
    return Response.json({ ok: false, error: msg }, { status: 502 });
  }
}
