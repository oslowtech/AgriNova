import React from "react";

function TrendBadge({ trend }: { trend?: string }) {
  if (!trend) return null;
  const t = trend.toLowerCase();
  const cls =
    t === "up"
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/30"
      : t === "down"
        ? "bg-rose-500/15 text-rose-200 border-rose-500/30"
        : "bg-zinc-500/15 text-zinc-200 border-zinc-500/30";
  const icon = t === "up" ? "▲" : t === "down" ? "▼" : "●";
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        cls,
      ].join(" ")}
    >
      <span className="text-[10px]">{icon}</span>
      {trend}
    </span>
  );
}

export function SignalCard({
  title,
  subtitle,
  currentValue,
  trend,
  confidenceScore,
  chart,
  explanation,
}: {
  title: string;
  subtitle?: string;
  currentValue: string;
  trend?: string;
  confidenceScore?: number;
  chart?: React.ReactNode;
  explanation: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-zinc-400">{subtitle}</div> : null}
        </div>
        <TrendBadge trend={trend} />
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <div className="text-2xl font-semibold">{currentValue}</div>
        {confidenceScore !== undefined ? (
          <div className="text-xs text-zinc-400">
            Confidence: <span className="font-semibold text-zinc-200">{Math.round(confidenceScore * 100)}%</span>
          </div>
        ) : null}
      </div>

      {chart ? <div className="mt-3">{chart}</div> : null}

      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
        <div className="text-xs font-semibold text-zinc-200">Why this score</div>
        <div className="mt-1 text-xs text-zinc-300 leading-relaxed">{explanation}</div>
      </div>
    </div>
  );
}

