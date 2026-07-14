import type { ChipField } from "@nave/validators";

export interface VehicleChipData {
  make: string | null;
  model: string | null;
  plate: string;
  nickname: string | null;
}

/**
 * @spec SPEC-20260603-003 RF-04/RF-05 — fallback nickname→model e ordem configurável
 *
 * Reutilizado pela prévia de configuração (RNF-03) e, na Fase 5, pelo
 * `VehicleContextChip` real (SPEC-20260603-001).
 */
export function resolveChipValue(field: ChipField, vehicle: VehicleChipData): string {
  switch (field) {
    case "nickname":
      return vehicle.nickname ?? vehicle.model ?? "";
    case "make":
      return vehicle.make ?? "";
    case "model":
      return vehicle.model ?? "";
    case "plate":
      return vehicle.plate;
  }
}

export function formatChipPreview(fields: ChipField[], vehicle: VehicleChipData): string {
  return fields
    .map((field) => resolveChipValue(field, vehicle))
    .filter((value) => value.length > 0)
    .join(" ");
}
