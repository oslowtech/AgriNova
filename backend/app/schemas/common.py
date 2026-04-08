from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ExplanationItem(BaseModel):
    factor: str
    direction: str = Field(description="e.g. 'up', 'down', 'mixed'")
    detail: str


class Confidence(BaseModel):
    score: float = Field(ge=0.0, le=1.0, description="0-1 confidence")
    notes: str = ""


class DataSourceTrace(BaseModel):
    source: str
    timestamp_iso: str
    mode: str = "mock"
    details: Dict[str, Any] = Field(default_factory=dict)


class WarningItem(BaseModel):
    code: str
    message: str


class GeoJSONDict(BaseModel):
    """Loose GeoJSON container."""

    # GeoJSON can be Feature/Geometry/FeatureCollection; keep it flexible.
    data: Dict[str, Any]


class MonthlySeries(BaseModel):
    """Monthly time series (values in chronological order)."""

    months: List[str] = Field(description="ISO month labels (e.g. 2025-01)")
    values: List[float]

