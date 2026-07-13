import { z } from "zod";

/**
 * @spec SPEC-20260521-004 RF-07
 */
export const listAuditLogsQueryDtoSchema = z.object({
  user_id: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListAuditLogsQueryDto = z.infer<typeof listAuditLogsQueryDtoSchema>;
