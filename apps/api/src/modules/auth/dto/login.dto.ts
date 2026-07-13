import { loginInputSchema } from "@nave/validators";
import type { z } from "zod";

export const loginDtoSchema = loginInputSchema;
export type LoginDto = z.infer<typeof loginDtoSchema>;
