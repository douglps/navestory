import { z } from "zod";

/**
 * @spec SPEC-20260521-003 RF-02, RF-03
 */
export const exportExpensesQuerySchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Período deve estar no formato YYYY-MM"),
  vehicle_id: z.string().uuid().optional(),
});
export type ExportExpensesQuery = z.infer<typeof exportExpensesQuerySchema>;
