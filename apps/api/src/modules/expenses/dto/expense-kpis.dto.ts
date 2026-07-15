import { expenseKpisQuerySchema } from "@nave/validators";
import type { z } from "zod";

export const expenseKpisDtoSchema = expenseKpisQuerySchema;
export type ExpenseKpisDto = z.infer<typeof expenseKpisDtoSchema>;
