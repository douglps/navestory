import { updateExpenseTemplateInputSchema } from "@navestory/validators";
import type { z } from "zod";

export const updateExpenseTemplateDtoSchema = updateExpenseTemplateInputSchema;
export type UpdateExpenseTemplateDto = z.infer<
  typeof updateExpenseTemplateDtoSchema
>;
