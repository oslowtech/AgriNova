import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import { useParcel } from "../state/ParcelContext";
import { createParcel, getSampleBoundary } from "../services/api";

function NavItem({
  to,
  label,
}: {
  to: string;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "block rounded-lg px-3 py-2 text-sm transition",
          isActive ? "bg-zinc-800 text-white" : "text-zinc-300 hover:bg-zinc-800/70",
        ].join(" ")
      }
    >
      <span className="whitespace-nowrap">{label}</span>
    </NavLink>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <div className="px-3 pt-5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{title}</div>;
}

export function LayoutShell() {
  const { parcel, setParcel } = useParcel();
  const location = useLocation();
  const pageTitle = location.pathname.replaceAll("-", " ");

  const [bootingDemo, setBootingDemo] = useState(false);

  // On first load, automatically create a demo parcel from Boundary.geojson
  // so the dashboards are populated without manual steps.
  useEffect(() => {
    if (parcel?.parcel_id || bootingDemo) return;
    let cancelled = false;
    const run = async () => {
      try {
        setBootingDemo(true);
        const boundary = await getSampleBoundary();
        if (cancelled) return;
        const created = await createParcel(boundary, "Demo parcel");
        if (cancelled) return;
        setParcel({ parcel_id: created.parcel_id, parcel_name: created.parcel_name });
      } catch {
        // Silent fail – user can still create/upload manually in Settings.
      } finally {
        if (!cancelled) setBootingDemo(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [parcel?.parcel_id, bootingDemo, setParcel]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-6xl px-4 py-6">
        <aside className="w-80 shrink-0 border-r border-zinc-800 bg-zinc-950/60 p-4">
          <div className="mb-6">
            <div className="text-xl font-semibold tracking-tight">LANDROID</div>
            <div className="mt-1 text-xs text-zinc-400">
              Land intelligence and valuation (demo)
            </div>
          </div>

          <nav>
            <SectionTitle title="Dashboard" />
            <div className="mt-2 space-y-2">
              <NavItem to="/overview" label="Overview" />
              <NavItem to="/land-health" label="Land Health" />
              <NavItem to="/zones" label="Plant Health Zones" />
              <NavItem to="/canopy" label="Tree/Canopy Detection" />
              <NavItem to="/valuation" label="Land Valuation" />
            </div>

            <SectionTitle title="Models" />
            <div className="mt-2 space-y-2">
              <NavItem to="/algorithm-comparison" label="Algorithm Comparison" />
            </div>

            <SectionTitle title="Operations" />
            <div className="mt-2 space-y-2">
              <NavItem to="/data-sources" label="Data Sources / Logs" />
              <NavItem to="/settings" label="Settings / Uploads" />
            </div>
          </nav>

          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="text-xs text-zinc-400">Current parcel</div>
            <div className="mt-1 truncate font-mono text-sm">
              {parcel?.parcel_id ? parcel.parcel_id : "None (upload/select in Settings)"}
            </div>
          </div>
        </aside>

        <main className="flex-1 px-6 py-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-400">Page</div>
              <div className="text-lg font-semibold">{pageTitle || "Overview"}</div>
            </div>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

