import { z } from "zod";

/**
 * @spec SPEC-20260602-002 R-VEH-02
 * Placa brasileira (ABC1234) ou padrão Mercosul (ABC1D23) — validada após normalização
 * (uppercase, sem hífen) feita pelo `LicensePlate` VO / `normalizePlate`.
 */
export const LICENSE_PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

export function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/-/g, "").trim();
}

export const plateSchema = z
  .string()
  .transform(normalizePlate)
  .refine((value) => LICENSE_PLATE_REGEX.test(value), {
    message: "Placa inválida — use o formato ABC1234 (BR) ou ABC1D23 (Mercosul)",
  });

export const vehicleTypeSchema = z.enum([
  "carro",
  "moto",
  "caminhao",
  "onibus",
  "utilitario",
  "outro",
]);

export const vehicleOperationalStatusSchema = z
  .enum(["parking", "workshop", "accident", "impounded"])
  .default("parking");

export const fuelTypeSchema = z.enum([
  "gasoline",
  "gasoline_premium",
  "ethanol",
  "diesel",
  "diesel_s10",
  "gnv",
  "electric",
  "hybrid",
]);

/**
 * @spec SPEC-20260602-002 RF-01, RF-07
 * Campos obrigatórios (plate, make, model, year, vehicle_type) + opcionais (RF-07).
 */
export const vehicleBaseSchema = z.object({
  plate: plateSchema,
  make: z.string().min(1, "Marca é obrigatória"),
  model: z.string().min(1, "Modelo é obrigatório"),
  year: z.number().int().min(1900).max(2100),
  vehicle_type: vehicleTypeSchema,
  nickname: z.string().max(50).nullable().optional(),
  color: z.string().nullable().optional(),
  model_year: z.number().int().min(1900).max(2100).nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
  photo_thumbnail_url: z.string().url().nullable().optional(),
  photo_object_position: z.string().optional(),
  photo_zoom: z.number().optional(),
  odometer: z.number().nonnegative().nullable().optional(),
  fuel_type: fuelTypeSchema.nullable().optional(),
  fuel_efficiency: z.number().nonnegative().nullable().optional(),
  fuel_liters_capacity: z.number().nonnegative().nullable().optional(),
  ipva_due_date: z.string().nullable().optional(),
  renavam: z.string().max(11).nullable().optional(),
  chassi: z.string().max(17).nullable().optional(),
  fipe_code: z.string().nullable().optional(),
  fipe_updated_at: z.string().nullable().optional(),
  status: vehicleOperationalStatusSchema.optional(),
  engine_displacement_cc: z.number().int().nullable().optional(),
  engine_power_cv: z.number().int().nullable().optional(),
  engine_torque_kgm: z.number().nullable().optional(),
  engine_config: z.string().nullable().optional(),
  is_turbo: z.boolean().optional(),
});

export const createVehicleInputSchema = vehicleBaseSchema;
export type CreateVehicleInput = z.infer<typeof createVehicleInputSchema>;

export const updateVehicleInputSchema = vehicleBaseSchema.partial();
export type UpdateVehicleInput = z.infer<typeof updateVehicleInputSchema>;
