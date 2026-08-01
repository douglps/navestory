import { alertsQuerySchema } from "@navestory/validators";
import type { z } from "zod";

export const alertsDtoSchema = alertsQuerySchema;
export type AlertsDto = z.infer<typeof alertsDtoSchema>;
