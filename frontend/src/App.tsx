import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LayoutShell } from "./components/LayoutShell";
import { OverviewPage } from "./pages/OverviewPage";
import { LandHealthPage } from "./pages/LandHealthPage";
import { ZonesPage } from "./pages/ZonesPage";
import { CanopyPage } from "./pages/CanopyPage";
import { ValuationPage } from "./pages/ValuationPage";
import { AlgorithmComparisonPage } from "./pages/AlgorithmComparisonPage";
import { DataSourcesPage } from "./pages/DataSourcesPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<LayoutShell />}>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/land-health" element={<LandHealthPage />} />
        <Route path="/zones" element={<ZonesPage />} />
        <Route path="/canopy" element={<CanopyPage />} />
        <Route path="/valuation" element={<ValuationPage />} />
        <Route path="/algorithm-comparison" element={<AlgorithmComparisonPage />} />
        <Route path="/data-sources" element={<DataSourcesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  );
}

