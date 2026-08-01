import { createGroupInputSchema } from "@navestory/validators";
import type { z } from "zod";

export const createGroupDtoSchema = createGroupInputSchema;
export type CreateGroupDto = z.infer<typeof createGroupDtoSchema>;
