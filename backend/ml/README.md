# Land Health ML Pipeline

Machine Learning pipeline for predicting land health scores from NDVI (GeoTIFF) data.

## Overview

This pipeline:
1. Loads NDVI data from GeoTIFF files
2. Extracts features (NDVI, local statistics, environmental factors)
3. Trains a Random Forest model to predict land health scores (0-100)
4. Provides a FastAPI endpoint for inference

## Installation

```bash
cd backend
pip install -r requirements.txt
```

## Usage

### 1. Train the Model

```bash
cd backend/ml
python train.py
```

This will:
- Load NDVI data from `ProblemStatementAndData/*.tif` (or generate synthetic data)
- Train a Random Forest model
- Print R² score and MAE
- Show feature importances
- Save model to `land_health_model.pkl`

### 2. Run the API Server

**Standalone (port 8001):**
```bash
cd backend/ml
uvicorn app:app --reload --port 8001
```

**Integrated with main API (port 8000):**
```bash
cd backend
uvicorn app.main:app --reload
```

### 3. API Endpoints

#### Predict Land Health
```
GET /predict?ndvi=0.5&rainfall=800&soil_ph=6.5&temperature=25
```

**Parameters:**
- `ndvi` (required): NDVI value (-1 to 1)
- `rainfall` (required): Annual rainfall in mm (0-5000)
- `soil_ph` (required): Soil pH (0-14)
- `temperature` (required): Temperature in Celsius (-50 to 60)
- `ndvi_mean` (optional): Local NDVI mean
- `ndvi_std` (optional): Local NDVI standard deviation

**Response:**
```json
{
  "health_score": 78.5,
  "label": "Healthy",
  "confidence": 0.85
}
```

#### Model Info
```
GET /model/info
```

**Response:**
```json
{
  "status": "ready",
  "model_type": "RandomForestRegressor",
  "n_estimators": 100,
  "max_depth": 15,
  "feature_names": ["ndvi", "ndvi_mean", "ndvi_std", "rainfall", "soil_pH", "temperature"],
  "feature_importances": {...}
}
```

## Health Score Labels

| Score Range | Label |
|------------|-------|
| 70-100 | Healthy |
| 40-69 | Moderate |
| 0-39 | At Risk |

## File Structure

```
backend/ml/
├── __init__.py
├── train.py          # Training pipeline
├── api.py            # FastAPI router (integrated)
├── app.py            # Standalone FastAPI app
├── land_health_model.pkl  # Trained model (generated)
└── README.md
```

## Features

The model uses 6 features:

1. **ndvi**: Current pixel NDVI (normalized 0-1)
2. **ndvi_mean**: Local 3x3 window mean
3. **ndvi_std**: Local 3x3 window standard deviation
4. **rainfall**: Annual rainfall (mm)
5. **soil_pH**: Soil pH value
6. **temperature**: Temperature (°C)

## Example Inference

```python
from train import predict_health, load_model

model = load_model()

features = {
    'ndvi': 0.75,
    'ndvi_mean': 0.72,
    'ndvi_std': 0.08,
    'rainfall': 800,
    'soil_pH': 6.5,
    'temperature': 25,
}

score = predict_health(features, model)
print(f"Health Score: {score:.2f}")
```

## cURL Examples

```bash
# Predict health
curl "http://localhost:8001/predict?ndvi=0.6&rainfall=800&soil_ph=6.5&temperature=25"

# Get model info
curl "http://localhost:8001/model/info"

# POST request
curl -X POST "http://localhost:8001/predict" \
  -H "Content-Type: application/json" \
  -d '{"ndvi": 0.6, "rainfall": 800, "soil_pH": 6.5, "temperature": 25}'
```
