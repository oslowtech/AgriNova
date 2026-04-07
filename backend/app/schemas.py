from pydantic import BaseModel, Field


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


class ValuationResponse(BaseModel):
    low: float
    mid: float
    high: float
    currency: str = "USD"
