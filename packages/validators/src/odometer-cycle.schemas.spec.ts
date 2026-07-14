import { describe, expect, it } from "vitest";
import { createOdometerCycleInputSchema } from "./odometer-cycle.schemas";

describe("createOdometerCycleInputSchema", () => {
  it("aceita starting_value e reason válidos (RF-11)", () => {
    const result = createOdometerCycleInputSchema.safeParse({
      starting_value: 0,
      reason: "Troca de painel após colisão em 10/07/2026",
    });
    expect(result.success).toBe(true);
  });

  it("aplica default 0 quando starting_value é omitido", () => {
    const result = createOdometerCycleInputSchema.safeParse({ reason: "Troca de painel" });
    expect(result.success).toBe(true);
    expect(result.success ? result.data.starting_value : null).toBe(0);
  });

  it("rejeita reason vazio", () => {
    const result = createOdometerCycleInputSchema.safeParse({ starting_value: 0, reason: "" });
    expect(result.success).toBe(false);
  });

  it("rejeita reason com menos de 3 caracteres após trim", () => {
    const result = createOdometerCycleInputSchema.safeParse({ starting_value: 0, reason: "  ok  " });
    expect(result.success).toBe(false);
  });

  it("rejeita reason com mais de 500 caracteres", () => {
    const result = createOdometerCycleInputSchema.safeParse({
      starting_value: 0,
      reason: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejeita starting_value negativo", () => {
    const result = createOdometerCycleInputSchema.safeParse({ starting_value: -1, reason: "Troca" });
    expect(result.success).toBe(false);
  });

  it("aplica trim e normalize NFC ao reason", () => {
    const result = createOdometerCycleInputSchema.safeParse({
      starting_value: 0,
      reason: "  Troca de painel  ",
    });
    expect(result.success).toBe(true);
    expect(result.success ? result.data.reason : null).toBe("Troca de painel");
  });
});
