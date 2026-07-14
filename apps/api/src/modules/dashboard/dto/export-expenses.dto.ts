import { exportExpensesQuerySchema } from "@nave/validators";
import type { z } from "zod";

export const exportExpensesDtoSchema = exportExpensesQuerySchema;
export type ExportExpensesDto = z.infer<typeof exportExpensesDtoSchema>;
