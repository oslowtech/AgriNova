from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import math
import random
from pathlib import Path

import numpy as np

# Try to load the trained ML model
ML_MODEL = None
try:
    import joblib
    MODEL_PATH = Path(__file__).resolve().parents[2] / "ml" / "land_health_model.pkl"
    if MODEL_PATH.exists():
        ML_MODEL = joblib.load(MODEL_PATH)
        print(f"[ML] Model loaded from {MODEL_PATH}")
    else:
        print(f"[ML] Model not found at {MODEL_PATH}, using weighted formula fallback")
except ImportError:
    print("[ML] joblib not installed, using weighted formula fallback")
except Exception as e:
    print(f"[ML] Could not load model: {e}, using weighted formula fallback")


@dataclass
class LandMetrics:
    ndvi: float
    rainfall: float
    soil: float
    temperature: float
    completeness: float


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _seed_for_location(lat: float, lng: float) -> int:
    day = datetime.utcnow().strftime("%Y%m%d")
    return hash((round(lat, 3), round(lng, 3), day)) & 0xFFFFFFFF


def normalize_ndvi(raw_ndvi: float) -> float:
    # Typical NDVI range spans -1 to 1, with vegetation mostly in [0, 0.9].
    normalized = ((raw_ndvi + 1.0) / 2.0) * 100.0
    return _clamp(normalized, 0.0, 100.0)


def normalize_rainfall(rain_mm: float) -> float:
    # Peak suitability around 120mm/week, tapering toward extremes.
    score = 100.0 - (abs(rain_mm - 120.0) / 120.0) * 100.0
    return _clamp(score, 0.0, 100.0)


def normalize_soil(soil_index: float) -> float:
    return _clamp(soil_index, 0.0, 100.0)


def normalize_temperature(temp_c: float) -> float:
    # Optimal crop comfort band around 24-30C.
    optimal = 27.0
    score = 100.0 - (abs(temp_c - optimal) / 20.0) * 100.0
    return _clamp(score, 0.0, 100.0)


def classify_label(score: float) -> str:
    if score >= 70:
        return "Healthy"
    if score >= 45:
        return "Moderate"
    return "At Risk"


def confidence_score(metrics: LandMetrics) -> float:
    spread_penalty = (
        abs(metrics.ndvi - metrics.soil)
        + abs(metrics.rainfall - metrics.temperature)
    ) / 200.0
    confidence = 0.55 + (0.4 * metrics.completeness) - (0.2 * spread_penalty)
    return round(_clamp(confidence, 0.0, 0.99), 2)


def weighted_health_score(metrics: LandMetrics, raw_ndvi: float = None) -> float:
    """
    Calculate land health score using ML model if available, otherwise use weighted formula.
    
    Args:
        metrics: LandMetrics with normalized values (0-100 scale)
        raw_ndvi: Raw NDVI value (-1 to 1 scale) for ML model input
    """
    if ML_MODEL is not None:
        try:
            # Convert metrics to ML model input format
            # ML model expects: ndvi (0-1), ndvi_mean, ndvi_std, rainfall (mm), soil_pH, temperature (C)
            ndvi_normalized = raw_ndvi if raw_ndvi is not None else (metrics.ndvi / 100.0 * 2 - 1)  # Convert back to -1 to 1
            ndvi_01 = (ndvi_normalized + 1) / 2  # Normalize to 0-1 for model
            
            # Convert rainfall score back to mm (approximate)
            rainfall_mm = 120 + (metrics.rainfall - 50) * 2  # Inverse of normalize_rainfall
            
            # Convert soil score to pH (approximate: score 0-100 maps to pH 5-8)
            soil_ph = 5.0 + (metrics.soil / 100.0) * 3.0
            
            # Convert temperature score back to Celsius (approximate)
            temp_c = 27.0 + (50 - metrics.temperature) * 0.2
            
            features = np.array([[
                ndvi_01,
                ndvi_01,  # ndvi_mean (use same value)
                0.05,     # ndvi_std (default)
                rainfall_mm,
                soil_ph,
                temp_c,
            ]])
            
            prediction = ML_MODEL.predict(features)[0]
            return round(_clamp(float(prediction), 0.0, 100.0), 2)
        except Exception as e:
            print(f"ML prediction failed: {e}, falling back to weighted formula")
    
    # Fallback: weighted formula
    score = (
        0.4 * metrics.ndvi
        + 0.3 * metrics.rainfall
        + 0.2 * metrics.soil
        + 0.1 * metrics.temperature
    )
    return round(_clamp(score, 0.0, 100.0), 2)


