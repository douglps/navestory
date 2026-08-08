import { describe, expect, it } from "vitest";
import { createVehicleInputSchema } from "@navestory/validators";
import { zodIssuesToFieldErrors } from "./form-errors";

/**
 * @spec SPEC-20260807-003 RF-08, R-FORM-08
 */
describe("zodIssuesToFieldErrors", () => {
  it("mapeia um erro por campo quando múltiplos campos são inválidos simultaneamente", () => {
    const result = createVehicleInputSchema.safeParse({
      plate: "",
      make: "",
      model: "",
      year: 1000,
      vehicle_type: "carro",
    });
    expect(result.success).toBe(false);
    if (result.success) return;

    const fieldErrors = zodIssuesToFieldErrors(result.error.issues);

    expect(fieldErrors.plate).toBeDefined();
    expect(fieldErrors.make).toBe("Marca é obrigatória");
    expect(fieldErrors.model).toBe("Modelo é obrigatório");
    expect(fieldErrors.year).toBeDefined();
  });

  it("mantém apenas a primeira mensagem quando um campo tem múltiplos issues", () => {
    const fieldErrors = zodIssuesToFieldErrors([
      { path: ["make"], message: "primeiro erro" } as never,
      { path: ["make"], message: "segundo erro" } as never,
    ]);

    expect(fieldErrors.make).toBe("primeiro erro");
  });

  it("usa a chave _root para issues sem path", () => {
    const fieldErrors = zodIssuesToFieldErrors([
      { path: [], message: "erro geral" } as never,
    ]);

    expect(fieldErrors._root).toBe("erro geral");
  });
});
