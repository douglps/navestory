import { updateFineInputSchema } from "@nave/validators";
import type { z } from "zod";

export const updateFineDtoSchema = updateFineInputSchema;
export type UpdateFineDto = z.infer<typeof updateFineDtoSchema>;
