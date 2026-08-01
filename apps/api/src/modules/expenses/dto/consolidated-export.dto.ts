import { consolidatedExportQuerySchema } from "@navestory/validators";
import type { z } from "zod";

export const consolidatedExportDtoSchema = consolidatedExportQuerySchema;
export type ConsolidatedExportDto = z.infer<typeof consolidatedExportDtoSchema>;
