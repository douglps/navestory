import { updateExpenseTemplateInputSchema } from "@nave/validators";
import type { z } from "zod";

export const updateExpenseTemplateDtoSchema = updateExpenseTemplateInputSchema;
export type UpdateExpenseTemplateDto = z.infer<typeof updateExpenseTemplateDtoSchema>;
