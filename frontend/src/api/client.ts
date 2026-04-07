import { LandHealth, Valuation, ZoneMap } from "../types";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const DEMO_LAND_HEALTH: LandHealth = {
  score: 72.5,
  label: "Moderate",
  confidence: 0.85,
  ndvi: 0.58,
  rainfall: 1150,
  soil: 68,
  temperature: 28.5
};

const DEMO_ZONE_MAP: ZoneMap = {
  percentages: { dense: 18.5, healthy: 42.3, sparse: 28.1, stressed: 11.1 },
  grid_size: 12,
  cells: Array.from({ length: 144 }, (_, i) => {
    const row = Math.floor(i / 12);
    const col = i % 12;
    const zones = ["dense", "healthy", "sparse", "stressed"] as const;
    const weights = [0.18, 0.42, 0.28, 0.12];
    const rand = Math.random();
    let cumulative = 0;
    let zone = "healthy";
    for (let j = 0; j < weights.length; j++) {
      cumulative += weights[j];
      if (rand < cumulative) {
        zone = zones[j];
        break;
      }
    }
    return { row, col, zone, ndvi: 0.3 + Math.random() * 0.5 };
  })
};

const DEMO_VALUATION: Valuation = {
  low: 1200000,
  mid: 1650000,
  high: 2100000,
  currency: "INR",
  confidence: 0.78,
  factors: [
    { name: "Land Health Score", impact: "positive" },
    { name: "Proximity to Highway", impact: "positive" },
    { name: "Water Body Nearby", impact: "positive" }
  ]
};

const DEMO_BOUNDARY = {
  type: "FeatureCollection",
  features: [{
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [[
        [77.58, 12.96],
        [77.60, 12.96],
        [77.60, 12.98],
        [77.58, 12.98],
        [77.58, 12.96]
      ]]
    }
  }]
};

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function request<T>(path: string, fallback?: T): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      throw new Error("Unauthorized - please log in again");
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (fallback !== undefined) {
      console.warn(`API call failed for ${path}, using demo data:`, error);
      return fallback;
    }
    
    throw error;
  }
}

export async function fetchLandHealth(lat: number, lng: number): Promise<LandHealth> {
  return request<LandHealth>(`/land-health?lat=${lat}&lng=${lng}`, DEMO_LAND_HEALTH);
}

export async function fetchZoneMap(lat: number, lng: number): Promise<ZoneMap> {
  return request<ZoneMap>(`/zone-map?lat=${lat}&lng=${lng}&grid_size=12`, DEMO_ZONE_MAP);
}

export async function fetchValuation(lat: number, lng: number): Promise<Valuation> {
  return request<Valuation>(`/valuation?lat=${lat}&lng=${lng}`, DEMO_VALUATION);
}

export async function fetchBoundary(): Promise<any> {
  return request<any>("/boundary", DEMO_BOUNDARY);
}

export async function checkHealth(): Promise<boolean> {
  try {
    await request<{ status: string }>("/health");
    return true;
  } catch {
    return false;
  }
}
