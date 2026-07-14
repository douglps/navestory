import { setGroupMembersInputSchema } from "@nave/validators";
import type { z } from "zod";

export const setGroupMembersDtoSchema = setGroupMembersInputSchema;
export type SetGroupMembersDto = z.infer<typeof setGroupMembersDtoSchema>;
