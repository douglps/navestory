import { recoverPasswordInputSchema } from "@navestory/validators";
import type { z } from "zod";

export const recoverPasswordDtoSchema = recoverPasswordInputSchema;
export type RecoverPasswordDto = z.infer<typeof recoverPasswordDtoSchema>;
