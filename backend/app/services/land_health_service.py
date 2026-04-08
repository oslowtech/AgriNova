from __future__ import annotations

import datetime as dt
from typing import Any, Dict, List

from app.core.settings import settings
from app.data_sources.base import StaticGeoContext
from app.data_sources.mock.chirps import MockCHIRPSRainfallDataSource
from app.data_sources.mock.era5 import MockERA5TemperatureDataSource
from app.data_sources.mock.ndvi_birdscale import MockBirdscaleNDVIDataSource
from app.data_sources.mock.sentinel2 import MockSentinel2NDVIDataSource
from app.data_sources.mock.soilgrids import MockISRICSoilGridsDataSource
from app.schemas.common import Confidence, DataSourceTrace, ExplanationItem
from app.schemas.land_health import CompositeLandHealth, LandHealthResponse, LandHealthWeights
from app.schemas.signals import NDVITrendSignal, RainfallSignal, SoilSignal, TemperatureSignal
from app.services.scoring_engine import (
    composite_confidence,
    compute_ndvi_trend,
    compute_rainfall_adequacy,
    compute_soil_quality_score,
    compute_temperature_suitability_score,
    health_class_from_score,
    land_health_score_from_subscores,
)


def _recent_month_labels(count: int) -> list[str]:
    today = dt.date.today()
    labels: list[str] = []
    y = today.year
    m = today.month
    for _ in range(count):
        labels.append(f"{y:04d}-{m:02d}")
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    labels.reverse()
    return labels


