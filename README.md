# Landroid

AI-powered land intelligence platform with a React Native mobile client and FastAPI backend.

## Screenshots

All uploaded app screenshots are embedded below.

1. Screenshot 01

![Screenshot 01](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.23.06.jpeg)

2. Screenshot 02

![Screenshot 02](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.23.08.jpeg)

3. Screenshot 03

![Screenshot 03](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.23.10.jpeg)

4. Screenshot 04

![Screenshot 04](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.23.11%20(1).jpeg)

5. Screenshot 05

![Screenshot 05](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.23.11.jpeg)

6. Screenshot 06

![Screenshot 06](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.23.13.jpeg)

7. Screenshot 07

![Screenshot 07](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.23.14.jpeg)

8. Screenshot 08

![Screenshot 08](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.23.22%20(1).jpeg)

9. Screenshot 09

![Screenshot 09](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.23.22.jpeg)

10. Screenshot 10

![Screenshot 10](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.24.47.jpeg)

11. Screenshot 11

![Screenshot 11](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.24.49.jpeg)

12. Screenshot 12

![Screenshot 12](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.25.04.jpeg)

13. Screenshot 13

![Screenshot 13](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.25.26.jpeg)

14. Screenshot 14

![Screenshot 14](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.25.38.jpeg)

15. Screenshot 15

![Screenshot 15](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.25.48.jpeg)

16. Screenshot 16

![Screenshot 16](docs/screenshots/WhatsApp%20Image%202026-04-07%20at%2013.26.06.jpeg)

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
