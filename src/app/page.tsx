"use client";

import { useEffect, useState } from "react";
import { AlertsPanel } from "@/components/alerts-panel";
import { MapPanel } from "@/components/map-panel";
import { parseRouteGeoJson } from "@/lib/geojson";
import type { RouteSegment } from "@/types/route-segment";
import type { WeatherAlert } from "@/types/weather-alert";

export default function Home() {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [averageSpeedKmh, setAverageSpeedKmh] = useState(20);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAlerts() {
      try {
        const response = await fetch("/api/alerts");
        if (!response.ok) {
          throw new Error("Nie udało się pobrać alertów.");
        }
        const data = (await response.json()) as { alerts: WeatherAlert[] };
        setAlerts(data.alerts);
      } catch {
        setError("Błąd pobierania alertów.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadAlerts();
  }, []);

  async function handleRouteUpload(file: File) {
    try {
      const text = await file.text();
      const parsedSegments = parseRouteGeoJson(text, averageSpeedKmh);
      setSegments(parsedSegments);
      setRouteError(null);
    } catch {
      setSegments([]);
      setRouteError(
        "Nie udało się odczytać trasy. Użyj poprawnego GeoJSON (LineString).",
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-14 md:px-10">
        <header className="space-y-4">
          <p className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-300">
            MVP Weather Alerts
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
            Mapa pogody dla rowerzystów w trasie
          </h1>
          <p className="max-w-2xl text-base text-slate-300 md:text-lg">
            Aplikacja ostrzega o deszczu na aktualnej trasie i podpowiada objazd
            albo zmianę godziny przejazdu.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-sm font-semibold text-cyan-300">1. Trasa</h2>
            <p className="mt-2 text-sm text-slate-300">
              Dodaj trasę ręcznie lub importuj plik.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-sm font-semibold text-cyan-300">2. Monitoring</h2>
            <p className="mt-2 text-sm text-slate-300">
              System sprawdza segment trasy, czas dojazdu i prognozę opadów.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-sm font-semibold text-cyan-300">3. Alert</h2>
            <p className="mt-2 text-sm text-slate-300">
              Otrzymujesz ostrzeżenie na mapie z punktem ryzyka.
            </p>
          </article>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4">
            <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="mb-3 text-base font-semibold">Parametry przejazdu</h2>
              <label className="block text-sm text-slate-300">
                Średnia prędkość (km/h)
                <input
                  type="number"
                  min={5}
                  max={60}
                  step={1}
                  value={averageSpeedKmh}
                  onChange={(event) => setAverageSpeedKmh(Number(event.target.value))}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-400/40 focus:ring"
                />
              </label>
              <p className="mt-2 text-xs text-slate-400">
                Po zmianie prędkości wczytaj trasę ponownie, aby przeliczyć ETA.
              </p>
            </article>

            <MapPanel
              segments={segments}
              onUpload={handleRouteUpload}
              routeError={routeError}
            />
          </div>
          {isLoading ? (
            <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-300">
              Ładowanie alertów...
            </aside>
          ) : error ? (
            <aside className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-5 text-sm text-rose-200">
              {error}
            </aside>
          ) : (
            <AlertsPanel alerts={alerts} />
          )}
        </section>

        <section className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5">
          <p className="text-sm font-medium text-emerald-200">
            Następny krok: podpiąć import trasy, dane pogodowe i wyliczanie ETA per
            segment.
          </p>
        </section>
      </main>
    </div>
  );
}
