# Landroid

AI-powered land intelligence platform with a React Native mobile client and FastAPI backend.

## Project Structure

- frontend/
- backend/
- ProblemStatementAndData/

## Backend (FastAPI)

1. Open terminal in backend folder.
2. Create and activate virtual environment.
3. Install dependencies.
4. Run API server.

```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend endpoints:
- GET /land-health?lat=&lng=
- GET /zone-map?lat=&lng=&grid_size=
- GET /valuation?lat=&lng=
- GET /boundary
- GET /health

## Frontend (React Native with Expo)

1. Open second terminal in frontend folder.
2. Install dependencies.
3. Configure API base URL.
4. Start Expo app.

```bash
cd frontend
npm install
```

Create .env file from .env.example:

```bash
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000
```

Use these values depending on device:
- Android emulator: http://10.0.2.2:8000
- iOS simulator: http://127.0.0.1:8000
- Physical device: http://<your-lan-ip>:8000

Run app:

```bash
npm run start
```

## Features Implemented

- OTP-style authentication screen (Firebase-ready structure)
- Dashboard with health score, label, confidence, and metric cards
- Zone distribution visualization with percentage bars
- Satellite map with boundary overlay and NDVI zone layer toggle
- Bottom tab navigation: Map, Dashboard, Profile
- Weighted scoring model:
  - health = 0.4*ndvi + 0.3*rainfall + 0.2*soil + 0.1*temperature
- NDVI normalization and zone classification algorithm
- Confidence score based on completeness and metric consistency
- Valuation range estimation endpoint
- API response caching for performance

## Notes

- Existing boundary data is in projected coordinates; app normalizes it for map rendering when needed.
- System is simulation-ready for hackathons and can be swapped with real environmental APIs.
