import { vehicleHistoryQuerySchema } from "@nave/validators";
import type { z } from "zod";

export const vehicleHistoryDtoSchema = vehicleHistoryQuerySchema;
export type VehicleHistoryDto = z.infer<typeof vehicleHistoryDtoSchema>;
