import { createCategoryInputSchema } from "@nave/validators";
import type { z } from "zod";

export const createCategoryDtoSchema = createCategoryInputSchema;
export type CreateCategoryDto = z.infer<typeof createCategoryDtoSchema>;
