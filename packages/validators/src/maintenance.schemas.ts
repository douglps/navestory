import { z } from "zod";

/**
 * @spec SPEC-20260603-002 R7
 * Grafo de transições válidas de status de manutenção; `completed` e `cancelled` são estados
 * terminais. `scheduled` é o estado inicial real do banco (enum `maintenance_status`) — ver
 * changelog v0.2 de SPEC-20260603-002 sobre a correção da contradição spec-vs-schema-real.
 */
export const maintenanceStatusSchema = z.enum(["scheduled", "in_progress", "completed", "cancelled"]);
export type MaintenanceStatus = z.infer<typeof maintenanceStatusSchema>;

export const MAINTENANCE_STATUS_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  scheduled: ["in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

/**
 * @spec SPEC-20260715-002 RF-BK-07, R-TZ-03
 * Aceita `YYYY-MM-DD` (compatibilidade retroativa) ou ISO 8601 com offset explícito.
 */
const dateSchema = z
  .string()
  .refine(
    (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isNaN(Date.parse(value)),
    "Data deve estar no formato YYYY-MM-DD ou ISO 8601 com offset",
  );

/**
 * @spec SPEC-20260715-001 RF-01, RF-02
 * Campos obrigatórios (vehicle_id, description, scheduled_date) + opcionais. `status` nunca
 * aparece aqui — é sempre `scheduled` na criação (RF-03) e só muda via transição validada.
 */
export const maintenanceBaseSchema = z.object({
  vehicle_id: z.string().uuid(),
  description: z
    .string()
    .transform((value) => value.trim().normalize("NFC"))
    .pipe(z.string().min(3).max(500)),
  scheduled_date: dateSchema,
  cost: z.number().min(0.01).max(100_000_000).nullable().optional(),
  odometer_km: z.number().int().min(0).max(9_999_999).nullable().optional(),
  completion_date: dateSchema.nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createMaintenanceInputSchema = maintenanceBaseSchema;
export type CreateMaintenanceInput = z.infer<typeof createMaintenanceInputSchema>;

/**
 * @spec SPEC-20260715-001 RF-06
 * `status` só entra via update (nunca na criação, RF-03).
 */
export const updateMaintenanceInputSchema = maintenanceBaseSchema
  .partial()
  .omit({ vehicle_id: true })
  .extend({
    status: maintenanceStatusSchema.optional(),
  });
export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceInputSchema>;

export const listMaintenancesQuerySchema = z.object({
  vehicle_id: z.string().uuid().optional(),
  status: maintenanceStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListMaintenancesQuery = z.infer<typeof listMaintenancesQuerySchema>;

export interface Maintenance {
  id: string;
  user_id: string;
  vehicle_id: string;
  description: string;
  status: MaintenanceStatus;
  scheduled_date: string;
  completion_date: string | null;
  cost: number | null;
  odometer_km: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
