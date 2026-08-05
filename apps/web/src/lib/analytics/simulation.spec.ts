import { describe, expect, it } from "vitest";
import type { ExpenseCategoryMonthlySeries } from "@navestory/validators";
import {
  buildAdjustedMonthlyTotals,
  categoryTotalsByMonth,
  projectMovingAverage,
} from "./simulation";

function categoryRow(
  yearMonth: string,
  category: string,
  total: number,
): ExpenseCategoryMonthlySeries {
  return { year_month: yearMonth, category, total, vehicle_id: null };
}

/**
 * @spec SPEC-20260801-002 RF-04
 */
describe("categoryTotalsByMonth", () => {
  it("indexa apenas os totais da categoria informada", () => {
    const series = [
      categoryRow("2026-01-01", "fuel", 100),
      categoryRow("2026-01-01", "maintenance", 50),
      categoryRow("2026-02-01", "fuel", 120),
    ];
    const result = categoryTotalsByMonth(series, "fuel");
    expect(result).toEqual(
      new Map([
        ["2026-01-01", 100],
        ["2026-02-01", 120],
      ]),
    );
  });
});

describe("buildAdjustedMonthlyTotals", () => {
  it("substitui o total da categoria alvo pelo valor ajustado (+20%)", () => {
    const historical = [{ month: "2026-01-01", total: 500 }];
    const categoryTotals = new Map([["2026-01-01", 100]]);

    const result = buildAdjustedMonthlyTotals(historical, categoryTotals, 20);

    // 500 - 100 + (100 * 1.2) = 500 - 100 + 120 = 520
    expect(result).toEqual([{ month: "2026-01-01", total: 520 }]);
  });

  it("reduz o total do mês com variação negativa (-50%)", () => {
    const historical = [{ month: "2026-01-01", total: 500 }];
    const categoryTotals = new Map([["2026-01-01", 100]]);

    const result = buildAdjustedMonthlyTotals(historical, categoryTotals, -50);

    // 500 - 100 + 50 = 450
    expect(result).toEqual([{ month: "2026-01-01", total: 450 }]);
  });

  it("trata mês sem dado da categoria como 0 (variação não afeta o total)", () => {
    const historical = [{ month: "2026-01-01", total: 500 }];
    const categoryTotals = new Map<string, number>();

    const result = buildAdjustedMonthlyTotals(historical, categoryTotals, 50);

    expect(result).toEqual([{ month: "2026-01-01", total: 500 }]);
  });

  it("variação 0% preserva o total original", () => {
    const historical = [{ month: "2026-01-01", total: 500 }];
    const categoryTotals = new Map([["2026-01-01", 100]]);

    const result = buildAdjustedMonthlyTotals(historical, categoryTotals, 0);

    expect(result).toEqual([{ month: "2026-01-01", total: 500 }]);
  });
});

/**
 * @spec SPEC-20260801-002 RF-04
 */
describe("projectMovingAverage", () => {
  it("retorna vazio com menos de 3 meses históricos", () => {
    const totals = [
      { month: "2026-01-01", total: 100 },
      { month: "2026-02-01", total: 100 },
    ];
    expect(projectMovingAverage(totals, 3)).toEqual([]);
  });

  it("projeta a média móvel de 3 meses para os meses seguintes", () => {
    const totals = [
      { month: "2026-01-01", total: 300 },
      { month: "2026-02-01", total: 300 },
      { month: "2026-03-01", total: 300 },
    ];

    const result = projectMovingAverage(totals, 2);

    expect(result).toEqual([
      { month: "2026-04-01", projectedAmount: 300 },
      { month: "2026-05-01", projectedAmount: 300 },
    ]);
  });

  it("faz rolling da janela a cada mês projetado", () => {
    const totals = [
      { month: "2026-01-01", total: 100 },
      { month: "2026-02-01", total: 200 },
      { month: "2026-03-01", total: 300 },
    ];

    const result = projectMovingAverage(totals, 1);

    // avg(100, 200, 300) = 200
    expect(result).toEqual([{ month: "2026-04-01", projectedAmount: 200 }]);
  });

  it("faz rollover de ano ao projetar além de dezembro", () => {
    const totals = [
      { month: "2026-10-01", total: 100 },
      { month: "2026-11-01", total: 100 },
      { month: "2026-12-01", total: 100 },
    ];

    const result = projectMovingAverage(totals, 1);

    expect(result).toEqual([{ month: "2027-01-01", projectedAmount: 100 }]);
  });
});
