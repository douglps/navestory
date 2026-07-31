import { alertsQuerySchema } from "@nave/validators";
import type { z } from "zod";

export const alertsDtoSchema = alertsQuerySchema;
export type AlertsDto = z.infer<typeof alertsDtoSchema>;
