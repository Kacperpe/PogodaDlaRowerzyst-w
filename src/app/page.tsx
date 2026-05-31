"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPanel } from "@/components/map-panel";
import { AppNav, type AppTab } from "@/components/app-nav";
import { parseRouteFile } from "@/lib/geojson";
import { generateRouteIcs } from "@/lib/ics";
import type { RouteSegment } from "@/types/route-segment";
import type { WeatherPointForecast } from "@/types/weather-point-forecast";
import type { WeatherAlert, WeatherAlertKind } from "@/types/weather-alert";

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
    apparentTemperatureC: number | null;
    precipitationProbability: number | null;
    precipitationMm: number | null;
    rainMm: number | null;
    windKmh: number | null;
    windGustsKmh: number | null;
    weatherCode: number | null;
  };
};

const ALERT_KIND_CONFIG: Record<WeatherAlertKind, { emoji: string; label: string; color: string }> = {
  rain: { emoji: "🌧", label: "Deszcz",  color: "#f59e0b" },
  wind: { emoji: "💨", label: "Wiatr",   color: "#a78bfa" },
  cold: { emoji: "🥶", label: "Zimno",   color: "#22d3ee" },
  hot:  { emoji: "🌡", label: "Gorąco",  color: "#f87171" },
};

// ── Weather condition styling ────────────────────────────────────────────────

type ConditionMeta = { icon: string; label: string; rgb: readonly [number, number, number] };

function getConditionMeta(code: number | null): ConditionMeta {
  if (code === null) return { icon: "—",  label: "Brak danych",       rgb: [0,   0,   0  ] };
  if (code === 0)    return { icon: "☀️", label: "Słonecznie",         rgb: [0,   0,   0  ] };
  if (code <= 3)     return { icon: "⛅", label: "Zachmurzenie",       rgb: [0,   0,   0  ] };
  if (code <= 48)    return { icon: "🌫", label: "Mgła",               rgb: [107, 114, 128] };
  if (code <= 55)    return { icon: "🌦", label: "Mżawka",             rgb: [59,  130, 246] };
  if (code <= 57)    return { icon: "🌨", label: "Marznąca mżawka",    rgb: [6,   182, 212] };
  if (code <= 65)    return { icon: "🌧", label: "Deszcz",             rgb: [37,   99, 235] };
  if (code <= 67)    return { icon: "🌨", label: "Marznący deszcz",    rgb: [6,   182, 212] };
  if (code <= 77)    return { icon: "❄️", label: "Śnieg",              rgb: [139,  92, 246] };
  if (code <= 82)    return { icon: "🌧", label: "Przelotny deszcz",   rgb: [37,   99, 235] };
  if (code <= 86)    return { icon: "🌨", label: "Przelotny śnieg",    rgb: [139,  92, 246] };
  if (code >= 95)    return { icon: "⛈", label: "Burza",              rgb: [239,  68,  68] };
  return             { icon: "⛅", label: "Zmienne",             rgb: [0,   0,   0  ] };
}

// 0 = brak danych, 1 = możliwe (<33%), 2 = prawdopodobne (33-67%), 3 = pewne (>67%)
function precipShade(prob: number | null): 0 | 1 | 2 | 3 {
  if (prob === null) return 0;
  if (prob < 33) return 1;
  if (prob < 67) return 2;
  return 3;
}

function rowBackground(code: number | null, prob: number | null, windKmh: number | null): string {
  const wind = windKmh ?? 0;
  const { rgb } = getConditionMeta(code);
  const [r, g, b] = rgb;
  // Silny wiatr bez opadów
  if (wind > 50 && (code === null || code <= 3)) {
    const a = wind > 90 ? 0.28 : wind > 70 ? 0.18 : 0.10;
    return `rgba(139,92,246,${a})`;
  }
  // Brak koloru dla pogodnych/zachmurzonych
  if (r === 0 && g === 0 && b === 0) return "";
  const shade = precipShade(prob);
  const alpha = shade === 0 ? 0.07 : shade === 1 ? 0.11 : shade === 2 ? 0.22 : 0.38;
  return `rgba(${r},${g},${b},${alpha})`;
}

type ConfBadge = { pct: string; label: string; color: string };
function confidenceBadge(prob: number | null): ConfBadge {
  if (prob === null) return { pct: "—",      label: "",          color: "inherit"  };
  if (prob < 33)     return { pct: `${prob}%`, label: "możliwe",  color: "#f59e0b"  };
  if (prob < 67)     return { pct: `${prob}%`, label: "prawdop.", color: "#f97316"  };
  return             { pct: `${prob}%`, label: "pewne",    color: "#ef4444"  };
}

