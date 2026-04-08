import React, { useEffect, useState } from "react";
import { getLandHealth } from "../services/api";
import type { LandHealthResponse } from "../types";
import { useParcel } from "../state/ParcelContext";
import { RequireParcel } from "../components/RequireParcel";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { SignalCard } from "../components/SignalCard";
import { MonthlyLineChart } from "../components/MonthlyLineChart";

export function LandHealthPage() {
  const { parcel } = useParcel();
  const parcel_id = parcel?.parcel_id ?? null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LandHealthResponse | null>(null);

  useEffect(() => {
    if (!parcel_id) return;
    setLoading(true);
    setError(null);
    getLandHealth(parcel_id)
      .then((d) => setData(d))
      .catch((e) => setError(e?.message ? String(e.message) : "Failed to load land health"))
      .finally(() => setLoading(false));
  }, [parcel_id]);

  return (
    <RequireParcel>
      <div className="space-y-4">
        {loading ? (
          <LoadingSpinner label="Computing Land Health..." />
        ) : error ? (
          <ErrorBanner message={error} />
        ) : null}

        {data ? (
          <>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-zinc-400">Composite score</div>
                  <div className="mt-1 text-3xl font-semibold">
                    {Math.round(data.composite.land_health_score)} <span className="text-base text-zinc-400">/100</span>
                  </div>
                  <div className="mt-1 text-sm text-zinc-300">
                    Class:{" "}
                    <span className="font-semibold text-zinc-100">{data.composite.health_class}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                  <div className="text-xs text-zinc-400">Confidence</div>
                  <div className="mt-1 text-xl font-semibold">
                    {Math.round(data.composite.confidence.score * 100)}%
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">Transparent weighted subscores</div>
                </div>
              </div>

              <div className="mt-4 text-sm text-zinc-300 leading-relaxed">
                {data.composite.explanation}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                {[
                  { key: "ndvi_trend", label: "NDVI trend", val: data.composite.factor_breakdown.ndvi_trend },
                  { key: "rainfall_adequacy", label: "Rain adequacy", val: data.composite.factor_breakdown.rainfall_adequacy },
                  { key: "soil_quality", label: "Soil quality", val: data.composite.factor_breakdown.soil_quality },
                  { key: "temperature_suitability", label: "Temp suitability", val: data.composite.factor_breakdown.temperature_suitability },
                ].map((s) => (
                  <div key={s.key} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                    <div className="text-xs text-zinc-400">{s.label}</div>
                    <div className="mt-1 text-xl font-semibold">{Math.round(s.val)}</div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-zinc-100/90"
                        style={{ width: `${Math.max(0, Math.min(100, s.val))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SignalCard
                title="NDVI"
                subtitle={`2-year mean: ${data.signals.ndvi.mean_2yr.toFixed(3)}`}
                currentValue={data.signals.ndvi.current_value.toFixed(3)}
                trend={data.signals.ndvi.trend_indicator}
                confidenceScore={data.signals.ndvi.confidence.score}
                chart={<MonthlyLineChart series={data.signals.ndvi.monthly_trend} stroke="#22c55e" />}
                explanation={data.signals.ndvi.explanation}
              />

              <SignalCard
                title="Rainfall"
                subtitle={`Normal annual: ${Math.round(data.signals.rainfall.historical_normal_annual_mm)} mm`}
                currentValue={`${Math.round(data.signals.rainfall.annual_mm)} mm`}
                trend={data.signals.rainfall.trend_indicator}
                confidenceScore={data.signals.rainfall.confidence.score}
                chart={<MonthlyLineChart series={data.signals.rainfall.monthly_distribution} stroke="#38bdf8" />}
                explanation={data.signals.rainfall.explanation}
              />

              <SignalCard
                title="Temperature (regional)"
                subtitle={`Heat stress events: ${data.signals.temperature.heat_stress_event_count}`}
                currentValue={`${(() => {
                  const tSeries = data.signals.temperature.monthly_trend.values;
                  const last = tSeries[tSeries.length - 1] ?? 0;
                  return last.toFixed(1);
                })()} C`}
                trend={data.signals.temperature.trend_indicator}
                confidenceScore={data.signals.temperature.confidence.score}
                chart={<MonthlyLineChart series={data.signals.temperature.monthly_trend} stroke="#f59e0b" />}
                explanation={data.signals.temperature.explanation}
              />

              <SignalCard
                title="Soil"
                subtitle={`${data.signals.soil.soil_type} • ${data.signals.soil.texture}`}
                currentValue={`pH ${data.signals.soil.ph.toFixed(2)}`}
                confidenceScore={data.signals.soil.confidence.score}
                explanation={data.signals.soil.explanation}
              />
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5 shadow-soft">
              <div className="text-sm font-semibold">NDVI status</div>
              <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="text-sm text-zinc-200">
                  Status: <span className="font-semibold">{data.signals.ndvi.status_label}</span>
                </div>
                <div className="mt-2 text-sm text-zinc-300 leading-relaxed">
                  {data.signals.ndvi.explanation}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </RequireParcel>
  );
}

