import { createInviteInputSchema } from "@navestory/validators";
import type { z } from "zod";

export const createInviteDtoSchema = createInviteInputSchema;
export type CreateInviteDto = z.infer<typeof createInviteDtoSchema>;
