from __future__ import annotations

import hashlib
import math

import numpy as np

from app.data_sources.base import GeoContext, OSMProximityDataSource


def _seed_from_ctx(ctx: GeoContext) -> int:
    raw = f"osm:{ctx.centroid_wgs84[0]:.6f},{ctx.centroid_wgs84[1]:.6f}:{ctx.mode}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


class MockOSMProximityDataSource(OSMProximityDataSource):
    """
    FR-34 uses OSM proximity signals as a feature for valuation.

    In mock mode we generate deterministic distances to roads/markets and map them to a 0-100 score.
    """

    def get_osm_proximity_signals(self, ctx: GeoContext) -> dict:
        rng = np.random.default_rng(_seed_from_ctx(ctx))

        distance_to_road_km = float(np.clip(rng.lognormal(mean=0.0, sigma=0.7), 0.05, 40.0))
        distance_to_market_km = float(np.clip(rng.lognormal(mean=0.4, sigma=0.8), 0.1, 80.0))

        # Smaller distance => higher proximity.
        road_score = 100.0 * math.exp(-distance_to_road_km / 8.0)
        market_score = 100.0 * math.exp(-distance_to_market_km / 15.0)

        proximity_score = float(np.clip(0.6 * road_score + 0.4 * market_score, 0.0, 100.0))
        return {
            "distance_to_road_km": distance_to_road_km,
            "distance_to_market_km": distance_to_market_km,
            "proximity_score": proximity_score,
        }

