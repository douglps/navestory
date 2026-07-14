import { z } from "zod";

/**
 * @spec SPEC-20260711-001 RF-11, R-SAN-01, R-SAN-02
 */
export const createOdometerCycleInputSchema = z.object({
  starting_value: z.coerce.number().int().nonnegative().default(0),
  reason: z
    .string()
    .transform((value) => value.trim().normalize("NFC"))
    .pipe(z.string().min(3, "Motivo deve ter entre 3 e 500 caracteres").max(500)),
});
export type CreateOdometerCycleInput = z.infer<typeof createOdometerCycleInputSchema>;

export interface OdometerCycle {
  id: string;
  vehicle_id: string;
  cycle_number: number;
  started_at: string;
  starting_value: number;
  previous_cycle_max: number | null;
  reason: string;
  created_by: string;
  created_at: string;
}
