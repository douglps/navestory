import { upcomingCostsQuerySchema } from "@navestory/validators";
import type { z } from "zod";

export const upcomingCostsDtoSchema = upcomingCostsQuerySchema;
export type UpcomingCostsDto = z.infer<typeof upcomingCostsDtoSchema>;
