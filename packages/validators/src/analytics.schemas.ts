import { z } from "zod";

/** @spec SPEC-20260622-001 RF-08 */
export const fuelTrendQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type FuelTrendQuery = z.infer<typeof fuelTrendQuerySchema>;

/** @spec SPEC-20260622-001 RF-01, R-ANA-04 */
export interface VehicleTcoBreakdown {
  fuel: number;
  maintenance: number;
  fines: number;
  recurring: number;
  other: number;
}

export interface VehicleTco {
  total: number;
  breakdown: VehicleTcoBreakdown;
  cost_per_km: number | null;
  cost_per_month: number | null;
  total_km: number;
  period_days: number;
}

/** @spec SPEC-20260622-001 RF-02, R-ANA-01, R-FUEL-02, R-FUEL-03 */
export interface FuelTrendPoint {
  expense_id: string;
  date: string;
  liters: number;
  amount: number;
  odometer_km: number | null;
  km_per_liter: number | null;
  price_per_liter: number | null;
  rolling_avg_kpl: number | null;
}

/** @spec SPEC-20260622-001 RF-09, R-ANA-02 */
export const anomaliesQuerySchema = z.object({
  threshold: z.coerce.number().min(1.5).max(4.0).default(2.0),
  vehicle_id: z.string().uuid().optional(),
});
export type AnomaliesQuery = z.infer<typeof anomaliesQuerySchema>;

/** @spec SPEC-20260622-001 RF-03, R-ANA-02 */
export interface ExpenseAnomaly {
  expense_id: string;
  vehicle_id: string;
  category: string;
  amount: number;
  date: string;
  z_score: number;
  avg_amount: number;
  stddev_amount: number;
}

/** @spec SPEC-20260622-001 RF-04, R-ANA-05 */
export interface FleetBenchmarkEntry {
  vehicle_id: string;
  plate: string;
  vehicle_name: string;
  total_expenses: number;
  total_km: number;
  cost_per_km: number | null;
  avg_km_per_liter: number | null;
  maintenance_count: number;
  fines_count: number;
  health_score: number | null;
  efficiency_rank: number;
}

/** @spec SPEC-20260622-001 RF-11, R-ANA-03 */
export const forecastQuerySchema = z.object({
  vehicle_id: z.string().uuid().optional(),
  months: z.coerce.number().int().min(1).max(12).default(3),
});
export type ForecastQuery = z.infer<typeof forecastQuerySchema>;

/** @spec SPEC-20260622-001 RF-05, R-ANA-03 */
export interface MonthlyForecastPoint {
  month: string;
  projected_amount: number;
  projected_low: number;
  projected_high: number;
  is_forecast: boolean;
}

/** @spec SPEC-20260622-001 RF-12 */
export const seasonalQuerySchema = z.object({
  vehicle_id: z.string().uuid().optional(),
});
export type SeasonalQuery = z.infer<typeof seasonalQuerySchema>;

/** @spec SPEC-20260622-001 RF-06, R-ANA-07 */
export interface SeasonalHeatmapCell {
  month_number: number;
  category: string;
  avg_amount: number;
  occurrence_count: number;
}

/** @spec SPEC-20260622-001 RF-14, R-ANA-05 */
export const insightsQuerySchema = z.object({
  vehicle_id: z.string().uuid().optional(),
});
export type InsightsQuery = z.infer<typeof insightsQuerySchema>;

/** @spec SPEC-20260622-001 RF-14 */
export type AnalyticsInsightType =
  | "efficiency"
  | "fuel_degradation"
  | "fines_discount"
  | "cheaper_supplier"
  | "forecast_increase";

/** @spec SPEC-20260622-001 RF-14 */
export interface AnalyticsInsight {
  type: AnalyticsInsightType;
  message: string;
  vehicle_id: string | null;
}

/** @spec SPEC-20260622-001 RF-16 */
export const exportAnalyticsQuerySchema = z.object({
  vehicle_id: z.string().uuid().optional(),
  format: z.enum(["csv"]).default("csv"),
});
export type ExportAnalyticsQuery = z.infer<typeof exportAnalyticsQuerySchema>;
