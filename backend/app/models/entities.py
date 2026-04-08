from __future__ import annotations

import datetime as dt
import json
from typing import Any, Dict, List, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class ParcelEntity(Base):
    __tablename__ = "parcels"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    parcel_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    geometry_geojson: Mapped[str] = mapped_column(Text)  # GeoJSON payload
    centroid_wgs84_json: Mapped[str] = mapped_column(Text)  # "[lon, lat]"
    bbox_wgs84_json: Mapped[str] = mapped_column(Text)  # "[min_lon, min_lat, max_lon, max_lat]"
    mode: Mapped[str] = mapped_column(String, default="mock")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

    def centroid_wgs84(self) -> tuple[float, float]:
        data = json.loads(self.centroid_wgs84_json)
        return float(data[0]), float(data[1])

    def bbox_wgs84(self) -> tuple[float, float, float, float]:
        data = json.loads(self.bbox_wgs84_json)
        return float(data[0]), float(data[1]), float(data[2]), float(data[3])


class LandHealthEntity(Base):
    __tablename__ = "land_health_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    parcel_id: Mapped[str] = mapped_column(String, ForeignKey("parcels.id"))
    computed_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)
    mode: Mapped[str] = mapped_column(String, default="mock")
    payload_json: Mapped[str] = mapped_column(Text)  # JSON-serialized LandHealthResponse


class ValuationEntity(Base):
    __tablename__ = "valuation_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    parcel_id: Mapped[str] = mapped_column(String, ForeignKey("parcels.id"))
    computed_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)
    mode: Mapped[str] = mapped_column(String, default="mock")
    payload_json: Mapped[str] = mapped_column(Text)  # JSON-serialized ValuationResult


class RasterUploadEntity(Base):
    __tablename__ = "rasters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    parcel_id: Mapped[str] = mapped_column(String, ForeignKey("parcels.id"))
    kind: Mapped[str] = mapped_column(String)  # "ndvi" or other
    path: Mapped[str] = mapped_column(String)
    uploaded_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)


class OrthomosaicUploadEntity(Base):
    __tablename__ = "orthomosaics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    parcel_id: Mapped[str] = mapped_column(String, ForeignKey("parcels.id"))
    path: Mapped[str] = mapped_column(String)
    uploaded_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