// ── Alert computation ────────────────────────────────────────────────────────

function computeWeatherAlerts(rows: WeatherPointForecast[]): WeatherAlert[] {
  return rows.reduce<WeatherAlert[]>((acc, row) => {
    const kinds: WeatherAlertKind[] = [];
    if ((row.precipitationProbability ?? 0) >= 40 || (row.rainMm ?? 0) > 0 || (row.precipitationMm ?? 0) > 0) kinds.push("rain");
    if ((row.windKmh ?? 0) >= 30) kinds.push("wind");
    if (row.temperatureC !== null && row.temperatureC < 8) kinds.push("cold");
    if (row.temperatureC !== null && row.temperatureC > 30) kinds.push("hot");
    if (kinds.length > 0) acc.push({ ...row, kinds });
    return acc;
  }, []);
}

function toDateTimeLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem("theme-mode") === "light" ? "light" : "dark";
}

function getMaxForecastDate() {
  return toDateTimeLocalInputValue(new Date(Date.now() + 16 * 24 * 60 * 60 * 1000));
}

function buildCheckpoints(source: RouteSegment[]) {
  if (source.length === 0) return [] as RouteSegment[];
  const intervalMinutes = 30;
  const endEta = source[source.length - 1].etaMinutesFromStart;
  const checkpoints: RouteSegment[] = [];
  const used = new Set<string>();
  for (let minute = intervalMinutes; minute <= endEta; minute += intervalMinutes) {
    const segment = source.find((s) => s.etaMinutesFromStart >= minute);
    if (segment && !used.has(segment.id)) { checkpoints.push(segment); used.add(segment.id); }
  }
  const finalSegment = source[source.length - 1];
  if (!used.has(finalSegment.id)) checkpoints.push(finalSegment);
  const maxPoints = 24;
  if (checkpoints.length <= maxPoints) return checkpoints;
  const stride = Math.ceil(checkpoints.length / maxPoints);
  const reduced: RouteSegment[] = [];
  for (let i = 0; i < checkpoints.length; i += stride) reduced.push(checkpoints[i]);
  const last = checkpoints[checkpoints.length - 1];
  if (reduced[reduced.length - 1]?.id !== last.id) reduced.push(last);
  return reduced;
}

