from __future__ import annotations

import json
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.data_store import TTLCache
from app.schemas import LandHealthResponse, ValuationResponse, ZoneCell, ZoneMapResponse, ZonePercentages
from app.services.land_intelligence import (
    build_zone_map,
    classify_label,
    compute_valuation,
    confidence_score,
    simulate_land_metrics,
    weighted_health_score,
)

# Import ML router
try:
    from ml.api import router as ml_router
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False

app = FastAPI(title="Landroid API", version="1.0.0")
cache = TTLCache(ttl_seconds=180)

origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _boundary_file() -> Path:
    repo_root = Path(__file__).resolve().parents[2]
    return repo_root / "ProblemStatementAndData" / "Boundary.geojson"


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "Landroid API"}


@app.get("/boundary")
async def boundary() -> dict:
    file_path = _boundary_file()
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Boundary file not found")

    with file_path.open("r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/land-health", response_model=LandHealthResponse)
async def get_land_health(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
) -> LandHealthResponse:
    cache_key = f"land:{lat:.4f}:{lng:.4f}"
    cached = cache.get(cache_key)
    if cached is not None:
        return LandHealthResponse(**cached)

    metrics, raw_ndvi = simulate_land_metrics(lat, lng)
    score = weighted_health_score(metrics, raw_ndvi)
    label = classify_label(score)
    confidence = confidence_score(metrics)

    payload = {
        "score": score,
        "label": label,
        "confidence": confidence,
        "ndvi": metrics.ndvi,
        "rainfall": metrics.rainfall,
        "soil": metrics.soil,
        "temperature": metrics.temperature,
    }
    cache.set(cache_key, payload)
    return LandHealthResponse(**payload)


@app.get("/zone-map", response_model=ZoneMapResponse)
async def get_zone_map(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    grid_size: int = Query(default=12, ge=4, le=40),
) -> ZoneMapResponse:
    cache_key = f"zone:{lat:.4f}:{lng:.4f}:{grid_size}"
    cached = cache.get(cache_key)
    if cached is not None:
        return ZoneMapResponse(**cached)

    cells, percentages = build_zone_map(lat, lng, grid_size=grid_size)

    payload = {
        "percentages": ZonePercentages(**percentages),
        "grid_size": grid_size,
        "cells": [ZoneCell(**cell) for cell in cells],
    }
    cache.set(cache_key, payload)
    return ZoneMapResponse(**payload)


@app.get("/valuation", response_model=ValuationResponse)
async def get_valuation(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
) -> ValuationResponse:
    metrics, raw_ndvi = simulate_land_metrics(lat, lng)
    health_score = weighted_health_score(metrics, raw_ndvi)
    valuation = compute_valuation(
        health_score=health_score,
        soil_score=metrics.soil,
        rainfall_score=metrics.rainfall,
        lat=lat,
        lng=lng,
    )
    return ValuationResponse(**valuation)


# Register ML router if available
if ML_AVAILABLE:
    app.include_router(ml_router)
