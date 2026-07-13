import { z } from "zod";

/**
 * @spec SPEC-20260521-004 RF-04
 */
export const deleteAccountDtoSchema = z.object({
  confirm: z.literal(true),
});
export type DeleteAccountDto = z.infer<typeof deleteAccountDtoSchema>;
