import { updateRecurringCostInputSchema } from "@nave/validators";
import type { z } from "zod";

export const updateRecurringCostDtoSchema = updateRecurringCostInputSchema;
export type UpdateRecurringCostDto = z.infer<typeof updateRecurringCostDtoSchema>;
