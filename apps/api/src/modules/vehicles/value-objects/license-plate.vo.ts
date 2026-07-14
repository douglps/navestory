import { BadRequestException } from "@nestjs/common";
import { LICENSE_PLATE_REGEX, normalizePlate } from "@nave/validators";

/**
 * @spec SPEC-20260602-002 RF-02, R-VEH-02
 * Normaliza (uppercase, sem hífen) e valida placa BR (ABC1234) / Mercosul (ABC1D23).
 */
export class LicensePlate {
  private constructor(private readonly value: string) {}

  static create(raw: string): LicensePlate {
    const normalized = normalizePlate(raw);
    if (!LICENSE_PLATE_REGEX.test(normalized)) {
      throw new BadRequestException(
        "Placa inválida — use o formato ABC1234 (BR) ou ABC1D23 (Mercosul)",
      );
    }
    return new LicensePlate(normalized);
  }

  toString(): string {
    return this.value;
  }
}
