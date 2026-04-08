import React, { useEffect, useMemo, useState } from "react";
import { getValuation } from "../services/api";
import type { FactorContribution, ValuationResult } from "../types";
import { useParcel } from "../state/ParcelContext";
import { RequireParcel } from "../components/RequireParcel";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorBanner } from "../components/ErrorBanner";

function arrowFor(dir?: string) {
  const d = (dir ?? "").toLowerCase();
  if (d === "up") return "▲";
  if (d === "down") return "▼";
  return "●";
}

export function ValuationPage() {
  const { parcel } = useParcel();
  const parcel_id = parcel?.parcel_id ?? null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ValuationResult | null>(null);

  useEffect(() => {
    if (!parcel_id) return;
    setLoading(true);
    setError(null);
    getValuation(parcel_id)
      .then((d) => setData(d))
      .catch((e) => setError(e?.message ? String(e.message) : "Failed to load valuation"))
      .finally(() => setLoading(false));
  }, [parcel_id]);

  const factors = useMemo(() => {
    if (!data) return [];
    const entries = Object.entries(data.factor_contributions).map(([k, v]) => ({ key: k, value: v }));
    const max = Math.max(...entries.map((e) => e.value), 1e-9);
    return entries.map((e) => ({ ...e, pct: (e.value / max) * 100 }));
  }, [data]);

  return (
    <RequireParcel>
      <div className="space-y-4">
        {loading ? <LoadingSpinner label="Estimating land value..." /> : null}
        {error ? <ErrorBanner message={error} /> : null}

        {data ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-zinc-400">Estimated intelligence range</div>
                  <div className="mt-1 text-3xl font-semibold">{data.valuation_band} band</div>
                  <div className="mt-2 text-sm text-zinc-300">
                    Rs/acre:{" "}
                    <span className="font-semibold text-zinc-100">
                      {Math.round(data.estimated_intelligence_range_rs_per_acre.low)} –{" "}
                      {Math.round(data.estimated_intelligence_range_rs_per_acre.high)}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                  <div className="text-xs text-zinc-400">Confidence</div>
                  <div className="mt-1 text-2xl font-semibold">{Math.round(data.confidence.score * 100)}%</div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                  <div className="text-xs text-zinc-400">Low</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {Math.round(data.estimated_intelligence_range_rs_per_acre.low)}
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                  <div className="text-xs text-zinc-400">Mid</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {Math.round(data.estimated_intelligence_range_rs_per_acre.mid)}
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                  <div className="text-xs text-zinc-400">High</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {Math.round(data.estimated_intelligence_range_rs_per_acre.high)}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="text-sm font-semibold">Factor contribution (relative)</div>
                <div className="mt-3 space-y-3">
                  {factors.map((f) => (
                    <div key={f.key} className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-zinc-200">{f.key}</div>
                        <div className="text-xs text-zinc-400">{f.value.toFixed(3)}</div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full bg-zinc-100/90" style={{ width: `${Math.min(100, f.pct)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5 shadow-soft space-y-4">
              <div>
                <div className="text-sm font-semibold">Top driving factors</div>
                <div className="mt-2 text-sm text-zinc-300">
                  Up/down signals that push the estimated range higher or lower.
                </div>
              </div>

              <div className="space-y-2">
                {data.top_factors.map((f, idx) => (
                  <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">{f.factor}</div>
                      <div
                        className={[
                          "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          f.direction?.toLowerCase() === "up"
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                            : f.direction?.toLowerCase() === "down"
                              ? "border-rose-500/40 bg-rose-500/15 text-rose-200"
                              : "border-zinc-500/30 bg-zinc-800/40 text-zinc-200",
                        ].join(" ")}
                      >
                        {arrowFor(f.direction)} {f.direction ?? "mixed"}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      delta: {f.delta_normalized.toFixed(3)}
                    </div>
                    {f.details ? <div className="mt-2 text-sm text-zinc-300 leading-relaxed">{f.details}</div> : null}
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="text-sm font-semibold">Disclaimer</div>
                <div className="mt-2 text-xs text-zinc-400 leading-relaxed">{data.disclaimer}</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </RequireParcel>
  );
}

