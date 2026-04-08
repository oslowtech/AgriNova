import React, { useEffect, useMemo, useState } from "react";
import { createParcel, getSampleBoundary, uploadOrthomosaic, uploadRaster } from "../services/api";
import { useParcel } from "../state/ParcelContext";
import { ErrorBanner } from "../components/ErrorBanner";

function formatJsonPreview(obj: any) {
  return JSON.stringify(obj, null, 2);
}

export function SettingsPage() {
  const { parcel, setParcel } = useParcel();
  const parcel_id = parcel?.parcel_id ?? null;

  const [mode, setMode] = useState<string>("mock");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sample, setSample] = useState<any | null>(null);
  const [geometryText, setGeometryText] = useState<string>("");
  const [parcelName, setParcelName] = useState<string>("Demo Parcel");

  const [messages, setMessages] = useState<string[]>([]);

  const log = (m: string) => setMessages((prev) => [m, ...prev].slice(0, 6));

  useEffect(() => {
    let cancelled = false;
    getSampleBoundary()
      .then((s) => {
        if (cancelled) return;
        setSample(s);
        setGeometryText(formatJsonPreview(s));
        log("Loaded sample `Boundary.geojson`.");
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e?.message ? String(e.message) : "Failed to load sample boundary");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const createFromText = async (text: string) => {
    setError(null);
    setLoading(true);
    try {
      const geometry = JSON.parse(text);
      const resp = await createParcel(geometry, parcelName);
      setParcel({ parcel_id: resp.parcel_id, parcel_name: resp.parcel_name });
      log(`Created parcel: ${resp.parcel_id}`);
      setMessages((prev) => prev);
    } finally {
      setLoading(false);
    }
  };

  const onBoundaryFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const text = await file.text();
      // Validate JSON quickly.
      JSON.parse(text);
      setGeometryText(text);
      log(`Loaded boundary file: ${file.name}`);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Invalid GeoJSON/JSON boundary file");
    } finally {
      setLoading(false);
    }
  };

  const uploadNdviRaster = async (file: File) => {
    if (!parcel_id) {
      setError("Create/select a parcel first.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await uploadRaster(parcel_id, "ndvi", file);
      log(`Uploaded raster: ${file.name}`);
    } finally {
      setLoading(false);
    }
  };

  const uploadOrtho = async (file: File) => {
    if (!parcel_id) {
      setError("Create/select a parcel first.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await uploadOrthomosaic(parcel_id, file);
      log(`Uploaded orthomosaic: ${file.name}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error ? <ErrorBanner message={error} /> : null}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5 shadow-soft">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Settings / Uploads</div>
            <div className="mt-1 text-sm text-zinc-300">
              FR demo uses `LANDROID_MODE=mock`. Uploads override demo inputs when available.
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="text-xs text-zinc-400">Current parcel</div>
            <div className="mt-1 font-mono text-sm text-zinc-100">{parcel_id ?? "None"}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5 shadow-soft">
          <div className="text-sm font-semibold">Parcel boundary</div>
          <div className="mt-1 text-sm text-zinc-300">Paste GeoJSON or upload a `.geojson` file.</div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col">
              <label className="text-xs text-zinc-400">Parcel name</label>
              <input
                className="mt-1 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2 text-sm w-72 max-w-full"
                value={parcelName}
                onChange={(e) => setParcelName(e.target.value)}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs text-zinc-400">Load boundary file</label>
              <input
                className="mt-1 w-72 max-w-full text-sm text-zinc-200"
                type="file"
                accept=".geojson,.json,application/json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onBoundaryFile(f);
                }}
              />
            </div>
          </div>

          <textarea
            className="mt-4 h-72 w-full rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 font-mono text-xs text-zinc-200"
            value={geometryText}
            onChange={(e) => setGeometryText(e.target.value)}
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              disabled={loading}
              className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold hover:bg-zinc-700 disabled:opacity-60"
              onClick={() => createFromText(geometryText)}
            >
              Create parcel
            </button>
            <button
              disabled={loading || !sample}
              className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-2 text-sm hover:bg-zinc-950/70 disabled:opacity-60"
              onClick={() => {
                if (sample) setGeometryText(formatJsonPreview(sample));
              }}
            >
              Use sample boundary
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5 shadow-soft space-y-4">
          <div>
            <div className="text-sm font-semibold">Uploads</div>
            <div className="mt-1 text-sm text-zinc-300">These are used in demo mode when present.</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="text-sm font-semibold">Raster upload</div>
            <div className="mt-1 text-xs text-zinc-400">Example: NDVI GeoTIFF for FR-18/FR-25.</div>
            <input
              className="mt-3 w-full text-sm text-zinc-200"
              type="file"
              accept=".tif,.tiff,application/octet-stream"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadNdviRaster(f);
              }}
            />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="text-sm font-semibold">Orthomosaic upload</div>
            <div className="mt-1 text-xs text-zinc-400">Example: `.tif` for FR-29..FR-33.</div>
            <input
              className="mt-3 w-full text-sm text-zinc-200"
              type="file"
              accept=".tif,.tiff,application/octet-stream"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadOrtho(f);
              }}
            />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="text-sm font-semibold">Actions</div>
            <div className="mt-3 text-xs text-zinc-300 leading-relaxed">
              After uploads, open the relevant tab (Land Health, Zones, Canopy, Valuation) to re-run computations.
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5 shadow-soft">
        <div className="text-sm font-semibold">Activity log</div>
        <div className="mt-2 space-y-2">
          {messages.length === 0 ? (
            <div className="text-sm text-zinc-300">No activity yet.</div>
          ) : (
            messages.map((m, idx) => (
              <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-sm text-zinc-200">
                {m}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

