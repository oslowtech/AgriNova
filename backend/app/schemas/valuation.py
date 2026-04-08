from __future__ import annotations

from typing import Dict, List

from pydantic import BaseModel, Field

from app.schemas.common import Confidence, DataSourceTrace


class FactorContribution(BaseModel):
    factor: str
    direction: str = Field(description="up or down")
    delta_normalized: float = Field(description="Signed delta in 0-1 normalized score")
    details: str = ""


class ValuationRange(BaseModel):
    low: float
    mid: float
    high: float


class ValuationResult(BaseModel):
    parcel_id: str
    mode: str = "mock"
    valuation_band: str = Field(description="Low / Mid / High")
    estimated_intelligence_range_rs_per_acre: ValuationRange
    confidence: Confidence
    disclaimer: str
    factor_contributions: Dict[str, float] = Field(
        description="Normalized factor contributions (0-1) used in scoring."
    )
    top_factors: List[FactorContribution] = Field(
        description="Top factors driving estimate upward/downward."
    )
    data_traces: List[DataSourceTrace] = Field(default_factory=list)

