import { fleetKpisQuerySchema } from "@navestory/validators";
import type { z } from "zod";

export const fleetKpisDtoSchema = fleetKpisQuerySchema;
export type FleetKpisDto = z.infer<typeof fleetKpisDtoSchema>;
