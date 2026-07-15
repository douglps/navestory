import { listMaintenancesQuerySchema } from "@nave/validators";
import type { z } from "zod";

export const listMaintenancesDtoSchema = listMaintenancesQuerySchema;
export type ListMaintenancesDto = z.infer<typeof listMaintenancesDtoSchema>;
