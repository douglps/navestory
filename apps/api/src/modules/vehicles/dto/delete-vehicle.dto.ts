import { deleteVehicleInputSchema } from "@navestory/validators";
import type { z } from "zod";

export const deleteVehicleDtoSchema = deleteVehicleInputSchema;
export type DeleteVehicleDto = z.infer<typeof deleteVehicleDtoSchema>;
