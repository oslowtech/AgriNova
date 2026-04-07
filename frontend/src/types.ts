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
  impact: "positive" | "negative";
};

export type Valuation = {
  low: number;
  mid: number;
  high: number;
  currency: string;
  confidence?: number;
  factors?: ValuationFactor[];
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
