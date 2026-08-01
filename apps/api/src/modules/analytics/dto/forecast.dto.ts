import { forecastQuerySchema } from "@navestory/validators";
import type { z } from "zod";

export const forecastDtoSchema = forecastQuerySchema;
export type ForecastDto = z.infer<typeof forecastDtoSchema>;
