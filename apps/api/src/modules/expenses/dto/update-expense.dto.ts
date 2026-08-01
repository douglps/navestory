import { updateExpenseInputSchema } from "@navestory/validators";
import type { z } from "zod";

export const updateExpenseDtoSchema = updateExpenseInputSchema;
export type UpdateExpenseDto = z.infer<typeof updateExpenseDtoSchema>;
