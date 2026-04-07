"""
Standalone FastAPI application for Land Health ML Prediction.
Can be run independently or integrated with the main app.
"""

from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from train import load_model, predict_health, MODEL_PATH

app = FastAPI(
    title="Land Health ML API",
    description="Machine Learning API for predicting land health from NDVI and environmental features",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthPredictionResponse(BaseModel):
    """Response model for health prediction."""
    health_score: float = Field(..., ge=0, le=100, description="Predicted land health score (0-100)")
    label: str = Field(..., description="Health classification label")
    confidence: float = Field(..., ge=0, le=1, description="Prediction confidence (0-1)")


class HealthPredictionRequest(BaseModel):
    """Request model for health prediction."""
    ndvi: float = Field(..., ge=-1, le=1, description="NDVI value (-1 to 1)")
    rainfall: float = Field(..., ge=0, le=5000, description="Annual rainfall in mm")
    soil_pH: float = Field(..., ge=0, le=14, description="Soil pH value")
    temperature: float = Field(..., ge=-50, le=60, description="Temperature in Celsius")
    ndvi_mean: Optional[float] = Field(None, ge=-1, le=1, description="Local NDVI mean (optional)")
    ndvi_std: Optional[float] = Field(None, ge=0, le=1, description="Local NDVI std (optional)")


def classify_health_label(score: float) -> str:
    """Classify health score into label."""
    if score >= 70:
        return "Healthy"
    elif score >= 40:
        return "Moderate"
    else:
        return "At Risk"


def calculate_confidence(score: float, ndvi: float) -> float:
    """Calculate prediction confidence based on score and NDVI."""
    ndvi_norm = (ndvi + 1) / 2
    
    if ndvi_norm > 0.7 or ndvi_norm < 0.3:
        base_confidence = 0.9
    elif ndvi_norm > 0.5 or ndvi_norm < 0.4:
        base_confidence = 0.8
    else:
        base_confidence = 0.7
    
    if score > 85 or score < 15:
        certainty_boost = 0.05
    elif score > 70 or score < 30:
        certainty_boost = 0.03
    else:
        certainty_boost = 0.0
    
    return min(base_confidence + certainty_boost, 0.95)


# Lazy model loading
_model = None


def get_model():
    """Lazy load model."""
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise HTTPException(
                status_code=503,
                detail="Model not trained yet. Run: python train.py"
            )
        _model = load_model()
    return _model


@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "service": "Land Health ML API",
        "version": "1.0.0",
        "endpoints": {
            "/predict": "GET - Predict land health from features",
            "/model/info": "GET - Get model information",
            "/docs": "Swagger UI documentation",
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    model_status = "ready" if MODEL_PATH.exists() else "not_trained"
    return {"status": "ok", "model_status": model_status}


@app.get("/predict", response_model=HealthPredictionResponse)
async def predict(
    ndvi: float = Query(..., ge=-1, le=1, description="NDVI value (-1 to 1)"),
    rainfall: float = Query(..., ge=0, le=5000, description="Annual rainfall in mm"),
    soil_ph: float = Query(..., ge=0, le=14, description="Soil pH value"),
    temperature: float = Query(..., ge=-50, le=60, description="Temperature in Celsius"),
    ndvi_mean: Optional[float] = Query(None, ge=-1, le=1, description="Local NDVI mean"),
    ndvi_std: Optional[float] = Query(None, ge=0, le=1, description="Local NDVI std dev"),
) -> HealthPredictionResponse:
    """
    Predict land health score from environmental features.
    
    - **ndvi**: Normalized Difference Vegetation Index (-1 to 1)
    - **rainfall**: Annual rainfall in millimeters
    - **soil_ph**: Soil acidity/alkalinity (0-14)
    - **temperature**: Average temperature in Celsius
    
    Returns predicted health score (0-100), classification label, and confidence.
    """
    try:
        model = get_model()
        
        # Normalize NDVI to 0-1 for model
        ndvi_normalized = (ndvi + 1) / 2
        mean_val = (ndvi_mean + 1) / 2 if ndvi_mean is not None else ndvi_normalized
        std_val = ndvi_std if ndvi_std is not None else 0.05
        
        features = {
            'ndvi': ndvi_normalized,
            'ndvi_mean': mean_val,
            'ndvi_std': std_val,
            'rainfall': rainfall,
            'soil_pH': soil_ph,
            'temperature': temperature,
        }
        
        health_score = predict_health(features, model)
        label = classify_health_label(health_score)
        confidence = calculate_confidence(health_score, ndvi)
        
        return HealthPredictionResponse(
            health_score=round(health_score, 2),
            label=label,
            confidence=round(confidence, 3),
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict", response_model=HealthPredictionResponse)
async def predict_post(request: HealthPredictionRequest) -> HealthPredictionResponse:
    """Predict land health score (POST version)."""
    return await predict(
        ndvi=request.ndvi,
        rainfall=request.rainfall,
        soil_ph=request.soil_pH,
        temperature=request.temperature,
        ndvi_mean=request.ndvi_mean,
        ndvi_std=request.ndvi_std,
    )


@app.get("/model/info")
async def model_info() -> dict:
    """Get information about the trained model."""
    if not MODEL_PATH.exists():
        return {
            "status": "not_trained",
            "message": "Model has not been trained yet. Run: python train.py"
        }
    
    model = get_model()
    feature_names = ['ndvi', 'ndvi_mean', 'ndvi_std', 'rainfall', 'soil_pH', 'temperature']
    
    return {
        "status": "ready",
        "model_type": "RandomForestRegressor",
        "n_estimators": model.n_estimators,
        "max_depth": model.max_depth,
        "feature_names": feature_names,
        "feature_importances": dict(zip(
            feature_names,
            [round(float(x), 4) for x in model.feature_importances_]
        )),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
