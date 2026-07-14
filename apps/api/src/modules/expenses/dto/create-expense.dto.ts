import { createExpenseInputSchema } from "@nave/validators";
import type { z } from "zod";

export const createExpenseDtoSchema = createExpenseInputSchema;
export type CreateExpenseDto = z.infer<typeof createExpenseDtoSchema>;
