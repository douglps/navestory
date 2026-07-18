import { forecastQuerySchema } from "@nave/validators";
import type { z } from "zod";

export const forecastDtoSchema = forecastQuerySchema;
export type ForecastDto = z.infer<typeof forecastDtoSchema>;
