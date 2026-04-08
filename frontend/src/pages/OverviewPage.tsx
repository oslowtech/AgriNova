import React, { useEffect, useMemo, useState } from "react";
import { apiHealth, getLandHealth, getValuation } from "../services/api";
import type { LandHealthResponse, ValuationResult } from "../types";
import { useParcel } from "../state/ParcelContext";
import { ErrorBanner } from "../components/ErrorBanner";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { RequireParcel } from "../components/RequireParcel";

function formatScore(v: number) {
  return `${Math.round(v)} / 100`;
}

function statusColor(status: string) {
  const s = status.toLowerCase();
  if (s.includes("healthy")) return "bg-emerald-500/15 text-emerald-200 border-emerald-500/30";
  if (s.includes("moderate")) return "bg-amber-500/15 text-amber-200 border-amber-500/30";
  return "bg-rose-500/15 text-rose-200 border-rose-500/30";
}

export function OverviewPage() {
  const { parcel } = useParcel();
  const parcel_id = parcel?.parcel_id ?? null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [landHealth, setLandHealth] = useState<LandHealthResponse | null>(null);
  const [valuation, setValuation] = useState<ValuationResult | null>(null);
  const [mode, setMode] = useState<string>("mock");

  useEffect(() => {
    if (!parcel_id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getLandHealth(parcel_id), getValuation(parcel_id), apiHealth()])
      .then(([lh, val, h]) => {
        if (cancelled) return;
        setLandHealth(lh);
        setValuation(val);
        setMode(h.mode ?? "mock");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ? String(e.message) : "Failed to fetch land/valuation data");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [parcel_id]);

  const ndvi = landHealth?.signals.ndvi;
  const rainfall = landHealth?.signals.rainfall;
  const temp = landHealth?.signals.temperature;
  const soil = landHealth?.signals.soil;

  const alerts = useMemo(() => {
    const out: { title: string; detail: string }[] = [];
    if (ndvi?.status_label === "Degrading") {
      out.push({ title: "NDVI trend is degrading", detail: "Vegetation vigor has been trending downward." });
    }
    if (rainfall?.surplus_deficit_flag === "Deficit") {
      out.push({ title: "Rainfall deficit", detail: "Annual rainfall is below historical normal." });
    }
    if ((temp?.heat_stress_event_count ?? 0) > 0) {
      out.push({
        title: "Heat stress detected (regional)",
        detail: `${temp?.heat_stress_event_count} month(s) above the stress threshold.`,
      });
    }
    return out;
  }, [ndvi?.status_label, rainfall?.surplus_deficit_flag, temp?.heat_stress_event_count]);

  return (
    <RequireParcel>
      <div className="space-y-5">
        <div className="flex flex-wrap items-stretch gap-4">
          <div className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-zinc-400">LANDROID composite</div>
                <div className="mt-1 text-2xl font-semibold">
                  {landHealth ? formatScore(landHealth.composite.land_health_score) : "--"}
                </div>
              </div>
              <div
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusColor(
                  landHealth?.composite.health_class ?? "At Risk",
                )}`}
              >
                {landHealth?.composite.health_class ?? "—"}
              </div>
            </div>
            <div className="mt-3 text-sm text-zinc-300">
              Mode: <span className="font-semibold text-zinc-100">{mode}</span>
            </div>
            <div className="mt-2 text-sm text-zinc-300">
              Valuation band:{" "}
              <span className="font-semibold text-zinc-100">{valuation?.valuation_band ?? "—"}</span>
            </div>
          </div>

          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5 shadow-soft">
            <div className="text-sm font-semibold">Top signals</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="text-xs text-zinc-400">NDVI</div>
                <div className="mt-1 font-semibold">{ndvi ? ndvi.current_value.toFixed(3) : "--"}</div>
                <div className="mt-1 text-xs text-zinc-300">{ndvi?.status_label ?? ""}</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="text-xs text-zinc-400">Rainfall</div>
                <div className="mt-1 font-semibold">
                  {rainfall ? `${Math.round(rainfall.annual_mm)} mm` : "--"}
                </div>
                <div className="mt-1 text-xs text-zinc-300">{rainfall?.surplus_deficit_flag ?? ""}</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="text-xs text-zinc-400">Temp</div>
                <div className="mt-1 font-semibold">{temp ? `${temp.heat_stress_event_count}` : "--"}</div>
                <div className="mt-1 text-xs text-zinc-300">heat stress</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="text-xs text-zinc-400">Soil pH</div>
                <div className="mt-1 font-semibold">{soil ? soil.ph.toFixed(2) : "--"}</div>
                <div className="mt-1 text-xs text-zinc-300">{soil?.soil_type ?? ""}</div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner label="Fetching dashboard data..." />
        ) : error ? (
          <ErrorBanner message={error} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5 shadow-soft">
              <div className="text-sm font-semibold">Alerts & anomalies</div>
              {alerts.length === 0 ? (
                <div className="mt-3 text-sm text-zinc-300">No major anomalies detected in demo mode.</div>
              ) : (
                <div className="mt-3 space-y-3">
                  {alerts.map((a, idx) => (
                    <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                      <div className="text-sm font-semibold">{a.title}</div>
                      <div className="mt-1 text-sm text-zinc-300">{a.detail}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5 shadow-soft">
              <div className="text-sm font-semibold">Valuation range</div>
              <div className="mt-2 text-sm text-zinc-300">Estimated intelligence range (Rs/acre)</div>
              <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="text-xs text-zinc-400">Low</div>
                <div className="text-lg font-semibold">{valuation ? Math.round(valuation.estimated_intelligence_range_rs_per_acre.low) : "—"}</div>
              </div>
              <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="text-xs text-zinc-400">Mid</div>
                <div className="text-lg font-semibold">{valuation ? Math.round(valuation.estimated_intelligence_range_rs_per_acre.mid) : "—"}</div>
              </div>
              <div className="mt-3 text-xs text-zinc-400">
                {valuation?.disclaimer ?? ""}
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireParcel>
  );
}

