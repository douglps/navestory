import { describe, expect, it } from "vitest";
import {
  createExpenseTemplateInputSchema,
  updateExpenseTemplateInputSchema,
} from "./expense-template.schemas";

const validUuid = "11111111-1111-4111-8111-111111111111";

describe("createExpenseTemplateInputSchema", () => {
  const base = {
    name: "Abastecimento Semanal",
    vehicle_id: validUuid,
    category: "fuel",
    amount: 150.0,
  };

  it("aceita payload mínimo válido (RF-06)", () => {
    expect(createExpenseTemplateInputSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita name vazio (CA-13)", () => {
    expect(createExpenseTemplateInputSchema.safeParse({ ...base, name: "" }).success).toBe(false);
  });

  it("rejeita name acima de 60 caracteres", () => {
    expect(
      createExpenseTemplateInputSchema.safeParse({ ...base, name: "a".repeat(61) }).success,
    ).toBe(false);
  });

  it("rejeita amount negativo ou zero (CA-13)", () => {
    expect(createExpenseTemplateInputSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(createExpenseTemplateInputSchema.safeParse({ ...base, amount: -10 }).success).toBe(
      false,
    );
  });

  it("rejeita liters negativo ou zero (CA-13)", () => {
    expect(createExpenseTemplateInputSchema.safeParse({ ...base, liters: 0 }).success).toBe(false);
  });

  it("não possui campos date nem odometer_km (R6)", () => {
    const parsed = createExpenseTemplateInputSchema.safeParse({
      ...base,
      date: "2026-07-14",
      odometer_km: 1000,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect((parsed.data as Record<string, unknown>).date).toBeUndefined();
      expect((parsed.data as Record<string, unknown>).odometer_km).toBeUndefined();
    }
  });

  it("aceita campos opcionais de combustível (R-FUEL-05)", () => {
    const result = createExpenseTemplateInputSchema.safeParse({
      ...base,
      fuel_type: "gasoline",
      liters: 40.5,
      supplier: "Posto Ipiranga",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateExpenseTemplateInputSchema", () => {
  it("aceita atualização parcial de um único campo (RF-09)", () => {
    expect(updateExpenseTemplateInputSchema.safeParse({ name: "Novo nome" }).success).toBe(true);
  });

  it("aceita objeto vazio", () => {
    expect(updateExpenseTemplateInputSchema.safeParse({}).success).toBe(true);
  });
});
