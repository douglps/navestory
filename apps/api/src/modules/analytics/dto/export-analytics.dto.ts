import { exportAnalyticsQuerySchema } from "@navestory/validators";
import type { z } from "zod";

export const exportAnalyticsDtoSchema = exportAnalyticsQuerySchema;
export type ExportAnalyticsDto = z.infer<typeof exportAnalyticsDtoSchema>;
