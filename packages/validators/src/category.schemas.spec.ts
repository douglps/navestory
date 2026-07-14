import { describe, expect, it } from "vitest";
import {
  createCategoryInputSchema,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORY_VALUES,
} from "./category.schemas";

describe("DEFAULT_EXPENSE_CATEGORIES", () => {
  it("possui exatamente 9 categorias padrão (CA-07)", () => {
    expect(DEFAULT_EXPENSE_CATEGORIES).toHaveLength(9);
    expect(DEFAULT_EXPENSE_CATEGORY_VALUES).toHaveLength(9);
  });
});

describe("createCategoryInputSchema", () => {
  it("aceita value e label válidos (CA-01)", () => {
    const result = createCategoryInputSchema.safeParse({
      value: "fuel_premium",
      label: "Gasolina Aditivada",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita value com maiúsculas ou espaços (CA-05)", () => {
    const result = createCategoryInputSchema.safeParse({
      value: "Fuel Premium",
      label: "X",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita value vazio", () => {
    const result = createCategoryInputSchema.safeParse({ value: "", label: "X" });
    expect(result.success).toBe(false);
  });

  it("rejeita value com mais de 50 caracteres", () => {
    const result = createCategoryInputSchema.safeParse({
      value: "a".repeat(51),
      label: "X",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita label com mais de 100 caracteres", () => {
    const result = createCategoryInputSchema.safeParse({
      value: "custom",
      label: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });
});
