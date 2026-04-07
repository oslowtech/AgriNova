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

### Train model

```bash
cd backend
.venv\Scripts\activate
python -m ml.train
```

This creates `backend/ml/land_health_model.pkl`.

### How prediction works

- `GET /ml/predict` and `POST /ml/predict` provide model inference.
- `GET /ml/model/info` reports model readiness and feature importances.
- The main health pipeline in `app/services/land_intelligence.py` uses trained ML model when available.
- If model is missing or cannot load, backend automatically falls back to deterministic weighted formula, so predictions still continue.

## API Reference (Connected and Implemented)

All routes below are implemented in `backend/app/main.py` and `backend/ml/api.py`.

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | API health check |
| `/boundary` | GET | Returns parcel boundary GeoJSON |
| `/land-health` | GET | Health score, label, confidence, metrics |
| `/zone-map` | GET | Cell-wise NDVI zones + percentages |
| `/valuation` | GET | Indicative valuation range + top factors |
| `/soil` | GET | SoilGrids-based soil properties |
| `/weather` | GET | Open-Meteo weather summary |
| `/proximity` | GET | OSM proximity to highway/town/water |
| `/location` | GET | Reverse geocoded location info |
| `/intelligence` | GET | Combined one-call intelligence payload |
| `/ml/predict` | GET/POST | ML health prediction |
| `/ml/model/info` | GET | Model metadata/readiness |

## Quick API Verification

Run after backend is started:

```bash
curl "http://localhost:8000/health"
curl "http://localhost:8000/land-health?lat=12.961705&lng=77.599227"
curl "http://localhost:8000/zone-map?lat=12.961705&lng=77.599227&grid_size=12"
curl "http://localhost:8000/valuation?lat=12.961705&lng=77.599227"
curl "http://localhost:8000/intelligence?lat=12.961705&lng=77.599227"
curl "http://localhost:8000/ml/model/info"
curl "http://localhost:8000/ml/predict?ndvi=0.62&rainfall=900&soil_ph=6.5&temperature=27"
```

If these return JSON responses, API connectivity and prediction flow are working correctly.

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
