import { registerInputSchema } from "@nave/validators";
import type { z } from "zod";

export const registerDtoSchema = registerInputSchema;
export type RegisterDto = z.infer<typeof registerDtoSchema>;
