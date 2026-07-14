import { describe, expect, it } from "vitest";
import {
  createVehicleInputSchema,
  normalizePlate,
  plateSchema,
  updateVehicleInputSchema,
} from "./vehicle.schemas";

describe("normalizePlate", () => {
  it("remove hífen e converte para uppercase (R-VEH-02, CA-01)", () => {
    expect(normalizePlate("abc-1234")).toBe("ABC1234");
  });
});

describe("plateSchema", () => {
  it("aceita placa BR (ABC1234) (CA-01)", () => {
    expect(plateSchema.safeParse("ABC1234").success).toBe(true);
  });

  it("aceita placa Mercosul (ABC1D23) (CA-03)", () => {
    expect(plateSchema.safeParse("ABC1D23").success).toBe(true);
  });

  it("rejeita placa com formato inválido (CA-02)", () => {
    expect(plateSchema.safeParse("AB1234").success).toBe(false);
  });
});

describe("createVehicleInputSchema", () => {
  const base = { plate: "abc-1234", make: "Fiat", model: "Uno", year: 2020, vehicle_type: "carro" };

  it("aceita payload mínimo válido (RF-01)", () => {
    const result = createVehicleInputSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("rejeita quando vehicle_type está ausente (CA-10)", () => {
    const withoutType: Record<string, unknown> = { ...base };
    delete withoutType.vehicle_type;
    expect(createVehicleInputSchema.safeParse(withoutType).success).toBe(false);
  });

  it("rejeita quando make está ausente", () => {
    const withoutMake: Record<string, unknown> = { ...base };
    delete withoutMake.make;
    expect(createVehicleInputSchema.safeParse(withoutMake).success).toBe(false);
  });
});

describe("updateVehicleInputSchema", () => {
  it("aceita atualização parcial de um único campo (CA-07)", () => {
    expect(updateVehicleInputSchema.safeParse({ color: "Azul" }).success).toBe(true);
  });

  it("aceita objeto vazio (todos os campos opcionais)", () => {
    expect(updateVehicleInputSchema.safeParse({}).success).toBe(true);
  });
});
