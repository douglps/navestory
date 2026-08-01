import { expenseKpisQuerySchema } from "@navestory/validators";
import type { z } from "zod";

export const expenseKpisDtoSchema = expenseKpisQuerySchema;
export type ExpenseKpisDto = z.infer<typeof expenseKpisDtoSchema>;
