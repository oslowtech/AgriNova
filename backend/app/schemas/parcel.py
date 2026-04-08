from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field

from app.schemas.common import GeoJSONDict


class ParcelCreate(BaseModel):
    parcel_name: Optional[str] = Field(default=None)
    geometry: Dict[str, Any] = Field(
        description="GeoJSON geometry/feature/featurecollection for the parcel boundary or footprint."
    )

    # Optional: provide centroid explicitly when you already computed it.
    centroid_wgs84: Optional[tuple[float, float]] = Field(
        default=None, description="(lon, lat) in WGS84"
    )


class ParcelResponse(BaseModel):
    parcel_id: str
    parcel_name: Optional[str] = None
    geometry: Dict[str, Any]
    centroid_wgs84: tuple[float, float]
    bbox_wgs84: tuple[float, float, float, float] = Field(
        description="(min_lon, min_lat, max_lon, max_lat)"
    )

    mode: str = "mock"

