"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type * as LeafletType from "leaflet";
import type { RouteSegment } from "@/types/route-segment";
import type { WeatherAlert } from "@/types/weather-alert";

type Props = {
  segments: RouteSegment[];
  alerts: WeatherAlert[];
};

const SEVERITY_COLOR: Record<WeatherAlert["severity"], string> = {
  high: "#f87171",
  medium: "#fb923c",
  low: "#fbbf24",
};

const TILE_DARK =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_LIGHT =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export function LeafletMap({ segments, alerts }: Props) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const tileLayerRef = useRef<import("leaflet").TileLayer | null>(null);
  const routeLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const alertLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const leafletRef = useRef<typeof LeafletType | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Inicjalizacja mapy — tylko raz
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, { zoomControl: true }).setView([52.2, 21.0], 7);
      mapRef.current = map;
      leafletRef.current = L;

      routeLayerRef.current = L.layerGroup().addTo(map);
      alertLayerRef.current = L.layerGroup().addTo(map);

      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      tileLayerRef.current?.remove();
      tileLayerRef.current = null;
      routeLayerRef.current?.clearLayers();
      alertLayerRef.current?.clearLayers();
      routeLayerRef.current = null;
      alertLayerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Zmiana kafelków przy zmianie motywu
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;

    tileLayerRef.current?.remove();
    tileLayerRef.current = L.tileLayer(
      resolvedTheme === "dark" ? TILE_DARK : TILE_LIGHT,
      { attribution: TILE_ATTRIBUTION, maxZoom: 19 },
    ).addTo(map);
  }, [mapReady, resolvedTheme]);

  // Rysowanie trasy i alertów
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    const routeLayer = routeLayerRef.current;
    const alertLayer = alertLayerRef.current;
    if (!mapReady || !map || !L || !routeLayer || !alertLayer) return;

    routeLayer.clearLayers();
    alertLayer.clearLayers();

    if (segments.length > 0) {
      const latlngs: [number, number][] = segments.map((s) => [s.from[1], s.from[0]]);
      const last = segments.at(-1);
      if (last) latlngs.push([last.to[1], last.to[0]]);

      const polyline = L.polyline(latlngs, {
        color: "#22d3ee",
        weight: 3,
        opacity: 0.85,
      }).addTo(routeLayer);
      map.fitBounds(polyline.getBounds(), { padding: [30, 30] });

      const start = segments[0].from;
      L.circleMarker([start[1], start[0]], {
        radius: 10,
        color: "#4ade80",
        fillColor: "#4ade80",
        fillOpacity: 0.9,
        weight: 2,
      })
        .bindTooltip("Start", { permanent: true, direction: "top", className: "map-label" })
        .addTo(routeLayer);

      if (last) {
        L.circleMarker([last.to[1], last.to[0]], {
          radius: 10,
          color: "#94a3b8",
          fillColor: "#94a3b8",
          fillOpacity: 0.9,
          weight: 2,
        })
          .bindTooltip("Koniec", { permanent: true, direction: "top", className: "map-label" })
          .addTo(routeLayer);
      }
    }

    for (const alert of alerts) {
      const color = SEVERITY_COLOR[alert.severity];
      L.circleMarker([alert.lat, alert.lon], {
        radius: 12,
        color,
        fillColor: color,
        fillOpacity: 0.4,
        weight: 2,
      })
        .bindPopup(
          `<b>${alert.label}</b><br>${alert.precipitationMm.toFixed(1)} mm/h<br>ETA +${alert.etaMinutesFromStart} min`,
        )
        .addTo(alertLayer);
    }
  }, [mapReady, segments, alerts]);

  return <div ref={containerRef} className="h-[55vw] min-h-[280px] w-full sm:h-[480px] md:h-[600px]" />;
}
