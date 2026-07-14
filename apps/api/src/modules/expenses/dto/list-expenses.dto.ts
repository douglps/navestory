import { listExpensesQuerySchema } from "@nave/validators";
import type { z } from "zod";

export const listExpensesDtoSchema = listExpensesQuerySchema;
export type ListExpensesDto = z.infer<typeof listExpensesDtoSchema>;
