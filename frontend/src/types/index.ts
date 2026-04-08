export type Confidence = {
  score: number;
  notes?: string;
};

export type DataSourceTrace = {
  source: string;
  timestamp_iso: string;
  mode?: string;
  details?: Record<string, any>;
};

export type MonthlySeries = {
  months: string[];
  values: number[];
};

export type ExplanationItem = {
  factor: string;
  direction?: string;
  detail: string;
};

export type NDVITrendSignal = {
  current_value: number;
  mean_2yr: number;
  monthly_trend: MonthlySeries;
  status_label: string;
  trend_indicator: string;
  confidence: Confidence;
  explanation: string;
  factor_explanations: ExplanationItem[];
};

export type RainfallSignal = {
  annual_mm: number;
  monthly_distribution: MonthlySeries;
  historical_normal_annual_mm: number;
  deviation_from_normal_mm: number;
  surplus_deficit_flag: string;
  trend_indicator: string;
  confidence: Confidence;
  explanation: string;
};

export type TemperatureSignal = {
  label: string;
  monthly_trend: MonthlySeries;
  heat_stress_event_count: number;
  trend_indicator: string;
  confidence: Confidence;
  explanation: string;
};

export type SoilSignal = {
  soil_type: string;
  ph: number;
  organic_carbon: number;
  texture: string;
  confidence: Confidence;
  explanation: string;
};

export type CompositeLandHealth = {
  land_health_score: number;
  health_class: string;
  confidence: Confidence;
  weights: {
    ndvi_trend: number;
    rainfall_adequacy: number;
    soil_quality: number;
    temperature_suitability: number;
  };
  factor_breakdown: Record<string, number>;
  warnings: ExplanationItem[];
  explanation: string;
};

export type LandHealthResponse = {
  parcel_id: string;
  mode: string;
  signals: {
    ndvi: NDVITrendSignal;
    rainfall: RainfallSignal;
    temperature: TemperatureSignal;
    soil: SoilSignal;
  };
  composite: CompositeLandHealth;
  data_traces: DataSourceTrace[];
};

export type ParcelLite = {
  parcel_id: string;
  parcel_name?: string | null;
};

export type ValuationRange = {
  low: number;
  mid: number;
  high: number;
};

export type FactorContribution = {
  factor: string;
  direction?: string;
  delta_normalized: number;
  details?: string;
};

export type ValuationResult = {
  parcel_id: string;
  mode: string;
  valuation_band: string;
  estimated_intelligence_range_rs_per_acre: ValuationRange;
  confidence: Confidence;
  disclaimer: string;
  factor_contributions: Record<string, number>;
  top_factors: FactorContribution[];
  data_traces: DataSourceTrace[];
};

export type ZoneClass = {
  name: string;
  range: string;
  color: string;
  area_percent: number;
};

export type ZoneComparison = {
  from_date: string;
  to_date: string;
  lower_health_area_increase_percent: number;
  summary: string;
};

export type ZoneMapResponse = {
  parcel_id: string;
  mode: string;
  generated_at_iso: string;
  legend: ZoneClass[];
  zones_geojson: any;
  comparison?: ZoneComparison | null;
  confidence: Confidence;
  data_traces: DataSourceTrace[];
};

export type CanopyBlob = {
  id: number;
  x: number;
  y: number;
  radius: number;
  area_sq_m: number;
  is_stressed: boolean;
};

export type CanopyComparison = {
  from_date: string;
  to_date: string;
  missing_count: number;
  new_count: number;
};

export type CanopyDetectionResult = {
  parcel_id: string;
  mode: string;
  method: string;
  total_canopy_count: number;
  density_per_acre: number;
  median_canopy_area_sq_m: number;
  blobs: CanopyBlob[];
  stressed_canopy_ids: number[];
  comparison?: CanopyComparison | null;
  confidence: Confidence;
  explanation: string;
  data_traces: DataSourceTrace[];
};

export type ModelMetrics = {
  rmse: number;
  mae: number;
  r2: number;
  runtime_ms: number;
  inference_latency_ms: number;
  confidence_score: number;
};

export type AlgorithmComparisonItem = {
  algorithm: string;
  available: boolean;
  reason_unavailable?: string | null;
  metrics?: ModelMetrics | null;
  best_overall_score?: number | null;
};

export type ModelCompareResponse = {
  run_id: string;
  task: string;
  n_samples: number;
  results: AlgorithmComparisonItem[];
  winner?: string | null;
  active_algorithm?: string | null;
};

