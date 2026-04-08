from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class ModelTrainRequest(BaseModel):
    random_seed: int = 42
    n_samples: int = 500


class ModelMetrics(BaseModel):
    algorithm: str
    task: str = Field(description="valuation_regression")
    rmse: float
    mae: float
    r2: float
    runtime_ms: float
    inference_latency_ms: float
    memory_mb_estimate: float
    calibration_score: float
    available: bool = True
    note: Optional[str] = None


class ModelPrediction(BaseModel):
    algorithm: str
    predicted_value: float


class ModelComparisonResponse(BaseModel):
    random_seed: int
    metrics: List[ModelMetrics]
    predictions_for_current_parcel: List[ModelPrediction]
    winner_algorithm: str
    best_overall_score: float