def simulate_land_metrics(lat: float, lng: float) -> tuple[LandMetrics, float]:
    """
    Simulate land metrics for a location.
    Returns: (LandMetrics, raw_ndvi) where raw_ndvi is in -1 to 1 scale for ML model.
    """
    rng = random.Random(_seed_for_location(lat, lng))

    raw_ndvi = _clamp(rng.normalvariate(0.45, 0.18), -0.1, 0.9)
    rain_mm = _clamp(rng.normalvariate(115.0, 35.0), 10.0, 260.0)
    soil_index = _clamp(rng.normalvariate(68.0, 14.0), 15.0, 95.0)
    temp_c = _clamp(rng.normalvariate(27.0, 5.0), 10.0, 44.0)

    ndvi = normalize_ndvi(raw_ndvi)
    rainfall = normalize_rainfall(rain_mm)
    soil = normalize_soil(soil_index)
    temperature = normalize_temperature(temp_c)

    # Small chance of missing fields to emulate real-world API incompleteness.
    completeness = 1.0
    if rng.random() < 0.08:
        rainfall = rainfall * 0.95
        completeness -= 0.1
    if rng.random() < 0.05:
        soil = soil * 0.9
        completeness -= 0.1

    metrics = LandMetrics(
        ndvi=round(ndvi, 2),
        rainfall=round(rainfall, 2),
        soil=round(soil, 2),
        temperature=round(temperature, 2),
        completeness=_clamp(completeness, 0.0, 1.0),
    )
    return metrics, raw_ndvi


def classify_ndvi_zone(raw_ndvi: float) -> str:
    if raw_ndvi < 0.2:
        return "stressed"
    if raw_ndvi < 0.4:
        return "sparse"
    if raw_ndvi < 0.6:
        return "healthy"
    return "dense"


def build_zone_map(lat: float, lng: float, grid_size: int = 12) -> tuple[list[dict], dict[str, float]]:
    rng = random.Random(_seed_for_location(lat + 0.123, lng - 0.456))
    cells: list[dict] = []
    counts = {"stressed": 0, "sparse": 0, "healthy": 0, "dense": 0}

    for row in range(grid_size):
        for col in range(grid_size):
            center_bias = 0.45 + 0.2 * math.sin((row + col) / 4.0)
            ndvi_raw = _clamp(rng.normalvariate(center_bias, 0.18), 0.0, 0.9)
            zone = classify_ndvi_zone(ndvi_raw)
            counts[zone] += 1
            cells.append(
                {
                    "row": row,
                    "col": col,
                    "ndvi": round(ndvi_raw, 3),
                    "zone": zone,
                }
            )

    total = float(grid_size * grid_size)
    percentages = {
        "stressed": round((counts["stressed"] / total) * 100.0, 2),
        "sparse": round((counts["sparse"] / total) * 100.0, 2),
        "healthy": round((counts["healthy"] / total) * 100.0, 2),
        "dense": round((counts["dense"] / total) * 100.0, 2),
    }

    return cells, percentages


def compute_valuation(
    health_score: float,
    soil_score: float,
    rainfall_score: float,
    lat: float,
    lng: float,
) -> dict[str, float]:
    # A simple location factor based on tropical suitability.
    location_factor = 1.0 + (0.15 * (1.0 - min(abs(lat) / 60.0, 1.0)))
    base_price = 850.0

    quality_index = (
        0.5 * (health_score / 100.0)
        + 0.3 * (soil_score / 100.0)
        + 0.2 * (rainfall_score / 100.0)
    )

    mid = base_price * (0.6 + quality_index) * location_factor
    low = mid * 0.85
    high = mid * 1.2

    return {
        "low": round(low, 2),
        "mid": round(mid, 2),
        "high": round(high, 2),
    }
