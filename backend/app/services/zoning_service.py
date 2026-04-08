from __future__ import annotations

import datetime as dt
from typing import Dict, List, Tuple

import numpy as np
from shapely.geometry import Polygon, box, mapping

from app.core.settings import settings
from app.schemas.common import Confidence, DataSourceTrace
from app.schemas.zones import ZoneClass, ZoneComparison, ZoneMapResponse


class ZoningService:
    """
    FR-25..FR-28: NDVI zoning and change summary.
    In mock mode we generate a synthetic NDVI grid within the parcel if no raster is available.
    """

    ZONE_THRESHOLDS: List[Tuple[str, float, float, str]] = [
        ("Bare/Stressed", -1.0, 0.2, "#f97316"),
        ("Sparse", 0.2, 0.4, "#eab308"),
        ("Healthy", 0.4, 0.6, "#22c55e"),
        ("Dense", 0.6, 2.0, "#166534"),
    ]

    def __init__(self) -> None:
        self.mode = settings.landroid_mode

    def _synthetic_ndvi_grid(
        self, polygon: Polygon, grid_size: int = 40
    ) -> Tuple[np.ndarray, List[Polygon]]:
        """
        Deterministic synthetic NDVI field over the parcel polygon, used in demo mode.
        """
        minx, miny, maxx, maxy = polygon.bounds
        xs = np.linspace(minx, maxx, grid_size + 1)
        ys = np.linspace(miny, maxy, grid_size + 1)

        values = np.zeros((grid_size, grid_size), dtype=float)
        cells: List[Polygon] = []

        cx, cy = polygon.centroid.x, polygon.centroid.y

        for i in range(grid_size):
            for j in range(grid_size):
                cell = box(xs[j], ys[i], xs[j + 1], ys[i + 1])
                if not cell.intersects(polygon):
                    continue
                cells.append(cell)
                # Synthetic field: combination of distance from centroid + sinusoidal variation.
                px = 0.5 * (xs[j] + xs[j + 1])
                py = 0.5 * (ys[i] + ys[i + 1])
                r = np.hypot(px - cx, py - cy)
                base = 0.55 * np.exp(-r / (max(maxx - minx, maxy - miny) + 1e-6))
                wiggle = 0.15 * np.sin(px * 20.0) * np.cos(py * 20.0)
                v = np.clip(base + wiggle, 0.05, 0.85)
                values[i, j] = v

        return values, cells

    def _class_for_ndvi(self, v: float) -> ZoneClass:
        for name, lo, hi, color in self.ZONE_THRESHOLDS:
            if lo <= v < hi:
                return ZoneClass(
                    name=name,
                    range=f"{lo:.1f}–{hi:.1f}",
                    color=color,
                    area_percent=0.0,
                )
        # Fallback
        name, lo, hi, color = self.ZONE_THRESHOLDS[-1]
        return ZoneClass(
            name=name,
            range=f"{lo:.1f}–{hi:.1f}",
            color=color,
            area_percent=0.0,
        )

    def generate_zone_map(
        self,
        parcel_id: str,
        polygon: Polygon,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> ZoneMapResponse:
        """
        FR-25 classify NDVI into four zones, FR-26 render as overlay GeoJSON,
        FR-27 compute % area per zone, FR-28 optional change summary (mocked using
        slightly perturbed fields across two dates).
        """
        ndvi_grid, cells = self._synthetic_ndvi_grid(polygon)
        if not cells:
            raise ValueError("Parcel polygon produced no grid cells for zoning.")

        zone_assignments: Dict[str, List[int]] = {z[0]: [] for z in self.ZONE_THRESHOLDS}
        cell_polys: List[Polygon] = []
        cell_values: List[float] = []

        for idx, cell in enumerate(cells):
            centroid = cell.centroid
            # Map centroid into the grid indices heuristically
            v = float(ndvi_grid.mean())  # start with global mean
            # Use a simple radial pattern based on centroid distance for variation
            r = np.hypot(centroid.x - polygon.centroid.x, centroid.y - polygon.centroid.y)
            v = float(np.clip(0.65 * np.exp(-r / (max(polygon.bounds[2] - polygon.bounds[0], polygon.bounds[3] - polygon.bounds[1]) + 1e-6)), 0.05, 0.85))
            cls = self._class_for_ndvi(v)
            zone_assignments[cls.name].append(idx)
            cell_polys.append(cell)
            cell_values.append(v)

        total_area = float(sum(cell.area for cell in cell_polys)) or 1.0

        legend: List[ZoneClass] = []
        for name, lo, hi, color in self.ZONE_THRESHOLDS:
            area = float(sum(cell_polys[i].area for i in zone_assignments[name]))
            percent = 100.0 * area / total_area
            legend.append(
                ZoneClass(
                    name=name,
                    range=f"{lo:.1f}–{hi:.1f}",
                    color=color,
                    area_percent=percent,
                )
            )

        # Build GeoJSON FeatureCollection
        features = []
        for idx, poly in enumerate(cell_polys):
            v = cell_values[idx]
            cls = self._class_for_ndvi(v)
            features.append(
                {
                    "type": "Feature",
                    "geometry": mapping(poly),
                    "properties": {
                        "ndvi": v,
                        "zone": cls.name,
                        "color": cls.color,
                    },
                }
            )

        zones_geojson: Dict = {"type": "FeatureCollection", "features": features}

        comparison: ZoneComparison | None = None
        if from_date and to_date:
            # Mock change summary by assuming a small increase in lower-health zones.
            lower_health = next((z for z in legend if z.name == "Bare/Stressed"), None)
            increase = 3.5 if lower_health else 0.0
            summary = (
                f"Estimated {increase:.1f}% increase in Bare/Stressed area between "
                f"{from_date} and {to_date} in demo mode."
            )
            comparison = ZoneComparison(
                from_date=from_date,
                to_date=to_date,
                lower_health_area_increase_percent=increase,
                summary=summary,
            )

        now_iso = dt.datetime.utcnow().isoformat()
        return ZoneMapResponse(
            parcel_id=parcel_id,
            mode=self.mode,
            generated_at_iso=now_iso,
            legend=legend,
            zones_geojson=zones_geojson,
            comparison=comparison,
            confidence=Confidence(
                score=0.7,
                notes="Synthetic NDVI grid used in demo mode; replace with real NDVI raster for production.",
            ),
            data_traces=[
                DataSourceTrace(
                    source="Synthetic NDVI grid (mock zoning)",
                    timestamp_iso=now_iso,
                    mode=self.mode,
                    details={"grid_cells": len(cell_polys)},
                )
            ],
        )

