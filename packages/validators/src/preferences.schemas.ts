import { z } from "zod";
import { dashboardKpiIdsSchema, type KpiCatalogId } from "./dashboard.schemas";

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

/**
 * @spec SPEC-20260715-002 RF-BK-02, R-TZ-02
 * Padrão IANA básico (`America/Sao_Paulo`) — validação completa via `Intl.supportedValuesOf`
 * é responsabilidade do frontend, não obrigatória aqui.
 */
export const timezoneSchema = z
  .string()
  .regex(/^[A-Za-z_/]+$/, "Fuso horário deve ser um nome IANA (ex: America/Sao_Paulo)")
  .min(1)
  .max(64);

export const updatePreferencesInputSchema = z
  .object({
    auto_draft_enabled: z.boolean().optional(),
    vehicle_chip_fields: chipFieldsSchema.optional(),
    dashboard_kpi_ids: dashboardKpiIdsSchema.optional(),
    timezone: timezoneSchema.nullable().optional(),
  })
  .refine(
    (data) =>
      data.auto_draft_enabled !== undefined ||
      data.vehicle_chip_fields !== undefined ||
      data.dashboard_kpi_ids !== undefined ||
      data.timezone !== undefined,
    { message: "Informe ao menos um campo para atualizar" },
  );
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesInputSchema>;

export interface UserPreferences {
  user_id: string;
  auto_draft_enabled: boolean;
  vehicle_chip_fields: ChipField[];
  dashboard_kpi_ids: KpiCatalogId[];
  timezone: string | null;
  updated_at: string;
}
