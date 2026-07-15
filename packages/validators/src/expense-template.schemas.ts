import { z } from "zod";
import { fuelTypeSchema } from "./vehicle.schemas";

/**
 * @spec SPEC-20260601-003 RF-06, R3, R6
 * `date` e `odometer_km` nunca aparecem aqui (R6) — são sempre preenchidos no momento do uso.
 * `full_tank` também é intencionalmente ausente (R-FUEL-05) — estado do tanque é pontual.
 */
export const expenseTemplateBaseSchema = z.object({
  name: z.string().trim().min(1).max(60),
  vehicle_id: z.string().uuid(),
  category: z.string().trim().min(1).max(100),
  amount: z.number().min(0.01).max(100_000_000),
  description: z
    .string()
    .transform((value) => value.trim().normalize("NFC"))
    .pipe(z.string().max(255))
    .nullable()
    .optional(),
  liters: z.number().positive().nullable().optional(),
  fuel_type: fuelTypeSchema.nullable().optional(),
  supplier: z
    .string()
    .transform((value) => value.trim().normalize("NFC"))
    .pipe(z.string().max(100))
    .nullable()
    .optional(),
});

export const createExpenseTemplateInputSchema = expenseTemplateBaseSchema;
export type CreateExpenseTemplateInput = z.infer<typeof createExpenseTemplateInputSchema>;

export const updateExpenseTemplateInputSchema = expenseTemplateBaseSchema.partial();
export type UpdateExpenseTemplateInput = z.infer<typeof updateExpenseTemplateInputSchema>;

export interface ExpenseTemplate {
  id: string;
  user_id: string;
  vehicle_id: string;
  name: string;
  category: string;
  amount: number;
  description: string | null;
  liters: number | null;
  fuel_type: string | null;
  supplier: string | null;
  last_used_at: string;
  created_at: string;
  updated_at: string;
}
