import { vehicleHistoryQuerySchema } from "@navestory/validators";
import type { z } from "zod";

export const vehicleHistoryDtoSchema = vehicleHistoryQuerySchema;
export type VehicleHistoryDto = z.infer<typeof vehicleHistoryDtoSchema>;
