import React, { useEffect, useState } from "react";
import { apiHealth, getLandHealth } from "../services/api";
import type { LandHealthResponse } from "../types";
import { useParcel } from "../state/ParcelContext";
import { RequireParcel } from "../components/RequireParcel";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorBanner } from "../components/ErrorBanner";

export function DataSourcesPage() {
  const { parcel } = useParcel();
  const parcel_id = parcel?.parcel_id ?? null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [healthMode, setHealthMode] = useState<string>("mock");
  const [landHealth, setLandHealth] = useState<LandHealthResponse | null>(null);

  useEffect(() => {
    if (!parcel_id) return;
    setLoading(true);
    setError(null);
    Promise.all([apiHealth(), getLandHealth(parcel_id)])
      .then(([h, lh]) => {
        setHealthMode(h.mode ?? "mock");
        setLandHealth(lh);
      })
      .catch((e) => setError(e?.message ? String(e.message) : "Failed to load traces"))
      .finally(() => setLoading(false));
  }, [parcel_id]);

  return (
    <RequireParcel>
      <div className="space-y-4">
        {loading ? <LoadingSpinner label="Loading data source traces..." /> : null}
        {error ? <ErrorBanner message={error} /> : null}

        {landHealth ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Data sources / logs</div>
                <div className="mt-1 text-sm text-zinc-300">
                  Mode: <span className="font-semibold text-zinc-100">{healthMode}</span>
                </div>
              </div>
              <div className="text-xs text-zinc-400">
                FR-18..FR-23 and FR-34..FR-38 are computed in backend with mock fallbacks.
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-semibold">Latest land-health traces</div>
              <div className="mt-2 space-y-2">
                {landHealth.data_traces.map((t, idx) => (
                  <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                    <div className="text-sm font-semibold">{t.source}</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {new Date(t.timestamp_iso).toLocaleString()} • mode: {t.mode ?? "mock"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="text-sm font-semibold">Model runs</div>
              <div className="mt-2 text-sm text-zinc-300 leading-relaxed">
                Run history + model metadata endpoints are planned next (e.g. `/api/runs`, `/api/models/compare`).
                This page is already designed to show per-run timestamps and traces once exposed.
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </RequireParcel>
  );
}

