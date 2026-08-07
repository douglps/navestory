import { describe, expect, it } from "vitest";
import { changeDateYear } from "./date-year";

/**
 * @spec SPEC-20260612-002 RF-02
 */
describe("changeDateYear", () => {
  it("altera apenas o ano, mantendo mês e dia", () => {
    expect(changeDateYear("2026-06-12", 2023)).toBe("2023-06-12");
  });

  it("faz rollover em data inválida (29/02 em ano não bissexto)", () => {
    expect(changeDateYear("2024-02-29", 2023)).toBe("2023-03-01");
  });

  it("usa mês e dia default (1) quando a string não os contém", () => {
    expect(changeDateYear("2026", 2023)).toBe("2023-01-01");
  });
});
