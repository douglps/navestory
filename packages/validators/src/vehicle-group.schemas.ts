import { z } from "zod";

/**
 * @spec SPEC-20260602-003 RF-16
 * Paleta preset de 8 cores oferecida no formulário; o campo `color` também
 * aceita qualquer hex de 6 dígitos válido fora dessa lista.
 */
export const PRESET_GROUP_COLORS = [
  "#6366f1",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#ec4899",
] as const;

export const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export const groupColorSchema = z
  .string()
  .regex(HEX_COLOR_REGEX, "Cor inválida — use hex de 6 dígitos");

export const groupNameSchema = z
  .string()
  .min(1, "Nome obrigatório")
  .max(60, "Nome deve ter no máximo 60 caracteres");

/**
 * @spec SPEC-20260602-003 RF-01
 */
export const createGroupInputSchema = z.object({
  name: groupNameSchema,
  color: groupColorSchema,
});
export type CreateGroupInput = z.infer<typeof createGroupInputSchema>;

/**
 * @spec SPEC-20260602-003 RF-03
 */
export const updateGroupInputSchema = createGroupInputSchema.partial();
export type UpdateGroupInput = z.infer<typeof updateGroupInputSchema>;

/**
 * @spec SPEC-20260602-003 RF-05, RF-06, R-GRP-01
 * `groupId` chega via parâmetro de rota, não faz parte do corpo validado aqui.
 */
export const setGroupMembersInputSchema = z.object({
  vehicleIds: z.array(z.string().uuid()).max(200, "Máximo de 200 veículos por grupo"),
});
export type SetGroupMembersInput = z.infer<typeof setGroupMembersInputSchema>;

export const vehicleGroupSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: groupNameSchema,
  color: groupColorSchema,
  created_at: z.string(),
  updated_at: z.string(),
});
export type VehicleGroup = z.infer<typeof vehicleGroupSchema>;
