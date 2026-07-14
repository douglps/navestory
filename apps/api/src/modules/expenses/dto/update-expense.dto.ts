import { updateExpenseInputSchema } from "@nave/validators";
import type { z } from "zod";

export const updateExpenseDtoSchema = updateExpenseInputSchema;
export type UpdateExpenseDto = z.infer<typeof updateExpenseDtoSchema>;
