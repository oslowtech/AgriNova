# GeoInsight

AI-powered land intelligence platform for parcel health analysis, NDVI zoning, and indicative valuation.

This repository contains:
- a FastAPI backend (core intelligence + external data connectors)
- an integrated ML prediction module
- a React Native (Expo) mobile app that consumes these APIs

## What Is Connected End-to-End

1. Frontend calls backend APIs from `frontend/src/api/client.ts`.
2. Backend serves land intelligence APIs from `backend/app/main.py`.
3. Backend includes ML router from `backend/ml/api.py` at `/ml/*`.
4. ML training/inference logic is in `backend/ml/train.py`.
5. Core health scoring uses ML when model is available, with fallback weighted scoring if model is not present.
6. Frontend has safe demo fallbacks so UI remains functional even if network/API is unavailable.

## Architecture

```text
Mobile App (Expo React Native)
        |
        | HTTP (REST)
        v
FastAPI Backend (app/main.py)
  |- Core intelligence: /land-health, /zone-map, /valuation
  |- External APIs: /soil, /weather, /proximity, /location
  |- Aggregator: /intelligence
  |- Health/infra: /health, /boundary
  '- ML router: /ml/predict, /ml/model/info
            |
            v
   RandomForest model + raster feature pipeline (backend/ml)
```

## Project Structure

```text
backend/
  app/
    main.py
    schemas.py
    data_store.py
    services/
      external_apis.py
      land_intelligence.py
  ml/
    api.py
    train.py
    app.py
frontend/
  src/
    api/client.ts
ProblemStatementAndData/
README.md
```

## Backend Setup (FastAPI)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Base URL: `http://localhost:8000`

## Frontend Setup (Expo)

```bash
cd frontend
npm install
```

Create `.env`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000
```

Use API base URL by target:
- Android emulator: `http://10.0.2.2:8000`
- iOS simulator: `http://127.0.0.1:8000`
- Physical device: `http://<your-lan-ip>:8000`

Run:

```bash
npm run start
```

## ML Prediction Model (Working Integration)
LANDROID — AI-Powered Land Intelligence Platform

LANDROID is a full-stack geospatial AI platform that analyzes land using satellite data, environmental signals, and machine learning to generate actionable insights such as land health, vegetation zones, canopy detection, and valuation.

Built for Birdscale × VIT Chennai Hackathon (2026).

🚀 Features
📊 Land Health Dashboard
NDVI trend analysis (current + historical)
Rainfall adequacy (CHIRPS)
Temperature trends & heat stress (ERA5)
Soil quality (ISRIC SoilGrids)
Composite Land Health Score (0–100)
Health classification:
🟢 Healthy (75–100)
🟡 Moderate (50–74)
🔴 At Risk (<50)
🗺️ Plant Health Zone Mapping
NDVI-based classification:
Bare/Stressed (<0.2)
Sparse (0.2–0.4)
Healthy (0.4–0.6)
Dense (>0.6)
GIS overlay with legend
Zone-wise area distribution
Change detection across dates
🌴 Tree & Canopy Detection
OpenCV-based detection:
Blob Detection
Watershed Segmentation
Outputs:
Total tree count
Density per acre
Canopy map overlay
Temporal comparison (missing/new trees)
Stress detection (small canopy size)
Confidence scoring
💰 Land Valuation Engine
AI-driven valuation (Rs/acre)
Based on:
Land Health Score (30%)
Soil Quality (20%)
Rainfall (15%)
OSM Proximity (25%)
Night Light Index (10%)
Outputs:
Low / Mid / High band
Confidence score
Top 3 driving factors
⚠️ Clearly marked as non-government estimation
🤖 Multi-Algorithm ML Comparison

Compare performance across models:

Random Forest
XGBoost
LightGBM
CatBoost
Neural Network (MLP)
Linear Regression (baseline)

Metrics:

RMSE, MAE, R² (regression)
Accuracy, F1, AUC (classification)
Runtime & latency
Confidence calibration
🏗️ Tech Stack
Frontend
React + TypeScript
Tailwind CSS
Recharts / Plotly
Leaflet / Mapbox GL
Backend
FastAPI (Python)
GeoPandas, Rasterio, Shapely
OpenCV, scikit-image
scikit-learn, XGBoost, LightGBM
Data Sources
Birdscale NDVI Raster
Sentinel-2 (Planetary Computer)
CHIRPS Rainfall
ERA5 Temperature
ISRIC SoilGrids
VIIRS Night Lights
OpenStreetMap
🧠 System Architecture
Data Sources → Data Pipeline → Feature Engineering → ML Models
            → Scoring Engine → API Layer → Frontend Dashboard

Modular design:

Data acquisition layer
Feature engineering
ML + rule-based scoring
Visualization layer
Algorithm comparison engine
## Screenshots

### Mobile App and Console

![Screenshot 01](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.23.06.jpeg)
![Screenshot 02](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.23.08.jpeg)
![Screenshot 03](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.23.10.jpeg)
![Screenshot 04](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.23.11%20%281%29.jpeg)
![Screenshot 05](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.23.11.jpeg)
![Screenshot 06](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.23.13.jpeg)
![Screenshot 07](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.23.14.jpeg)
![Screenshot 08](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.23.22%20%281%29.jpeg)
![Screenshot 09](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.23.22.jpeg)
![Screenshot 10](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.24.47.jpeg)
![Screenshot 11](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.24.49.jpeg)
![Screenshot 12](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.25.04.jpeg)
![Screenshot 13](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.25.26.jpeg)
![Screenshot 14](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.25.38.jpeg)
![Screenshot 15](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.25.48.jpeg)
![Screenshot 16](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.26.06.jpeg)

## Key Notes

- External data providers are used where available (SoilGrids, Open-Meteo, OSM).
- API responses are cached server-side for better performance.
- System supports demo/hackathon mode with robust fallbacks in both backend and frontend.
- Valuation is indicative intelligence only and not a legal/government valuation.
