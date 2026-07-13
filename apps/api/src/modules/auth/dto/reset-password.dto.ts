import { resetPasswordInputSchema } from "@nave/validators";
import type { z } from "zod";

export const resetPasswordDtoSchema = resetPasswordInputSchema;
export type ResetPasswordDto = z.infer<typeof resetPasswordDtoSchema>;
