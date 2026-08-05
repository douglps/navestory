import { createWorkspaceInputSchema } from "@navestory/validators";
import type { z } from "zod";

export const createWorkspaceDtoSchema = createWorkspaceInputSchema;
export type CreateWorkspaceDto = z.infer<typeof createWorkspaceDtoSchema>;
