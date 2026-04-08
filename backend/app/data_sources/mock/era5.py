from __future__ import annotations

import datetime as dt
import hashlib
import math

import numpy as np

from app.data_sources.base import GeoContext, TemperatureDataSource


def _seed_from_ctx(ctx: GeoContext) -> int:
    raw = f"era5:{ctx.bbox_wgs84[0]:.5f},{ctx.bbox_wgs84[1]:.5f},{ctx.mode}"
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


class MockERA5TemperatureDataSource(TemperatureDataSource):
    """
    FR-20 regional temperature comes from Planetary Computer ERA5.

    In mock mode we generate a regional-level 12-month monthly mean series based on bbox.
    """

    @staticmethod
    def get_recent_month_labels(count: int = 12) -> list[str]:
        today = dt.date.today()
        return month_labels(today, count)

    def get_temperature_monthly_series(self, ctx: GeoContext, months: int = 12) -> list[float]:
        rng = np.random.default_rng(_seed_from_ctx(ctx))
        _, lat = ctx.centroid_wgs84

        base = 24 + 6 * math.sin(math.radians(lat * 2.0))
        amp = rng.uniform(3, 8)
        phase = rng.uniform(0, 2 * math.pi)
        t = np.arange(months, dtype=float)

        seasonal = amp * np.sin(2 * np.pi * t / 12.0 + phase)
        trend = rng.normal(0.05, 0.25) * (t - months / 2) / months
        noise = rng.normal(0, 0.8, size=months)

        temps = base + seasonal + trend + noise
        return [float(np.clip(v, -5, 50)) for v in temps.tolist()]

