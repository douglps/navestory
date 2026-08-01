import { createFineInputSchema } from "@navestory/validators";
import type { z } from "zod";

export const createFineDtoSchema = createFineInputSchema;
export type CreateFineDto = z.infer<typeof createFineDtoSchema>;
