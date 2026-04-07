from pydantic import BaseModel, Field
from typing import Optional


class LandHealthResponse(BaseModel):
    score: float = Field(ge=0, le=100)
    label: str
    confidence: float = Field(ge=0, le=1)
    ndvi: float = Field(ge=0, le=100)
    rainfall: float = Field(ge=0, le=100)
    soil: float = Field(ge=0, le=100)
    temperature: float = Field(ge=0, le=100)


class ZonePercentages(BaseModel):
    stressed: float
    sparse: float
    healthy: float
    dense: float


class ZoneCell(BaseModel):
    row: int
    col: int
    ndvi: float
    zone: str


class ZoneMapResponse(BaseModel):
    percentages: ZonePercentages
    grid_size: int
    cells: list[ZoneCell]


class ValuationFactor(BaseModel):
    name: str
    contribution: float  # percentage contribution
    score: float  # raw score value


class ValuationResponse(BaseModel):
    low: float
    mid: float
    high: float
    currency: str = "INR"
    confidence: float = Field(ge=0, le=1, default=0.75)
    top_factors: list[ValuationFactor] = []
    disclaimer: str = "This is an estimated intelligence range, not a legal or government guideline valuation."


# External API Response Schemas
class SoilDataResponse(BaseModel):
    ph: float
    organic_carbon: float  # g/kg
    clay: float  # %
    sand: float  # %
    silt: float  # %
    texture_class: str
    confidence: float
    source: str = "ISRIC SoilGrids"


class WeatherDataResponse(BaseModel):
    temperature_mean: float  # °C
    temperature_min: float
    temperature_max: float
    precipitation_annual: float  # mm/year
    precipitation_days: int
    heat_stress_days: int
    monthly_temps: list[float]
    monthly_precip: list[float]
    rainfall_status: str  # "surplus", "normal", "deficit"
    source: str = "Open-Meteo"


class ProximityDataResponse(BaseModel):
    nearest_highway_km: float
    nearest_town_km: float
    nearest_water_km: float
    highway_name: Optional[str]
    town_name: Optional[str]
    water_name: Optional[str]
    source: str = "OpenStreetMap"


class LocationInfoResponse(BaseModel):
    display_name: str
    village: Optional[str]
    town: Optional[str]
    city: Optional[str]
    district: Optional[str]
    state: Optional[str]
    country: str
    source: str = "OSM Nominatim"


class FullLandIntelligenceResponse(BaseModel):
    """Combined response with all land intelligence data."""
    latitude: float
    longitude: float
    location: Optional[LocationInfoResponse]
    health: LandHealthResponse
    soil: Optional[SoilDataResponse]
    weather: Optional[WeatherDataResponse]
    proximity: Optional[ProximityDataResponse]
    valuation: ValuationResponse
    zones: ZonePercentages
