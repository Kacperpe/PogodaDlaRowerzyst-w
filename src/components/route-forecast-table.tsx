import type { ForecastPoint } from "@/types/forecast-point";

type Props = {
  forecast: ForecastPoint[];
  isLoading: boolean;
};

function precipColor(mm: number) {
  if (mm > 5) return "bg-rose-500";
  if (mm > 2) return "bg-orange-500";
  if (mm > 0.5) return "bg-amber-400";
  return "bg-emerald-400";
}

function rowBg(mm: number) {
  if (mm > 5) return "bg-rose-50/60 dark:bg-rose-900/10";
  if (mm > 2) return "bg-orange-50/60 dark:bg-orange-900/10";
  if (mm > 0.5) return "bg-amber-50/60 dark:bg-amber-900/10";
  return "";
}

function conditionIcon(weatherCode: number, precipitation: number): string {
  if (weatherCode >= 95) return "⛈";
  if (weatherCode >= 80) return "🌧";
  if (weatherCode >= 71) return "❄️";
  if (weatherCode >= 51) return "🌦";
  if (weatherCode >= 45) return "🌫";
  if (weatherCode >= 1) return "⛅";
  if (precipitation > 0) return "🌦";
  return "☀️";
}

export function RouteForecastTable({ forecast, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-3">
        <div className="h-5 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/60" />
      </div>
    );
  }

  if (forecast.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden">
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800 sm:px-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Prognoza wzdłuż trasy
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Próbkowanie co ~5 km · {forecast.length} punktów
        </p>
      </div>

      {/* Header — hidden on mobile */}
      <div className="hidden sm:grid sm:grid-cols-[4rem_4rem_1fr_10rem] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 sm:px-5">
        {["Km", "Godz.", "Warunki", "Opady"].map((h) => (
          <span key={h} className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {h}
          </span>
        ))}
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {forecast.map((point) => {
          const icon = conditionIcon(point.weatherCode, point.precipitationMm);
          const pct = Math.min(100, (point.precipitationMm / 10) * 100);
          const color = precipColor(point.precipitationMm);
          const bg = rowBg(point.precipitationMm);

          return (
            <div
              key={point.segmentId}
              className={`flex items-center gap-2 px-4 py-3 sm:grid sm:grid-cols-[4rem_4rem_1fr_10rem] sm:gap-0 sm:px-5 ${bg}`}
            >
              {/* Icon — mobile only */}
              <span className="text-lg sm:hidden">{icon}</span>

              {/* Km */}
              <span className="tabular-nums text-sm font-medium text-slate-700 dark:text-slate-300">
                {point.distanceKmFromStart} km
              </span>

              {/* Time */}
              <span className="tabular-nums text-sm text-slate-500 dark:text-slate-400">
                {point.arrivalTime}
              </span>

              {/* Condition — icon+text on desktop, hidden on mobile (icon already shown) */}
              <span className="hidden sm:flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span>{icon}</span>
                {point.condition}
              </span>

              {/* Precip */}
              <div className="ml-auto flex items-center gap-2 sm:ml-0">
                <div className="hidden sm:block h-2 w-16 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                </div>
                <span className={`tabular-nums text-sm ${point.precipitationMm > 0.5 ? "font-semibold text-slate-800 dark:text-slate-200" : "text-slate-500 dark:text-slate-400"}`}>
                  {point.precipitationMm.toFixed(1)}<span className="text-xs font-normal"> mm/h</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
