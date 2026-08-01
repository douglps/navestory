import { updateRecurringCostInputSchema } from "@navestory/validators";
import type { z } from "zod";

export const updateRecurringCostDtoSchema = updateRecurringCostInputSchema;
export type UpdateRecurringCostDto = z.infer<
  typeof updateRecurringCostDtoSchema
>;
