import { describe, expect, it } from "vitest";
import { relativeLabel } from "./relative-label";

/**
 * @spec SPEC-20260804-006 RF-04
 */
describe("relativeLabel", () => {
  it("dias negativos (plural): venceu há N dias", () => {
    expect(relativeLabel(-3)).toBe("Venceu há 3 dias");
  });

  it("dias negativos (singular): venceu há 1 dia", () => {
    expect(relativeLabel(-1)).toBe("Venceu há 1 dia");
  });

  it("zero dias: Hoje", () => {
    expect(relativeLabel(0)).toBe("Hoje");
  });

  it("dias positivos (singular): Em 1 dia", () => {
    expect(relativeLabel(1)).toBe("Em 1 dia");
  });

  it("dias positivos (plural): Em N dias", () => {
    expect(relativeLabel(5)).toBe("Em 5 dias");
  });
});
