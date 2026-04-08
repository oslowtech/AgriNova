from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Tuple

import numpy as np


def _linear_regression_slope(x: np.ndarray, y: np.ndarray) -> tuple[float, float]:
    """
    Returns (slope, r2).
    """
    if x.size != y.size or x.size < 2:
        return 0.0, 0.0

    x_mean = float(x.mean())
    y_mean = float(y.mean())
    denom = float(((x - x_mean) ** 2).sum())
    if denom == 0.0:
        return 0.0, 0.0
    slope = float(((x - x_mean) * (y - y_mean)).sum() / denom)

    y_hat = float(y_mean) + slope * (x - x_mean)
    ss_res = float(((y - y_hat) ** 2).sum())
    ss_tot = float(((y - y_mean) ** 2).sum())
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0
    return slope, float(np.clip(r2, 0.0, 1.0))


def compute_ndvi_trend(
    ndvi_current: float,
    ndvi_mean_2yr: float,
    ndvi_monthly_series: List[float],
) -> dict:
    """
    FR-18 + FR-22 NDVI trend scoring.
    """
    y = np.array(ndvi_monthly_series, dtype=float)
    x = np.arange(y.size, dtype=float)

    slope, r2 = _linear_regression_slope(x, y)
    # Heuristic threshold tuned for mock/normalized NDVI signals.
    # Positive small slopes are not meaningful; magnitude threshold avoids jitter.
    slope_threshold = 0.0025

    if slope > slope_threshold:
        status = "Recovering"
        status_dir = 1.0
    elif slope < -slope_threshold:
        status = "Degrading"
        status_dir = -1.0
    else:
        status = "Healthy"
        status_dir = 0.0

    # Score: combine level (current vs 2y mean) and trend (slope direction/magnitude).
    level_ratio = (ndvi_current - ndvi_mean_2yr) / max(abs(ndvi_mean_2yr), 1e-6)
    level_score = 50.0 + 45.0 * float(np.tanh(level_ratio))

    trend_score = 50.0 + 40.0 * float(np.tanh((slope / 0.01) * status_dir))
    # Use r2 to modulate confidence: if time series is noisy, confidence drops.
    score = float(np.clip(0.6 * level_score + 0.4 * trend_score, 0.0, 100.0))

    confidence = float(np.clip(0.3 + 0.7 * r2, 0.0, 1.0))
    explanation = (
        f"NDVI level vs 2-year mean and the month-to-month trend slope determine this signal. "
        f"Estimated slope={slope:.4f} (r2={r2:.2f})."
    )

    trend_indicator = "Up" if status_dir > 0 else "Down" if status_dir < 0 else "Stable"

    return {
        "score": score,
        "status_label": status,
        "confidence": confidence,
        "trend_indicator": trend_indicator,
        "explanation": explanation,
        "trend_slope": slope,
        "r2": r2,
    }


def compute_rainfall_adequacy(
    annual_mm: float,
    normal_annual_mm: float,
    monthly_distribution: List[float],
) -> dict:
    """
    FR-19 + FR-22 rainfall adequacy scoring.
    """
    normal = max(float(normal_annual_mm), 1e-6)
    ratio = float(annual_mm) / normal
    # Penalize log deviation from normal.
    deviation = abs(math.log(max(ratio, 1e-6)))
    sigma = 0.45
    adequacy_level_score = 100.0 * math.exp(-(deviation**2) / (2.0 * sigma**2))

    monthly = np.array(monthly_distribution, dtype=float)
    mean = float(max(monthly.mean(), 1e-6))
    cv = float(monthly.std() / mean)
    # More even month-to-month distribution => slightly higher confidence/score.
    evenness_penalty = float(np.clip(cv / 1.2, 0.0, 1.0))  # 0..1
    score = float(np.clip(0.75 * adequacy_level_score + 25.0 * (1.0 - evenness_penalty), 0.0, 100.0))

    confidence = float(np.clip(0.55 * (1.0 - evenness_penalty) + 0.45 * (1.0 - deviation / 1.2), 0.0, 1.0))
    deviation_mm = float(annual_mm) - float(normal_annual_mm)

    if deviation_mm > 20.0:
        flag = "Surplus"
        trend_indicator = "Up"
    elif deviation_mm < -20.0:
        flag = "Deficit"
        trend_indicator = "Down"
    else:
        flag = "Neutral"
        trend_indicator = "Stable"

    explanation = (
        f"Rainfall adequacy is based on annual deviation from the historical normal and "
        f"how evenly rain is distributed across months (CV={cv:.2f})."
    )

    return {
        "score": score,
        "confidence": confidence,
        "deviation_mm": deviation_mm,
        "surplus_deficit_flag": flag,
        "trend_indicator": trend_indicator,
        "explanation": explanation,
    }


