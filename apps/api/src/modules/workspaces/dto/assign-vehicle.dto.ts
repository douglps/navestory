import { assignVehicleInputSchema } from "@navestory/validators";
import type { z } from "zod";

export const assignVehicleDtoSchema = assignVehicleInputSchema;
export type AssignVehicleDto = z.infer<typeof assignVehicleDtoSchema>;
