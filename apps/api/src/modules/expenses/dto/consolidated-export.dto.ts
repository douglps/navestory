import { consolidatedExportQuerySchema } from "@nave/validators";
import type { z } from "zod";

export const consolidatedExportDtoSchema = consolidatedExportQuerySchema;
export type ConsolidatedExportDto = z.infer<typeof consolidatedExportDtoSchema>;
