from __future__ import annotations

import datetime as dt
import math
from pathlib import Path
from typing import List, Tuple

import cv2
import numpy as np
import rasterio
from shapely.geometry import Polygon

from app.core.settings import settings
from app.schemas.canopy import CanopyBlob, CanopyComparison, CanopyDetectionResult
from app.schemas.common import Confidence, DataSourceTrace, ExplanationItem


class CanopyService:
    """
    FR-29..FR-33: canopy detection using OpenCV.
    Supports two methods: blob and watershed.

    In demo mode, defaults to Orthomosaic.tif in workspace if no upload is present.
    """

    def __init__(self, workspace_root: Path) -> None:
        self.mode = settings.landroid_mode
        self.workspace_root = workspace_root

    def _load_image(self, image_path: Path | None) -> np.ndarray:
        if image_path is None:
            # Demo-mode fallback to Orthomosaic.tif
            fallback = self.workspace_root / "Orthomosaic.tif"
            image_path = fallback
        if not image_path.exists():
            raise FileNotFoundError(f"Unable to read orthomosaic at {image_path}")

        suffix = image_path.suffix.lower()
        if suffix in {".tif", ".tiff"}:
            # Read a downsampled preview-sized array to avoid loading full multi-GB rasters into memory.
            with rasterio.open(str(image_path)) as src:
                max_dim = 1600
                h, w = src.height, src.width
                scale = max(h / max_dim, w / max_dim, 1.0)
                out_h = max(1, int(h / scale))
                out_w = max(1, int(w / scale))

                count = src.count
                if count >= 3:
                    arr = src.read(
                        [1, 2, 3],
                        out_shape=(3, out_h, out_w),
                        resampling=rasterio.enums.Resampling.bilinear,
                    )
                    img = np.transpose(arr, (1, 2, 0))
                else:
                    arr = src.read(
                        1,
                        out_shape=(out_h, out_w),
                        resampling=rasterio.enums.Resampling.bilinear,
                    )
                    img = np.stack([arr, arr, arr], axis=-1)

            img = np.nan_to_num(img, nan=0.0, posinf=0.0, neginf=0.0)
            vmin = float(np.percentile(img, 2))
            vmax = float(np.percentile(img, 98))
            if vmax <= vmin:
                vmax = vmin + 1.0
            img_norm = np.clip((img - vmin) / (vmax - vmin), 0.0, 1.0)
            return (img_norm * 255.0).astype(np.uint8)

        img = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
        if img is None:
            raise FileNotFoundError(f"Unable to read orthomosaic at {image_path}")
        return img

    def _detect_canopies_blob(self, img: np.ndarray) -> List[Tuple[float, float, float]]:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray_blur = cv2.medianBlur(gray, 5)

        params = cv2.SimpleBlobDetector_Params()
        params.filterByColor = False
        params.filterByArea = True
        params.minArea = 20
        params.maxArea = 5000
        params.filterByCircularity = False
        params.filterByConvexity = False
        params.filterByInertia = False

        detector = cv2.SimpleBlobDetector_create(params)
        keypoints = detector.detect(gray_blur)

        blobs: List[Tuple[float, float, float]] = []
        for k in keypoints:
            x, y = k.pt
            r = k.size / 2.0
            blobs.append((x, y, r))
        return blobs

    def _detect_canopies_watershed(self, img: np.ndarray) -> List[Tuple[float, float, float]]:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        _, thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        kernel = np.ones((3, 3), np.uint8)
        opening = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=2)

        sure_bg = cv2.dilate(opening, kernel, iterations=3)
        dist_transform = cv2.distanceTransform(opening, cv2.DIST_L2, 5)
        _, sure_fg = cv2.threshold(
            dist_transform, 0.4 * dist_transform.max(), 255, 0
        )
        sure_fg = sure_fg.astype(np.uint8)
        unknown = cv2.subtract(sure_bg, sure_fg)

        num_markers, markers = cv2.connectedComponents(sure_fg)
        markers = markers + 1
        markers[unknown == 255] = 0

        img_color = img.copy()
        cv2.watershed(img_color, markers)

        blobs: List[Tuple[float, float, float]] = []
        for marker_id in range(2, num_markers + 1):
            mask = markers == marker_id
            ys, xs = np.where(mask)
            if xs.size == 0:
                continue
            x_center = float(xs.mean())
            y_center = float(ys.mean())
            area = float(mask.sum())
            radius = float(math.sqrt(area / math.pi))
            blobs.append((x_center, y_center, radius))
        return blobs

    def _to_canopy_result(
        self,
        parcel_id: str,
        method: str,
        blobs_raw: List[Tuple[float, float, float]],
        polygon: Polygon | None = None,
        comparison: CanopyComparison | None = None,
    ) -> CanopyDetectionResult:
        if not blobs_raw:
            return CanopyDetectionResult(
                parcel_id=parcel_id,
                mode=self.mode,
                method=method,
                total_canopy_count=0,
                density_per_acre=0.0,
                median_canopy_area_sq_m=0.0,
                blobs=[],
                stressed_canopy_ids=[],
                comparison=comparison,
                confidence=Confidence(
                    score=0.4, notes="No canopies detected; image may be low resolution or unsuitable."
                ),
                explanation="No canopy-like blobs detected in the orthomosaic.",
                data_traces=[],
                factor_explanations=[],
            )

        # Approximate ground sampling: assume 0.1 m per pixel in demo mode.
        pixel_size_m = 0.1
        blobs: List[CanopyBlob] = []
        areas: List[float] = []

        for idx, (x, y, r) in enumerate(blobs_raw, start=1):
            area_px = math.pi * r * r
            area_sq_m = area_px * pixel_size_m * pixel_size_m

            blobs.append(
                CanopyBlob(
                    id=idx,
                    x=float(x),
                    y=float(y),
                    radius=float(r * pixel_size_m),
                    area_sq_m=float(area_sq_m),
                    is_stressed=False,  # filled later
                )
            )
            areas.append(area_sq_m)

        areas_arr = np.array(areas, dtype=float)
        median_area = float(np.median(areas_arr))
        stressed_ids: List[int] = []
        for blob in blobs:
            if blob.area_sq_m < 0.5 * median_area:
                blob.is_stressed = True
                stressed_ids.append(blob.id)

        parcel_area_sq_m = float(polygon.area) if polygon is not None else 4046.86
        density_per_acre = float(len(blobs) / (parcel_area_sq_m / 4046.86))

        conf_score = 0.7 if len(blobs) > 5 else 0.5

        explanation = (
            "Canopy detection uses OpenCV-based "
            f"{'blob detection' if method == 'blob' else 'watershed segmentation'} "
            "to identify individual canopy-like objects. Smaller-than-median canopies "
            "are flagged as potentially stressed."
        )

        now_iso = dt.datetime.utcnow().isoformat()
        return CanopyDetectionResult(
            parcel_id=parcel_id,
            mode=self.mode,
            method=method,
            total_canopy_count=len(blobs),
            density_per_acre=density_per_acre,
            median_canopy_area_sq_m=median_area,
            blobs=blobs,
            stressed_canopy_ids=stressed_ids,
            comparison=comparison,
            confidence=Confidence(
                score=conf_score,
                notes="Heuristic confidence based on canopy count and assumed resolution.",
            ),
            explanation=explanation,
            data_traces=[
                DataSourceTrace(
                    source="Orthomosaic image",
                    timestamp_iso=now_iso,
                    mode=self.mode,
                    details={"method": method},
                )
            ],
            factor_explanations=[
                ExplanationItem(
                    factor="Canopy count",
                    direction="up" if len(blobs) > 0 else "mixed",
                    detail=f"Total detected canopy-like objects: {len(blobs)}",
                ),
                ExplanationItem(
                    factor="Stressed canopy fraction",
                    direction="down" if stressed_ids else "mixed",
                    detail=f"{len(stressed_ids)} of {len(blobs)} canopies are smaller than 50% of median area.",
                ),
            ],
        )

    def detect_canopies(
        self,
        parcel_id: str,
        method: str,
        polygon: Polygon | None,
        image_path: Path | None,
        comparison: CanopyComparison | None = None,
    ) -> CanopyDetectionResult:
        img = self._load_image(image_path)

        if method == "watershed":
            blobs_raw = self._detect_canopies_watershed(img)
        else:
            blobs_raw = self._detect_canopies_blob(img)
            method = "blob"

        return self._to_canopy_result(parcel_id, method, blobs_raw, polygon=polygon, comparison=comparison)

