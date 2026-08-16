import { z } from "zod";
import { fuelTypeSchema } from "./vehicle.schemas";

/**
 * @spec SPEC-20260715-002 RF-BK-06, R-TZ-03
 * Aceita `YYYY-MM-DD` (compatibilidade retroativa — interpretado como meia-noite no fuso do
 * usuário pelo service) ou ISO 8601 com offset explícito (`2026-07-15T21:30:00-03:00`).
 */
export const occurredAtSchema = z
  .string()
  .refine(
    (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isNaN(Date.parse(value)),
    "Data deve estar no formato YYYY-MM-DD ou ISO 8601 com offset",
  );

/**
 * @spec SPEC-20260714-001 RF-01, RF-02
 * Campos obrigatórios (vehicle_id, category, amount, occurred_at) + opcionais de combustível.
 * source_type/source_id/is_readonly nunca aparecem aqui — somente-leitura via API pública (RNF-04).
 */
export const expenseBaseSchema = z.object({
  vehicle_id: z.string().uuid(),
  category: z.string().trim().min(1).max(100),
  amount: z.number().min(0.01).max(100_000_000),
  occurred_at: occurredAtSchema,
  description: z
    .string()
    .transform((value) => value.trim().normalize("NFC"))
    .pipe(z.string().max(500))
    .nullable()
    .optional(),
  odometer_km: z.number().int().min(0).max(9_999_999).nullable().optional(),
  fuel_type: fuelTypeSchema.nullable().optional(),
  liters: z.number().positive().nullable().optional(),
  full_tank: z.boolean().nullable().optional(),
  supplier: z
    .string()
    .transform((value) => value.trim().normalize("NFC"))
    .pipe(z.string().max(100))
    .nullable()
    .optional(),
});

/**
 * @spec SPEC-20260612-001 RF-06.1
 * `category = 'fuel'` exige `odometer_km` informado (R-FUEL-01). No update, só é possível
 * validar essa dependência quando `category` está presente no payload — o caso "já é fuel"
 * (categoria não alterada nesta chamada) depende do estado persistido e é responsabilidade
 * do service, não do schema.
 */
function requireOdometerForFuel<T extends { category?: string; odometer_km?: number | null }>(
  data: T,
  ctx: z.RefinementCtx,
): void {
  if (data.category === "fuel" && (data.odometer_km == null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Odômetro é obrigatório para despesas de combustível.",
      path: ["odometer_km"],
    });
  }
}

export const createExpenseInputSchema = expenseBaseSchema.superRefine(requireOdometerForFuel);
export type CreateExpenseInput = z.infer<typeof createExpenseInputSchema>;

export const updateExpenseInputSchema = expenseBaseSchema
  .partial()
  .omit({ vehicle_id: true })
  .superRefine(requireOdometerForFuel);
export type UpdateExpenseInput = z.infer<typeof updateExpenseInputSchema>;

/**
 * @spec SPEC-20260714-001 RF-03, P1
 */
export const listExpensesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  vehicle_id: z.string().uuid().optional(),
  category: z.string().trim().min(1).max(100).optional(),
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;

/**
 * @spec SPEC-20260608-001 RF-01, RNF-03
 */
/**
 * @spec SPEC-20260721-002 RF-01 — `7` habilitado para o KPI "compromissos próximos 7 dias" e o
 * widget RF-09; a RPC `get_upcoming_costs` já suporta os 3 valores (`p_horizon_days`).
 * @spec SPEC-20260721-002 RF-09, P6 — `limit` opcional aplicado via PostgREST (`.limit()` no
 * builder do RPC, não em memória) para o widget "Próximos 7 dias" nunca carregar mais que o teto.
 */
export const upcomingCostsQuerySchema = z.object({
  vehicle_id: z.string().uuid().optional(),
  horizon_days: z.coerce
    .number()
    .int()
    .refine((value) => value === 7 || value === 30 || value === 90, {
      message: "horizon_days deve ser 7, 30 ou 90",
    })
    .default(30),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
export type UpcomingCostsQuery = z.infer<typeof upcomingCostsQuerySchema>;

export interface UpcomingCostItem {
  source_type: "maintenance" | "fine" | "recurring_cost" | "expense";
  source_id: string;
  title: string;
  amount: number | null;
  due_date: string;
  vehicle_id: string;
  vehicle_plate: string | null;
  is_estimated: boolean;
}

/**
 * @spec SPEC-20260608-002 RF-01
 */
export const expenseKpisQuerySchema = z.object({
  vehicle_id: z.string().uuid().optional(),
});
export type ExpenseKpisQuery = z.infer<typeof expenseKpisQuerySchema>;

export interface ExpenseKpis {
  total_this_month: number;
  total_prev_month: number;
  delta_percent: number | null;
  total_all_time: number;
  upcoming_30_days_total: number;
  upcoming_30_days_count: number;
}

/**
 * @spec SPEC-20260609-003 RF-01
 * `from`/`to` ausentes → últimos 12 meses (default aplicado no service, não aqui).
 */
export const consolidatedExportQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  vehicle_id: z.string().uuid().optional(),
});
export type ConsolidatedExportQuery = z.infer<typeof consolidatedExportQuerySchema>;

