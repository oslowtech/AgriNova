import { LandHealth, Valuation, ZoneMap, SoilData, WeatherData, ProximityData, LocationInfo, FullIntelligence } from "../types";

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
  top_factors: [
    { name: "Land Health Score", impact: "positive", contribution: 30 },
    { name: "Location Access", impact: "positive", contribution: 25 },
    { name: "Soil Quality", impact: "neutral", contribution: 20 }
  ],
  disclaimer: "This is an estimated intelligence range, not a legal or government guideline valuation."
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

const DEMO_SOIL: SoilData = {
  ph: 6.5,
  organic_carbon: 15.2,
  clay: 28.5,
  sand: 35.2,
  silt: 36.3,
  texture_class: "Clay Loam",
  confidence: 0.9,
  source: "ISRIC SoilGrids"
};

const DEMO_WEATHER: WeatherData = {
  temperature_mean: 27.5,
  temperature_min: 18.2,
  temperature_max: 38.5,
  precipitation_annual: 1150,
  precipitation_days: 85,
  heat_stress_days: 45,
  monthly_temps: [22, 24, 28, 32, 34, 30, 28, 27, 28, 27, 24, 22],
  monthly_precip: [20, 15, 25, 45, 120, 180, 220, 190, 150, 100, 50, 30],
  rainfall_status: "normal",
  source: "Open-Meteo"
};

const DEMO_PROXIMITY: ProximityData = {
  nearest_highway_km: 2.5,
  nearest_town_km: 4.2,
  nearest_water_km: 1.8,
  highway_name: "NH-44",
  town_name: "Kolar",
  water_name: "Tank",
  source: "OpenStreetMap"
};

const DEMO_LOCATION: LocationInfo = {
  display_name: "Sample Village, Kolar, Karnataka, India",
  village: "Sample Village",
  town: null,
  city: null,
  district: "Kolar",
  state: "Karnataka",
  country: "India",
  source: "OSM Nominatim"
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
  const timeoutId = setTimeout(() => controller.abort(), 15000);

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

export async function fetchSoilData(lat: number, lng: number): Promise<SoilData> {
  return request<SoilData>(`/soil?lat=${lat}&lng=${lng}`, DEMO_SOIL);
}

export async function fetchWeatherData(lat: number, lng: number): Promise<WeatherData> {
  return request<WeatherData>(`/weather?lat=${lat}&lng=${lng}`, DEMO_WEATHER);
}

export async function fetchProximityData(lat: number, lng: number): Promise<ProximityData> {
  return request<ProximityData>(`/proximity?lat=${lat}&lng=${lng}`, DEMO_PROXIMITY);
}

export async function fetchLocationInfo(lat: number, lng: number): Promise<LocationInfo> {
  return request<LocationInfo>(`/location?lat=${lat}&lng=${lng}`, DEMO_LOCATION);
}

export async function fetchFullIntelligence(lat: number, lng: number): Promise<FullIntelligence> {
  return request<FullIntelligence>(`/intelligence?lat=${lat}&lng=${lng}`);
}

export async function checkHealth(): Promise<boolean> {
  try {
    await request<{ status: string }>("/health");
    return true;
  } catch {
    return false;
  }
}
