import React from "react";

export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-200" />
      <div className="text-sm text-zinc-200">{label ?? "Loading..."}</div>
    </div>
  );
}