/**
 * @spec SPEC-20260814-002 RF-04, RNF-03
 */
export const fuelStatsQuerySchema = z.object({
  vehicle_id: z.string().uuid(),
});
export type FuelStatsQuery = z.infer<typeof fuelStatsQuerySchema>;

/**
 * @spec SPEC-20260814-002 R-FUEL-11, RF-03
 * @spec SPEC-20260807-004 RF-01, RF-05
 * `avg_*` são `null` quando a amostra de abastecimentos com `full_tank = true` é insuficiente
 * (< 3 — R-FUEL-11). `last_odometer_km` é o maior odômetro registrado para o veículo em
 * `expenses` (fuel) ∪ `maintenances` — SPEC-20260807-004 RF-01 consolidado aqui para evitar 3ª
 * chamada de rede. `favorite_fuel_type` vem de `vehicles.favorite_fuel_type` (RF-05), retornado
 * junto do endpoint já carregado no mount do formulário.
 */
export interface FuelStats {
  avg_price_per_liter: number | null;
  avg_km_per_liter: number | null;
  record_count: number;
  /** @spec SPEC-20260807-004 RF-01 — MAX de expenses(fuel) ∪ maintenances */
  last_odometer_km: number | null;
  /**
   * @spec SPEC-20260807-004 RF-05 — `vehicles.favorite_fuel_type`; null se não definido.
   * Opcional para retrocompatibilidade com mocks e chamadas que não precisam deste campo
   * (ex.: `fuel-realtime-calc` só usa `last_odometer_km` e `avg_*`).
   */
  favorite_fuel_type?: string | null;
}

/**
 * @spec SPEC-20260814-003 RF-08
 * `q` normalizado (trim + NFC) no service (R-SAN-01, R-SAN-02); aceito aqui como string livre.
 */
export const supplierSuggestionsQuerySchema = z.object({
  q: z.string().max(100).optional(),
  workspace_id: z.string().uuid().optional(),
});
export type SupplierSuggestionsQuery = z.infer<typeof supplierSuggestionsQuerySchema>;

/**
 * @spec SPEC-20260814-003 RF-01, RF-03, RF-06
 */
export interface SupplierSuggestion {
  supplier: string;
  source: "personal" | "workspace";
  used_by_count?: number;
  most_recent_user_name?: string | null;
}

/**
 * @spec SPEC-20260814-004 RF-04, R-RCP-01
 * Allowlist de MIME e limite de tamanho compartilhados entre cliente (validação client-side,
 * RNF-07) e servidor (multer `fileFilter` + revalidação no service, R-SAN-05) — única fonte de
 * verdade para não divergir cliente/servidor.
 */
export const RECEIPT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export const RECEIPT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;
export type ReceiptMimeType = (typeof RECEIPT_ALLOWED_MIME_TYPES)[number];

/** @spec SPEC-20260814-004 RF-03, R-RCP-02 — extensão sempre inferida do MIME validado, nunca do nome original */
export const RECEIPT_MIME_EXTENSION: Record<ReceiptMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/**
 * @spec SPEC-20260814-004 (decisão de implementação — geração assíncrona de thumbnail)
 * `not_applicable`: sem comprovante, ou comprovante é PDF (nunca gera thumbnail — RF-05).
 * `pending`: comprovante de imagem enviado, thumbnail ainda sendo gerado em job fire-and-forget.
 * `completed`: `receipt_thumbnail_key` populado, pronto para exibição.
 * `failed`: geração falhou — UI cai permanentemente no fallback estático (mesmo ícone do PDF).
 */
export const RECEIPT_THUMBNAIL_STATUSES = [
  "not_applicable",
  "pending",
  "completed",
  "failed",
] as const;
export type ReceiptThumbnailStatus = (typeof RECEIPT_THUMBNAIL_STATUSES)[number];

/** @spec SPEC-20260814-004 RNF-03 — signed URLs, TTL 60min, geradas sob demanda (nunca persistidas) */
export interface ReceiptUrls {
  original_url: string;
  thumbnail_url: string | null;
  thumbnail_status: ReceiptThumbnailStatus;
  is_pdf: boolean;
}
