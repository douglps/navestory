import { describe, expect, it } from "vitest";
import {
  createRecurringCostInputSchema,
  listRecurringCostsQuerySchema,
  RECURRING_COST_TYPE_TO_CATEGORY,
  updateRecurringCostInputSchema,
} from "./recurring-cost.schemas";

const validUuid = "11111111-1111-4111-8111-111111111111";

describe("createRecurringCostInputSchema", () => {
  const base = {
    vehicle_id: validUuid,
    cost_type: "ipva",
    year: 2026,
    amount: 1250.0,
    due_date: "2026-03-31",
  };

  it("aceita payload mínimo válido (RF-02)", () => {
    expect(createRecurringCostInputSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita cost_type inválido", () => {
    expect(
      createRecurringCostInputSchema.safeParse({ ...base, cost_type: "toll" }).success,
    ).toBe(false);
  });

  it("rejeita amount zero ou negativo", () => {
    expect(createRecurringCostInputSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
  });

  it("rejeita year fora do range", () => {
    expect(createRecurringCostInputSchema.safeParse({ ...base, year: 1999 }).success).toBe(false);
    expect(createRecurringCostInputSchema.safeParse({ ...base, year: 2101 }).success).toBe(false);
  });

  it("aceita paid_at opcional", () => {
    expect(
      createRecurringCostInputSchema.safeParse({ ...base, paid_at: "2026-03-15" }).success,
    ).toBe(true);
  });
});

describe("updateRecurringCostInputSchema", () => {
  it("aceita atualização parcial de paid_at (RF-03)", () => {
    expect(updateRecurringCostInputSchema.safeParse({ paid_at: "2026-03-15" }).success).toBe(true);
  });

  it("não permite alterar vehicle_id", () => {
    const parsed = updateRecurringCostInputSchema.safeParse({ vehicle_id: validUuid });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect((parsed.data as Record<string, unknown>).vehicle_id).toBeUndefined();
    }
  });
});

describe("listRecurringCostsQuerySchema", () => {
  it("aceita filtros opcionais (RF-01)", () => {
    const result = listRecurringCostsQuerySchema.safeParse({
      vehicle_id: validUuid,
      year: 2026,
      cost_type: "insurance",
      paid: "true",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paid).toBe(true);
    }
  });

  it("aceita objeto vazio", () => {
    expect(listRecurringCostsQuerySchema.safeParse({}).success).toBe(true);
  });
});

describe("RECURRING_COST_TYPE_TO_CATEGORY", () => {
  it("mapeia cost_type para categoria de expense (R-LED-05)", () => {
    expect(RECURRING_COST_TYPE_TO_CATEGORY).toEqual({
      ipva: "tax",
      crlv: "tax",
      insurance: "insurance",
      other: "other",
    });
  });
});
