from __future__ import annotations

import datetime as dt
import json
import uuid
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.settings import settings
from app.db.database import init_db
from app.models.entities import (
    LandHealthEntity,
    OrthomosaicUploadEntity,
    ParcelEntity,
    RasterUploadEntity,
    ValuationEntity,
)
from app.schemas.canopy import CanopyDetectionResult
from app.schemas.land_health import LandHealthResponse
from app.schemas.modeling import ModelCompareResponse, ModelTrainRequest
from app.schemas.parcel import ParcelCreate, ParcelResponse
from app.schemas.valuation import ValuationResult
from app.schemas.zones import ZoneMapResponse
from app.services.canopy_service import CanopyService
from app.services.land_health_service import LandHealthService
from app.services.model_comparison_service import ModelComparisonService
from app.services.valuation_service import ValuationService
from app.services.zoning_service import ZoningService
from app.utils.geo import centroid_and_bbox_wgs84, safe_json_dumps, shapely_from_geojson, shapely_from_geojson_wgs84

import numpy as np
import cv2
import rasterio
from fastapi.responses import StreamingResponse

router = APIRouter()

init_db()

land_health_service = LandHealthService()
valuation_service = ValuationService()
zoning_service = ZoningService()
WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
canopy_service = CanopyService(workspace_root=WORKSPACE_ROOT)
model_comparison_service = ModelComparisonService()


@router.get("/samples/boundary")
def sample_boundary() -> Dict[str, Any]:
    """
    Returns the workspace sample `Boundary.geojson` for demo UX.
    """
    boundary_path = WORKSPACE_ROOT / "Boundary.geojson"
    if not boundary_path.exists():
        raise HTTPException(status_code=404, detail="Sample Boundary.geojson not found")
    content = boundary_path.read_text(encoding="utf-8")
    return json.loads(content)


@router.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "mode": settings.landroid_mode,
        "cache_dir": settings.cache_dir,
    }


@router.post("/parcels", response_model=ParcelResponse)
def create_parcel(parcel_in: ParcelCreate, db: Session = Depends(get_db)) -> ParcelResponse:
    geometry_geojson = parcel_in.geometry
    parcel_id = str(uuid.uuid4())

    # Compute centroid/bbox in WGS84 for downstream signals.
    centroid_wgs84, bbox_wgs84 = centroid_and_bbox_wgs84(geometry_geojson)

    entity = ParcelEntity(
        id=parcel_id,
        parcel_name=parcel_in.parcel_name,
        geometry_geojson=safe_json_dumps(geometry_geojson),
        centroid_wgs84_json=safe_json_dumps(list(centroid_wgs84)),
        bbox_wgs84_json=safe_json_dumps(list(bbox_wgs84)),
        mode=settings.landroid_mode,
    )
    db.add(entity)
    db.commit()
    db.refresh(entity)

    # Return original geometry (not serialized string) for easy rendering.
    return ParcelResponse(
        parcel_id=entity.id,
        parcel_name=entity.parcel_name,
        geometry=json.loads(entity.geometry_geojson),
        centroid_wgs84=tuple(centroid_wgs84),
        bbox_wgs84=tuple(bbox_wgs84),
        mode=entity.mode,
    )


@router.get("/land-health/{parcel_id}", response_model=LandHealthResponse)
def get_land_health(parcel_id: str, db: Session = Depends(get_db)) -> LandHealthResponse:
    parcel = db.get(ParcelEntity, parcel_id)
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")

    centroid = parcel.centroid_wgs84()
    land_health = land_health_service.compute_land_health(parcel_id=parcel.id, centroid_wgs84=centroid)

    # Persist latest land-health computation.
    entity = LandHealthEntity(
        parcel_id=parcel.id,
        computed_at=dt.datetime.utcnow(),
        mode=land_health.mode,
        payload_json=land_health.model_dump_json(),
    )
    db.add(entity)
    db.commit()

    return land_health


