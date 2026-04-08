from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from app.schemas.common import Confidence, DataSourceTrace, ExplanationItem
from app.schemas.signals import NDVITrendSignal, RainfallSignal, SoilSignal, TemperatureSignal


class LandHealthWeights(BaseModel):
    ndvi_trend: float = Field(description="Weight for NDVI trend (0-1)")
    rainfall_adequacy: float = Field(description="Weight for rainfall adequacy (0-1)")
    soil_quality: float = Field(description="Weight for soil quality (0-1)")
    temperature_suitability: float = Field(description="Weight for temperature suitability (0-1)")


class CompositeLandHealth(BaseModel):
    land_health_score: float = Field(description="Composite score (0-100)")
    health_class: str = Field(description="Healthy / Moderate / At Risk")
    confidence: Confidence
    weights: LandHealthWeights
    factor_breakdown: Dict[str, float] = Field(
        description="Subscore contributions mapped to 0-100 each."
    )
    warnings: List[ExplanationItem] = Field(default_factory=list)
    explanation: str


class LandHealthResponse(BaseModel):
    parcel_id: str
    mode: str = "mock"
    signals: Dict[str, object] = Field(
        description="Signal payload keyed as ndvi, rainfall, temperature, soil"
    )
    composite: CompositeLandHealth
    data_traces: List[DataSourceTrace] = Field(default_factory=list)

