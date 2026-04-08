from __future__ import annotations

import datetime as dt
import hashlib
import math
from typing import Protocol

import numpy as np

from app.data_sources.base import GeoContext, NDVIDataSource


def _seed_from_ctx(ctx: GeoContext) -> int:
    raw = f"{ctx.centroid_wgs84[0]:.6f},{ctx.centroid_wgs84[1]:.6f},{ctx.mode}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


class MockBirdscaleNDVIDataSource(NDVIDataSource):
    """
    FR-18 current NDVI comes from Birdscale NDVI raster.

    In mock mode we generate a plausible "current" NDVI value.
    """

    def get_current_ndvi(self, ctx: GeoContext) -> float:
        rng = np.random.default_rng(_seed_from_ctx(ctx))
        _, lat = ctx.centroid_wgs84

        seasonal = 0.06 * math.sin(math.radians(lat * 3.0))
        mean = 0.42 + seasonal
        current = mean + rng.normal(0, 0.06)
        # Clamp to typical NDVI range (avoid negative in mock)
        return float(np.clip(current, 0.05, 0.75))

    def get_ndvi_monthly_series(self, ctx: GeoContext, months: int = 24) -> list[float]:
        # Not used for FR-18 in our design (Sentinel-2 supplies historical series),
        # but keep it deterministic for future modules.
        rng = np.random.default_rng(_seed_from_ctx(ctx) ^ 0xB1A0)
        base = 0.45 + 0.1 * math.sin(math.radians(ctx.centroid_wgs84[1] * 2.5))
        slope = rng.normal(0, 0.01)
        t = np.arange(months, dtype=float)
        seasonal = 0.08 * np.sin(2 * np.pi * t / 12.0)
        noise = rng.normal(0, 0.03, size=months)
        vals = base + slope * (t - months / 2) + seasonal + noise
        return [float(np.clip(v, 0.05, 0.8)) for v in vals.tolist()]

