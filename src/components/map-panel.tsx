"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { RouteSegment } from "@/types/route-segment";
import type { WeatherAlert } from "@/types/weather-alert";
import type { Poi, PoiCategory } from "@/types/poi";
import { POI_CONFIG } from "@/types/poi";

const RouteMap = dynamic(
  () => import("@/components/route-map").then((module) => module.RouteMap),
  { ssr: false },
);

type ThemeMode = "dark" | "light";

type MapPanelProps = {
  segments: RouteSegment[];
  themeMode: ThemeMode;
  weatherAlerts: WeatherAlert[];
};

type LatLng = [number, number];

const ALL_CATEGORIES = Object.keys(POI_CONFIG) as PoiCategory[];
const MAX_DISTANCE_M = 500;

function distanceToSegmentM(
  poiLat: number, poiLon: number,
  aLat: number, aLon: number,
  bLat: number, bLon: number,
): number {
  const latScale = 111320;
  const lonScale = 111320 * Math.cos((poiLat * Math.PI) / 180);
  const px = (poiLon - aLon) * lonScale;
  const py = (poiLat - aLat) * latScale;
  const dx = (bLon - aLon) * lonScale;
  const dy = (bLat - aLat) * latScale;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / lenSq));
  return Math.sqrt((px - t * dx) ** 2 + (py - t * dy) ** 2);
}

function isNearRoute(poi: Poi, segments: RouteSegment[]): boolean {
  for (const seg of segments) {
    const dist = distanceToSegmentM(
      poi.lat, poi.lon,
      seg.from[1], seg.from[0],
      seg.to[1], seg.to[0],
    );
    if (dist <= MAX_DISTANCE_M) return true;
  }
  return false;
}

export function MapPanel({ segments, themeMode, weatherAlerts }: MapPanelProps) {
  const routePoints = useMemo<LatLng[]>(() => {
    if (segments.length === 0) return [];
    const points: LatLng[] = [[segments[0].from[1], segments[0].from[0]]];
    for (const segment of segments) {
      points.push([segment.to[1], segment.to[0]]);
    }
    return points;
  }, [segments]);

  const [pois, setPois] = useState<Poi[]>([]);
  const [poisLoading, setPoisLoading] = useState(false);
  const [poisError, setPoisError] = useState<string | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<PoiCategory>>(new Set(ALL_CATEGORIES));
  const [panelOpen, setPanelOpen] = useState(true);

  const bbox = useMemo(() => {
    if (segments.length === 0) return null;
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;
    for (const seg of segments) {
      const [fromLon, fromLat] = seg.from;
      const [toLon, toLat] = seg.to;
      minLat = Math.min(minLat, fromLat, toLat);
      maxLat = Math.max(maxLat, fromLat, toLat);
      minLon = Math.min(minLon, fromLon, toLon);
      maxLon = Math.max(maxLon, fromLon, toLon);
    }
    const pad = 0.02;
    return { minLat: minLat - pad, maxLat: maxLat + pad, minLon: minLon - pad, maxLon: maxLon + pad };
  }, [segments]);

  useEffect(() => {
    if (!bbox) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      minLat: String(bbox.minLat),
      minLon: String(bbox.minLon),
      maxLat: String(bbox.maxLat),
      maxLon: String(bbox.maxLon),
    });
    const timer = setTimeout(() => {
      setPoisLoading(true);
      setPoisError(null);
      fetch(`/api/pois?${params.toString()}`, { signal: controller.signal })
        .then(async (res) => {
          const data = (await res.json()) as { ok: boolean; pois?: Poi[]; error?: string };
          if (data.ok && data.pois) {
            setPois(data.pois);
          } else {
            setPoisError(data.error ?? `HTTP ${res.status}`);
          }
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
          setPoisError("Brak połączenia z serwerem POI");
        })
        .finally(() => setPoisLoading(false));
    }, 600);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [bbox]);

  const routeFilteredPois = useMemo(
    () => pois.filter((poi) => isNearRoute(poi, segments)),
    [pois, segments],
  );

  const filteredPois = useMemo(
    () => routeFilteredPois.filter((poi) => activeCategories.has(poi.category)),
    [routeFilteredPois, activeCategories],
  );

  const isDark = themeMode === "dark";

  function toggleCategory(cat: PoiCategory) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const panelBase = isDark
    ? "border-slate-700/80 bg-slate-950/90 text-slate-200"
    : "border-slate-300/90 bg-white/92 text-slate-800";

  return (
    <section className={`absolute inset-0 transition-colors duration-300 ${isDark ? "bg-slate-950" : "bg-slate-100"}`}>
      <RouteMap points={routePoints} themeMode={themeMode} weatherAlerts={weatherAlerts} pois={filteredPois} />

      {segments.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-0 top-28 z-[500] flex justify-center px-4">
          <p className={`rounded-xl border px-4 py-3 text-sm backdrop-blur transition-colors duration-300 ${isDark ? "border-slate-700/80 bg-slate-950/85 text-slate-300" : "border-slate-300 bg-white/90 text-slate-700"}`}>
            Brak segmentow. Wczytaj plik GeoJSON lub GPX.
          </p>
        </div>
      ) : null}

      {segments.length > 0 ? (
        <div className={`absolute bottom-20 left-3 z-[1000] rounded-xl border shadow-xl backdrop-blur md:bottom-6 ${panelBase}`}>
          <button
            type="button"
            onClick={() => setPanelOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-xs font-semibold"
          >
            <span className="flex items-center gap-2">
              Atrakcje na trasie
              {poisLoading && <span className="opacity-60">ładowanie...</span>}
              {!poisLoading && !poisError && <span className="opacity-60">({filteredPois.length})</span>}
              {poisError && <span className="text-rose-400">błąd</span>}
            </span>
            <span className={`transition-transform duration-200 ${panelOpen ? "rotate-180" : "rotate-0"}`}>▲</span>
          </button>

          {panelOpen ? (
            <>
              {poisError ? (
                <div className="px-3 pb-1 text-xs text-rose-400">{poisError}</div>
              ) : null}
              <div className={`flex flex-col gap-1 px-3 pb-2 border-t ${isDark ? "border-slate-700/40" : "border-slate-200"}`}>
                {ALL_CATEGORIES.map((cat) => {
                  const cfg = POI_CONFIG[cat];
                  const active = activeCategories.has(cat);
                  const count = routeFilteredPois.filter((p) => p.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`flex items-center gap-2 rounded px-1 py-0.5 text-xs transition-opacity ${active ? "opacity-100" : "opacity-40"}`}
                    >
                      <span className="inline-block h-3 w-3 flex-shrink-0 rounded-full border-2 border-white/60" style={{ background: cfg.color }} />
                      <span>{cfg.label}</span>
                      <span className="ml-auto opacity-60">{count}</span>
                    </button>
                  );
                })}
              </div>

            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