export default function Home() {
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [averageSpeedKmh, setAverageSpeedKmh] = useState(20);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeStartAt, setRouteStartAt] = useState(() => toDateTimeLocalInputValue(new Date()));
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [forecastRows, setForecastRows] = useState<WeatherPointForecast[]>([]);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [maxForecastDate] = useState(getMaxForecastDate);

  useEffect(() => {
    const saved = window.localStorage.getItem("theme-mode");
    if (saved === "light") setThemeMode("light");
  }, []);
  const [activeTab, setActiveTab] = useState<AppTab>("map");

  const weatherAlerts = useMemo(() => computeWeatherAlerts(forecastRows), [forecastRows]);
  const isDark = themeMode === "dark";

  const computeRouteForecast = useCallback(async () => {
    if (segments.length === 0) return;
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
            lat, lon,
            plannedAtRouteTz,
            sampledAtRouteTz: data.sample.at,
            timezone: data.timezoneAbbr ? `${timezone} (${data.timezoneAbbr})` : timezone,
            temperatureC: data.sample.temperatureC,
            apparentTemperatureC: data.sample.apparentTemperatureC,
            precipitationProbability: data.sample.precipitationProbability,
            precipitationMm: data.sample.precipitationMm,
            rainMm: data.sample.rainMm,
            windKmh: data.sample.windKmh,
            windGustsKmh: data.sample.windGustsKmh,
            weatherCode: data.sample.weatherCode,
          } satisfies WeatherPointForecast;
        }),
      );
      setForecastRows(rows);
    } catch {
      setForecastError("Nie udalo sie pobrac prognozy dla trasy.");
    } finally {
      setForecastLoading(false);
    }
  }, [segments, routeStartAt]);

  useEffect(() => {
    if (segments.length === 0) return;
    const timer = setTimeout(() => { void computeRouteForecast(); }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computeRouteForecast]);

  function downloadCalendar() {
    if (forecastRows.length === 0) return;
    const ics = generateRouteIcs(forecastRows, routeStartAt, notifyEmail.trim() || undefined);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "trasa-pogoda.ics"; a.click();
    URL.revokeObjectURL(url);
  }

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

  // ── Shared style helpers ──────────────────────────────────────────────────
  const panelBorder = isDark ? "border-slate-700/80" : "border-slate-300/90";
  const panelBg     = isDark ? "bg-slate-950" : "bg-white";
  const labelCls    = isDark ? "block text-sm text-slate-300" : "block text-sm text-slate-700";
  const inputCls    = `mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ring-cyan-400/40 focus:ring ${isDark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-300 bg-white text-slate-900"}`;
  const errorCls    = `rounded-lg border px-3 py-2 text-xs ${isDark ? "border-rose-400/40 bg-rose-400/10 text-rose-200" : "border-rose-300 bg-rose-50 text-rose-700"}`;

  return (
    <div className={`relative h-screen w-screen overflow-hidden transition-colors duration-300 ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"}`}>

      {/* Map — always rendered; offset by sidebar on desktop */}
      <div className="absolute inset-0 md:left-16">
        <MapPanel
          segments={segments}
          themeMode={themeMode}
          weatherAlerts={weatherAlerts}
        />
      </div>

      {/* Content overlay: weather & settings tabs */}
      {activeTab !== "map" && (
        <div className={`fixed left-0 right-0 top-0 bottom-16 z-[1100] overflow-hidden border-r shadow-2xl
          md:left-16 md:right-auto md:bottom-0 md:w-96
          ${panelBg} ${panelBorder}`}>

          {/* ── WEATHER TAB ───────────────────────────────────────────────── */}
          {activeTab === "weather" && (
            <div className="flex flex-col h-full">
              <div className={`shrink-0 flex items-center gap-2 px-4 py-3 border-b ${panelBorder}`}>
                <span className="font-semibold">Prognoza pogody</span>
                {forecastLoading && <span className="text-xs opacity-60">ładuję...</span>}
              </div>

              {weatherAlerts.length > 0 && (
                <div className="shrink-0 px-4 py-2 flex flex-wrap gap-1.5">
                  {(["rain", "wind", "cold", "hot"] as WeatherAlertKind[]).map((kind) => {
                    const count = weatherAlerts.filter((a) => a.kinds.includes(kind)).length;
                    if (count === 0) return null;
                    const { emoji, label, color } = ALERT_KIND_CONFIG[kind];
                    return (
                      <span key={kind} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{ background: color + "22", color, border: `1px solid ${color}55` }}>
                        {emoji} {label} {count}×
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="flex-1 overflow-y-auto">
                {forecastError && <div className={`m-4 ${errorCls}`}>{forecastError}</div>}
                {forecastRows.length === 0 && !forecastLoading && !forecastError && (
                  <div className={`m-4 rounded-lg border px-4 py-8 text-center text-sm opacity-60 ${panelBorder}`}>
                    Wczytaj trasę w zakładce ⚙️ Trasa, aby zobaczyć prognozę.
                  </div>
                )}
                {forecastRows.length > 0 && (
                  <>
                    <table className="min-w-full text-xs">
                      <thead className={`sticky top-0 ${isDark ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-800"}`}>
                        <tr>
                          <th className="px-2 py-2 text-left whitespace-nowrap">Czas</th>
                          <th className="px-2 py-2 text-left whitespace-nowrap">Temp</th>
                          <th className="px-2 py-2 text-left whitespace-nowrap">Odcz.</th>
                          <th className="px-2 py-2 text-left whitespace-nowrap">Pewność</th>
                          <th className="px-2 py-2 text-left whitespace-nowrap">Deszcz</th>
                          <th className="px-2 py-2 text-left whitespace-nowrap">Wiatr</th>
                          <th className="px-2 py-2 text-left whitespace-nowrap">Porywy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecastRows.map((row) => {
                          const meta = getConditionMeta(row.weatherCode);
                          const bg   = rowBackground(row.weatherCode, row.precipitationProbability, row.windKmh);
                          const conf = confidenceBadge(row.precipitationProbability);
                          return (
                            <tr
                              key={row.segmentId + row.etaMinutes}
                              title={`${meta.label}${conf.label ? ` · ${conf.label} (${conf.pct})` : ""}`}
                              style={bg ? { background: bg } : undefined}
                              className={isDark ? "border-t border-slate-700/60" : "border-t border-slate-200"}
                            >
                              <td className="px-2 py-1.5 whitespace-nowrap">
                                <span className="mr-1">{meta.icon}</span>{row.plannedAtRouteTz}
                              </td>
                              <td className="px-2 py-1.5">{row.temperatureC ?? "—"}</td>
                              <td className="px-2 py-1.5">{row.apparentTemperatureC ?? "—"}</td>
                              <td className="px-2 py-1.5">
                                <span style={{ color: conf.color }} className="font-semibold">{conf.pct}</span>
                                {conf.label && <span className={`ml-1 text-[10px] ${isDark ? "opacity-60" : "opacity-50"}`}>{conf.label}</span>}
                              </td>
                              <td className="px-2 py-1.5">{row.rainMm ?? row.precipitationMm ?? "—"}</td>
                              <td className="px-2 py-1.5">{row.windKmh ?? "—"}</td>
                              <td className="px-2 py-1.5">{row.windGustsKmh ?? "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className={`px-3 py-2 text-[10px] opacity-50 border-t ${panelBorder}`}>
                      ☀️ słonecznie · ⛅ chmury · 🌫 mgła · 🌦 mżawka · 🌧 deszcz · ❄️ śnieg · ⛈ burza · 💨 wiatr
                      <br />
                      Kolor wiersza: jasny &lt;33% · średni 33–67% · ciemny &gt;67% pewności
                    </div>
                  </>
                )}
              </div>

              {forecastRows.length > 0 && (
                <div className={`shrink-0 border-t p-3 flex items-center gap-2 ${panelBorder}`}>
                  <input
                    type="email"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder="e-mail (opcjonalnie)"
                    className={`min-w-0 flex-1 rounded border px-2 py-1.5 text-xs outline-none ring-cyan-400/40 focus:ring ${isDark ? "border-slate-700 bg-slate-900 text-slate-200 placeholder-slate-600" : "border-slate-300 bg-white text-slate-800 placeholder-slate-400"}`}
                  />
                  <button type="button" onClick={downloadCalendar}
                    className={`shrink-0 rounded px-2 py-1.5 text-xs font-semibold transition-colors ${isDark ? "bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25" : "bg-cyan-100 text-cyan-800 hover:bg-cyan-200"}`}>
                    📅 Kalendarz
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── SETTINGS TAB ──────────────────────────────────────────────── */}
          {activeTab === "settings" && (
            <div className="h-full overflow-y-auto">
              <div className="p-4 space-y-4">
                <div className={`flex items-center justify-between pb-3 border-b ${panelBorder}`}>
                  <span className="font-semibold">Ustawienia trasy</span>
                  <button type="button" onClick={toggleTheme}
                    className={`rounded-md border px-2 py-1 text-xs font-semibold transition-colors ${isDark ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20" : "border-slate-400 bg-slate-200 text-slate-800 hover:bg-slate-300"}`}>
                    {isDark ? "☀️ Jasny" : "🌙 Ciemny"}
                  </button>
                </div>

                <label className={labelCls}>
                  Średnia prędkość (km/h)
                  <input type="number" min={5} max={60} step={1} value={averageSpeedKmh}
                    onChange={(e) => setAverageSpeedKmh(Number(e.target.value))}
                    className={inputCls} />
                </label>

                <label className={labelCls}>
                  Start trasy (data i godzina)
                  <input type="datetime-local" value={routeStartAt} max={maxForecastDate}
                    onChange={(e) => setRouteStartAt(e.target.value)}
                    className={inputCls} />
                </label>

                <label className={`block rounded-lg border p-3 text-sm ${isDark ? "border-slate-700 bg-slate-900/60 text-slate-300" : "border-slate-300 bg-slate-50 text-slate-700"}`}>
                  <span className={`mb-2 block font-medium ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                    Wczytaj trasę (GeoJSON / GPX)
                  </span>
                  <input
                    type="file"
                    accept=".geojson,.gpx,application/geo+json,application/json,application/gpx+xml"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleRouteUpload(f); }}
                    className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-2 file:text-xs file:font-semibold"
                  />
                </label>

                {DEMO_ROUTES.map((route) => (
                  <button key={route.file} type="button" onClick={() => void loadPublicRoute(route.file)}
                    className={`w-full rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${isDark ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20" : "border-slate-400 bg-slate-200 text-slate-800 hover:bg-slate-300"}`}>
                    {route.label}
                  </button>
                ))}

                {routeError && <div className={errorCls}>{routeError}</div>}
                {forecastError && <div className={errorCls}>{forecastError}</div>}

                {segments.length > 0 && (
                  <div className={`rounded-lg border px-3 py-2 text-xs ${isDark ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-emerald-300 bg-emerald-50 text-emerald-700"}`}>
                    Trasa wczytana · {segments.length} segmentów
                    {forecastLoading && <span className="opacity-70"> · przeliczam prognozę...</span>}
                    {!forecastLoading && forecastRows.length > 0 && <span> · prognoza gotowa ⛅</span>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <AppNav activeTab={activeTab} onTabChange={setActiveTab} isDark={isDark} alertCount={weatherAlerts.length} />
    </div>
  );
}
