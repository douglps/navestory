import { upcomingCostsQuerySchema } from "@nave/validators";
import type { z } from "zod";

export const upcomingCostsDtoSchema = upcomingCostsQuerySchema;
export type UpcomingCostsDto = z.infer<typeof upcomingCostsDtoSchema>;
