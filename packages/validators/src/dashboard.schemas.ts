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

/**
 * @spec SPEC-20260531-001 RF-DA-01, CA-S3-02
 * `document_upcoming` (documento a vencer, ainda não vencido) só é emitido quando o chamador passa
 * `include_upcoming=true` em `GET /dashboard/alerts` (ver `alertsQuerySchema`) — o comportamento
 * default de RF-DA-01 (só documentos já vencidos) não muda.
 */
export type FleetAlertType =
  | "maintenance_overdue"
  | "maintenance_upcoming"
  | "document_overdue"
  | "document_upcoming";

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
 * @spec SPEC-20260531-001 RF-DA-01
 * Flag opt-in — sem ela, `GET /dashboard/alerts` mantém o comportamento aprovado (só documentos
 * vencidos). Usada hoje só pelo protótipo `/dashboard/concept` para montar uma timeline de
 * próximos eventos; não é (ainda) consumida pela `FleetAlertBar` de produção.
 */
export const alertsQuerySchema = z.object({
  include_upcoming: z.coerce.boolean().optional(),
});
export type AlertsQuery = z.infer<typeof alertsQuerySchema>;

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

/**
 * @spec SPEC-20260721-002 RF-01 (revisão: catálogo de KPIs configurável)
 * Catálogo fixo de KPIs disponíveis para o dashboard — cada id mapeia para uma fonte de dado
 * real já existente (RPCs de analytics de SPEC-20260622-001 ou queries do próprio dashboard).
 * Não é um "query builder" livre — decisão de UX registrada em R-KPI-01: mais opções que isso
 * aumenta carga cognitiva sem ganho proporcional (Miller's Law / Hick's Law).
 */
export const KPI_CATALOG_IDS = [
  "expenses_month",
  "cost_per_km",
  "fleet_health",
  "urgent_maintenance",
  "total_vehicles",
  "next_maintenance",
  "upcoming_costs_7d",
  "expense_anomalies",
] as const;
export type KpiCatalogId = (typeof KPI_CATALOG_IDS)[number];

/** @spec SPEC-20260721-002 RF-01 — mesmo conjunto de 4 KPIs já exibidos antes desta feature, preservado como default para não mudar a experiência sem ação do usuário. */
export const DEFAULT_DASHBOARD_KPI_IDS: KpiCatalogId[] = [
  "expenses_month",
  "urgent_maintenance",
  "cost_per_km",
  "next_maintenance",
];

/** @spec SPEC-20260721-002 R-KPI-01 — teto de KPIs simultâneos no dashboard */
export const MAX_ACTIVE_DASHBOARD_KPIS = 6;

/** @spec SPEC-20260721-002 R-KPI-01 */
export const dashboardKpiIdsSchema = z
  .array(z.enum(KPI_CATALOG_IDS))
  .min(1, { message: "Selecione ao menos 1 KPI" })
  .max(MAX_ACTIVE_DASHBOARD_KPIS, { message: `Selecione no máximo ${MAX_ACTIVE_DASHBOARD_KPIS} KPIs` })
  .refine((ids) => new Set(ids).size === ids.length, { message: "KPIs não podem repetir" });
export type DashboardKpiIds = z.infer<typeof dashboardKpiIdsSchema>;

/**
 * @spec SPEC-20260721-002 RF-01, R-KPI-02
 * `delta_pct` é `null` (não zero) quando a amostra do período anterior é pequena demais para um
 * percentual ser informativo (R-KPI-02) ou quando não há histórico suficiente — o frontend deve
 * tratar `null` como "sem seta de tendência", nunca como "0%".
 */
export interface KpiSeriesValue {
  value: number;
  delta_pct: number | null;
  history_6mo: number[] | null;
}

/** @spec SPEC-20260721-002 RF-01 */
export interface FleetKpiCatalog {
  expenses_month: KpiResult<KpiSeriesValue>;
  cost_per_km: KpiResult<KpiSeriesValue>;
  fleet_health: KpiResult<number | null>;
  urgent_maintenance: KpiResult<number>;
  total_vehicles: KpiResult<number>;
  next_maintenance: KpiResult<{ date: string; vehicle_plate: string } | null>;
  upcoming_costs_7d: KpiResult<{ total: number; count: number }>;
  expense_anomalies: KpiResult<number>;
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

/**
 * @spec SPEC-20260722-004 RF-01, RF-08
 * `groupIds` chega como string única ou array na querystring (Express/qs) — normaliza para
 * array antes de validar cada item como UUID.
 */
export const categorySummaryQuerySchema = z.object({
  vehicleId: z.string().uuid().optional(),
  groupIds: z.preprocess(
    (value) => (value === undefined ? undefined : Array.isArray(value) ? value : [value]),
    z.array(z.string().uuid()).optional(),
  ),
});
export type CategorySummaryQuery = z.infer<typeof categorySummaryQuerySchema>;

/** @spec SPEC-20260722-004 RF-01, R-SUB-01 */
export interface CategorySummaryItem {
  category: string;
  label: string;
  total_amount: number;
  count: number;
}

/** @spec SPEC-20260722-004 RF-02, R-SUB-03, R-SUB-04 */
export const finesStatusResponseSchema = z.object({
  status: z.enum(["none", "open", "overdue"]),
  count: z.number().int().min(0),
});
export type FinesStatusResponse = z.infer<typeof finesStatusResponseSchema>;

/**
 * @spec SPEC-20260721-002 RF-08
 * Ponto de série mensal genérico, reaproveitado pelos dois gráficos de frota que são agregados
 * por mês (custo/km e volume de combustível) — mesmo formato que `KpiSeriesValue.history_6mo`,
 * mas com o rótulo do mês explícito (`month`) porque aqui o dado é consumido por um gráfico, não
 * por um KpiCard com sparkline.
 */
export interface MonthlySeriesPoint {
  month: string;
  value: number;
}

/**
 * @spec SPEC-20260721-002 RF-08
 * Os 3 gráficos inline de frota (US-08). Endpoint próprio (`GET /dashboard/fleet-charts`),
 * desacoplado de `fleet-kpis`/`kpi-catalog` (RNF-05 — RF-08 não deve bloquear os demais RFs desta
 * spec). `fuel_liters` é volume de combustível abastecido por mês (soma de `expenses.liters`),
 * não eficiência km/L — métrica de eficiência por veículo já existe em
 * `GET /analytics/fuel-trend/:vehicleId` e não agrega de forma significativa entre veículos
 * diferentes de uma frota mista (decisão registrada no changelog da spec).
 */
export interface FleetChartsResponse {
  cost_per_km: MonthlySeriesPoint[];
  fuel_liters: MonthlySeriesPoint[];
  category_breakdown: CategorySummaryItem[];
}
