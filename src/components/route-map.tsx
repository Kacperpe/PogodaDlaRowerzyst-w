"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { WeatherPointForecast } from "@/types/weather-point-forecast";
import type { Poi, PoiCategory } from "@/types/poi";
import { POI_CONFIG } from "@/types/poi";

type LatLng = [number, number];

type RouteMapProps = {
  points: LatLng[];
  themeMode: "dark" | "light";
  rainAlerts: WeatherPointForecast[];
  pois: Poi[];
};

const POI_EMOJI: Record<PoiCategory, string> = {
  restaurant:    "🍴",
  accommodation: "🛏",
  toilet:        "🚻",
  campsite:      "⛺",
  attraction:    "🏛",
  shop:          "🛒",
  water:         "💧",
};

function createPoiIcon(category: PoiCategory): L.DivIcon {
  const { color, label } = POI_CONFIG[category];
  const emoji = POI_EMOJI[category];
  return L.divIcon({
    html: `<div title="${label}" style="background:${color};border:2.5px solid white;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 6px rgba(0,0,0,0.45);cursor:pointer;">${emoji}</div>`,
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  });
}

const ALL_POI_CATEGORIES: PoiCategory[] = [
  "restaurant", "accommodation", "toilet", "campsite", "attraction", "shop", "water",
];

function FitToRoute({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(points, { padding: [36, 36] });
  }, [map, points]);
  return null;
}

export function RouteMap({ points, themeMode, rainAlerts, pois }: RouteMapProps) {
  const isDark = themeMode === "dark";
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution = isDark
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  const poiIcons = useMemo(
    () => Object.fromEntries(ALL_POI_CATEGORIES.map((cat) => [cat, createPoiIcon(cat)])) as Record<PoiCategory, L.DivIcon>,
    [],
  );

  return (
    <MapContainer center={[52.2297, 21.0122]} zoom={7} className="h-full w-full" scrollWheelZoom>
      <TileLayer attribution={attribution} url={tileUrl} />

      {points.length > 0 ? (
        <>
          <Polyline positions={points} pathOptions={{ color: "#22d3ee", weight: 4 }} />
          <CircleMarker center={points[0]} radius={7} pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.95 }}>
            <Tooltip permanent direction="top" offset={[0, -10]}>START</Tooltip>
          </CircleMarker>
          <CircleMarker center={points[points.length - 1]} radius={7} pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.95 }}>
            <Tooltip permanent direction="top" offset={[0, -10]}>KONIEC</Tooltip>
          </CircleMarker>

          {rainAlerts.map((alert) => (
            <CircleMarker
              key={`${alert.segmentId}-${alert.etaMinutes}`}
              center={[alert.lat, alert.lon]}
              radius={8}
              pathOptions={{ color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.95 }}
            >
              <Tooltip direction="top" offset={[0, -10]}>
                {`Ostrzezenie deszczu: ${alert.segmentId} | ETA ${alert.etaMinutes} min | opad ${alert.rainMm ?? alert.precipitationMm ?? "-"} mm | prawd. ${alert.precipitationProbability ?? "-"}%`}
              </Tooltip>
            </CircleMarker>
          ))}

          {pois.map((poi) => {
            const cfg = POI_CONFIG[poi.category];
            return (
              <Marker key={poi.id} position={[poi.lat, poi.lon]} icon={poiIcons[poi.category]}>
                <Popup>
                  <div style={{ minWidth: 120 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{poi.name ?? cfg.label}</div>
                    {poi.name ? <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{cfg.label}</div> : null}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          <FitToRoute points={points} />
        </>
      ) : null}
    </MapContainer>
  );
}
