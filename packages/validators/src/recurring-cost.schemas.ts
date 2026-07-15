import { z } from "zod";

/**
 * @spec SPEC-20260609-001 RF-02
 */
export const recurringCostTypeSchema = z.enum(["ipva", "crlv", "insurance", "other"]);
export type RecurringCostType = z.infer<typeof recurringCostTypeSchema>;

/**
 * @spec SPEC-20260609-001, R-LED-05
 * Mapeamento cost_type → categoria de expense usada na vinculação automática ao ledger.
 */
export const RECURRING_COST_TYPE_TO_CATEGORY: Record<RecurringCostType, string> = {
  ipva: "tax",
  crlv: "tax",
  insurance: "insurance",
  other: "other",
};

export const RECURRING_COST_TYPE_LABEL: Record<RecurringCostType, string> = {
  ipva: "IPVA",
  crlv: "CRLV",
  insurance: "Seguro",
  other: "Doc. Recorrente",
};

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD");

/**
 * @spec SPEC-20260609-001 RF-02
 */
export const recurringCostBaseSchema = z.object({
  vehicle_id: z.string().uuid(),
  cost_type: recurringCostTypeSchema,
  year: z.number().int().min(2000).max(2100),
  amount: z.number().positive().max(100_000_000),
  due_date: dateSchema,
  notes: z
    .string()
    .transform((value) => value.trim().normalize("NFC"))
    .pipe(z.string().max(500))
    .nullable()
    .optional(),
  paid_at: dateSchema.nullable().optional(),
});

export const createRecurringCostInputSchema = recurringCostBaseSchema;
export type CreateRecurringCostInput = z.infer<typeof createRecurringCostInputSchema>;

/**
 * @spec SPEC-20260609-001 RF-03
 */
export const updateRecurringCostInputSchema = recurringCostBaseSchema.partial().omit({
  vehicle_id: true,
});
export type UpdateRecurringCostInput = z.infer<typeof updateRecurringCostInputSchema>;

/**
 * @spec SPEC-20260609-001 RF-01
 */
export const listRecurringCostsQuerySchema = z.object({
  vehicle_id: z.string().uuid().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  cost_type: recurringCostTypeSchema.optional(),
  paid: z.coerce.boolean().optional(),
});
export type ListRecurringCostsQuery = z.infer<typeof listRecurringCostsQuerySchema>;

export interface RecurringCost {
  id: string;
  user_id: string;
  vehicle_id: string;
  cost_type: RecurringCostType;
  year: number;
  amount: number;
  due_date: string;
  paid_at: string | null;
  expense_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
