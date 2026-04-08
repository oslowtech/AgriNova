from __future__ import annotations

import time
import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from app.schemas.modeling import (
    AlgorithmComparisonItem,
    ModelCompareResponse,
    ModelMetrics,
)

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPRegressor
from sklearn.linear_model import LinearRegression


@dataclass
class ModelRunRecord:
    run_id: str
    response: ModelCompareResponse


class ModelComparisonService:
    def __init__(self) -> None:
        self._runs: List[ModelRunRecord] = []
        self._active_algorithm: Optional[str] = None

    def _synthetic_dataset(self, n_samples: int, seed: int) -> tuple[np.ndarray, np.ndarray]:
        rng = np.random.default_rng(seed)
        # Features aligned with valuation factors
        ndvi = rng.uniform(0.1, 0.9, n_samples)
        rainfall = rng.uniform(300, 1600, n_samples)
        soil = rng.uniform(20, 95, n_samples)
        temp = rng.uniform(10, 40, n_samples)
        osm = rng.uniform(0, 100, n_samples)
        night = rng.uniform(0, 1, n_samples)
        canopy_density = rng.uniform(0, 50, n_samples)
        area = rng.uniform(0.3, 20.0, n_samples)

        X = np.column_stack([ndvi, rainfall, soil, temp, osm, night, canopy_density, area])

        # Synthetic valuation target with nonlinearities + noise
        y = (
            900
            + 550 * ndvi
            + 0.22 * rainfall
            + 4.2 * soil
            - 12 * np.maximum(temp - 32, 0)
            + 6.8 * osm
            + 180 * night
            + 3.5 * canopy_density
            - 5 * np.log1p(area)
            + 80 * ndvi * night
            + rng.normal(0, 60, n_samples)
        )
        return X, y

    def _build_models(self, seed: int) -> List[tuple[str, Any, Optional[str]]]:
        def _import_xgboost() -> tuple[Any, Optional[str]]:
            try:
                from xgboost import XGBRegressor as _XGBRegressor  # type: ignore

                return _XGBRegressor, None
            except Exception as e:  # pragma: no cover
                msg = str(e)
                if "libomp" in msg.lower():
                    return None, "xgboost unavailable: missing libomp runtime (install with `brew install libomp`)"
                return None, f"xgboost unavailable: {e.__class__.__name__}"

        def _import_lightgbm() -> tuple[Any, Optional[str]]:
            try:
                from lightgbm import LGBMRegressor as _LGBMRegressor  # type: ignore

                return _LGBMRegressor, None
            except Exception as e:  # pragma: no cover
                msg = str(e)
                if "libomp" in msg.lower():
                    return None, "lightgbm unavailable: missing libomp runtime (install with `brew install libomp`)"
                return None, f"lightgbm unavailable: {e.__class__.__name__}"

        def _import_catboost() -> tuple[Any, Optional[str]]:
            try:
                from catboost import CatBoostRegressor as _CatBoostRegressor  # type: ignore

                return _CatBoostRegressor, None
            except Exception as e:  # pragma: no cover
                return None, f"catboost unavailable: {e.__class__.__name__}"

        XGBRegressor, xgb_reason = _import_xgboost()
        LGBMRegressor, lgbm_reason = _import_lightgbm()
        CatBoostRegressor, cat_reason = _import_catboost()

        models: List[tuple[str, Any, Optional[str]]] = [
            ("Random Forest", RandomForestRegressor(n_estimators=180, random_state=seed), None),
            ("MLP / Neural Network", MLPRegressor(hidden_layer_sizes=(64, 32), max_iter=400, random_state=seed), None),
            ("Linear Regression", LinearRegression(), None),
        ]

        if XGBRegressor is not None:
            models.append(
                (
                    "XGBoost",
                    XGBRegressor(
                        n_estimators=250,
                        max_depth=6,
                        learning_rate=0.05,
                        subsample=0.9,
                        colsample_bytree=0.9,
                        random_state=seed,
                        objective="reg:squarederror",
                    ),
                    None,
                )
            )
        else:
            models.append(("XGBoost", None, xgb_reason or "xgboost package not installed"))

        if LGBMRegressor is not None:
            models.append(
                (
                    "LightGBM",
                    LGBMRegressor(
                        n_estimators=250,
                        learning_rate=0.05,
                        random_state=seed,
                    ),
                    None,
                )
            )
        else:
            models.append(("LightGBM", None, lgbm_reason or "lightgbm package not installed"))

        if CatBoostRegressor is not None:
            models.append(
                (
                    "CatBoost",
                    CatBoostRegressor(
                        iterations=220,
                        learning_rate=0.07,
                        depth=6,
                        random_seed=seed,
                        verbose=False,
                    ),
                    None,
                )
            )
        else:
            models.append(("CatBoost", None, cat_reason or "catboost package not installed"))

        return models

    def compare(self, n_samples: int = 500, seed: int = 42) -> ModelCompareResponse:
        X, y = self._synthetic_dataset(n_samples=n_samples, seed=seed)
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=seed)

        entries: List[AlgorithmComparisonItem] = []
        scored: List[tuple[str, float]] = []

        for name, model, unavailable_reason in self._build_models(seed):
            if model is None:
                entries.append(
                    AlgorithmComparisonItem(
                        algorithm=name,
                        available=False,
                        reason_unavailable=unavailable_reason,
                    )
                )
                continue

            t0 = time.perf_counter()
            model.fit(X_train, y_train)
            train_runtime_ms = (time.perf_counter() - t0) * 1000.0

            t1 = time.perf_counter()
            y_pred = model.predict(X_test)
            infer_latency_ms = ((time.perf_counter() - t1) * 1000.0) / max(len(X_test), 1)

            rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
            mae = float(mean_absolute_error(y_test, y_pred))
            r2 = float(r2_score(y_test, y_pred))
            confidence = float(np.clip(0.65 * max(r2, 0.0) + 0.35 * np.exp(-rmse / 450.0), 0.0, 1.0))

            # Higher is better; penalize error, runtime, and latency lightly.
            score = float(
                np.clip(
                    100.0
                    - 0.055 * rmse
                    - 0.03 * mae
                    + 30.0 * max(r2, 0.0)
                    - 0.004 * train_runtime_ms
                    - 1.3 * infer_latency_ms,
                    0.0,
                    100.0,
                )
            )
            scored.append((name, score))

            entries.append(
                AlgorithmComparisonItem(
                    algorithm=name,
                    available=True,
                    metrics=ModelMetrics(
                        rmse=rmse,
                        mae=mae,
                        r2=r2,
                        runtime_ms=float(train_runtime_ms),
                        inference_latency_ms=float(infer_latency_ms),
                        confidence_score=confidence,
                    ),
                    best_overall_score=score,
                )
            )

        winner = max(scored, key=lambda t: t[1])[0] if scored else None
        if self._active_algorithm is None and winner is not None:
            self._active_algorithm = winner

        run_id = str(uuid.uuid4())
        resp = ModelCompareResponse(
            run_id=run_id,
            n_samples=n_samples,
            results=entries,
            winner=winner,
            active_algorithm=self._active_algorithm,
        )
        self._runs.insert(0, ModelRunRecord(run_id=run_id, response=resp))
        self._runs = self._runs[:30]
        return resp

    def list_runs(self) -> List[ModelCompareResponse]:
        return [r.response for r in self._runs]

    def latest(self) -> Optional[ModelCompareResponse]:
        return self._runs[0].response if self._runs else None

    def set_active_algorithm(self, name: str) -> Optional[ModelCompareResponse]:
        self._active_algorithm = name
        latest = self.latest()
        if latest is None:
            return None
        latest.active_algorithm = name
        return latest

