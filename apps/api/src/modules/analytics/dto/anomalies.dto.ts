import { anomaliesQuerySchema } from "@navestory/validators";
import type { z } from "zod";

export const anomaliesDtoSchema = anomaliesQuerySchema;
export type AnomaliesDto = z.infer<typeof anomaliesDtoSchema>;
