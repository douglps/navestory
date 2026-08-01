import { categorySummaryQuerySchema } from "@navestory/validators";
import type { z } from "zod";

export const categorySummaryDtoSchema = categorySummaryQuerySchema;
export type CategorySummaryDto = z.infer<typeof categorySummaryDtoSchema>;
