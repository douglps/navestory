import { resetPasswordInputSchema } from "@navestory/validators";
import type { z } from "zod";

export const resetPasswordDtoSchema = resetPasswordInputSchema;
export type ResetPasswordDto = z.infer<typeof resetPasswordDtoSchema>;
