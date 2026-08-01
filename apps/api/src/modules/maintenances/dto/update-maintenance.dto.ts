import { updateMaintenanceInputSchema } from "@navestory/validators";
import type { z } from "zod";

export const updateMaintenanceDtoSchema = updateMaintenanceInputSchema;
export type UpdateMaintenanceDto = z.infer<typeof updateMaintenanceDtoSchema>;
