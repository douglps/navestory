import { updateMemberProfileInputSchema } from "@navestory/validators";
import type { z } from "zod";

export const updateMemberProfileDtoSchema = updateMemberProfileInputSchema;
export type UpdateMemberProfileDto = z.infer<typeof updateMemberProfileDtoSchema>;
