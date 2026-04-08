from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, Optional, Protocol, Tuple


class GeoContext(Protocol):
    centroid_wgs84: tuple[float, float]
    bbox_wgs84: tuple[float, float, float, float]
    mode: str


@dataclass(frozen=True)
class StaticGeoContext:
    centroid_wgs84: tuple[float, float]
    bbox_wgs84: tuple[float, float, float, float]
    mode: str


class NDVIDataSource(ABC):
    @abstractmethod
    def get_current_ndvi(self, ctx: GeoContext) -> float:
        raise NotImplementedError

    @abstractmethod
    def get_ndvi_monthly_series(self, ctx: GeoContext, months: int = 24) -> list[float]:
        raise NotImplementedError


class RainfallDataSource(ABC):
    @abstractmethod
    def get_rainfall_monthly_series(self, ctx: GeoContext, months: int = 12) -> list[float]:
        raise NotImplementedError

    @abstractmethod
    def get_rainfall_historical_normal(self, ctx: GeoContext, months: int = 12) -> list[float]:
        raise NotImplementedError


class TemperatureDataSource(ABC):
    @abstractmethod
    def get_temperature_monthly_series(
        self, ctx: GeoContext, months: int = 12
    ) -> list[float]:
        raise NotImplementedError


class SoilDataSource(ABC):
    @abstractmethod
    def get_soil_profile(self, ctx: GeoContext) -> Dict[str, Any]:
        raise NotImplementedError


class OSMProximityDataSource(ABC):
    @abstractmethod
    def get_osm_proximity_signals(self, ctx: GeoContext) -> Dict[str, Any]:
        raise NotImplementedError


class NightLightDataSource(ABC):
    @abstractmethod
    def get_nightlight_index(self, ctx: GeoContext) -> float:
        raise NotImplementedError

