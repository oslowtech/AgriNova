from __future__ import annotations

from typing import Dict, List

from pydantic import BaseModel, Field

from app.schemas.common import Confidence, DataSourceTrace


class ZoneClass(BaseModel):
    name: str
    range: str
    color: str
    area_percent: float


class ZoneComparison(BaseModel):
    from_date: str
    to_date: str
    lower_health_area_increase_percent: float
    summary: str


class ZoneMapResponse(BaseModel):
    parcel_id: str
    mode: str = "mock"
    generated_at_iso: str
    legend: List[ZoneClass]
    zones_geojson: Dict
    comparison: ZoneComparison | None = None
    confidence: Confidence
    data_traces: List[DataSourceTrace] = Field(default_factory=list)

