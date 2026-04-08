from __future__ import annotations

from typing import Dict, List, Tuple

from pydantic import BaseModel, Field

from app.schemas.common import Confidence, DataSourceTrace, ExplanationItem


class CanopyBlob(BaseModel):
    id: int
    x: float
    y: float
    radius: float
    area_sq_m: float
    is_stressed: bool


class CanopyComparison(BaseModel):
    from_date: str
    to_date: str
    missing_count: int
    new_count: int


class CanopyDetectionResult(BaseModel):
    parcel_id: str
    mode: str = "mock"
    method: str = Field(description="blob or watershed")
    total_canopy_count: int
    density_per_acre: float
    median_canopy_area_sq_m: float
    blobs: List[CanopyBlob]
    stressed_canopy_ids: List[int]
    comparison: CanopyComparison | None = None
    confidence: Confidence
    explanation: str
    data_traces: List[DataSourceTrace] = Field(default_factory=list)
    factor_explanations: List[ExplanationItem] = Field(default_factory=list)

