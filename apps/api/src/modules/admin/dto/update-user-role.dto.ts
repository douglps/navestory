import { z } from "zod";

/**
 * @spec SPEC-20260731-008 RF-02
 */
export const updateUserRoleDtoSchema = z.object({
  role: z.enum(["admin"]).nullable(),
});
export type UpdateUserRoleDto = z.infer<typeof updateUserRoleDtoSchema>;
