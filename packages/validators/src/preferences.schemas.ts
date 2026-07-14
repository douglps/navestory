import { z } from "zod";

/**
 * @spec SPEC-20260612-003 RF-01.2
 */
export const DEFAULT_AUTO_DRAFT_ENABLED = false;

/**
 * @spec SPEC-20260603-003 RF-01/RF-02/RF-03
 */
export const CHIP_FIELDS = ["plate", "make", "model", "nickname"] as const;
export type ChipField = (typeof CHIP_FIELDS)[number];

/**
 * @spec SPEC-20260603-003 RF-05 — ordem padrão ao criar conta (atualizada 2026-06-15)
 */
export const DEFAULT_CHIP_FIELDS: ChipField[] = ["make", "plate", "model"];

/**
 * @spec SPEC-20260603-003 RF-01/RF-02/RF-03/RF-08
 */
export const chipFieldsSchema = z
  .array(z.enum(CHIP_FIELDS))
  .min(1, { message: "Selecione ao menos 1 campo" })
  .max(3, { message: "Selecione no máximo 3 campos" })
  .refine((fields) => fields.includes("plate"), {
    message: "A placa é obrigatória",
  })
  .refine((fields) => new Set(fields).size === fields.length, {
    message: "Campos não podem repetir",
  });

export const updatePreferencesInputSchema = z
  .object({
    auto_draft_enabled: z.boolean().optional(),
    vehicle_chip_fields: chipFieldsSchema.optional(),
  })
  .refine((data) => data.auto_draft_enabled !== undefined || data.vehicle_chip_fields !== undefined, {
    message: "Informe ao menos um campo para atualizar",
  });
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesInputSchema>;

export interface UserPreferences {
  user_id: string;
  auto_draft_enabled: boolean;
  vehicle_chip_fields: ChipField[];
  updated_at: string;
}
