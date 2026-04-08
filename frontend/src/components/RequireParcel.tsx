import React from "react";
import { useParcel } from "../state/ParcelContext";

export function RequireParcel({ children }: { children: React.ReactNode }) {
  const { parcel } = useParcel();
  if (!parcel?.parcel_id) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/35 p-6">
        <div className="text-lg font-semibold">No parcel selected</div>
        <div className="mt-2 text-sm text-zinc-300">
          Go to <span className="font-semibold text-zinc-100">Settings / Uploads</span> and create a demo parcel
          or upload your own boundary to enable dashboards.
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

