import { createRecurringCostInputSchema } from "@navestory/validators";
import type { z } from "zod";

export const createRecurringCostDtoSchema = createRecurringCostInputSchema;
export type CreateRecurringCostDto = z.infer<
  typeof createRecurringCostDtoSchema
>;
