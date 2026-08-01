import { listMaintenancesQuerySchema } from "@navestory/validators";
import type { z } from "zod";

export const listMaintenancesDtoSchema = listMaintenancesQuerySchema;
export type ListMaintenancesDto = z.infer<typeof listMaintenancesDtoSchema>;
