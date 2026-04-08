from __future__ import annotations

import datetime as dt
from typing import List, Tuple

from app.data_sources.base import StaticGeoContext
from app.data_sources.mock.osm_proximity import MockOSMProximityDataSource
from app.data_sources.mock.viirs_nightlight import MockVIIRSNightLightDataSource
from app.schemas.common import Confidence, DataSourceTrace
from app.schemas.land_health import LandHealthResponse
from app.schemas.valuation import FactorContribution, ValuationRange, ValuationResult


def _rs_band_from_index(v_index: float) -> str:
    # Stable thresholds for demo mode.
    if v_index < 0.45:
        return "Low"
    if v_index < 0.65:
        return "Mid"
    return "High"


class ValuationService:
    """
    FR-34..FR-38 valuation based on the required factor weights.
    """

    def __init__(self) -> None:
        self.osm = MockOSMProximityDataSource()
        self.viirs = MockVIIRSNightLightDataSource()

    def compute_valuation(
        self,
        parcel_id: str,
        centroid_wgs84: tuple[float, float],
        land_health: LandHealthResponse,
    ) -> ValuationResult:
        mode = land_health.mode

        ctx = StaticGeoContext(
            centroid_wgs84=centroid_wgs84,
            bbox_wgs84=(
                centroid_wgs84[0] - 0.01,
                centroid_wgs84[1] - 0.01,
                centroid_wgs84[0] + 0.01,
                centroid_wgs84[1] + 0.01,
            ),
            mode=mode,
        )

        # Required weights (sum to 1.0)
        w_land_health = 0.30
        w_soil_quality = 0.20
        w_rainfall_adequacy = 0.15
        w_osm_proximity = 0.25
        w_nightlight = 0.10

        land_health_score = float(land_health.composite.land_health_score)
        soil_quality_score = float(land_health.composite.factor_breakdown["soil_quality"])
        rainfall_adequacy_score = float(land_health.composite.factor_breakdown["rainfall_adequacy"])

        osm_signals = self.osm.get_osm_proximity_signals(ctx)
        proximity_score_0_100 = float(osm_signals["proximity_score"])
        proximity_norm = proximity_score_0_100 / 100.0

        nightlight_index_0_1 = float(self.viirs.get_nightlight_index(ctx))

        # Normalize all to 0..1
        land_health_norm = land_health_score / 100.0
        soil_quality_norm = soil_quality_score / 100.0
        rainfall_adequacy_norm = rainfall_adequacy_score / 100.0

        # Weighted index
        v_index = (
            w_land_health * land_health_norm
            + w_soil_quality * soil_quality_norm
            + w_rainfall_adequacy * rainfall_adequacy_norm
            + w_osm_proximity * proximity_norm
            + w_nightlight * nightlight_index_0_1
        )

        band = _rs_band_from_index(v_index)

        # Convert to a realistic "intelligence range" (demo-scale).
        rs_mid = 600.0 + 1300.0 * v_index  # 600..1890-ish
        low = rs_mid * 0.85
        high = rs_mid * 1.15
        valuation_range = ValuationRange(low=float(low), mid=float(rs_mid), high=float(high))

        # Confidence: combine land-health confidence with modest assumed confidence for other layers.
        base_conf = float(land_health.composite.confidence.score)
        osm_conf = 0.7
        night_conf = 0.65
        confidence_score = float(max(0.0, min(1.0, 0.55 * base_conf + 0.2 * osm_conf + 0.25 * night_conf)))

        disclaimer = (
            "This is an estimated intelligence range for decision support. It is not a legal/government "
            "valuation and should not be used as an official appraisal."
        )

        # Factor contributions for explainability and FR-37.
        factor_contributions = {
            "land_health_score": w_land_health * land_health_norm,
            "soil_quality": w_soil_quality * soil_quality_norm,
            "rainfall_adequacy": w_rainfall_adequacy * rainfall_adequacy_norm,
            "osm_proximity": w_osm_proximity * proximity_norm,
            "nightlight_index": w_nightlight * nightlight_index_0_1,
        }

        # Compute signed deltas relative to a neutral baseline of 0.5 for each normalized factor.
        baseline = 0.5
        candidates: list[Tuple[str, str, float]] = []  # (factor, direction, delta)

        def add_factor(name: str, direction: str, delta: float) -> None:
            candidates.append((name, direction, delta))

        deltas = {
            "Land Health Score": w_land_health * (land_health_norm - baseline),
            "Soil Quality": w_soil_quality * (soil_quality_norm - baseline),
            "Rainfall Adequacy": w_rainfall_adequacy * (rainfall_adequacy_norm - baseline),
            "OSM Proximity Signals": w_osm_proximity * (proximity_norm - baseline),
            "VIIRS Night Light Index": w_nightlight * (nightlight_index_0_1 - baseline),
        }
        for factor_name, delta in deltas.items():
            direction = "up" if delta > 0 else "down" if delta < 0 else "mixed"
            if direction != "mixed":
                add_factor(factor_name, direction, float(delta))

        # Top impacts (upward and downward) based on absolute delta.
        ups = sorted([c for c in candidates if c[1] == "up"], key=lambda t: abs(t[2]), reverse=True)[:3]
        downs = sorted([c for c in candidates if c[1] == "down"], key=lambda t: abs(t[2]), reverse=True)[:3]

        top_factors: List[FactorContribution] = []
        for factor_name, direction, delta in ups:
            top_factors.append(
                FactorContribution(
                    factor=factor_name,
                    direction=direction,
                    delta_normalized=delta,
                    details="Positive delta relative to neutral baseline (0.5).",
                )
            )
        for factor_name, direction, delta in downs:
            top_factors.append(
                FactorContribution(
                    factor=factor_name,
                    direction=direction,
                    delta_normalized=delta,
                    details="Negative delta relative to neutral baseline (0.5).",
                )
            )

        # Make sure we output the top 3 factors total if too many.
        top_factors = sorted(top_factors, key=lambda f: abs(f.delta_normalized), reverse=True)[:3]

        return ValuationResult(
            parcel_id=parcel_id,
            mode=mode,
            valuation_band=band,
            estimated_intelligence_range_rs_per_acre=valuation_range,
            confidence=Confidence(score=confidence_score, notes="Combined confidence across layers"),
            disclaimer=disclaimer,
            factor_contributions=factor_contributions,
            top_factors=top_factors,
            data_traces=[
                DataSourceTrace(
                    source="OSM proximity signals (mock)",
                    timestamp_iso=dt.datetime.utcnow().isoformat(),
                    mode=mode,
                    details=osm_signals,
                ),
                DataSourceTrace(
                    source="VIIRS nightlight index (mock)",
                    timestamp_iso=dt.datetime.utcnow().isoformat(),
                    mode=mode,
                    details={"nightlight_index_0_1": nightlight_index_0_1},
                ),
            ],
        )

