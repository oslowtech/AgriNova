from __future__ import annotations

from app.services.scoring_engine import compute_ndvi_trend, health_class_from_score


def test_health_class_thresholds() -> None:
    assert health_class_from_score(75.0) == "Healthy"
    assert health_class_from_score(74.0) == "Moderate"
    assert health_class_from_score(49.9) == "At Risk"


def test_ndvi_trend_recovering() -> None:
    ndvi_monthly = [0.30 + i * 0.01 for i in range(12)]  # strictly increasing
    current = ndvi_monthly[-1]
    mean_2yr = sum(ndvi_monthly) / len(ndvi_monthly)
    result = compute_ndvi_trend(current, mean_2yr, ndvi_monthly)
    assert result["status_label"] in {"Recovering", "Healthy"}
    assert result["trend_indicator"] in {"Up", "Stable"}

