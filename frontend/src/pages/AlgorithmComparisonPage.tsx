import React, { useEffect, useMemo, useState } from "react";
import { useParcel } from "../state/ParcelContext";
import { RequireParcel } from "../components/RequireParcel";
import { ErrorBanner } from "../components/ErrorBanner";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { getModelComparison, setActiveModel, trainModels } from "../services/api";
import type { ModelCompareResponse } from "../types";

const ALGORITHMS = [
  "Random Forest",
  "XGBoost",
  "LightGBM",
  "CatBoost",
  "MLP / Neural Network",
  "Linear Regression",
] as const;

export function AlgorithmComparisonPage() {
  const { parcel } = useParcel();
  const parcel_id = parcel?.parcel_id ?? null;
  const [active, setActive] = useState<string>("Random Forest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compare, setCompare] = useState<ModelCompareResponse | null>(null);

  useEffect(() => {
    if (!parcel_id) return;
    setLoading(true);
    setError(null);
    getModelComparison()
      .then((d) => {
        setCompare(d);
        if (d.active_algorithm) setActive(d.active_algorithm);
      })
      .catch((e) => setError(e?.message ? String(e.message) : "Failed to load comparison"))
      .finally(() => setLoading(false));
  }, [parcel_id]);

  const sorted = useMemo(() => {
    if (!compare) return [];
    return [...compare.results].sort((a, b) => (b.best_overall_score ?? -1) - (a.best_overall_score ?? -1));
  }, [compare]);

  if (!parcel_id) {
    return (
      <RequireParcel>
        <div />
      </RequireParcel>
    );
  }

  return (
    <RequireParcel>
      <div className="space-y-4">
        {loading ? <LoadingSpinner label="Training/evaluating models..." /> : null}
        {error ? <ErrorBanner message={error} title="Algorithm comparison error" /> : null}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5 shadow-soft">
          <div className="text-sm font-semibold">Active production algorithm</div>
          <div className="mt-2 text-sm text-zinc-300">
            Select which algorithm should be used for valuation/health computations.
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {ALGORITHMS.map((a) => (
              <label
                key={a}
                className={[
                  "flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3",
                  active === a ? "border-zinc-700 bg-zinc-950/40" : "border-zinc-800 bg-zinc-950/20 hover:bg-zinc-950/30",
                ].join(" ")}
              >
                <span className="text-sm font-semibold text-zinc-100">{a}</span>
                <input
                  type="radio"
                  checked={active === a}
                  onChange={async () => {
                    setActive(a);
                    try {
                      const resp = await setActiveModel(a);
                      setCompare(resp);
                    } catch {
                      // ignore optimistic UI rollback for now
                    }
                  }}
                />
              </label>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-xs text-zinc-400">
              Run ID: <span className="font-mono">{compare?.run_id ?? "—"}</span>
            </div>
            <button
              className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm hover:bg-zinc-950/70"
              onClick={async () => {
                if (!parcel_id) return;
                setLoading(true);
                setError(null);
                try {
                  const d = await trainModels(parcel_id, 600, 42);
                  setCompare(d);
                  if (d.active_algorithm) setActive(d.active_algorithm);
                } catch (e: any) {
                  setError(e?.message ? String(e.message) : "Training failed");
                } finally {
                  setLoading(false);
                }
              }}
            >
              Train / Refresh metrics
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">Performance comparison</div>
            <div className="text-xs text-zinc-400">
              Winner: <span className="font-semibold text-zinc-100">{compare?.winner ?? "—"}</span>
            </div>
          </div>

          <div className="mt-4 overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-400">
                  <th className="pb-2 pr-4">Algorithm</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">RMSE</th>
                  <th className="pb-2 pr-4">MAE</th>
                  <th className="pb-2 pr-4">R2</th>
                  <th className="pb-2 pr-4">Runtime (ms)</th>
                  <th className="pb-2 pr-4">Latency (ms)</th>
                  <th className="pb-2 pr-4">Confidence</th>
                  <th className="pb-2 pr-4">Best Overall</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.algorithm} className="border-t border-zinc-800/70">
                    <td className="py-2 pr-4 font-semibold">{r.algorithm}</td>
                    <td className="py-2 pr-4">
                      {r.available ? (
                        <span className="text-emerald-300">Available</span>
                      ) : (
                        <span className="text-amber-300">{r.reason_unavailable ?? "Unavailable"}</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">{r.metrics ? r.metrics.rmse.toFixed(2) : "—"}</td>
                    <td className="py-2 pr-4">{r.metrics ? r.metrics.mae.toFixed(2) : "—"}</td>
                    <td className="py-2 pr-4">{r.metrics ? r.metrics.r2.toFixed(3) : "—"}</td>
                    <td className="py-2 pr-4">{r.metrics ? r.metrics.runtime_ms.toFixed(1) : "—"}</td>
                    <td className="py-2 pr-4">{r.metrics ? r.metrics.inference_latency_ms.toFixed(3) : "—"}</td>
                    <td className="py-2 pr-4">
                      {r.metrics ? `${Math.round(r.metrics.confidence_score * 100)}%` : "—"}
                    </td>
                    <td className="py-2 pr-4">{r.best_overall_score?.toFixed(1) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RequireParcel>
  );
}

