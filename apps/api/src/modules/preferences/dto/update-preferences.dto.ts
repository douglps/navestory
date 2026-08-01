import { updatePreferencesInputSchema } from "@navestory/validators";
import type { z } from "zod";

export const updatePreferencesDtoSchema = updatePreferencesInputSchema;
export type UpdatePreferencesDto = z.infer<typeof updatePreferencesDtoSchema>;
