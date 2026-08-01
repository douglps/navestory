import { updateVehicleInputSchema } from "@navestory/validators";
import type { z } from "zod";

export const updateVehicleDtoSchema = updateVehicleInputSchema;
export type UpdateVehicleDto = z.infer<typeof updateVehicleDtoSchema>;
