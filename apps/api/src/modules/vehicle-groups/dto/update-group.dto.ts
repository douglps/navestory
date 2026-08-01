import { updateGroupInputSchema } from "@navestory/validators";
import type { z } from "zod";

export const updateGroupDtoSchema = updateGroupInputSchema;
export type UpdateGroupDto = z.infer<typeof updateGroupDtoSchema>;
