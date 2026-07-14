import { z } from "zod";

/**
 * @spec SPEC-20260612-003 RF-01.2
 */
export const DEFAULT_AUTO_DRAFT_ENABLED = false;

export const updatePreferencesInputSchema = z.object({
  auto_draft_enabled: z.boolean(),
});
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesInputSchema>;

export interface UserPreferences {
  user_id: string;
  auto_draft_enabled: boolean;
  updated_at: string;
}
