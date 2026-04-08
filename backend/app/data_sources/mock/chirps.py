from __future__ import annotations

import datetime as dt
import hashlib
import math

import numpy as np

from app.data_sources.base import GeoContext, RainfallDataSource


def _seed_from_ctx(ctx: GeoContext) -> int:
    raw = f"chirps:{ctx.centroid_wgs84[0]:.6f},{ctx.centroid_wgs84[1]:.6f}:{ctx.mode}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def month_labels(end: dt.date, count: int) -> list[str]:
    labels: list[str] = []
    y = end.year
    m = end.month
    for _ in range(count):
        labels.append(f"{y:04d}-{m:02d}")
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    labels.reverse()
    return labels


class MockCHIRPSRainfallDataSource(RainfallDataSource):
    """
    FR-19 rainfall comes from Planetary Computer CHIRPS.

    In mock mode we generate deterministic monthly rainfall and a historical normal.
    """

    @staticmethod
    def get_recent_month_labels(count: int = 12) -> list[str]:
        today = dt.date.today()
        return month_labels(today, count)

    def get_rainfall_monthly_series(self, ctx: GeoContext, months: int = 12) -> list[float]:
        rng = np.random.default_rng(_seed_from_ctx(ctx))
        _, lat = ctx.centroid_wgs84

        base = 40 + 20 * math.sin(math.radians(lat * 2.0))
        amp = rng.uniform(60, 200)  # seasonal amplitude
        phase = rng.uniform(0, 2 * math.pi)
        t = np.arange(months, dtype=float)

        seasonal = amp * np.sin(2 * np.pi * t / 12.0 + phase) + amp * 0.15
        normal = np.clip(base + seasonal + rng.normal(0, 12, size=months), 0, None)

        # Apply anomaly to produce a "current" year.
        anomaly = rng.normal(0, 0.18)  # +/- 18%
        current = normal * (1.0 + anomaly) + rng.normal(0, 10, size=months)
        return [float(np.clip(v, 0, None)) for v in current.tolist()]

    def get_rainfall_historical_normal(self, ctx: GeoContext, months: int = 12) -> list[float]:
        rng = np.random.default_rng(_seed_from_ctx(ctx) ^ 0xC11F)
        _, lat = ctx.centroid_wgs84

        base = 45 + 18 * math.sin(math.radians(lat * 2.0))
        amp = rng.uniform(50, 180)
        phase = rng.uniform(0, 2 * math.pi)
        t = np.arange(months, dtype=float)

        seasonal = amp * np.sin(2 * np.pi * t / 12.0 + phase) + amp * 0.1
        normal = np.clip(base + seasonal + rng.normal(0, 10, size=months), 0, None)
        return [float(np.clip(v, 0, None)) for v in normal.tolist()]

