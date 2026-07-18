import { insightsQuerySchema } from "@nave/validators";
import type { z } from "zod";

export const insightsDtoSchema = insightsQuerySchema;
export type InsightsDto = z.infer<typeof insightsDtoSchema>;