def _triangular_score(x: float, left: float, peak: float, right: float) -> float:
    if x <= left or x >= right:
        return 0.0
    if x == peak:
        return 100.0
    if x < peak:
        return float(100.0 * (x - left) / (peak - left))
    return float(100.0 * (right - x) / (right - peak))


def compute_soil_quality_score(soil_profile: dict) -> dict:
    """
    FR-21 + FR-22 soil quality scoring.
    """
    ph = float(soil_profile.get("ph", 6.5))
    organic = float(soil_profile.get("organic_carbon", 1.5))
    texture = str(soil_profile.get("texture", "loam"))

    ph_score = _triangular_score(ph, left=5.0, peak=7.0, right=8.3)

    # Organic carbon: low/moderate organic matter is still useful; too high can be less ideal in some cases.
    organic_score = _triangular_score(organic, left=0.2, peak=2.0, right=4.2)

    texture_ranking = {
        "loam": 1.0,
        "sandy_loam": 0.9,
        "silty_clay": 0.85,
        "clay": 0.8,
        "sand": 0.6,
    }
    tex_w = texture_ranking.get(texture, 0.75)
    texture_score = 100.0 * tex_w

    score = float(np.clip(0.45 * ph_score + 0.40 * organic_score + 0.15 * texture_score, 0.0, 100.0))
    confidence = float(np.clip(0.55 + 0.45 * (0.6 * (ph_score / 100.0) + 0.4 * (organic_score / 100.0)), 0.0, 1.0))

    explanation = (
        f"Soil score combines pH suitability, organic carbon, and texture preference. "
        f"Detected pH={ph:.2f}, organic carbon={organic:.2f}wt%, texture={texture}."
    )

    return {
        "score": score,
        "confidence": confidence,
        "ph_score": ph_score,
        "organic_score": organic_score,
        "texture_score": texture_score,
        "explanation": explanation,
    }


def compute_temperature_suitability_score(monthly_temps: List[float]) -> dict:
    """
    FR-20 + FR-22 temperature suitability scoring (regional-level).
    """
    temps = np.array(monthly_temps, dtype=float)
    optimal_low = 15.0
    optimal_high = 30.0

    within = float(((temps >= optimal_low) & (temps <= optimal_high)).mean())
    # Penalize extreme heat/cold.
    high_excess = np.clip(temps - optimal_high, 0.0, None)
    low_excess = np.clip(optimal_low - temps, 0.0, None)
    high_pen = float(high_excess.mean()) / 10.0
    low_pen = float(low_excess.mean()) / 10.0

    score = float(np.clip(100.0 * within - 35.0 * high_pen - 20.0 * low_pen, 0.0, 100.0))
    confidence = float(np.clip(0.35 + 0.65 * within, 0.0, 1.0))

    explanation = (
        f"Temperature suitability favors months within {optimal_low:.0f}–{optimal_high:.0f}C "
        f"and penalizes extreme heat/cold. Within-optimal fraction={within:.2f}."
    )
    return {
        "score": score,
        "confidence": confidence,
        "within_optimal_fraction": within,
        "explanation": explanation,
    }


def land_health_score_from_subscores(
    ndvi_score: float,
    rainfall_score: float,
    soil_score: float,
    temperature_score: float,
    weights: tuple[float, float, float, float] = (0.4, 0.3, 0.2, 0.1),
) -> float:
    w_ndvi, w_rain, w_soil, w_temp = weights
    return float(np.clip(w_ndvi * ndvi_score + w_rain * rainfall_score + w_soil * soil_score + w_temp * temperature_score, 0.0, 100.0))


def health_class_from_score(score: float) -> str:
    if score >= 75.0:
        return "Healthy"
    if score >= 50.0:
        return "Moderate"
    return "At Risk"


@dataclass(frozen=True)
class SubscoreResult:
    score_0_100: float
    confidence_0_1: float
    explanation: str


def composite_confidence(
    ndvi_conf: float,
    rain_conf: float,
    soil_conf: float,
    temp_conf: float,
    weights: tuple[float, float, float, float] = (0.4, 0.3, 0.2, 0.1),
) -> float:
    w_ndvi, w_rain, w_soil, w_temp = weights
    conf = w_ndvi * ndvi_conf + w_rain * rain_conf + w_soil * soil_conf + w_temp * temp_conf
    return float(np.clip(conf, 0.0, 1.0))

