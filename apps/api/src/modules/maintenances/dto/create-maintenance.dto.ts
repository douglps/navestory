import { createMaintenanceInputSchema } from "@nave/validators";
import type { z } from "zod";

export const createMaintenanceDtoSchema = createMaintenanceInputSchema;
export type CreateMaintenanceDto = z.infer<typeof createMaintenanceDtoSchema>;
