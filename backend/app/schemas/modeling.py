from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class ModelMetrics(BaseModel):
    rmse: float
    mae: float
    r2: float
    runtime_ms: float
    inference_latency_ms: float
    confidence_score: float = Field(ge=0.0, le=1.0)


class AlgorithmComparisonItem(BaseModel):
    algorithm: str
    available: bool = True
    reason_unavailable: Optional[str] = None
    metrics: Optional[ModelMetrics] = None
    best_overall_score: Optional[float] = None


class ModelCompareResponse(BaseModel):
    run_id: str
    task: str = "valuation_regression"
    n_samples: int
    results: List[AlgorithmComparisonItem]
    winner: Optional[str] = None
    active_algorithm: Optional[str] = None


class ModelTrainRequest(BaseModel):
    parcel_id: str
    n_samples: int = 500
    random_seed: int = 42