@router.get("/valuation/{parcel_id}", response_model=ValuationResult)
def get_valuation(parcel_id: str, db: Session = Depends(get_db)) -> ValuationResult:
    parcel = db.get(ParcelEntity, parcel_id)
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")

    # Get latest land-health result (FR-38: valuation updates automatically when land health changes).
    stmt = select(LandHealthEntity).where(LandHealthEntity.parcel_id == parcel_id).order_by(LandHealthEntity.computed_at.desc()).limit(1)
    latest = db.execute(stmt).scalars().first()
    if not latest:
        raise HTTPException(status_code=404, detail="Land health result not computed yet")

    land_health = LandHealthResponse.model_validate_json(latest.payload_json)
    centroid = parcel.centroid_wgs84()

    valuation = valuation_service.compute_valuation(
        parcel_id=parcel.id,
        centroid_wgs84=centroid,
        land_health=land_health,
    )

    entity = ValuationEntity(
        parcel_id=parcel.id,
        computed_at=dt.datetime.utcnow(),
        mode=valuation.mode,
        payload_json=valuation.model_dump_json(),
    )
    db.add(entity)
    db.commit()

    return valuation


@router.post("/uploads/raster")
def upload_raster(
    parcel_id: str,
    kind: str = "ndvi",
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    parcel = db.get(ParcelEntity, parcel_id)
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")

    upload_dir = WORKSPACE_ROOT / "backend" / "app" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / f"{parcel_id}_{kind}_{file.filename}"
    with dest.open("wb") as f:
        f.write(file.file.read())

    db.add(
        RasterUploadEntity(
            parcel_id=parcel_id,
            kind=kind,
            path=str(dest),
        )
    )
    db.commit()

    return {"status": "ok", "path": str(dest)}


@router.post("/uploads/orthomosaic")
def upload_orthomosaic(
    parcel_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    parcel = db.get(ParcelEntity, parcel_id)
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")

    upload_dir = WORKSPACE_ROOT / "backend" / "app" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = upload_dir / f"{parcel_id}_orthomosaic_{file.filename}"
    with dest.open("wb") as f:
        f.write(file.file.read())

    db.add(
        OrthomosaicUploadEntity(
            parcel_id=parcel_id,
            path=str(dest),
        )
    )
    db.commit()

    return {"status": "ok", "path": str(dest)}


@router.get("/zones/{parcel_id}", response_model=ZoneMapResponse)
def get_zones(
    parcel_id: str,
    from_date: str | None = None,
    to_date: str | None = None,
    db: Session = Depends(get_db),
) -> ZoneMapResponse:
    parcel = db.get(ParcelEntity, parcel_id)
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")

    geom = json.loads(parcel.geometry_geojson)
    polygon = shapely_from_geojson_wgs84(geom)

    # For now we always use synthetic NDVI in mock mode; if a real NDVI raster is uploaded,
    # a future enhancement can read it via Rasterio and feed into ZoningService.
    return zoning_service.generate_zone_map(
        parcel_id=parcel_id,
        polygon=polygon,  # type: ignore[arg-type]
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/canopy/{parcel_id}", response_model=CanopyDetectionResult)
def get_canopy(
    parcel_id: str,
    method: str = "blob",
    db: Session = Depends(get_db),
) -> CanopyDetectionResult:
    parcel = db.get(ParcelEntity, parcel_id)
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")

    geom = json.loads(parcel.geometry_geojson)
    polygon = shapely_from_geojson(geom)

    # Prefer uploaded orthomosaic if any; otherwise fallback to workspace Orthomosaic.tif.
    stmt = (
        select(OrthomosaicUploadEntity)
        .where(OrthomosaicUploadEntity.parcel_id == parcel_id)
        .order_by(OrthomosaicUploadEntity.uploaded_at.desc())
        .limit(1)
    )
    latest_ortho = db.execute(stmt).scalars().first()
    image_path = Path(latest_ortho.path) if latest_ortho else None

    return canopy_service.detect_canopies(
        parcel_id=parcel_id,
        method=method,
        polygon=polygon,  # type: ignore[arg-type]
        image_path=image_path,
        comparison=None,
    )


@router.get("/canopy/orthomosaic-preview/{parcel_id}")
def orthomosaic_preview(parcel_id: str, db: Session = Depends(get_db)) -> Response:
    """
    Returns a PNG preview of the latest uploaded orthomosaic (or fallback demo `Orthomosaic.tif`).
    Used by the frontend image viewer overlay.
    """
    parcel = db.get(ParcelEntity, parcel_id)
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")

    stmt = (
        select(OrthomosaicUploadEntity)
        .where(OrthomosaicUploadEntity.parcel_id == parcel_id)
        .order_by(OrthomosaicUploadEntity.uploaded_at.desc())
        .limit(1)
    )
    latest_ortho = db.execute(stmt).scalars().first()
    ortho_path = Path(latest_ortho.path) if latest_ortho else (WORKSPACE_ROOT / "Orthomosaic.tif")
    if not ortho_path.exists():
        raise HTTPException(status_code=404, detail=f"Orthomosaic file not found: {ortho_path}")

    with rasterio.open(str(ortho_path)) as src:
        max_dim = 1600
        h, w = src.height, src.width
        scale = max(h / max_dim, w / max_dim, 1.0)
        out_h = max(1, int(h / scale))
        out_w = max(1, int(w / scale))
        count = src.count
        if count >= 3:
            b1 = src.read(1, out_shape=(out_h, out_w), resampling=rasterio.enums.Resampling.bilinear)
            b2 = src.read(2, out_shape=(out_h, out_w), resampling=rasterio.enums.Resampling.bilinear)
            b3 = src.read(3, out_shape=(out_h, out_w), resampling=rasterio.enums.Resampling.bilinear)
            img = np.stack([b1, b2, b3], axis=-1)
        else:
            b1 = src.read(1, out_shape=(out_h, out_w), resampling=rasterio.enums.Resampling.bilinear)
            img = np.stack([b1, b1, b1], axis=-1)

    img = np.nan_to_num(img, nan=0.0, posinf=0.0, neginf=0.0)
    # Normalize to 0..255 for preview.
    vmin = float(np.percentile(img, 2))
    vmax = float(np.percentile(img, 98))
    if vmax <= vmin:
        vmax = vmin + 1.0
    img_norm = np.clip((img - vmin) / (vmax - vmin), 0.0, 1.0)
    img_u8 = (img_norm * 255.0).astype(np.uint8)

    # Convert to BGR for OpenCV encode.
    bgr = img_u8[:, :, ::-1]
    ok, png_bytes = cv2.imencode(".png", bgr)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to encode orthomosaic preview image")

    return StreamingResponse(iter([png_bytes.tobytes()]), media_type="image/png")


@router.post("/models/train", response_model=ModelCompareResponse)
def train_models(req: ModelTrainRequest) -> ModelCompareResponse:
    # Synthetic training/evaluation in demo mode for algorithm comparison.
    return model_comparison_service.compare(n_samples=req.n_samples, seed=req.random_seed)


@router.get("/models/compare", response_model=ModelCompareResponse)
def compare_models(n_samples: int = 500, random_seed: int = 42) -> ModelCompareResponse:
    # Recompute each time so newly available libraries (installed after server start)
    # are reflected immediately in the comparison table.
    return model_comparison_service.compare(n_samples=n_samples, seed=random_seed)


@router.get("/runs", response_model=list[ModelCompareResponse])
def list_runs() -> list[ModelCompareResponse]:
    return model_comparison_service.list_runs()


@router.post("/models/active", response_model=ModelCompareResponse)
def set_active_model(algorithm: str) -> ModelCompareResponse:
    updated = model_comparison_service.set_active_algorithm(algorithm)
    if updated is not None:
        return updated
    resp = model_comparison_service.compare()
    model_comparison_service.set_active_algorithm(algorithm)
    return model_comparison_service.latest() or resp

