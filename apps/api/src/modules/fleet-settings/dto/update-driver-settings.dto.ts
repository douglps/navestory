import { updateDriverSettingsInputSchema } from "@navestory/validators";
import type { z } from "zod";

export const updateDriverSettingsDtoSchema = updateDriverSettingsInputSchema;
export type UpdateDriverSettingsDto = z.infer<typeof updateDriverSettingsDtoSchema>;
