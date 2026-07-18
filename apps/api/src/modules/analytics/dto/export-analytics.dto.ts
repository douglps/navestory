import { exportAnalyticsQuerySchema } from "@nave/validators";
import type { z } from "zod";

export const exportAnalyticsDtoSchema = exportAnalyticsQuerySchema;
export type ExportAnalyticsDto = z.infer<typeof exportAnalyticsDtoSchema>;
