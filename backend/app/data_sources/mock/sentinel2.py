from __future__ import annotations

import datetime as dt
import hashlib
import math

import numpy as np

from app.data_sources.base import GeoContext, NDVIDataSource


def _seed_from_ctx(ctx: GeoContext) -> int:
    raw = f"sentinel2:{ctx.centroid_wgs84[0]:.6f},{ctx.centroid_wgs84[1]:.6f}:{ctx.mode}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def months_labels(end: dt.date, count: int) -> list[str]:
    labels: list[str] = []
    y = end.year
    m = end.month
    # Build backwards then reverse.
    for _ in range(count):
        labels.append(f"{y:04d}-{m:02d}")
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    labels.reverse()
    return labels


class MockSentinel2NDVIDataSource(NDVIDataSource):
    """
    FR-18 historical NDVI trend comes from Planetary Computer Sentinel-2 time series.

    In mock mode we generate a 24-month monthly NDVI series deterministically.
    """

    def get_current_ndvi(self, ctx: GeoContext) -> float:
        # Not used by our FR-18 pipeline; provide a consistent implementation.
        rng = np.random.default_rng(_seed_from_ctx(ctx))
        return float(rng.uniform(0.25, 0.7))

    def get_ndvi_monthly_series(self, ctx: GeoContext, months: int = 24) -> list[float]:
        rng = np.random.default_rng(_seed_from_ctx(ctx))
        _, lat = ctx.centroid_wgs84

        base = 0.38 + 0.12 * math.cos(math.radians(lat * 2.0))
        slope = rng.normal(0, 0.02)  # per month-ish (will be moderated below)
        amp = rng.uniform(0.04, 0.1)
        noise = rng.normal(0, 0.02, size=months)
        t = np.arange(months, dtype=float)
        seasonal = amp * np.sin(2 * np.pi * t / 12.0)

        vals = base + (slope * (t - months / 2)) + seasonal + noise
        return [float(np.clip(v, 0.05, 0.85)) for v in vals.tolist()]

    @staticmethod
    def get_recent_month_labels(count: int = 12) -> list[str]:
        today = dt.date.today()
        return months_labels(today, count)

