import { z } from "zod";

/**
 * @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md RF-01, RF-02, R-FLEET-01
 */
export const driverSettingsSchema = z.object({
  workspace_id: z.string().uuid(),
  require_cnh_number: z.boolean(),
  require_cnh_expiry: z.boolean(),
  require_cnh_category: z.boolean(),
  require_phone: z.boolean(),
  updated_at: z.string(),
});
export type DriverSettings = z.infer<typeof driverSettingsSchema>;

/**
 * @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md RF-02
 */
export const updateDriverSettingsInputSchema = z
  .object({
    requireCnhNumber: z.boolean(),
    requireCnhExpiry: z.boolean(),
    requireCnhCategory: z.boolean(),
    requirePhone: z.boolean(),
  })
  .partial();
export type UpdateDriverSettingsInput = z.infer<typeof updateDriverSettingsInputSchema>;

/**
 * @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md RF-04
 */
export const updateMemberProfileInputSchema = z
  .object({
    cnhNumber: z.string().trim().max(20).nullable(),
    cnhCategory: z.string().trim().max(5).nullable(),
    cnhExpiresAt: z.string().date().nullable(),
    phone: z.string().trim().max(20).nullable(),
  })
  .partial();
export type UpdateMemberProfileInput = z.infer<typeof updateMemberProfileInputSchema>;

export const memberProfileSchema = z.object({
  workspace_member_id: z.string().uuid(),
  cnh_number: z.string().nullable(),
  cnh_category: z.string().nullable(),
  cnh_expires_at: z.string().nullable(),
  phone: z.string().nullable(),
  updated_at: z.string(),
});
export type MemberProfile = z.infer<typeof memberProfileSchema>;

/**
 * @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md RF-08, RF-09, RF-10, R-DS-08
 * Escala de urgência de vencimento de CNH, mesmo padrão de `urgencyBadge`: `expired`/danger,
 * `urgency_hot`/≤7d, `warning`/≤30d, `ok`/em dia. `not_set` quando o campo não foi preenchido.
 */
export const cnhStatusSchema = z.enum(["ok", "warning", "urgency_hot", "expired", "not_set"]);
export type CnhStatus = z.infer<typeof cnhStatusSchema>;

export const registrationStatusSchema = z.enum(["complete", "incomplete"]);
export type RegistrationStatus = z.infer<typeof registrationStatusSchema>;

/**
 * @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md RF-11
 */
export const complianceEntrySchema = z.object({
  memberId: z.string().uuid(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  registrationStatus: registrationStatusSchema,
  missingFields: z.array(z.string()),
  cnhStatus: cnhStatusSchema,
  cnhExpiresAt: z.string().nullable(),
  cnhDaysRemaining: z.number().int().nullable(),
});
export type ComplianceEntry = z.infer<typeof complianceEntrySchema>;

/**
 * @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md RF-12
 */
export const complianceQuerySchema = z.object({
  registrationStatus: registrationStatusSchema.optional(),
  cnhStatus: cnhStatusSchema.optional(),
});
export type ComplianceQuery = z.infer<typeof complianceQuerySchema>;
