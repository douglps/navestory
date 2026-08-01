import { listFinesQuerySchema } from "@navestory/validators";
import type { z } from "zod";

export const listFinesDtoSchema = listFinesQuerySchema;
export type ListFinesDto = z.infer<typeof listFinesDtoSchema>;
