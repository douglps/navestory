import { describe, expect, it } from "vitest";
import {
  consolidatedExportQuerySchema,
  createExpenseInputSchema,
  expenseKpisQuerySchema,
  listExpensesQuerySchema,
  updateExpenseInputSchema,
  upcomingCostsQuerySchema,
} from "./expense.schemas";

const validUuid = "11111111-1111-4111-8111-111111111111";

describe("createExpenseInputSchema", () => {
  const base = {
    vehicle_id: validUuid,
    category: "maintenance",
    amount: 150.0,
    date: "2026-07-14",
  };

  it("aceita payload mínimo válido (RF-01)", () => {
    expect(createExpenseInputSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita vehicle_id ausente", () => {
    const withoutVehicle: Record<string, unknown> = { ...base };
    delete withoutVehicle.vehicle_id;
    expect(createExpenseInputSchema.safeParse(withoutVehicle).success).toBe(false);
  });

  it("rejeita amount 0 (R-EXP-01, CA-02)", () => {
    expect(createExpenseInputSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
  });

  it("rejeita amount acima do máximo (R-EXP-01, CA-03)", () => {
    expect(
      createExpenseInputSchema.safeParse({ ...base, amount: 100_000_001 }).success,
    ).toBe(false);
  });

  it("rejeita odometer_km acima do máximo (R-ODO-02, CA-04)", () => {
    expect(
      createExpenseInputSchema.safeParse({ ...base, odometer_km: 10_000_000 }).success,
    ).toBe(false);
  });

  it("rejeita date em formato inválido", () => {
    expect(createExpenseInputSchema.safeParse({ ...base, date: "14/07/2026" }).success).toBe(
      false,
    );
  });

  it("rejeita fuel_type inválido (CA-14)", () => {
    expect(
      createExpenseInputSchema.safeParse({ ...base, fuel_type: "invalid_value" }).success,
    ).toBe(false);
  });

  it("aceita campos opcionais de combustível", () => {
    const result = createExpenseInputSchema.safeParse({
      ...base,
      category: "fuel",
      odometer_km: 50_000,
      fuel_type: "gasoline",
      liters: 40.5,
      full_tank: true,
      supplier: "Posto Ipiranga",
    });
    expect(result.success).toBe(true);
  });

  /**
   * @spec SPEC-20260612-001 RF-06.1
   */
  it("rejeita category=fuel sem odometer_km (R-FUEL-01)", () => {
    const result = createExpenseInputSchema.safeParse({ ...base, category: "fuel" });
    expect(result.success).toBe(false);
  });

  it("aceita category=fuel com odometer_km informado", () => {
    const result = createExpenseInputSchema.safeParse({
      ...base,
      category: "fuel",
      odometer_km: 50_000,
    });
    expect(result.success).toBe(true);
  });
});

describe("updateExpenseInputSchema", () => {
  it("aceita atualização parcial de um único campo (CA-13)", () => {
    expect(updateExpenseInputSchema.safeParse({ amount: 200.0 }).success).toBe(true);
  });

  it("aceita objeto vazio", () => {
    expect(updateExpenseInputSchema.safeParse({}).success).toBe(true);
  });

  it("não aceita vehicle_id (imutável após criação)", () => {
    const parsed = updateExpenseInputSchema.safeParse({ vehicle_id: validUuid, amount: 50 });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect((parsed.data as Record<string, unknown>).vehicle_id).toBeUndefined();
    }
  });

  /**
   * @spec SPEC-20260612-001 RF-06.1
   */
  it("rejeita category=fuel sem odometer_km", () => {
    expect(updateExpenseInputSchema.safeParse({ category: "fuel" }).success).toBe(false);
  });

  it("aceita category=fuel com odometer_km informado", () => {
    expect(
      updateExpenseInputSchema.safeParse({ category: "fuel", odometer_km: 60_000 }).success,
    ).toBe(true);
  });
});

describe("listExpensesQuerySchema", () => {
  it("aplica defaults de paginação (P1)", () => {
    const result = listExpensesQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("rejeita limit acima do máximo (CA-16)", () => {
    expect(listExpensesQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it("aceita filtros opcionais", () => {
    const result = listExpensesQuerySchema.safeParse({
      vehicle_id: validUuid,
      category: "fuel",
      date_from: "2026-07-01",
      date_to: "2026-07-31",
    });
    expect(result.success).toBe(true);
  });
});

describe("upcomingCostsQuerySchema", () => {
  it("aplica default de horizon_days=30 (RF-01)", () => {
    const result = upcomingCostsQuerySchema.parse({});
    expect(result.horizon_days).toBe(30);
  });

  it("aceita horizon_days=90", () => {
    expect(upcomingCostsQuerySchema.safeParse({ horizon_days: 90 }).success).toBe(true);
  });

  it("aceita horizon_days=7 (SPEC-20260721-002 RF-01 — KPI de compromissos próximos 7 dias)", () => {
    expect(upcomingCostsQuerySchema.safeParse({ horizon_days: 7 }).success).toBe(true);
  });

  it("rejeita horizon_days fora de (7, 30, 90) (RNF-03)", () => {
    expect(upcomingCostsQuerySchema.safeParse({ horizon_days: 15 }).success).toBe(false);
    expect(upcomingCostsQuerySchema.safeParse({ horizon_days: 45 }).success).toBe(false);
  });

  it("aceita vehicle_id opcional", () => {
    expect(upcomingCostsQuerySchema.safeParse({ vehicle_id: validUuid }).success).toBe(true);
  });

  it("aceita limit opcional (SPEC-20260721-002 RF-09, P6)", () => {
    const result = upcomingCostsQuerySchema.parse({ horizon_days: 7, limit: 10 });
    expect(result.limit).toBe(10);
  });

  it("limit é undefined quando omitido (sem teto aplicado)", () => {
    const result = upcomingCostsQuerySchema.parse({});
    expect(result.limit).toBeUndefined();
  });

  it("rejeita limit acima de 50", () => {
    expect(upcomingCostsQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
  });
});

describe("expenseKpisQuerySchema", () => {
  it("aceita objeto vazio", () => {
    expect(expenseKpisQuerySchema.safeParse({}).success).toBe(true);
  });

  it("aceita vehicle_id opcional", () => {
    expect(expenseKpisQuerySchema.safeParse({ vehicle_id: validUuid }).success).toBe(true);
  });

  it("rejeita vehicle_id inválido", () => {
    expect(expenseKpisQuerySchema.safeParse({ vehicle_id: "not-a-uuid" }).success).toBe(false);
  });
});

describe("consolidatedExportQuerySchema", () => {
  it("aceita objeto vazio (default de 12 meses aplicado no service)", () => {
    expect(consolidatedExportQuerySchema.safeParse({}).success).toBe(true);
  });

  it("aceita from/to/vehicle_id opcionais", () => {
    const result = consolidatedExportQuerySchema.safeParse({
      from: "2025-07-01",
      to: "2026-07-01",
      vehicle_id: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it("rejeita from em formato inválido", () => {
    expect(consolidatedExportQuerySchema.safeParse({ from: "01/07/2025" }).success).toBe(false);
  });
});
