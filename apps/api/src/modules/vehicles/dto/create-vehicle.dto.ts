import { createVehicleInputSchema } from "@nave/validators";
import type { z } from "zod";

export const createVehicleDtoSchema = createVehicleInputSchema;
export type CreateVehicleDto = z.infer<typeof createVehicleDtoSchema>;
