import { z } from "zod";
import {
  dashboardKpiIdsSchema,
  spendingWindowDaysSchema,
  type KpiCatalogId,
  type SpendingWindowDays,
} from "./dashboard.schemas";

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

/**
 * @spec SPEC-20260804-002 RF-05
 * `"all"` nunca tem `default_context_id`; `"single"`/`"group"` sempre têm — mesma coerência
 * validada por CHECK constraint no banco (RF-04), replicada aqui para dar 422 com mensagem
 * clara antes de bater no banco.
 */
export const contextTypeSchema = z.enum(["all", "single", "group"]);
export type ContextType = z.infer<typeof contextTypeSchema>;

export const updatePreferencesInputSchema = z
  .object({
    auto_draft_enabled: z.boolean().optional(),
    vehicle_chip_fields: chipFieldsSchema.optional(),
    dashboard_kpi_ids: dashboardKpiIdsSchema.optional(),
    timezone: timezoneSchema.nullable().optional(),
    /** @spec SPEC-20260804-001 RF-02 */
    spending_window_days: spendingWindowDaysSchema.optional(),
    /** @spec SPEC-20260804-002 RF-05 */
    default_context_type: contextTypeSchema.nullable().optional(),
    /** @spec SPEC-20260804-002 RF-05, RNF-04 — nunca confiar em input de cliente sem validar UUID */
    default_context_id: z.string().uuid().nullable().optional(),
  })
  .refine(
    (data) =>
      data.auto_draft_enabled !== undefined ||
      data.vehicle_chip_fields !== undefined ||
      data.dashboard_kpi_ids !== undefined ||
      data.timezone !== undefined ||
      data.spending_window_days !== undefined ||
      data.default_context_type !== undefined ||
      data.default_context_id !== undefined,
    { message: "Informe ao menos um campo para atualizar" },
  )
  .refine(
    (data) =>
      data.default_context_type !== "all" ||
      data.default_context_id === undefined ||
      data.default_context_id === null,
    {
      message: "Contexto padrão 'all' não deve ter default_context_id",
      path: ["default_context_id"],
    },
  )
  .refine(
    (data) =>
      data.default_context_type !== "single" &&
      data.default_context_type !== "group"
        ? true
        : data.default_context_id !== undefined &&
          data.default_context_id !== null,
    {
      message: "Contexto padrão 'single'/'group' exige default_context_id",
      path: ["default_context_id"],
    },
  );
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesInputSchema>;

export interface UserPreferences {
  user_id: string;
  auto_draft_enabled: boolean;
  vehicle_chip_fields: ChipField[];
  dashboard_kpi_ids: KpiCatalogId[];
  timezone: string | null;
  /** @spec SPEC-20260804-001 RF-01 */
  spending_window_days: SpendingWindowDays;
  /** @spec SPEC-20260804-002 RF-04 — `null` equivale a 'all' (R-PREF-01) */
  default_context_type: ContextType | null;
  default_context_id: string | null;
  updated_at: string;
}
