import { z } from "zod";

export const updateProfileDtoSchema = z.object({
  name: z.string().min(2).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateProfileDto = z.infer<typeof updateProfileDtoSchema>;
