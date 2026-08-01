import { seasonalQuerySchema } from "@navestory/validators";
import type { z } from "zod";

export const seasonalDtoSchema = seasonalQuerySchema;
export type SeasonalDto = z.infer<typeof seasonalDtoSchema>;
