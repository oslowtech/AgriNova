from __future__ import annotations

import hashlib
import math

import numpy as np

from app.data_sources.base import GeoContext, SoilDataSource


def _seed_from_ctx(ctx: GeoContext) -> int:
    raw = f"soil:{ctx.centroid_wgs84[0]:.6f},{ctx.centroid_wgs84[1]:.6f}:{ctx.mode}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


class MockISRICSoilGridsDataSource(SoilDataSource):
    """
    FR-21 soil profile comes from ISRIC SoilGrids REST API.

    In mock mode we generate plausible soil chemistry and texture classes.
    """

    def get_soil_profile(self, ctx: GeoContext) -> dict:
        rng = np.random.default_rng(_seed_from_ctx(ctx))
        lon, lat = ctx.centroid_wgs84

        # Soil type and texture (coarse categorical)
        textures = ["clay", "silty_clay", "loam", "sandy_loam", "sand"]
        texture = textures[int(rng.integers(0, len(textures)))]

        soil_types = ["Ferralsol", "Luvisol", "Cambisol", "Vertisol", "Acrisols", "Regosol"]
        soil_type = soil_types[int(rng.integers(0, len(soil_types)))]

        # Chemistry (ranges inspired by typical soils)
        ph = float(np.clip(5.0 + 1.8 * math.sin(math.radians(lat * 2.0)) + rng.normal(0, 0.6), 4.0, 8.8))
        organic_carbon = float(np.clip(0.4 + 1.6 * rng.random() + 0.2 * math.cos(math.radians(lon)), 0.1, 4.5))

        # Organic carbon and texture influence pH modestly in mock
        if texture in {"clay", "silty_clay"}:
            organic_carbon *= 1.08
            ph += 0.1
        if texture == "sand":
            organic_carbon *= 0.85
            ph -= 0.1

        return {
            "soil_type": soil_type,
            "ph": float(np.clip(ph, 4.0, 8.8)),
            "organic_carbon": float(np.clip(organic_carbon, 0.05, 6.0)),
            "texture": texture,
        }

