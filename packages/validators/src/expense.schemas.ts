import { z } from "zod";
import { fuelTypeSchema } from "./vehicle.schemas";

/**
 * @spec SPEC-20260714-001 RF-01, RF-02
 * Campos obrigatórios (vehicle_id, category, amount, date) + opcionais de combustível.
 * source_type/source_id/is_readonly nunca aparecem aqui — somente-leitura via API pública (RNF-04).
 */
export const expenseBaseSchema = z.object({
  vehicle_id: z.string().uuid(),
  category: z.string().trim().min(1).max(100),
  amount: z.number().min(0.01).max(100_000_000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
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
export const upcomingCostsQuerySchema = z.object({
  vehicle_id: z.string().uuid().optional(),
  horizon_days: z.coerce
    .number()
    .int()
    .refine((value) => value === 30 || value === 90, {
      message: "horizon_days deve ser 30 ou 90",
    })
    .default(30),
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
