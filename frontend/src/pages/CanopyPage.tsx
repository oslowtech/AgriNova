import React, { useEffect, useMemo, useRef, useState } from "react";
import { getCanopy, getOrthomosaicPreview } from "../services/api";
import type { CanopyDetectionResult } from "../types";
import { useParcel } from "../state/ParcelContext";
import { RequireParcel } from "../components/RequireParcel";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorBanner } from "../components/ErrorBanner";

function StressBadge({ stressed }: { stressed: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        stressed ? "border-rose-500/40 bg-rose-500/15 text-rose-200" : "border-emerald-500/40 bg-emerald-500/15 text-emerald-200",
      ].join(" ")}
    >
      {stressed ? "Stressed" : "OK"}
    </span>
  );
}

export function CanopyPage() {
  const { parcel } = useParcel();
  const parcel_id = parcel?.parcel_id ?? null;

  const [method, setMethod] = useState<"blob" | "watershed">("blob");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<CanopyDetectionResult | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!parcel_id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const [previewBlob, canopy] = await Promise.all([
          getOrthomosaicPreview(parcel_id),
          getCanopy(parcel_id, { method }),
        ]);

        if (cancelled) return;

        const url = URL.createObjectURL(previewBlob);
        setImgUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setResult(canopy);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ? String(e.message) : "Failed to compute canopy detection");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    };
    run();

    return () => {
      cancelled = true;
    };
  }, [parcel_id, method]);

  useEffect(() => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const onLoad = () => {
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      const rect = img.getBoundingClientRect();
      setDisplaySize({ w: rect.width, h: rect.height });
    };
    const onResize = () => {
      const rect = img.getBoundingClientRect();
      setDisplaySize({ w: rect.width, h: rect.height });
    };
    img.addEventListener("load", onLoad);
    window.addEventListener("resize", onResize);
    if (img.complete) onLoad();
    return () => {
      img.removeEventListener("load", onLoad);
      window.removeEventListener("resize", onResize);
    };
  }, [imgUrl]);

  const overlays = useMemo(() => {
    if (!result || !naturalSize || !displaySize) return [];
    const sx = displaySize.w / naturalSize.w;
    const sy = displaySize.h / naturalSize.h;
    return result.blobs.map((b) => ({
      id: b.id,
      left: b.x * sx,
      top: b.y * sy,
      radius: b.radius * ((sx + sy) / 2) / 0.1, // heuristic; backend radius is meters from pixel radius; here we only need a visual.
      isStressed: b.is_stressed,
    }));
  }, [result, naturalSize, displaySize]);

  return (
    <RequireParcel>
      <div className="space-y-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5 shadow-soft flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Tree & canopy detection</div>
            <div className="mt-1 text-sm text-zinc-300">FR-29..FR-33: OpenCV blob detection or watershed segmentation on the orthomosaic.</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 p-2">
              <button
                className={[
                  "rounded-lg px-3 py-2 text-sm",
                  method === "blob" ? "bg-zinc-800 text-white" : "text-zinc-300 hover:bg-zinc-800/70",
                ].join(" ")}
                onClick={() => setMethod("blob")}
              >
                Blob
              </button>
              <button
                className={[
                  "rounded-lg px-3 py-2 text-sm",
                  method === "watershed" ? "bg-zinc-800 text-white" : "text-zinc-300 hover:bg-zinc-800/70",
                ].join(" ")}
                onClick={() => setMethod("watershed")}
              >
                Watershed
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner label="Running canopy detection..." />
        ) : error ? (
          <ErrorBanner message={error} />
        ) : null}

        {result && imgUrl ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/35 p-0 shadow-soft overflow-hidden">
              <div className="relative w-full">
                <img
                  ref={imgRef}
                  src={imgUrl}
                  alt="Orthomosaic preview"
                  className="block max-h-[560px] w-full object-contain bg-zinc-950"
                />

                {overlays.map((o) => (
                  <div
                    key={o.id}
                    className="absolute pointer-events-none"
                    style={{
                      left: o.left,
                      top: o.top,
                      width: Math.max(6, Math.min(18, o.isStressed ? 14 : 10)),
                      height: Math.max(6, Math.min(18, o.isStressed ? 14 : 10)),
                      transform: "translate(-50%, -50%)",
                      borderRadius: "9999px",
                      border: `2px solid ${o.isStressed ? "#fb7185" : "#34d399"}`,
                      background: o.isStressed ? "rgba(251,113,133,0.15)" : "rgba(52,211,153,0.12)",
                      boxShadow: o.isStressed ? "0 0 0 3px rgba(251,113,133,0.08)" : "0 0 0 3px rgba(52,211,153,0.06)",
                    }}
                    title={`Canopy ${o.id}${o.isStressed ? " (stressed)" : ""}`}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-5 shadow-soft space-y-4">
              <div>
                <div className="text-sm font-semibold">Results</div>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                    <div className="text-xs text-zinc-400">Total canopy count</div>
                    <div className="mt-1 text-2xl font-semibold">{result.total_canopy_count}</div>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                    <div className="text-xs text-zinc-400">Density per acre</div>
                    <div className="mt-1 text-2xl font-semibold">{result.density_per_acre.toFixed(2)}</div>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                    <div className="text-xs text-zinc-400">Stressed canopies</div>
                    <div className="mt-1 text-2xl font-semibold">{result.stressed_canopy_ids.length}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="text-sm font-semibold">FR-33 Confidence</div>
                <div className="mt-2 text-sm text-zinc-300">
                  {Math.round(result.confidence.score * 100)}% — {result.confidence.notes ?? ""}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="text-sm font-semibold">Explanation</div>
                <div className="mt-2 text-sm text-zinc-300 leading-relaxed">{result.explanation}</div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="text-sm font-semibold">Method</div>
                <div className="mt-2 text-sm text-zinc-300">
                  Using <span className="font-semibold text-zinc-100">{method}</span> on the orthomosaic.
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <StressBadge stressed={false} />
                  <StressBadge stressed={true} />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </RequireParcel>
  );
}

