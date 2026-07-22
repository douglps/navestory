import { categorySummaryQuerySchema } from "@nave/validators";
import type { z } from "zod";

export const categorySummaryDtoSchema = categorySummaryQuerySchema;
export type CategorySummaryDto = z.infer<typeof categorySummaryDtoSchema>;
