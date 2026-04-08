from __future__ import annotations

from fastapi.testclient import TestClient

from app.db.database import Base, engine
from app.main import app


def _reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_health_and_valuation_endpoints() -> None:
    _reset_db()
    client = TestClient(app)

    square_poly = {
        "type": "Feature",
        "properties": {},
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [0.0, 0.0],
                    [0.0, 0.01],
                    [0.01, 0.01],
                    [0.01, 0.0],
                    [0.0, 0.0],
                ]
            ],
        },
    }

    parcel_resp = client.post(
        "/api/parcels",
        json={"parcel_name": "test-parcel", "geometry": square_poly},
    )
    assert parcel_resp.status_code == 200
    parcel = parcel_resp.json()
    parcel_id = parcel["parcel_id"]

    land_resp = client.get(f"/api/land-health/{parcel_id}")
    assert land_resp.status_code == 200
    land = land_resp.json()
    assert 0.0 <= land["composite"]["land_health_score"] <= 100.0
    assert land["composite"]["health_class"] in {"Healthy", "Moderate", "At Risk"}
    assert set(land["signals"].keys()) == {"ndvi", "rainfall", "temperature", "soil"}

    val_resp = client.get(f"/api/valuation/{parcel_id}")
    assert val_resp.status_code == 200
    valuation = val_resp.json()
    assert valuation["valuation_band"] in {"Low", "Mid", "High"}
    assert valuation["estimated_intelligence_range_rs_per_acre"]["mid"] > 0

