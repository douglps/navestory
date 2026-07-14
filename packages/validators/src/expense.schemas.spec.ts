import { describe, expect, it } from "vitest";
import {
  createExpenseInputSchema,
  listExpensesQuerySchema,
  updateExpenseInputSchema,
} from "./expense.schemas";

const validUuid = "11111111-1111-4111-8111-111111111111";

describe("createExpenseInputSchema", () => {
  const base = {
    vehicle_id: validUuid,
    category: "fuel",
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
      fuel_type: "gasoline",
      liters: 40.5,
      full_tank: true,
      supplier: "Posto Ipiranga",
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
