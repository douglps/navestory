import { createOdometerCycleInputSchema } from "@navestory/validators";
import type { z } from "zod";

export const createOdometerCycleDtoSchema = createOdometerCycleInputSchema;
export type CreateOdometerCycleDto = z.infer<
  typeof createOdometerCycleDtoSchema
>;
