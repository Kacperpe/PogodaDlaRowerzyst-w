"use client";

import { useEffect, useState } from "react";
import { MapPanel } from "@/components/map-panel";
import { parseRouteFile } from "@/lib/geojson";
import type { RouteSegment } from "@/types/route-segment";
import type { WeatherPointForecast } from "@/types/weather-point-forecast";

const DEMO_ROUTES: { label: string; file: string }[] = [];

type ThemeMode = "dark" | "light";

type WeatherPointResponse = {
  ok?: boolean;
  error?: string;
  timezone?: string | null;
  timezoneAbbr?: string | null;
  sample?: {
    at: string;
    temperatureC: number | null;
    precipitationProbability: number | null;
    precipitationMm: number | null;
    rainMm: number | null;
    windKmh: number | null;
  };
};

function toDateTimeLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
}

export default function Home() {
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [averageSpeedKmh, setAverageSpeedKmh] = useState(20);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [weatherTestLoading, setWeatherTestLoading] = useState(false);
  const [weatherTestResult, setWeatherTestResult] = useState<string | null>(null);
  const [routeStartAt, setRouteStartAt] = useState(() => toDateTimeLocalInputValue(new Date()));
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [forecastRows, setForecastRows] = useState<WeatherPointForecast[]>([]);
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("theme-mode");
    if (saved === "light") setThemeMode("light");
  }, []);

  useEffect(() => {
    if (segments.length === 0) return;
    const baseDate = new Date(routeStartAt);
    if (Number.isNaN(baseDate.getTime())) return;
    const timer = setTimeout(() => { void computeRouteForecast(); }, 300);
    return () => clearTimeout(timer);
    // computeRouteForecast jest świeże przez closure każdego renderu — pominięte celowo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, routeStartAt]);

  function toggleTheme() {
    setThemeMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem("theme-mode", next);
      return next;
    });
  }

  async function parseAndSetRoute(raw: string, filename: string) {
    try {
      const parsedSegments = parseRouteFile(raw, filename, averageSpeedKmh);
      setSegments(parsedSegments);
      setRouteError(null);
      setForecastRows([]);
      setForecastError(null);
    } catch {
      setSegments([]);
      setRouteError("Nie udalo sie odczytac trasy. Uzyj poprawnego GeoJSON albo GPX.");
    }
  }

  async function handleRouteUpload(file: File) {
    const text = await file.text();
    await parseAndSetRoute(text, file.name);
  }

  async function loadPublicRoute(filename: string) {
    try {
      const response = await fetch(`/${filename}`);
      if (!response.ok) throw new Error("Brak pliku");
      const raw = await response.text();
      await parseAndSetRoute(raw, filename);
    } catch {
      setSegments([]);
      setRouteError(`Nie udalo sie wczytac pliku z public: ${filename}`);
    }
  }

  async function testWeatherApi() {
    setWeatherTestLoading(true);
    setWeatherTestResult(null);
    try {
      const response = await fetch("/api/weather/test", { cache: "no-store" });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        current?: {
          temperature_2m?: number;
          precipitation?: number;
          rain?: number;
          wind_speed_10m?: number;
        };
      };

      if (!response.ok || !data.ok) {
        setWeatherTestResult(`API weather: BLAD (${response.status}) ${data.error ?? "nieznany blad"}`);
        return;
      }

      setWeatherTestResult(
        `API weather: OK | temp=${data.current?.temperature_2m ?? "-"}C, rain=${data.current?.rain ?? "-"}, precip=${data.current?.precipitation ?? "-"}, wind=${data.current?.wind_speed_10m ?? "-"} km/h`,
      );
    } catch {
      setWeatherTestResult("API weather: BLAD polaczenia z endpointem.");
    } finally {
      setWeatherTestLoading(false);
    }
  }

  function buildCheckpoints(source: RouteSegment[]) {
    if (source.length === 0) return [] as RouteSegment[];

    const intervalMinutes = 30;
    const endEta = source[source.length - 1].etaMinutesFromStart;
    const checkpoints: RouteSegment[] = [];
    const used = new Set<string>();

    for (let minute = intervalMinutes; minute <= endEta; minute += intervalMinutes) {
      const segment = source.find((s) => s.etaMinutesFromStart >= minute);
      if (segment && !used.has(segment.id)) {
        checkpoints.push(segment);
        used.add(segment.id);
      }
    }

    const finalSegment = source[source.length - 1];
    if (!used.has(finalSegment.id)) checkpoints.push(finalSegment);

    const maxPoints = 24;
    if (checkpoints.length <= maxPoints) return checkpoints;

    const stride = Math.ceil(checkpoints.length / maxPoints);
    const reduced: RouteSegment[] = [];
    for (let i = 0; i < checkpoints.length; i += stride) {
      reduced.push(checkpoints[i]);
    }
    const last = checkpoints[checkpoints.length - 1];
    if (reduced[reduced.length - 1]?.id !== last.id) reduced.push(last);
    return reduced;
  }

  async function computeRouteForecast() {
    if (segments.length === 0) {
      setForecastError("Najpierw wczytaj trase.");
      return;
    }

    const baseDate = new Date(routeStartAt);
    if (Number.isNaN(baseDate.getTime())) {
      setForecastError("Podaj poprawna date i godzine startu.");
      return;
    }

    const checkpoints = buildCheckpoints(segments);
    if (checkpoints.length === 0) {
      setForecastError("Brak punktow kontrolnych do prognozy.");
      return;
    }

    setForecastLoading(true);
    setForecastError(null);
    setForecastRows([]);

    try {
      const rows = await Promise.all(
        checkpoints.map(async (segment) => {
          const plannedTime = new Date(baseDate.getTime() + segment.etaMinutesFromStart * 60_000);
          const lat = segment.to[1];
          const lon = segment.to[0];
          const query = new URLSearchParams({ lat: String(lat), lon: String(lon), time: plannedTime.toISOString() });
          const response = await fetch(`/api/weather/point?${query.toString()}`, { cache: "no-store" });
          const data = (await response.json()) as WeatherPointResponse;

          if (!response.ok || !data.ok || !data.sample) {
            throw new Error(data.error ?? `Blad punktu ${segment.id}`);
          }

          const timezone = data.timezone ?? "UTC";
          const plannedAtRouteTz = new Intl.DateTimeFormat("pl-PL", {
            dateStyle: "short",
            timeStyle: "short",
            timeZone: timezone,
          }).format(plannedTime);

          return {
            segmentId: segment.id,
            etaMinutes: segment.etaMinutesFromStart,
            lat,
            lon,
            plannedAtRouteTz,
            sampledAtRouteTz: data.sample.at,
            timezone: data.timezoneAbbr
              ? `${timezone} (${data.timezoneAbbr})`
              : timezone,
            temperatureC: data.sample.temperatureC,
            precipitationProbability: data.sample.precipitationProbability,
            precipitationMm: data.sample.precipitationMm,
            rainMm: data.sample.rainMm,
            windKmh: data.sample.windKmh,
          } satisfies WeatherPointForecast;
        }),
      );

      setForecastRows(rows);
    } catch {
      setForecastError("Nie udalo sie pobrac prognozy dla trasy.");
    } finally {
      setForecastLoading(false);
    }
  }

  const isDark = themeMode === "dark";

  return (
    <div className={`relative h-screen w-screen overflow-hidden transition-colors duration-300 ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"}`}>
      <MapPanel segments={segments} themeMode={themeMode} forecastRows={forecastRows} />

      <header className="pointer-events-none absolute inset-x-0 top-3 z-[1200] flex justify-center px-3 md:px-6">
        <details className={`pointer-events-auto group w-full max-w-5xl overflow-hidden rounded-xl border shadow-2xl backdrop-blur transition-colors duration-300 ${isDark ? "border-slate-700/80 bg-slate-950/92" : "border-slate-300/90 bg-white/92"}`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold md:px-6">
            <span>Ustawienia trasy i pogody</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={toggleTheme} className={`rounded-md border px-2 py-1 text-xs font-semibold transition-colors ${isDark ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20" : "border-slate-400 bg-slate-200 text-slate-800 hover:bg-slate-300"}`}>
                {isDark ? "Tryb jasny" : "Tryb ciemny"}
              </button>
              <span className={isDark ? "text-xs text-cyan-300" : "text-xs text-slate-600"}>Rozwin</span>
            </div>
          </summary>

          <div className={`grid gap-4 border-t px-4 py-4 md:grid-cols-2 md:px-6 ${isDark ? "border-slate-700/70" : "border-slate-300"}`}>
            <label className={isDark ? "block text-sm text-slate-300" : "block text-sm text-slate-700"}>
              Srednia predkosc (km/h)
              <input type="number" min={5} max={60} step={1} value={averageSpeedKmh} onChange={(event) => setAverageSpeedKmh(Number(event.target.value))} className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-cyan-400/40 focus:ring ${isDark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-300 bg-white text-slate-900"}`} />
            </label>

            <label className={isDark ? "block text-sm text-slate-300" : "block text-sm text-slate-700"}>
              Start trasy (data i godzina)
              <input type="datetime-local" value={routeStartAt} onChange={(event) => setRouteStartAt(event.target.value)} className={`mt-2 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-cyan-400/40 focus:ring ${isDark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-300 bg-white text-slate-900"}`} />
            </label>

            <label className={`block rounded-lg border p-3 text-sm ${isDark ? "border-slate-700 bg-slate-900/60 text-slate-300" : "border-slate-300 bg-white/80 text-slate-700"}`}>
              <span className={isDark ? "mb-2 block font-medium text-slate-200" : "mb-2 block font-medium text-slate-800"}>Wczytaj trase (GeoJSON/GPX)</span>
              <input type="file" accept=".geojson,.gpx,application/geo+json,application/json,application/gpx+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleRouteUpload(file); }} className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-2 file:text-xs file:font-semibold" />
            </label>

            <div className="md:col-span-2 flex flex-wrap gap-2">
              {DEMO_ROUTES.map((route) => (
                <button key={route.file} type="button" onClick={() => void loadPublicRoute(route.file)} className={`rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${isDark ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20" : "border-slate-400 bg-slate-200 text-slate-800 hover:bg-slate-300"}`}>
                  Testuj z public: {route.label}
                </button>
              ))}
              <button type="button" onClick={() => void testWeatherApi()} disabled={weatherTestLoading} className={`rounded-md border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${isDark ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20" : "border-emerald-400 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"}`}>
                {weatherTestLoading ? "Testuje API pogody..." : "Testuj API pogody"}
              </button>
            </div>

            {routeError ? <div className={`md:col-span-2 rounded-lg border px-3 py-2 text-xs ${isDark ? "border-rose-400/40 bg-rose-400/10 text-rose-200" : "border-rose-300 bg-rose-50 text-rose-700"}`}>{routeError}</div> : null}
            {weatherTestResult ? <div className={`md:col-span-2 rounded-lg border px-3 py-2 text-xs ${isDark ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-emerald-300 bg-emerald-50 text-emerald-800"}`}>{weatherTestResult}</div> : null}
            {forecastError ? <div className={`md:col-span-2 rounded-lg border px-3 py-2 text-xs ${isDark ? "border-rose-400/40 bg-rose-400/10 text-rose-200" : "border-rose-300 bg-rose-50 text-rose-700"}`}>{forecastError}</div> : null}

            {(forecastRows.length > 0 || forecastLoading) ? (
              <div className={`md:col-span-2 rounded-lg border ${isDark ? "border-slate-700" : "border-slate-300"}`}>
                <div className={`px-2 py-1.5 text-xs font-semibold ${isDark ? "bg-slate-800/80 text-slate-200" : "bg-slate-200 text-slate-800"}`}>
                  Prognoza pogody na trasie
                  {forecastLoading && <span className="ml-2 font-normal opacity-60">liczę...</span>}
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
                  <table className="min-w-full text-xs">
                    <thead className={`sticky top-0 ${isDark ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-800"}`}>
                      <tr>
                        <th className="px-2 py-2 text-left whitespace-nowrap">Segment</th>
                        <th className="px-2 py-2 text-left whitespace-nowrap">Plan startu</th>
                        <th className="px-2 py-2 text-left whitespace-nowrap">Temp (°C)</th>
                        <th className="px-2 py-2 text-left whitespace-nowrap">Opad %</th>
                        <th className="px-2 py-2 text-left whitespace-nowrap">Deszcz mm</th>
                        <th className="px-2 py-2 text-left whitespace-nowrap">Wiatr km/h</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecastRows.map((row) => (
                        <tr key={row.segmentId + row.etaMinutes} className={isDark ? "border-t border-slate-700" : "border-t border-slate-300"}>
                          <td className="px-2 py-1.5">{row.segmentId}</td>
                          <td className="px-2 py-1.5 whitespace-nowrap">{row.plannedAtRouteTz}</td>
                          <td className="px-2 py-1.5">{row.temperatureC ?? "-"}</td>
                          <td className="px-2 py-1.5">{row.precipitationProbability ?? "-"}</td>
                          <td className="px-2 py-1.5">{row.rainMm ?? row.precipitationMm ?? "-"}</td>
                          <td className="px-2 py-1.5">{row.windKmh ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </details>
      </header>
    </div>
  );
}
