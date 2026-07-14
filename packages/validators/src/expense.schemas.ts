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

export const createExpenseInputSchema = expenseBaseSchema;
export type CreateExpenseInput = z.infer<typeof createExpenseInputSchema>;

export const updateExpenseInputSchema = expenseBaseSchema.partial().omit({ vehicle_id: true });
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
