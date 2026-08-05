import { describe, expect, it } from "vitest";
import type {
  ExpenseCategoryMonthlySeries,
  FuelTrendPoint,
} from "@navestory/validators";
import {
  buildCategoryCorrelations,
  buildKmConsumptionPairs,
  pearsonCorrelation,
} from "./correlation";

function point(overrides: Partial<FuelTrendPoint>): FuelTrendPoint {
  return {
    expense_id: "id",
    date: "2026-01-01",
    liters: 40,
    amount: 200,
    odometer_km: null,
    km_per_liter: null,
    price_per_liter: null,
    rolling_avg_kpl: null,
    ...overrides,
  };
}

/**
 * @spec SPEC-20260801-002 RF-01
 */
describe("pearsonCorrelation", () => {
  it("retorna 0 para lista vazia", () => {
    expect(pearsonCorrelation([])).toBe(0);
  });

  it("retorna 1 para correlação positiva perfeita", () => {
    const pairs: Array<[number, number]> = [
      [1, 2],
      [2, 4],
      [3, 6],
      [4, 8],
    ];
    expect(pearsonCorrelation(pairs)).toBeCloseTo(1, 5);
  });

  it("retorna -1 para correlação negativa perfeita", () => {
    const pairs: Array<[number, number]> = [
      [1, 8],
      [2, 6],
      [3, 4],
      [4, 2],
    ];
    expect(pearsonCorrelation(pairs)).toBeCloseTo(-1, 5);
  });

  it("retorna 0 quando denominador é zero (variância nula)", () => {
    const pairs: Array<[number, number]> = [
      [5, 1],
      [5, 2],
      [5, 3],
    ];
    expect(pearsonCorrelation(pairs)).toBe(0);
  });
});

/**
 * @spec SPEC-20260801-002 RF-01
 */
describe("buildKmConsumptionPairs", () => {
  it("deriva km_delta entre pontos consecutivos ordenados por data", () => {
    const points = [
      point({ date: "2026-02-01", odometer_km: 1200, km_per_liter: 12 }),
      point({ date: "2026-01-01", odometer_km: 1000, km_per_liter: 10 }),
    ];
    expect(buildKmConsumptionPairs(points)).toEqual([
      { kmDelta: 200, kmPerLiter: 12 },
    ]);
  });

  it("ignora pares sem odometer_km em algum dos pontos", () => {
    const points = [
      point({ date: "2026-01-01", odometer_km: null, km_per_liter: 10 }),
      point({ date: "2026-02-01", odometer_km: 1200, km_per_liter: 12 }),
    ];
    expect(buildKmConsumptionPairs(points)).toEqual([]);
  });

  it("ignora pares sem km_per_liter no ponto atual", () => {
    const points = [
      point({ date: "2026-01-01", odometer_km: 1000, km_per_liter: 10 }),
      point({ date: "2026-02-01", odometer_km: 1200, km_per_liter: null }),
    ];
    expect(buildKmConsumptionPairs(points)).toEqual([]);
  });

  it("ignora pares com km_delta <= 0 (odômetro retrocedendo ou igual)", () => {
    const points = [
      point({ date: "2026-01-01", odometer_km: 1200, km_per_liter: 10 }),
      point({ date: "2026-02-01", odometer_km: 1200, km_per_liter: 12 }),
    ];
    expect(buildKmConsumptionPairs(points)).toEqual([]);
  });
});

function row(
  yearMonth: string,
  category: string,
  total: number,
): ExpenseCategoryMonthlySeries {
  return { year_month: yearMonth, category, total, vehicle_id: null };
}

function eightMonths(): string[] {
  return Array.from(
    { length: 8 },
    (_, index) => `2026-${String(index + 1).padStart(2, "0")}-01`,
  );
}

/**
 * @spec SPEC-20260801-002 RF-02, R-ANA-09
 */
describe("buildCategoryCorrelations", () => {
  it("descarta pares com menos de 8 meses completos em comum (R-ANA-09)", () => {
    const series = [
      row("2026-01-01", "fuel", 100),
      row("2026-01-01", "maintenance", 50),
      row("2026-02-01", "fuel", 120),
      row("2026-02-01", "maintenance", 60),
    ];
    expect(buildCategoryCorrelations(series)).toEqual([]);
  });

  it("calcula o coeficiente para um par com 8+ meses completos e coeficiente positivo", () => {
    const months = eightMonths();
    const series = months.flatMap((month, index) => [
      row(month, "fuel", 100 + index * 10),
      row(month, "maintenance", 50 + index * 5),
    ]);

    const result = buildCategoryCorrelations(series);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      categoryA: "fuel",
      categoryB: "maintenance",
      n: 8,
    });
    expect(result[0]?.coefficient).toBeCloseTo(1, 5);
  });

  it("não inclui pares com coeficiente negativo ou nulo", () => {
    const months = eightMonths();
    const series = months.flatMap((month, index) => [
      row(month, "fuel", 100 + index * 10),
      row(month, "fines", 100 - index * 10),
    ]);

    expect(buildCategoryCorrelations(series)).toEqual([]);
  });

  it("ignora meses em que a categoria tem total <= 0", () => {
    const months = eightMonths();
    const series = months.flatMap((month, index) => [
      row(month, "fuel", 100 + index * 10),
      row(month, "maintenance", index === 0 ? 0 : 50 + index * 5),
    ]);

    expect(buildCategoryCorrelations(series)).toEqual([]);
  });

  it("retorna no máximo 3 pares, ordenados por maior coeficiente", () => {
    const months = eightMonths();
    const series = months.flatMap((month, index) => [
      row(month, "fuel", 100 + index * 10),
      row(month, "maintenance", 50 + index * 5),
      row(month, "fines", 20 + index * 20),
      row(month, "recurring", 10 + index * 1),
    ]);

    const result = buildCategoryCorrelations(series);

    expect(result.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1];
      // eslint-disable-next-line security/detect-object-injection -- índice de loop, não input do usuário
      const curr = result[i];
      expect(prev?.coefficient ?? 0).toBeGreaterThanOrEqual(
        curr?.coefficient ?? 0,
      );
    }
  });
});
