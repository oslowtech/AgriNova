import axios from "axios";
import type {
  CanopyDetectionResult,
  LandHealthResponse,
  ModelCompareResponse,
  ParcelLite,
  ValuationResult,
  ZoneMapResponse,
} from "../types";

const client = axios.create({
  baseURL: "/api",
  timeout: 120000,
});

export async function apiHealth() {
  const res = await client.get("/health");
  return res.data as { status: string; mode: string; cache_dir: string };
}

export async function createParcel(geometry: any, parcel_name?: string) {
  const res = await client.post("/parcels", {
    parcel_name: parcel_name ?? null,
    geometry,
  });
  return res.data as ParcelLite;
}

export async function getSampleBoundary() {
  const res = await client.get("/samples/boundary");
  return res.data;
}

export async function getLandHealth(parcel_id: string): Promise<LandHealthResponse> {
  const res = await client.get(`/land-health/${parcel_id}`);
  return res.data;
}

export async function getValuation(parcel_id: string): Promise<ValuationResult> {
  const res = await client.get(`/valuation/${parcel_id}`);
  return res.data;
}

export async function getZones(
  parcel_id: string,
  params?: { from_date?: string; to_date?: string },
): Promise<ZoneMapResponse> {
  const res = await client.get(`/zones/${parcel_id}`, { params });
  return res.data;
}

export async function getCanopy(
  parcel_id: string,
  params?: { method?: "blob" | "watershed" },
): Promise<CanopyDetectionResult> {
  const res = await client.get(`/canopy/${parcel_id}`, { params });
  return res.data;
}

export async function uploadRaster(
  parcel_id: string,
  kind: string,
  file: File,
): Promise<{ status: string; path: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await client.post(`/uploads/raster?parcel_id=${parcel_id}&kind=${encodeURIComponent(kind)}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function uploadOrthomosaic(
  parcel_id: string,
  file: File,
): Promise<{ status: string; path: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await client.post(`/uploads/orthomosaic?parcel_id=${parcel_id}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function getOrthomosaicPreview(parcel_id: string): Promise<Blob> {
  const res = await client.get(`/canopy/orthomosaic-preview/${parcel_id}`, { responseType: "blob" });
  return res.data as Blob;
}

export async function trainModels(parcel_id: string, n_samples = 500, random_seed = 42): Promise<ModelCompareResponse> {
  const res = await client.post("/models/train", { parcel_id, n_samples, random_seed });
  return res.data;
}

export async function getModelComparison(): Promise<ModelCompareResponse> {
  const res = await client.get("/models/compare");
  return res.data;
}

export async function setActiveModel(algorithm: string): Promise<ModelCompareResponse> {
  const res = await client.post(`/models/active?algorithm=${encodeURIComponent(algorithm)}`);
  return res.data;
}