def _trend_indicator_from_months(values: List[float]) -> str:
    # Lightweight trend: compare first half vs second half means.
    half = max(1, len(values) // 2)
    first = sum(values[:half]) / half
    second = sum(values[half:]) / max(1, len(values) - half)
    if second - first > 0.0:
        return "Up"
    if second - first < 0.0:
        return "Down"
    return "Stable"


class LandHealthService:
    def __init__(self) -> None:
        mode = settings.landroid_mode
        if mode != "mock":
            # For now, keep mock-first. Live adapters will be plugged in later.
            raise RuntimeError(f"Live mode not implemented yet (requested: {mode}).")

        self.mode = mode
        self.ndvi_birdscale = MockBirdscaleNDVIDataSource()
        self.ndvi_sentinel2 = MockSentinel2NDVIDataSource()
        self.rain_chirps = MockCHIRPSRainfallDataSource()
        self.temp_era5 = MockERA5TemperatureDataSource()
        self.soil = MockISRICSoilGridsDataSource()

    def compute_land_health(self, parcel_id: str, centroid_wgs84: tuple[float, float]) -> LandHealthResponse:
        ctx = StaticGeoContext(
            centroid_wgs84=centroid_wgs84,
            # bbox_wgs84 isn't available yet; mock providers use bbox seed in temp generator.
            # For now, approximate bbox around centroid to keep deterministic regional behavior.
            bbox_wgs84=(
                centroid_wgs84[0] - 0.01,
                centroid_wgs84[1] - 0.01,
                centroid_wgs84[0] + 0.01,
                centroid_wgs84[1] + 0.01,
            ),
            mode=self.mode,
        )

        # FR-18: Birdscale NDVI current
        ndvi_current = self.ndvi_birdscale.get_current_ndvi(ctx)

        # FR-18: Sentinel-2 NDVI history (24 months)
        ndvi_monthly_24 = self.ndvi_sentinel2.get_ndvi_monthly_series(ctx, months=24)
        ndvi_2yr_mean = float(sum(ndvi_monthly_24) / len(ndvi_monthly_24))

        # FR-18: Monthly trend array (we use last 12 months for charting)
        ndvi_monthly_12 = ndvi_monthly_24[-12:]
        ndvi_months_12 = _recent_month_labels(12)

        ndvi_scoring = compute_ndvi_trend(ndvi_current, ndvi_2yr_mean, ndvi_monthly_12)

        ndvi_signal = NDVITrendSignal(
            current_value=float(ndvi_current),
            mean_2yr=float(ndvi_2yr_mean),
            monthly_trend={"months": ndvi_months_12, "values": [float(v) for v in ndvi_monthly_12]},
            status_label=ndvi_scoring["status_label"],
            trend_indicator=ndvi_scoring["trend_indicator"],
            confidence=Confidence(score=ndvi_scoring["confidence"], notes="R2-modulated confidence"),
            explanation=ndvi_scoring["explanation"],
            factor_explanations=[
                ExplanationItem(
                    factor="NDVI level vs 2-year mean",
                    direction="mixed",
                    detail=f"Current={ndvi_current:.3f}, 2y mean={ndvi_2yr_mean:.3f}",
                ),
                ExplanationItem(
                    factor="Monthly NDVI trend slope",
                    direction=ndvi_scoring["trend_indicator"].lower(),
                    detail=f"Slope={ndvi_scoring['trend_slope']:.4f} (r2={ndvi_scoring['r2']:.2f})",
                ),
            ],
            data_traces=[
                DataSourceTrace(
                    source="Birdscale NDVI raster (current)",
                    timestamp_iso=dt.datetime.utcnow().isoformat(),
                    mode=self.mode,
                    details={"mock": True},
                ),
                DataSourceTrace(
                    source="Planetary Computer Sentinel-2 (NDVI, monthly time series)",
                    timestamp_iso=dt.datetime.utcnow().isoformat(),
                    mode=self.mode,
                    details={"months_used": 24},
                ),
            ],
        )

        # FR-19: Rainfall from CHIRPS (last 12 months)
        rainfall_monthly = self.rain_chirps.get_rainfall_monthly_series(ctx, months=12)
        rainfall_normal_monthly = self.rain_chirps.get_rainfall_historical_normal(ctx, months=12)
        rainfall_months_12 = _recent_month_labels(12)

        annual_mm = float(sum(rainfall_monthly))
        normal_annual_mm = float(sum(rainfall_normal_monthly))
        rainfall_scoring = compute_rainfall_adequacy(annual_mm, normal_annual_mm, rainfall_monthly)

        rainfall_signal = RainfallSignal(
            annual_mm=annual_mm,
            monthly_distribution={"months": rainfall_months_12, "values": [float(v) for v in rainfall_monthly]},
            historical_normal_annual_mm=normal_annual_mm,
            deviation_from_normal_mm=rainfall_scoring["deviation_mm"],
            surplus_deficit_flag=rainfall_scoring["surplus_deficit_flag"],
            trend_indicator=rainfall_scoring["trend_indicator"],
            confidence=Confidence(score=rainfall_scoring["confidence"], notes="Evenness + deviation"),
            explanation=rainfall_scoring["explanation"],
            data_traces=[
                DataSourceTrace(
                    source="Planetary Computer CHIRPS (monthly rainfall)",
                    timestamp_iso=dt.datetime.utcnow().isoformat(),
                    mode=self.mode,
                    details={"months_used": 12},
                )
            ],
        )

        # FR-20: Regional temperature from ERA5 (last 12 months)
        temp_monthly = self.temp_era5.get_temperature_monthly_series(ctx, months=12)
        temp_months_12 = _recent_month_labels(12)

        heat_stress_event_count = int(sum(1 for t in temp_monthly if t >= 35.0))
        temp_score = compute_temperature_suitability_score(temp_monthly)

        temp_signal = TemperatureSignal(
            label="Regional-level temperature (ERA5 bounding-box average)",
            monthly_trend={"months": temp_months_12, "values": [float(v) for v in temp_monthly]},
            heat_stress_event_count=heat_stress_event_count,
            trend_indicator=_trend_indicator_from_months(temp_monthly),
            confidence=Confidence(score=temp_score["confidence"], notes="Within-optimal fraction"),
            explanation=temp_score["explanation"],
            data_traces=[
                DataSourceTrace(
                    source="Planetary Computer ERA5 (regional monthly means)",
                    timestamp_iso=dt.datetime.utcnow().isoformat(),
                    mode=self.mode,
                    details={"heat_threshold_c": 35.0},
                )
            ],
        )

        # FR-21: Soil profile at centroid
        soil_profile = self.soil.get_soil_profile(ctx)
        soil_scoring = compute_soil_quality_score(soil_profile)

        soil_signal = SoilSignal(
            soil_type=str(soil_profile["soil_type"]),
            ph=float(soil_profile["ph"]),
            organic_carbon=float(soil_profile["organic_carbon"]),
            texture=str(soil_profile["texture"]),
            confidence=Confidence(score=soil_scoring["confidence"], notes="pH+organic+texture mapping"),
            explanation=soil_scoring["explanation"],
            data_traces=[
                DataSourceTrace(
                    source="ISRIC SoilGrids (centroid soil profile)",
                    timestamp_iso=dt.datetime.utcnow().isoformat(),
                    mode=self.mode,
                    details={"mock": True},
                )
            ],
        )

        # FR-22: Composite score using exact weights
        weights = (0.4, 0.3, 0.2, 0.1)  # NDVI trend, rainfall adequacy, soil, temperature suitability
        land_health_score = land_health_score_from_subscores(
            ndvi_score=ndvi_scoring["score"],
            rainfall_score=rainfall_scoring["score"],
            soil_score=soil_scoring["score"],
            temperature_score=temp_score["score"],
            weights=weights,
        )

        health_class = health_class_from_score(land_health_score)

        composite_conf = composite_confidence(
            ndvi_conf=ndvi_scoring["confidence"],
            rain_conf=rainfall_scoring["confidence"],
            soil_conf=soil_scoring["confidence"],
            temp_conf=temp_score["confidence"],
            weights=weights,
        )

        weights_obj = LandHealthWeights(
            ndvi_trend=weights[0],
            rainfall_adequacy=weights[1],
            soil_quality=weights[2],
            temperature_suitability=weights[3],
        )

        composite = CompositeLandHealth(
            land_health_score=land_health_score,
            health_class=health_class,
            confidence=Confidence(score=composite_conf, notes="Weighted subscore confidence"),
            weights=weights_obj,
            factor_breakdown={
                "ndvi_trend": float(ndvi_scoring["score"]),
                "rainfall_adequacy": float(rainfall_scoring["score"]),
                "soil_quality": float(soil_scoring["score"]),
                "temperature_suitability": float(temp_score["score"]),
            },
            warnings=[],
            explanation=(
                "Composite score uses transparent weights: NDVI trend (40%), rainfall adequacy (30%), "
                "soil quality (20%), and temperature suitability (10%). Each subscore includes an "
                "explainable confidence component."
            ),
        )

        # FR-24 cards (signal cards)
        response = LandHealthResponse(
            parcel_id=parcel_id,
            mode=self.mode,
            signals={
                "ndvi": ndvi_signal,
                "rainfall": rainfall_signal,
                "temperature": temp_signal,
                "soil": soil_signal,
            },
            composite=composite,
            data_traces=[
                DataSourceTrace(
                    source="LandHealthService aggregate",
                    timestamp_iso=dt.datetime.utcnow().isoformat(),
                    mode=self.mode,
                    details={"parcel_id": parcel_id},
                )
            ],
        )
        return response

