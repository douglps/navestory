import type { ExpenseCategoryMonthlySeries } from "@navestory/validators";

const MOVING_AVERAGE_WINDOW = 3;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function addMonths(monthStr: string, count: number): string {
  const [year, month] = monthStr.slice(0, 7).split("-").map(Number);
  if (!year || !month) return monthStr;
  const date = new Date(Date.UTC(year, month - 1 + count, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * @spec SPEC-20260801-002 RF-04
 * Totais mensais da categoria alvo, indexados por `year_month` — usado para localizar o
 * valor original a ser substituído em cada mês histórico.
 */
export function categoryTotalsByMonth(
  series: ExpenseCategoryMonthlySeries[],
  category: string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of series) {
    if (row.category !== category) continue;
    map.set(row.year_month, row.total);
  }
  return map;
}

/**
 * @spec SPEC-20260801-002 RF-04
 * Substitui o total da categoria alvo pelo valor ajustado em cada mês histórico:
 * `total_categoria * (1 + variacao_pct / 100)`. O total do mês (frota inteira) é recomputado
 * como `total - categoria_original + categoria_ajustada`.
 */
export function buildAdjustedMonthlyTotals(
  historicalTotals: Array<{ month: string; total: number }>,
  categoryTotals: Map<string, number>,
  variationPct: number,
): Array<{ month: string; total: number }> {
  return historicalTotals.map(({ month, total }) => {
    const categoryOriginal = categoryTotals.get(month) ?? 0;
    const categoryAdjusted = categoryOriginal * (1 + variationPct / 100);
    return {
      month,
      total: round2(total - categoryOriginal + categoryAdjusted),
    };
  });
}

export interface SimulatedForecastPoint {
  month: string;
  projectedAmount: number;
}

/**
 * @spec SPEC-20260801-002 RF-04
 * Porta client-side da média móvel de 3 meses de `forecast_monthly_costs`
 * (SPEC-20260622-001 RF-05), aplicada sobre a série histórica já ajustada pela simulação.
 * Requer pelo menos 3 meses de histórico; abaixo disso retorna vazio.
 */
export function projectMovingAverage(
  monthlyTotals: Array<{ month: string; total: number }>,
  monthsAhead: number,
): SimulatedForecastPoint[] {
  const n = monthlyTotals.length;
  if (n < MOVING_AVERAGE_WINDOW) return [];

  const last = monthlyTotals[n - 1];
  const secondLast = monthlyTotals[n - 2];
  const thirdLast = monthlyTotals[n - 3];
  if (!last || !secondLast || !thirdLast) return [];

  let avg3: [number, number, number] = [
    thirdLast.total,
    secondLast.total,
    last.total,
  ];
  let nextMonth = last.month;

  const result: SimulatedForecastPoint[] = [];
  for (let i = 0; i < monthsAhead; i++) {
    nextMonth = addMonths(nextMonth, 1);
    const nextAmount = (avg3[0] + avg3[1] + avg3[2]) / 3;
    result.push({ month: nextMonth, projectedAmount: round2(nextAmount) });
    avg3 = [avg3[1], avg3[2], nextAmount];
  }
  return result;
}
