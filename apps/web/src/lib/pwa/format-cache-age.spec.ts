import { describe, expect, it } from "vitest";
import { formatCacheAge } from "./format-cache-age";

describe("formatCacheAge", () => {
  it("RF-13.1: mesma data (calendário local) formata como 'Hoje HH:mm'", () => {
    const now = new Date(2026, 6, 18, 14, 0);
    const date = new Date(2026, 6, 18, 8, 42);

    expect(formatCacheAge(date, now)).toBe("Hoje 08:42");
  });

  it("RF-13.1: um dia antes formata como 'Ontem HH:mm'", () => {
    const now = new Date(2026, 6, 18, 9, 0);
    const date = new Date(2026, 6, 17, 23, 5);

    expect(formatCacheAge(date, now)).toBe("Ontem 23:05");
  });

  it("RF-13.1: mais antigo que ontem formata como 'DD/MM/AA HH:mm'", () => {
    const now = new Date(2026, 6, 18, 9, 0);
    const date = new Date(2026, 6, 10, 8, 42);

    expect(formatCacheAge(date, now)).toBe("10/07/26 08:42");
  });

  it("RF-13.1: início da madrugada de 'hoje' não é confundido com 'ontem'", () => {
    const now = new Date(2026, 6, 18, 0, 5);
    const date = new Date(2026, 6, 18, 0, 1);

    expect(formatCacheAge(date, now)).toBe("Hoje 00:01");
  });
});
