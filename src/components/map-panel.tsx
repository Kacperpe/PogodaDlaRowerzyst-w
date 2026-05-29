import type { RouteSegment } from "@/types/route-segment";

type MapPanelProps = {
  segments: RouteSegment[];
  onUpload: (file: File) => void;
  routeError: string | null;
};

export function MapPanel({ segments, onUpload, routeError }: MapPanelProps) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Trasa i segmenty</h2>
        <span className="text-xs text-slate-400">Upload GeoJSON</span>
      </div>

      <label className="mb-4 block rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-300">
        <span className="mb-2 block font-medium text-slate-200">Wczytaj trasę</span>
        <input
          type="file"
          accept=".geojson,application/geo+json,application/json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
          }}
          className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500/20 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-cyan-200 hover:file:bg-cyan-500/30"
        />
      </label>

      {routeError ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">
          {routeError}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
        {segments.length === 0 ? (
          <p className="text-sm text-slate-400">
            Brak segmentów. Wczytaj plik GeoJSON z linią trasy.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-emerald-200">
              Wczytano segmentów: {segments.length}
            </p>
            <div className="max-h-56 space-y-2 overflow-auto pr-1">
              {segments.slice(0, 12).map((segment) => (
                <div
                  key={segment.id}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs text-slate-300"
                >
                  <p className="font-semibold text-cyan-300">{segment.id}</p>
                  <p>
                    {segment.from[1].toFixed(4)}, {segment.from[0].toFixed(4)} →{" "}
                    {segment.to[1].toFixed(4)}, {segment.to[0].toFixed(4)}
                  </p>
                  <p>Dystans: {segment.distanceKm} km</p>
                  <p>ETA od startu: {segment.etaMinutesFromStart} min</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
