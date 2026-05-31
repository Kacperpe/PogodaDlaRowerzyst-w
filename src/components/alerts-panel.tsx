import type { WeatherAlert } from "@/types/weather-alert";

const SEVERITY_CONFIG: Record<
  WeatherAlert["severity"],
  { label: string; icon: string; row: string; badge: string }
> = {
  high: {
    label: "Silne opady",
    icon: "⛈",
    row: "border-rose-200 bg-rose-50 dark:border-rose-400/30 dark:bg-rose-400/10",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-400/20 dark:text-rose-300",
  },
  medium: {
    label: "Umiarkowane opady",
    icon: "🌧",
    row: "border-orange-200 bg-orange-50 dark:border-orange-400/30 dark:bg-orange-400/10",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-400/20 dark:text-orange-300",
  },
  low: {
    label: "Słabe opady",
    icon: "🌦",
    row: "border-amber-200 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-400/10",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300",
  },
};

const SEVERITY_ORDER: WeatherAlert["severity"][] = ["high", "medium", "low"];

type AlertsPanelProps = {
  alerts: WeatherAlert[];
  isLoading: boolean;
};

export function AlertsPanel({ alerts, isLoading }: AlertsPanelProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-3">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/60" />
        ))}
      </div>
    );
  }

  const sorted = [...alerts].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );

  const highCount = alerts.filter((a) => a.severity === "high").length;
  const mediumCount = alerts.filter((a) => a.severity === "medium").length;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Ostrzeżenia przed trasą
        </h2>
        {alerts.length === 0 ? (
          <span className="rounded-full bg-emerald-100 dark:bg-emerald-400/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            Brak zagrożeń
          </span>
        ) : (
          <span className="rounded-full bg-rose-100 dark:bg-rose-400/20 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
            {alerts.length} {alerts.length === 1 ? "alert" : "alertów"}
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Prognoza nie wskazuje opadów na tej trasie. Dobrej jazdy!
        </p>
      ) : (
        <>
          {(highCount > 0 || mediumCount > 0) && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-400/30 bg-rose-50 dark:bg-rose-400/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
              {highCount > 0 && (
                <span className="font-semibold">{highCount} silne zagrożenie{highCount > 1 ? "a" : ""} </span>
              )}
              {highCount > 0 && mediumCount > 0 && "i "}
              {mediumCount > 0 && (
                <span>{mediumCount} umiarkowane na trasie</span>
              )}
              {highCount > 0 && mediumCount === 0 && "na trasie — rozważ zmianę godziny wyjazdu."}
            </div>
          )}

          <div className="space-y-2">
            {sorted.map((alert) => {
              const cfg = SEVERITY_CONFIG[alert.severity];
              const etaH = Math.floor(alert.etaMinutesFromStart / 60);
              const etaM = alert.etaMinutesFromStart % 60;
              const etaLabel = etaH > 0 ? `${etaH}h ${etaM}min` : `${etaM} min`;

              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${cfg.row}`}
                >
                  <span className="text-xl leading-none mt-0.5">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        za {etaLabel} od startu
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                      {alert.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {alert.precipitationMm.toFixed(1)} mm/h
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
