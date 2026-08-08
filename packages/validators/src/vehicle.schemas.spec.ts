import { describe, expect, it } from "vitest";
import {
  createVehicleInputSchema,
  deleteVehicleInputSchema,
  normalizePlate,
  plateSchema,
  updateVehicleInputSchema,
  vehicleResponseSchema,
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

  it("normaliza make/model para uppercase com trim (SPEC-20260807-003 R-VEH-03)", () => {
    const result = createVehicleInputSchema.safeParse({
      ...base,
      make: "  fiat  ",
      model: "strada",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.make).toBe("FIAT");
      expect(result.data.model).toBe("STRADA");
    }
  });
});

describe("updateVehicleInputSchema", () => {
  it("aceita atualização parcial de um único campo (CA-07)", () => {
    expect(updateVehicleInputSchema.safeParse({ color: "Azul" }).success).toBe(true);
  });

  it("aceita objeto vazio (todos os campos opcionais)", () => {
    expect(updateVehicleInputSchema.safeParse({}).success).toBe(true);
  });

  it("aceita atualização de todos os campos editáveis (SPEC-20260807-003 RF-01)", () => {
    const result = updateVehicleInputSchema.safeParse({
      plate: "abc-1234",
      make: "fiat",
      model: "strada",
      year: 2021,
      vehicle_type: "utilitario",
      fuel_type: "diesel",
      nickname: "Trampo",
      color: "Branco",
      odometer: 12000,
    });
    expect(result.success).toBe(true);
  });
});

describe("deleteVehicleInputSchema", () => {
  it("aceita confirmationPlate não vazio (SPEC-20260807-003 RF-07, S17)", () => {
    expect(
      deleteVehicleInputSchema.safeParse({ confirmationPlate: "ABC1234" }).success,
    ).toBe(true);
  });

  it("rejeita confirmationPlate vazio", () => {
    expect(deleteVehicleInputSchema.safeParse({ confirmationPlate: "" }).success).toBe(
      false,
    );
  });
});

/**
 * @spec SPEC-20260803-001 RF-01
 * Fixture espelha exatamente `VEHICLE_COLUMNS` de `apps/api/src/modules/vehicles/vehicles.service.ts`
 * — trava regressão silenciosa entre o schema de saída e o shape real retornado pelo backend.
 */
describe("vehicleResponseSchema", () => {
  const realBackendShape = {
    id: "d290f1ee-6c54-4b01-90e6-d701748f0851",
    user_id: "d290f1ee-6c54-4b01-90e6-d701748f0852",
    plate: "ABC1234",
    make: "Fiat",
    model: "Uno",
    year: 2020,
    model_year: 2020,
    nickname: "Carango",
    color: "Azul",
    photo_url: null,
    photo_thumbnail_url: null,
    photo_object_position: null,
    photo_zoom: null,
    odometer: 45000,
    fuel_type: "gasoline",
    fuel_efficiency: 12.5,
    fuel_liters_capacity: 50,
    vehicle_type: "carro",
    status: "parking",
    renavam: null,
    chassi: null,
    fipe_code: null,
    fipe_updated_at: null,
    ipva_due_date: null,
    insurance_expires_at: null,
    crlv_expires_at: null,
    engine_displacement_cc: null,
    engine_power_cv: null,
    engine_torque_kgm: null,
    engine_config: null,
    is_turbo: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  it("aceita o shape real retornado por VehiclesService (RF-01)", () => {
    const result = vehicleResponseSchema.safeParse(realBackendShape);
    expect(result.success).toBe(true);
  });

  it("aceita campos nullable como null (RNF-04)", () => {
    const withAllNullables = {
      ...realBackendShape,
      make: null,
      model: null,
      year: null,
      nickname: null,
      photo_url: null,
    };
    expect(vehicleResponseSchema.safeParse(withAllNullables).success).toBe(true);
  });

  it("rejeita quando falta um campo obrigatório (id)", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...withoutId } = realBackendShape;
    expect(vehicleResponseSchema.safeParse(withoutId).success).toBe(false);
  });
});
