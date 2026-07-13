import { recoverPasswordInputSchema } from "@nave/validators";
import type { z } from "zod";

export const recoverPasswordDtoSchema = recoverPasswordInputSchema;
export type RecoverPasswordDto = z.infer<typeof recoverPasswordDtoSchema>;
