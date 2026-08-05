import { describe, expect, it } from "vitest";
import type { SeasonalHeatmapCell } from "@navestory/validators";
import {
  computeCategoryCooccurrence,
  computeMonthlyPresence,
  isUnlocked,
  isWithinFirstWeek,
  topCategories,
} from "./easter-egg-heatmap";

function cell(
  monthNumber: number,
  category: string,
  occurrenceCount = 1,
): SeasonalHeatmapCell {
  return {
    month_number: monthNumber,
    category,
    avg_amount: 100,
    occurrence_count: occurrenceCount,
  };
}

/**
 * @spec SPEC-20260801-001 RF-03, R-ANA-08
 */
describe("computeMonthlyPresence", () => {
  it("retorna 0 sem dados", () => {
    expect(computeMonthlyPresence([])).toBe(0);
  });

  it("conta meses distintos com occurrence_count > 0", () => {
    const cells = [
      cell(1, "fuel"),
      cell(1, "maintenance"),
      cell(2, "fuel"),
      cell(3, "fuel"),
    ];
    expect(computeMonthlyPresence(cells)).toBeCloseTo(3 / 12, 5);
  });

  it("ignora células com occurrence_count zero", () => {
    const cells = [cell(1, "fuel", 0), cell(2, "fuel", 0)];
    expect(computeMonthlyPresence(cells)).toBe(0);
  });
});

describe("isUnlocked", () => {
  it("desbloqueia com >= 40% de presença (5 de 12 meses)", () => {
    const cells = [1, 2, 3, 4, 5].map((month) => cell(month, "fuel"));
    expect(isUnlocked(cells)).toBe(true);
  });

  it("não desbloqueia com menos de 40% (4 de 12 meses)", () => {
    const cells = [1, 2, 3, 4].map((month) => cell(month, "fuel"));
    expect(isUnlocked(cells)).toBe(false);
  });
});

/**
 * @spec SPEC-20260801-001 RF-02
 */
describe("isWithinFirstWeek", () => {
  it("true dentro dos 7 dias", () => {
    const createdAt = "2026-08-01T00:00:00Z";
    const now = new Date("2026-08-05T00:00:00Z");
    expect(isWithinFirstWeek(createdAt, now)).toBe(true);
  });

  it("false após 7 dias", () => {
    const createdAt = "2026-08-01T00:00:00Z";
    const now = new Date("2026-08-09T00:00:00Z");
    expect(isWithinFirstWeek(createdAt, now)).toBe(false);
  });

  it("false para data inválida", () => {
    expect(isWithinFirstWeek("invalid", new Date())).toBe(false);
  });
});

/**
 * @spec SPEC-20260801-001 RF-04
 */
describe("computeCategoryCooccurrence", () => {
  it("conta meses em comum entre pares de categorias", () => {
    const cells = [
      cell(1, "fuel"),
      cell(1, "maintenance"),
      cell(2, "fuel"),
      cell(2, "maintenance"),
      cell(3, "fuel"),
    ];
    const result = computeCategoryCooccurrence(cells);
    expect(result).toEqual([
      { categoryA: "fuel", categoryB: "maintenance", monthCount: 2 },
    ]);
  });

  it("não inclui pares sem meses em comum", () => {
    const cells = [cell(1, "fuel"), cell(2, "maintenance")];
    expect(computeCategoryCooccurrence(cells)).toEqual([]);
  });

  it("ignora células com occurrence_count zero", () => {
    const cells = [cell(1, "fuel", 0), cell(1, "maintenance", 0)];
    expect(computeCategoryCooccurrence(cells)).toEqual([]);
  });
});

/**
 * @spec SPEC-20260801-001 RF-01
 */
describe("topCategories", () => {
  it("ordena categorias por gasto total (avg_amount × occurrence_count) desc", () => {
    const cells = [
      { ...cell(1, "fuel"), avg_amount: 100, occurrence_count: 2 },
      { ...cell(1, "maintenance"), avg_amount: 500, occurrence_count: 1 },
      { ...cell(2, "fines"), avg_amount: 10, occurrence_count: 1 },
    ];
    expect(topCategories(cells, 5)).toEqual(["maintenance", "fuel", "fines"]);
  });

  it("respeita o limite informado", () => {
    const cells = [
      { ...cell(1, "fuel"), avg_amount: 300, occurrence_count: 1 },
      { ...cell(1, "maintenance"), avg_amount: 200, occurrence_count: 1 },
      { ...cell(1, "fines"), avg_amount: 100, occurrence_count: 1 },
    ];
    expect(topCategories(cells, 2)).toEqual(["fuel", "maintenance"]);
  });
});
