import { categorySeriesQuerySchema } from "@navestory/validators";
import type { z } from "zod";

export const categorySeriesDtoSchema = categorySeriesQuerySchema;
export type CategorySeriesDto = z.infer<typeof categorySeriesDtoSchema>;
