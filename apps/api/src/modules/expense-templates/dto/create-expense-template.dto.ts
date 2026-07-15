import { createExpenseTemplateInputSchema } from "@nave/validators";
import type { z } from "zod";

export const createExpenseTemplateDtoSchema = createExpenseTemplateInputSchema;
export type CreateExpenseTemplateDto = z.infer<typeof createExpenseTemplateDtoSchema>;
