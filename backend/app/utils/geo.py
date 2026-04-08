from __future__ import annotations

import json
from typing import Any, Dict, Optional, Tuple

from shapely.geometry import LineString, Point, Polygon, shape
from shapely.geometry.base import BaseGeometry
from pyproj import CRS, Transformer


def _find_crs_epsg(geojson: Dict[str, Any]) -> Optional[int]:
    crs = geojson.get("crs")
    if not isinstance(crs, dict):
        return None
    props = crs.get("properties") or {}
    name = props.get("name") or ""
    # Common form: "urn:ogc:def:crs:EPSG::32643"
    if "EPSG" not in name:
        return None
    digits = "".join([ch for ch in name if ch.isdigit()])
    if not digits:
        return None
    return int(digits)


def _normalize_geojson(geojson: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert GeoJSON FeatureCollection/Feature into a single geometry container.
    """

    if geojson.get("type") == "FeatureCollection":
        features = geojson.get("features") or []
        if not features:
            raise ValueError("GeoJSON FeatureCollection has no features.")
        return features[0]
    if geojson.get("type") == "Feature":
        return geojson
    return {"type": "Feature", "geometry": geojson, "properties": {}}


def shapely_from_geojson(geojson: Dict[str, Any]) -> BaseGeometry:
    """
    Return a Shapely geometry from GeoJSON.

    If the input is a closed ring LineString, we convert it to a Polygon for area-based features.
    """

    normalized = _normalize_geojson(geojson)
    geom_obj = normalized.get("geometry")
    if not geom_obj:
        raise ValueError("Invalid GeoJSON: missing 'geometry'.")

    geom_type = geom_obj.get("type")
    if geom_type == "LineString":
        coords = geom_obj.get("coordinates") or []
        if len(coords) < 4:
            raise ValueError("LineString has too few points to be polygonal.")
        if coords[0] != coords[-1]:
            coords = coords + [coords[0]]
        return Polygon(coords)

    return shape(geom_obj)


def shapely_from_geojson_wgs84(geojson: Dict[str, Any]) -> BaseGeometry:
    """
    Build Shapely geometry from GeoJSON and transform to EPSG:4326.
    """
    epsg = _find_crs_epsg(geojson) or 4326
    geom = shapely_from_geojson(geojson)
    return transform_geom(geom, epsg, 4326)


def transform_geom(
    geom: BaseGeometry, from_epsg: int, to_epsg: int
) -> BaseGeometry:
    if from_epsg == to_epsg:
        return geom
    transformer = Transformer.from_crs(CRS.from_epsg(from_epsg), CRS.from_epsg(to_epsg), always_xy=True)
    # shapely >=2 supports transform directly; avoid version assumptions with manual mapping.
    return shapely_transform(transformer, geom)


def shapely_transform(transformer: Transformer, geom: BaseGeometry) -> BaseGeometry:
    # Minimal manual coordinate transform for Polygon/LineString/Multi* using shapely's mapping.
    from shapely.ops import transform as shp_transform

    return shp_transform(lambda x, y, z=None: transformer.transform(x, y), geom)


def centroid_and_bbox_wgs84(geojson: Dict[str, Any]) -> Tuple[tuple[float, float], tuple[float, float, float, float]]:
    """
    Returns:
      - centroid (lon, lat) in EPSG:4326
      - bbox (min_lon, min_lat, max_lon, max_lat) in EPSG:4326
    """

    epsg = _find_crs_epsg(geojson) or 4326
    geom = shapely_from_geojson(geojson)
    geom_wgs84 = transform_geom(geom, epsg, 4326)

    c = geom_wgs84.centroid
    centroid = (float(c.x), float(c.y))

    minx, miny, maxx, maxy = geom_wgs84.bounds
    bbox = (float(minx), float(miny), float(maxx), float(maxy))
    return centroid, bbox


def safe_json_dumps(obj: Any) -> str:
    return json.dumps(obj, separators=(",", ":"), ensure_ascii=False)

