import { updateGroupInputSchema } from "@nave/validators";
import type { z } from "zod";

export const updateGroupDtoSchema = updateGroupInputSchema;
export type UpdateGroupDto = z.infer<typeof updateGroupDtoSchema>;
