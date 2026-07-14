import { createOdometerCycleInputSchema } from "@nave/validators";
import type { z } from "zod";

export const createOdometerCycleDtoSchema = createOdometerCycleInputSchema;
export type CreateOdometerCycleDto = z.infer<typeof createOdometerCycleDtoSchema>;
