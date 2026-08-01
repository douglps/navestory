import { listRecurringCostsQuerySchema } from "@navestory/validators";
import type { z } from "zod";

export const listRecurringCostsDtoSchema = listRecurringCostsQuerySchema;
export type ListRecurringCostsDto = z.infer<typeof listRecurringCostsDtoSchema>;
