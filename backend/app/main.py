from __future__ import annotations

import json
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.data_store import TTLCache
from app.schemas import (
    LandHealthResponse, 
    ValuationResponse, 
    ValuationFactor,
    ZoneCell, 
    ZoneMapResponse, 
    ZonePercentages,
    SoilDataResponse,
    WeatherDataResponse,
    ProximityDataResponse,
    LocationInfoResponse,
    FullLandIntelligenceResponse,
)
from app.services.land_intelligence import (
    build_zone_map,
    classify_label,
    compute_valuation,
    confidence_score,
    simulate_land_metrics,
    weighted_health_score,
)
from app.services.external_apis import (
    fetch_soil_data,
    fetch_weather_data,
    fetch_proximity_data,
    fetch_location_info,
    fetch_all_external_data,
)

# Import ML router
try:
    from ml.api import router as ml_router
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False

app = FastAPI(
    title="GeoInsight API", 
    version="2.0.0",
    description="AI-powered land intelligence platform with real external data APIs"
)
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
    return {"status": "ok", "service": "GeoInsight API", "version": "2.0.0"}


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
    conf = confidence_score(metrics)

    payload = {
        "score": score,
        "label": label,
        "confidence": conf,
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
    """Get land valuation estimate with top contributing factors."""
    cache_key = f"val:{lat:.4f}:{lng:.4f}"
    cached = cache.get(cache_key)
    if cached is not None:
        return ValuationResponse(**cached)
    
    metrics, raw_ndvi = simulate_land_metrics(lat, lng)
    health_score = weighted_health_score(metrics, raw_ndvi)
    
    # Fetch proximity data for OSM factors
    proximity = await fetch_proximity_data(lat, lng)
    
    # Calculate proximity score (closer = better)
    proximity_score = 100.0
    if proximity:
        highway_factor = max(0, 100 - proximity.nearest_highway_km * 10)
        town_factor = max(0, 100 - proximity.nearest_town_km * 5)
        water_factor = max(0, 100 - proximity.nearest_water_km * 8)
        proximity_score = (highway_factor + town_factor + water_factor) / 3
    
    # Compute valuation with FR-34 formula
    # Health(30%) + Soil(20%) + Rainfall(15%) + OSM(25%) + VIIRS(10%)
    # Note: VIIRS not implemented yet, redistributing to others
    base_price = 850000  # Rs per acre base
    
    quality_index = (
        0.30 * (health_score / 100.0)
        + 0.20 * (metrics.soil / 100.0)
        + 0.15 * (metrics.rainfall / 100.0)
        + 0.25 * (proximity_score / 100.0)
        + 0.10 * 0.7  # VIIRS placeholder
    )
    
    # Location factor based on latitude (tropical = better)
    location_factor = 1.0 + (0.15 * (1.0 - min(abs(lat) / 60.0, 1.0)))
    
    mid = base_price * (0.6 + quality_index) * location_factor
    low = mid * 0.85
    high = mid * 1.2
    
    # Determine top factors (FR-37)
    factors = [
        ("Land Health Score", health_score, 0.30),
        ("Soil Quality", metrics.soil, 0.20),
        ("Rainfall Adequacy", metrics.rainfall, 0.15),
        ("Location Access", proximity_score, 0.25),
    ]
    factors.sort(key=lambda x: x[1] * x[2], reverse=True)
    
    top_factors = []
    for name, value, weight in factors[:3]:
        top_factors.append(ValuationFactor(
            name=name,
            contribution=round(weight * 100, 1),  # percentage contribution
            score=round(value, 1)  # raw score value
        ))
    
    payload = {
        "low": round(low, 2),
        "mid": round(mid, 2),
        "high": round(high, 2),
        "currency": "INR",
        "confidence": 0.75,
        "top_factors": top_factors,
        "disclaimer": "This is an estimated intelligence range, not a legal or government guideline valuation."
    }
    cache.set(cache_key, payload)
    return ValuationResponse(**payload)


# ============ NEW EXTERNAL API ENDPOINTS ============

@app.get("/soil", response_model=SoilDataResponse)
async def get_soil_data(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
) -> SoilDataResponse:
    """
    Fetch soil data from ISRIC SoilGrids.
    FREE API - No key required.
    Returns: pH, organic carbon, clay/sand/silt %, texture class.
    """
    cache_key = f"soil:{lat:.4f}:{lng:.4f}"
    cached = cache.get(cache_key)
    if cached is not None:
        return SoilDataResponse(**cached)
    
    soil = await fetch_soil_data(lat, lng)
    
    if soil is None:
        raise HTTPException(status_code=503, detail="Could not fetch soil data from external API")
    
    payload = {
        "ph": soil.ph,
        "organic_carbon": soil.organic_carbon,
        "clay": soil.clay,
        "sand": soil.sand,
        "silt": soil.silt,
        "texture_class": soil.texture_class,
        "confidence": soil.confidence,
        "source": "ISRIC SoilGrids"
    }
    cache.set(cache_key, payload)
    return SoilDataResponse(**payload)


@app.get("/weather", response_model=WeatherDataResponse)
async def get_weather_data(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    years: int = Query(default=2, ge=1, le=5),
) -> WeatherDataResponse:
    """
    Fetch historical weather data from Open-Meteo.
    FREE API - No key required.
    Returns: Temperature trends, rainfall, heat stress days.
    """
    cache_key = f"weather:{lat:.4f}:{lng:.4f}:{years}"
    cached = cache.get(cache_key)
    if cached is not None:
        return WeatherDataResponse(**cached)
    
    weather = await fetch_weather_data(lat, lng, years)
    
    if weather is None:
        raise HTTPException(status_code=503, detail="Could not fetch weather data from external API")
    
    payload = {
        "temperature_mean": weather.temperature_mean,
        "temperature_min": weather.temperature_min,
        "temperature_max": weather.temperature_max,
        "precipitation_annual": weather.precipitation_sum,
        "precipitation_days": weather.precipitation_days,
        "heat_stress_days": weather.heat_stress_days,
        "monthly_temps": weather.monthly_temps,
        "monthly_precip": weather.monthly_precip,
        "rainfall_status": weather.rainfall_deviation,
        "source": "Open-Meteo"
    }
    cache.set(cache_key, payload)
    return WeatherDataResponse(**payload)


@app.get("/proximity", response_model=ProximityDataResponse)
async def get_proximity_data(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
) -> ProximityDataResponse:
    """
    Fetch proximity to infrastructure from OpenStreetMap Overpass.
    FREE API - No key required.
    Returns: Distance to nearest highway, town, water body.
    """
    cache_key = f"prox:{lat:.4f}:{lng:.4f}"
    cached = cache.get(cache_key)
    if cached is not None:
        return ProximityDataResponse(**cached)
    
    proximity = await fetch_proximity_data(lat, lng)
    
    if proximity is None:
        raise HTTPException(status_code=503, detail="Could not fetch proximity data from external API")
    
    payload = {
        "nearest_highway_km": proximity.nearest_highway_km,
        "nearest_town_km": proximity.nearest_town_km,
        "nearest_water_km": proximity.nearest_water_km,
        "highway_name": proximity.highway_name,
        "town_name": proximity.town_name,
        "water_name": proximity.water_name,
        "source": "OpenStreetMap"
    }
    cache.set(cache_key, payload)
    return ProximityDataResponse(**payload)


@app.get("/location", response_model=LocationInfoResponse)
async def get_location_info(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
) -> LocationInfoResponse:
    """
    Reverse geocode coordinates using OSM Nominatim.
    FREE API - No key required.
    Returns: Village, town, district, state, country.
    """
    cache_key = f"loc:{lat:.4f}:{lng:.4f}"
    cached = cache.get(cache_key)
    if cached is not None:
        return LocationInfoResponse(**cached)
    
    location = await fetch_location_info(lat, lng)
    
    if location is None:
        raise HTTPException(status_code=503, detail="Could not fetch location data from external API")
    
    payload = {
        "display_name": location.display_name,
        "village": location.village,
        "town": location.town,
        "city": location.city,
        "district": location.district,
        "state": location.state,
        "country": location.country,
        "source": "OSM Nominatim"
    }
    cache.set(cache_key, payload)
    return LocationInfoResponse(**payload)


@app.get("/intelligence", response_model=FullLandIntelligenceResponse)
async def get_full_intelligence(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
) -> FullLandIntelligenceResponse:
    """
    Fetch ALL land intelligence data in one call.
    Combines: Location, Health, Soil, Weather, Proximity, Valuation, Zones.
    Makes parallel API calls for efficiency.
    """
    cache_key = f"intel:{lat:.4f}:{lng:.4f}"
    cached = cache.get(cache_key)
    if cached is not None:
        return FullLandIntelligenceResponse(**cached)
    
    # Fetch all external data in parallel
    external = await fetch_all_external_data(lat, lng)
    
    # Get internal metrics
    metrics, raw_ndvi = simulate_land_metrics(lat, lng)
    health_score = weighted_health_score(metrics, raw_ndvi)
    label = classify_label(health_score)
    conf = confidence_score(metrics)
    
    # Zone map
    _, percentages = build_zone_map(lat, lng, grid_size=12)
    
    # Build response
    location_resp = None
    if external["location"]:
        loc = external["location"]
        location_resp = LocationInfoResponse(
            display_name=loc.display_name,
            village=loc.village,
            town=loc.town,
            city=loc.city,
            district=loc.district,
            state=loc.state,
            country=loc.country
        )
    
    soil_resp = None
    if external["soil"]:
        s = external["soil"]
        soil_resp = SoilDataResponse(
            ph=s.ph,
            organic_carbon=s.organic_carbon,
            clay=s.clay,
            sand=s.sand,
            silt=s.silt,
            texture_class=s.texture_class,
            confidence=s.confidence
        )
    
    weather_resp = None
    if external["weather"]:
        w = external["weather"]
        weather_resp = WeatherDataResponse(
            temperature_mean=w.temperature_mean,
            temperature_min=w.temperature_min,
            temperature_max=w.temperature_max,
            precipitation_annual=w.precipitation_sum,
            precipitation_days=w.precipitation_days,
            heat_stress_days=w.heat_stress_days,
            monthly_temps=w.monthly_temps,
            monthly_precip=w.monthly_precip,
            rainfall_status=w.rainfall_deviation
        )
    
    proximity_resp = None
    proximity_score = 70.0
    if external["proximity"]:
        p = external["proximity"]
        proximity_resp = ProximityDataResponse(
            nearest_highway_km=p.nearest_highway_km,
            nearest_town_km=p.nearest_town_km,
            nearest_water_km=p.nearest_water_km,
            highway_name=p.highway_name,
            town_name=p.town_name,
            water_name=p.water_name
        )
        highway_factor = max(0, 100 - p.nearest_highway_km * 10)
        town_factor = max(0, 100 - p.nearest_town_km * 5)
        water_factor = max(0, 100 - p.nearest_water_km * 8)
        proximity_score = (highway_factor + town_factor + water_factor) / 3
    
    # Valuation
    base_price = 850000
    quality_index = (
        0.30 * (health_score / 100.0)
        + 0.20 * (metrics.soil / 100.0)
        + 0.15 * (metrics.rainfall / 100.0)
        + 0.25 * (proximity_score / 100.0)
        + 0.10 * 0.7
    )
    location_factor = 1.0 + (0.15 * (1.0 - min(abs(lat) / 60.0, 1.0)))
    mid = base_price * (0.6 + quality_index) * location_factor
    
    factors = [
        ("Land Health Score", health_score, 0.30),
        ("Soil Quality", metrics.soil, 0.20),
        ("Rainfall Adequacy", metrics.rainfall, 0.15),
        ("Location Access", proximity_score, 0.25),
    ]
    factors.sort(key=lambda x: x[1] * x[2], reverse=True)
    top_factors = [
        ValuationFactor(name=n, impact="positive" if v > 65 else "negative" if v < 40 else "neutral", contribution=round(w*100,0))
        for n, v, w in factors[:3]
    ]
    
    valuation_resp = ValuationResponse(
        low=round(mid * 0.85, 2),
        mid=round(mid, 2),
        high=round(mid * 1.2, 2),
        currency="INR",
        confidence=0.75,
        top_factors=top_factors
    )
    
    payload = {
        "latitude": lat,
        "longitude": lng,
        "location": location_resp,
        "health": LandHealthResponse(
            score=health_score,
            label=label,
            confidence=conf,
            ndvi=metrics.ndvi,
            rainfall=metrics.rainfall,
            soil=metrics.soil,
            temperature=metrics.temperature
        ),
        "soil": soil_resp,
        "weather": weather_resp,
        "proximity": proximity_resp,
        "valuation": valuation_resp,
        "zones": ZonePercentages(**percentages)
    }
    cache.set(cache_key, payload)
    return FullLandIntelligenceResponse(**payload)


# Register ML router if available
if ML_AVAILABLE:
    app.include_router(ml_router)
