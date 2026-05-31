"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type * as LeafletType from "leaflet";
import type { Poi, PoiCategory } from "@/types/poi";
import { POI_CONFIG } from "@/types/poi";
import type { WeatherAlert, WeatherAlertKind } from "@/types/weather-alert";

type LatLng = [number, number];

type RouteMapProps = {
  points: LatLng[];
  themeMode: "dark" | "light";
  weatherAlerts: WeatherAlert[];
  pois: Poi[];
};

const KIND_CONFIG: Record<WeatherAlertKind, { color: string; emoji: string; label: string }> = {
  rain: { color: "#f59e0b", emoji: "🌧", label: "Deszcz" },
  wind: { color: "#a78bfa", emoji: "💨", label: "Silny wiatr" },
  cold: { color: "#22d3ee", emoji: "🥶", label: "Zimno" },
  hot:  { color: "#f87171", emoji: "🌡", label: "Upał" },
};

const KIND_PRIORITY: WeatherAlertKind[] = ["rain", "wind", "cold", "hot"];

const POI_EMOJI: Record<PoiCategory, string> = {
  restaurant:    "🍴",
  accommodation: "🛏",
  toilet:        "🚻",
  campsite:      "⛺",
  attraction:    "🏛",
  shop:          "🛒",
  water:         "💧",
};

const TILE_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_LIGHT = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTR_DARK = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const ATTR_LIGHT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function primaryKind(kinds: WeatherAlertKind[]): WeatherAlertKind {
  for (const k of KIND_PRIORITY) {
    if (kinds.includes(k)) return k;
  }
  return kinds[0];
}

function alertRadius(alert: WeatherAlert): number {
  const pk = primaryKind(alert.kinds);
  if (pk === "rain") return Math.min(16, 8 + ((alert.precipitationProbability ?? 0) / 10));
  if (pk === "wind") return Math.min(16, 8 + Math.max(0, ((alert.windKmh ?? 0) - 30) / 5));
  return 10;
}

export function RouteMap({ points, themeMode, weatherAlerts, pois }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletType.Map | null>(null);
  const leafletRef = useRef<typeof LeafletType | null>(null);
  const tileLayerRef = useRef<LeafletType.TileLayer | null>(null);
  const routeLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const alertLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const poiLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, { zoomControl: true }).setView([52.2297, 21.0122], 7);
      mapRef.current = map;
      leafletRef.current = L;
      routeLayerRef.current = L.layerGroup().addTo(map);
      alertLayerRef.current = L.layerGroup().addTo(map);
      poiLayerRef.current = L.layerGroup().addTo(map);
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      tileLayerRef.current?.remove();
      tileLayerRef.current = null;
      routeLayerRef.current?.clearLayers();
      alertLayerRef.current?.clearLayers();
      poiLayerRef.current?.clearLayers();
      routeLayerRef.current = null;
      alertLayerRef.current = null;
      poiLayerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;

    tileLayerRef.current?.remove();
    const isDark = themeMode === "dark";
    tileLayerRef.current = L.tileLayer(isDark ? TILE_DARK : TILE_LIGHT, {
      attribution: isDark ? ATTR_DARK : ATTR_LIGHT,
      maxZoom: 19,
    }).addTo(map);
  }, [mapReady, themeMode]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const routeLayer = routeLayerRef.current;
    if (!mapReady || !L || !map || !routeLayer) return;

    routeLayer.clearLayers();

    if (points.length === 0) return;

    L.polyline(points, { color: "#22d3ee", weight: 4 }).addTo(routeLayer);

    L.circleMarker(points[0], { radius: 7, color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.95, weight: 2 })
      .bindTooltip("START", { permanent: true, direction: "top", offset: [0, -10] })
      .addTo(routeLayer);

    L.circleMarker(points[points.length - 1], { radius: 7, color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.95, weight: 2 })
      .bindTooltip("KONIEC", { permanent: true, direction: "top", offset: [0, -10] })
      .addTo(routeLayer);

    map.fitBounds(points, { padding: [36, 36] });
  }, [mapReady, points]);

  useEffect(() => {
    const L = leafletRef.current;
    const alertLayer = alertLayerRef.current;
    if (!mapReady || !L || !alertLayer) return;

    alertLayer.clearLayers();

    for (const alert of weatherAlerts) {
      const pk = primaryKind(alert.kinds);
      const { color } = KIND_CONFIG[pk];
      const radius = alertRadius(alert);
      const emojis = alert.kinds.map((k) => KIND_CONFIG[k].emoji).join(" ");

      const kindRows = alert.kinds.map((k) => {
        const cfg = KIND_CONFIG[k];
        let detail = "";
        if (k === "rain") detail = `${alert.rainMm ?? alert.precipitationMm ?? 0} mm · ${alert.precipitationProbability ?? 0}% szans`;
        if (k === "wind") detail = `${alert.windKmh ?? "—"} km/h`;
        if (k === "cold" || k === "hot") detail = `${alert.temperatureC}°C`;
        return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span style="background:${cfg.color}28;color:${cfg.color};border-radius:4px;padding:1px 6px;font-size:11px;font-weight:700;border:1px solid ${cfg.color}55;white-space:nowrap">${cfg.emoji} ${cfg.label}</span>
          <span style="color:#374151;font-weight:600">${detail}</span>
        </div>`;
      }).join("");

      const popup = `<div style="min-width:190px;font-family:system-ui,sans-serif;font-size:12px;line-height:1.6">
        <div style="font-weight:700;font-size:14px;margin-bottom:2px">${emojis} ${alert.segmentId}</div>
        <div style="color:#94a3b8;font-size:11px;margin-bottom:10px">${alert.plannedAtRouteTz}</div>
        ${kindRows}
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;color:#64748b;font-size:11px;display:flex;gap:12px">
          <span>🌡 ${alert.temperatureC !== null ? `${alert.temperatureC}°C` : "—"}</span>
          <span>💨 ${alert.windKmh !== null ? `${alert.windKmh} km/h` : "—"}</span>
        </div>
      </div>`;

      L.circleMarker([alert.lat, alert.lon], {
        radius,
        color: "#ffffff",
        weight: 2,
        fillColor: color,
        fillOpacity: 0.88,
      })
        .bindPopup(popup)
        .addTo(alertLayer);
    }
  }, [mapReady, weatherAlerts]);

  useEffect(() => {
    const L = leafletRef.current;
    const poiLayer = poiLayerRef.current;
    if (!mapReady || !L || !poiLayer) return;

    poiLayer.clearLayers();

    for (const poi of pois) {
      const cfg = POI_CONFIG[poi.category];
      const emoji = POI_EMOJI[poi.category];
      const icon = L.divIcon({
        html: `<div title="${cfg.label}" style="background:${cfg.color};border:2.5px solid white;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 6px rgba(0,0,0,0.45);cursor:pointer;">${emoji}</div>`,
        className: "",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -18],
      });

      const popup = `<div style="min-width:120px">
        <div style="font-weight:600;font-size:13px">${poi.name ?? cfg.label}</div>
        ${poi.name ? `<div style="font-size:11px;color:#64748b;margin-top:2px">${cfg.label}</div>` : ""}
      </div>`;

      L.marker([poi.lat, poi.lon], { icon }).bindPopup(popup).addTo(poiLayer);
    }
  }, [mapReady, pois]);

  return <div ref={containerRef} className="h-full w-full" />;
}
