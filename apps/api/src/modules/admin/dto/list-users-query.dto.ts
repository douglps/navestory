import { z } from "zod";

/**
 * @spec SPEC-20260521-004 RF-06
 */
export const listUsersQueryDtoSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListUsersQueryDto = z.infer<typeof listUsersQueryDtoSchema>;
