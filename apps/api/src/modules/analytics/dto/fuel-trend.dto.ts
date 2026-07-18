import { fuelTrendQuerySchema } from "@nave/validators";
import type { z } from "zod";

export const fuelTrendDtoSchema = fuelTrendQuerySchema;
export type FuelTrendDto = z.infer<typeof fuelTrendDtoSchema>;
