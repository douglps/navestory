import { z } from "zod";

/**
 * @spec SPEC-20260607-001 RF-05
 * Grafo de transições válidas de status de multa; `paid` e `cancelled` são estados terminais.
 */
export const fineStatusSchema = z.enum(["pending", "paid", "appealing", "cancelled"]);
export type FineStatus = z.infer<typeof fineStatusSchema>;

export const FINE_STATUS_TRANSITIONS: Record<FineStatus, FineStatus[]> = {
  pending: ["paid", "appealing", "cancelled"],
  appealing: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
};

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD");

/**
 * @spec SPEC-20260607-001 RF-01
 * Campos obrigatórios (vehicle_id, description, amount, occurred_at) + opcionais do auto de infração.
 * `status` nunca aparece aqui — é sempre `pending` na criação (RF-05) e só muda via transição validada.
 */
export const fineBaseSchema = z.object({
  vehicle_id: z.string().uuid(),
  description: z
    .string()
    .transform((value) => value.trim().normalize("NFC"))
    .pipe(z.string().min(3).max(500)),
  amount: z.number().min(0.01).max(100_000_000),
  occurred_at: dateSchema,
  auto_number: z
    .string()
    .transform((value) => value.trim().normalize("NFC"))
    .pipe(z.string().max(100))
    .nullable()
    .optional(),
  infraction_code: z
    .string()
    .transform((value) => value.trim().normalize("NFC"))
    .pipe(z.string().max(50))
    .nullable()
    .optional(),
  amount_with_discount: z.number().min(0.01).max(100_000_000).nullable().optional(),
  due_date: dateSchema.nullable().optional(),
  appeal_deadline: dateSchema.nullable().optional(),
  location: z
    .string()
    .transform((value) => value.trim().normalize("NFC"))
    .pipe(z.string().max(255))
    .nullable()
    .optional(),
  odometer_km: z.number().int().min(0).max(9_999_999).nullable().optional(),
  driver_name: z
    .string()
    .transform((value) => value.trim().normalize("NFC"))
    .pipe(z.string().max(255))
    .nullable()
    .optional(),
  notes: z
    .string()
    .transform((value) => value.trim().normalize("NFC"))
    .pipe(z.string().max(500))
    .nullable()
    .optional(),
});

export const createFineInputSchema = fineBaseSchema;
export type CreateFineInput = z.infer<typeof createFineInputSchema>;

/**
 * @spec SPEC-20260607-001 RF-04
 * `status`/`paid_at` só entram via update (nunca na criação, RF-05).
 */
export const updateFineInputSchema = fineBaseSchema
  .partial()
  .omit({ vehicle_id: true })
  .extend({
    status: fineStatusSchema.optional(),
    paid_at: dateSchema.nullable().optional(),
  });
export type UpdateFineInput = z.infer<typeof updateFineInputSchema>;

export const listFinesQuerySchema = z.object({
  status: fineStatusSchema.optional(),
});
export type ListFinesQuery = z.infer<typeof listFinesQuerySchema>;

export interface Fine {
  id: string;
  user_id: string;
  vehicle_id: string;
  description: string;
  amount: number;
  occurred_at: string;
  auto_number: string | null;
  infraction_code: string | null;
  amount_with_discount: number | null;
  due_date: string | null;
  paid_at: string | null;
  appeal_deadline: string | null;
  location: string | null;
  odometer_km: number | null;
  driver_name: string | null;
  status: FineStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
