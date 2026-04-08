# LANDROID Backend

FastAPI backend for LANDROID (land intelligence and valuation).

## Requirements

- Python 3.10+

## Run (demo mode)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

### Environment variables

- `LANDROID_MODE` (`mock` default, `live` reserved)
- `LANDROID_CACHE_DIR` (default: `./.cache`)

