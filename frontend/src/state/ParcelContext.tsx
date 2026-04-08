import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ParcelLite = {
  parcel_id: string;
  parcel_name?: string | null;
};

type ParcelContextValue = {
  parcel: ParcelLite | null;
  setParcel: (next: ParcelLite | null) => void;
};

const KEY = "landroid.currentParcel";
const ParcelContext = createContext<ParcelContextValue | undefined>(undefined);

export function ParcelProvider({ children }: { children: React.ReactNode }) {
  const [parcel, setParcelState] = useState<ParcelLite | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ParcelLite;
      if (parsed?.parcel_id) setParcelState(parsed);
    } catch {
      // ignore
    }
  }, []);

  const setParcel = useCallback((next: ParcelLite | null) => {
    setParcelState(next);
    try {
      if (!next) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(() => ({ parcel, setParcel }), [parcel, setParcel]);
  return <ParcelContext.Provider value={value}>{children}</ParcelContext.Provider>;
}

export function useParcel() {
  const ctx = useContext(ParcelContext);
  if (!ctx) throw new Error("useParcel must be used within ParcelProvider");
  return ctx;
}

