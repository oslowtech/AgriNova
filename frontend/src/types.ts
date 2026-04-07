export type LandHealth = {
  score: number;
  label: "Healthy" | "Moderate" | "At Risk";
  confidence: number;
  ndvi: number;
  rainfall: number;
  soil: number;
  temperature: number;
};

export type ZoneName = "stressed" | "sparse" | "healthy" | "dense";

export type ZoneCell = {
  row: number;
  col: number;
  ndvi: number;
  zone: ZoneName;
};

export type ZoneMap = {
  percentages: Record<ZoneName, number>;
  grid_size: number;
  cells: ZoneCell[];
};

export type ValuationFactor = {
  name: string;
  contribution: number;  // Percentage contribution
  score: number;        // Raw score value
};

export type Valuation = {
  low: number;
  mid: number;
  high: number;
  currency: string;
  confidence?: number;
  top_factors?: ValuationFactor[];
  disclaimer?: string;
};

export type SoilData = {
  ph: number;
  organic_carbon: number;
  clay: number;
  sand: number;
  silt: number;
  texture_class: string;
  confidence: number;
  source: string;
};

export type WeatherData = {
  temperature_mean: number;
  temperature_min: number;
  temperature_max: number;
  precipitation_annual: number;
  precipitation_days: number;
  heat_stress_days: number;
  monthly_temps: number[];
  monthly_precip: number[];
  rainfall_status: "surplus" | "normal" | "deficit";
  source: string;
};

export type ProximityData = {
  nearest_highway_km: number;
  nearest_town_km: number;
  nearest_water_km: number;
  highway_name: string | null;
  town_name: string | null;
  water_name: string | null;
  source: string;
};

export type LocationInfo = {
  display_name: string;
  village: string | null;
  town: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  country: string;
  source: string;
};

export type FullIntelligence = {
  latitude: number;
  longitude: number;
  location: LocationInfo | null;
  health: LandHealth;
  soil: SoilData | null;
  weather: WeatherData | null;
  proximity: ProximityData | null;
  valuation: Valuation;
  zones: Record<ZoneName, number>;
};

export type UserRole = "land_consultant" | "landowner";

export type UserProfile = {
  uid: string;
  phone?: string;
  email?: string;
  name: string;
  role: UserRole;
  createdAt: Date;
};
