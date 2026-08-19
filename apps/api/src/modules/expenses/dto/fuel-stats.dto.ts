import { fuelStatsQuerySchema } from "@navestory/validators";
import type { z } from "zod";

// @spec SPEC-20260814-002 RF-04
export const fuelStatsDtoSchema = fuelStatsQuerySchema;
export type FuelStatsDto = z.infer<typeof fuelStatsDtoSchema>;
