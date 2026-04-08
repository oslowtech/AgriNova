from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field

from app.schemas.common import Confidence, DataSourceTrace, ExplanationItem, MonthlySeries


class NDVITrendSignal(BaseModel):
    current_value: float
    mean_2yr: float
    monthly_trend: MonthlySeries
    status_label: str = Field(description="Healthy / Degrading / Recovering")
    trend_indicator: str = Field(description="Up / Down / Stable")
    confidence: Confidence
    explanation: str
    factor_explanations: List[ExplanationItem] = Field(default_factory=list)
    data_traces: List[DataSourceTrace] = Field(default_factory=list)


class RainfallSignal(BaseModel):
    annual_mm: float
    monthly_distribution: MonthlySeries
    historical_normal_annual_mm: float
    deviation_from_normal_mm: float
    surplus_deficit_flag: str = Field(description="Surplus / Deficit / Neutral")
    trend_indicator: str = Field(description="Up / Down / Stable")
    confidence: Confidence
    explanation: str
    data_traces: List[DataSourceTrace] = Field(default_factory=list)


class TemperatureSignal(BaseModel):
    label: str = Field(
        description="Regional-level temperature signal (not parcel-level precision)."
    )
    monthly_trend: MonthlySeries
    heat_stress_event_count: int
    trend_indicator: str = Field(description="Up / Down / Stable")
    confidence: Confidence
    explanation: str
    data_traces: List[DataSourceTrace] = Field(default_factory=list)


class SoilSignal(BaseModel):
    soil_type: str
    ph: float
    organic_carbon: float = Field(description="Organic carbon percent (wt%)")
    texture: str
    confidence: Confidence
    explanation: str
    data_traces: List[DataSourceTrace] = Field(default_factory=list)

