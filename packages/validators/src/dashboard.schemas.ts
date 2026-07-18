import { z } from "zod";

/**
 * @spec SPEC-20260521-003 RF-02, RF-03
 */
export const exportExpensesQuerySchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Período deve estar no formato YYYY-MM"),
  vehicle_id: z.string().uuid().optional(),
});
export type ExportExpensesQuery = z.infer<typeof exportExpensesQuerySchema>;

/**
 * @spec SPEC-20260531-001 RF-DA-03
 * `vehicle_id` só afeta o KPI "Próxima manutenção" (RF-DA-03) — os demais KPIs da Zona A são
 * sempre agregados de frota, conforme a redação da spec (Fleet Command não recorta por veículo).
 */
export const fleetKpisQuerySchema = z.object({
  vehicle_id: z.string().uuid().optional(),
});
export type FleetKpisQuery = z.infer<typeof fleetKpisQuerySchema>;

/** @spec SPEC-20260531-001 RF-SH-01, RF-SH-02 */
export interface FleetHealthEntry {
  vehicle_id: string;
  score: number;
  flags: Array<{ type: string; [key: string]: unknown }>;
}

/** @spec SPEC-20260531-001 RF-DA-01, CA-S3-02 */
export type FleetAlertType =
  | "maintenance_overdue"
  | "maintenance_upcoming"
  | "document_overdue";

export interface FleetAlert {
  id: string;
  type: FleetAlertType;
  vehicle_id: string;
  vehicle_plate: string;
  description: string;
  due_date: string;
  days_until_due: number;
}

/**
 * Cada KPI pode falhar isoladamente sem derrubar os demais (RF-DA-03, CA-S1-05.1).
 */
export type KpiResult<T> = { ok: true; value: T } | { ok: false };

export interface FleetKpis {
  total_this_month: KpiResult<number>;
  urgent_maintenance_count: KpiResult<number>;
  cost_per_km: KpiResult<number | null>;
  next_maintenance: KpiResult<{ date: string; vehicle_plate: string } | null>;
}

/** @spec SPEC-20260531-001 RF-DA-04 */
export type DocumentStatus = "ok" | "attention" | "overdue" | "unknown";

export interface VehicleDocumentsStatus {
  ipva: DocumentStatus;
  insurance: DocumentStatus;
  crlv: DocumentStatus;
}

export interface VehicleCard {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  nickname: string | null;
  odometer: number | null;
  last_fuel_date: string | null;
  last_fuel_amount: number | null;
  /** @spec SPEC-20260531-001 CA-S3-03 — true quando o último abastecimento não tem odômetro preenchido (dado legado, anterior à obrigatoriedade de RF-BD-04) */
  last_fuel_odometer_missing: boolean;
  documents: VehicleDocumentsStatus;
}

/**
 * @spec SPEC-20260531-001 RF-DB-07
 */
export const vehicleHistoryQuerySchema = z.object({
  vehicle_id: z.string().uuid(),
});
export type VehicleHistoryQuery = z.infer<typeof vehicleHistoryQuerySchema>;

export interface VehicleHistoryItem {
  id: string;
  type: "expense" | "maintenance";
  date: string;
  description: string;
  amount: number | null;
}
