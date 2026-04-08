import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getZones } from "../services/api";
import type { ZoneClass, ZoneMapResponse } from "../types";
import { useParcel } from "../state/ParcelContext";
import { RequireParcel } from "../components/RequireParcel";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorBanner } from "../components/ErrorBanner";

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function computeGeoBounds(geojson: any): { minLat: number; minLon: number; maxLat: number; maxLon: number } | null {
  if (!geojson || !geojson.features) return null;
  const coords: number[][] = [];

  const walk = (g: any) => {
    if (typeof g[0] === "number" && typeof g[1] === "number") {
      coords.push([g[1], g[0]]); // [lat, lon]
      return;
    }
    if (Array.isArray(g)) g.forEach(walk);
  };

  for (const f of geojson.features as any[]) {
    walk(f.geometry?.coordinates);
  }

  if (coords.length === 0) return null;
  const lats = coords.map((c) => c[0]);
  const lons = coords.map((c) => c[1]);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
  };
}

export function ZonesPage() {
  const { parcel } = useParcel();
  const parcel_id = parcel?.parcel_id ?? null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromMap, setFromMap] = useState<ZoneMapResponse | null>(null);
  const [toMap, setToMap] = useState<ZoneMapResponse | null>(null);
  const [legend, setLegend] = useState<ZoneClass[]>([]);

  const [fromDate, setFromDate] = useState<string>("2025-01-01");
  const [toDate, setToDate] = useState<string>("2026-01-01");
  const [mix, setMix] = useState<number>(0.5);

  const [compareEnabled, setCompareEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (!parcel_id) return;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const baseParams = { from_date: fromDate, to_date: fromDate };
        const single = await getZones(parcel_id, baseParams);
        setFromMap(single);
        setLegend(single.legend);

        if (compareEnabled) {
          const after = await getZones(parcel_id, { from_date: fromDate, to_date: toDate });
          setToMap(after);
        } else {
          setToMap(null);
        }
      } catch (e: any) {
        setError(e?.message ? String(e.message) : "Failed to load zones");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [parcel_id, compareEnabled, fromDate, toDate]);

  const activeMap = compareEnabled ? toMap ?? fromMap : fromMap;
  const bounds = useMemo(() => computeGeoBounds(activeMap?.zones_geojson), [activeMap?.zones_geojson]);
  const center = useMemo(() => {
    if (!bounds) return null;
    return [(bounds.minLat + bounds.maxLat) / 2, (bounds.minLon + bounds.maxLon) / 2] as [number, number];
  }, [bounds]);

  const styleFeature = (feature: any) => {
    const color = feature?.properties?.color ?? "#64748b";
    return {
      color,
      weight: 1,
      fillColor: color,
      fillOpacity: 0.55,
    };
  };

  return (
    <RequireParcel>
      <div className="space-y-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5 shadow-soft">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">NDVI zone overlay</div>
              <div className="mt-1 text-sm text-zinc-300">
                FR-25..FR-28: deterministic thresholding (demo) + color-coded GIS overlay.
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col">
                <label className="text-xs text-zinc-400">From date</label>
                <input
                  className="mt-1 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2 text-sm"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-zinc-400">To date</label>
                <input
                  className="mt-1 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2 text-sm"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                <input
                  type="checkbox"
                  checked={compareEnabled}
                  onChange={(e) => setCompareEnabled(e.target.checked)}
                />
                <span className="text-sm">Before/After</span>
              </label>
            </div>
          </div>

          {compareEnabled ? (
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-sm text-zinc-300">
                Slider blend: <span className="font-semibold text-zinc-100">{Math.round(mix * 100)}%</span> after
              </div>
              <input
                className="w-72 max-w-full accent-zinc-200"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={mix}
                onChange={(e) => setMix(parseFloat(e.target.value))}
              />
            </div>
          ) : null}

          {compareEnabled ? (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="text-sm font-semibold">Change summary</div>
              <div className="mt-2 text-sm text-zinc-300">
                {toMap?.comparison?.summary ?? "No change summary available."}
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/35 p-0 shadow-soft overflow-hidden">
            {loading || !fromMap ? (
              <div className="p-5">
                <LoadingSpinner label="Generating zone overlay..." />
              </div>
            ) : error ? (
              <div className="p-5">
                <ErrorBanner message={error} />
              </div>
            ) : (
              <MapContainer
                style={{ height: 520 }}
                center={center ?? [0, 0]}
                zoom={center ? 14 : 2}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {compareEnabled ? (
                  <>
                    <GeoJSON
                      data={fromMap?.zones_geojson}
                      style={(feature) => ({
                        ...styleFeature(feature),
                        fillOpacity: 0.55 * (1 - mix),
                      })}
                    />
                    <GeoJSON
                      data={toMap?.zones_geojson}
                      style={(feature) => ({
                        ...styleFeature(feature),
                        fillOpacity: 0.55 * mix,
                      })}
                    />
                  </>
                ) : (
                  <GeoJSON data={fromMap?.zones_geojson} style={(f) => styleFeature(f)} />
                )}
              </MapContainer>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Legend</div>
                <div className="mt-1 text-xs text-zinc-400">Zone classification by NDVI thresholds</div>
              </div>
              {fromMap ? (
                <button
                  className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm hover:bg-zinc-950/60"
                  onClick={() =>
                    downloadText(
                      `zones_${parcel_id}.geojson`,
                      JSON.stringify((compareEnabled ? toMap?.zones_geojson : fromMap?.zones_geojson) ?? {}, null, 2),
                    )
                  }
                >
                  Download GeoJSON
                </button>
              ) : null}
            </div>

            <div className="mt-4 space-y-2">
              {legend.map((z) => (
                <div key={z.name} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ background: z.color }} />
                    <div>
                      <div className="text-sm font-semibold">{z.name}</div>
                      <div className="text-xs text-zinc-400">{z.range}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold">{z.area_percent.toFixed(1)}%</div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="text-sm font-semibold">FR-27: area percentages</div>
              <div className="mt-1 text-sm text-zinc-300">
                Percentage area per NDVI zone is computed from the synthetic zoning grid in demo mode.
              </div>
            </div>
          </div>
        </div>
      </div>
    </RequireParcel>
  );
}

