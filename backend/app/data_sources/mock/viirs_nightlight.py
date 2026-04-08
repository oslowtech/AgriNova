from __future__ import annotations

import hashlib
import math

import numpy as np

from app.data_sources.base import GeoContext, NightLightDataSource


def _seed_from_ctx(ctx: GeoContext) -> int:
    raw = f"viirs:{ctx.centroid_wgs84[0]:.6f},{ctx.centroid_wgs84[1]:.6f}:{ctx.mode}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


class MockVIIRSNightLightDataSource(NightLightDataSource):
    """
    FR-34 uses Planetary Computer VIIRS night light index.

    In mock mode we generate a deterministic nightlight index in [0, 1].
    """

    def get_nightlight_index(self, ctx: GeoContext) -> float:
        rng = np.random.default_rng(_seed_from_ctx(ctx))
        lon, lat = ctx.centroid_wgs84

        # City-like areas generally have higher values; mimic with a smooth function.
        base = 0.25 + 0.35 * (math.sin(math.radians(lat * 3.0)) * 0.5 + 0.5)  # 0.25..0.425
        lon_wobble = 0.2 * (math.cos(math.radians(lon * 2.0)) * 0.5 + 0.5)  # 0..0.2
        noise = rng.normal(0, 0.08)
        val = base + lon_wobble + noise
        return float(np.clip(val, 0.0, 1.0))

