import { updatePreferencesInputSchema } from "@nave/validators";
import type { z } from "zod";

export const updatePreferencesDtoSchema = updatePreferencesInputSchema;
export type UpdatePreferencesDto = z.infer<typeof updatePreferencesDtoSchema>;
