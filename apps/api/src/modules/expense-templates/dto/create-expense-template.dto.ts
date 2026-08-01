import { createExpenseTemplateInputSchema } from "@navestory/validators";
import type { z } from "zod";

export const createExpenseTemplateDtoSchema = createExpenseTemplateInputSchema;
export type CreateExpenseTemplateDto = z.infer<
  typeof createExpenseTemplateDtoSchema
>;
