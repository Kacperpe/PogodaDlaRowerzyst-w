import type { WeatherAlert } from "@/types/weather-alert";

type AlertsPanelProps = {
  alerts: WeatherAlert[];
};

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  return (
    <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="mb-4 text-base font-semibold">Alerty na trasie</h2>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <article
            key={alert.id}
            className="rounded-xl border border-slate-700 bg-slate-950/60 p-3"
          >
            <p className="text-xs font-semibold text-cyan-300">{alert.id}</p>
            <p className="mt-1 text-sm text-slate-200">
              {alert.segment} • ETA {alert.eta}
            </p>
            <p className="mt-1 text-xs text-amber-300">{alert.severity}</p>
            <p className="mt-2 text-xs text-slate-300">
              Rekomendacja: {alert.recommendation}
            </p>
          </article>
        ))}
      </div>
    </aside>
  );
}
