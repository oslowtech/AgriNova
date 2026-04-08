import React from "react";

export function ErrorBanner({ title, message }: { title?: string; message: string }) {
  return (
    <div className="rounded-xl border border-red-800 bg-red-950/40 p-4">
      <div className="text-sm font-semibold text-red-200">{title ?? "Something went wrong"}</div>
      <div className="mt-1 text-sm text-red-100">{message}</div>
    </div>
  );
}

