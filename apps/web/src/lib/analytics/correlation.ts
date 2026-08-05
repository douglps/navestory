import type {
  ExpenseCategoryMonthlySeries,
  FuelTrendPoint,
} from "@navestory/validators";

const MIN_CATEGORY_PAIR_MONTHS = 8;
const TOP_CATEGORY_PAIRS = 3;

/**
 * @spec SPEC-20260801-002 RF-01, RF-02
 * Coeficiente de correlação de Pearson sobre pares numéricos. Implementação direta —
 * não introduzir biblioteca de estatística para isso (ver Notas Técnicas da spec).
 */
export function pearsonCorrelation(pairs: Array<[number, number]>): number {
  const n = pairs.length;
  if (n === 0) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const [x, y] of pairs) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2),
  );

  return denominator === 0 ? 0 : numerator / denominator;
}

export interface KmConsumptionPair {
  kmDelta: number;
  kmPerLiter: number;
}

/**
 * @spec SPEC-20260801-002 RF-01
 * Deriva pares (km percorridos entre abastecimentos, km/L) a partir da série de
 * `fuel_consumption_trend` já em cache — sem chamada de rede adicional.
 */
export function buildKmConsumptionPairs(
  points: FuelTrendPoint[],
): KmConsumptionPair[] {
  const sorted = [...points].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const pairs: KmConsumptionPair[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    // eslint-disable-next-line security/detect-object-injection -- índice de loop, não input do usuário
    const curr = sorted[i];
    if (!prev || !curr) continue;
    if (prev.odometer_km == null || curr.odometer_km == null) continue;
    if (curr.km_per_liter == null) continue;

    const kmDelta = curr.odometer_km - prev.odometer_km;
    if (kmDelta <= 0) continue;

    pairs.push({ kmDelta, kmPerLiter: curr.km_per_liter });
  }

  return pairs;
}

export interface CategoryPairCorrelation {
  categoryA: string;
  categoryB: string;
  n: number;
  coefficient: number;
}

/**
 * @spec SPEC-20260801-002 RF-02, R-ANA-09
 * Para cada par de categorias, considera apenas os `year_month` em que ambas têm `total > 0`
 * (pares completos). Guardrail R-ANA-09: abaixo de 8 pares completos o par é descartado —
 * nenhum coeficiente é calculado nem exibido. Retorna os 3 pares com maior coeficiente
 * positivo entre os que atingem o mínimo.
 */
export function buildCategoryCorrelations(
  series: ExpenseCategoryMonthlySeries[],
): CategoryPairCorrelation[] {
  const byCategory = new Map<string, Map<string, number>>();
  for (const row of series) {
    if (row.total <= 0) continue;
    const months = byCategory.get(row.category) ?? new Map<string, number>();
    months.set(row.year_month, row.total);
    byCategory.set(row.category, months);
  }

  const categories = [...byCategory.keys()].sort();
  const results: CategoryPairCorrelation[] = [];

  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      // eslint-disable-next-line security/detect-object-injection -- índices de loop, não input do usuário
      const categoryA = categories[i];
      // eslint-disable-next-line security/detect-object-injection -- índices de loop, não input do usuário
      const categoryB = categories[j];
      if (!categoryA || !categoryB) continue;

      const monthsA = byCategory.get(categoryA);
      const monthsB = byCategory.get(categoryB);
      if (!monthsA || !monthsB) continue;

      const commonMonths = [...monthsA.keys()].filter((month) =>
        monthsB.has(month),
      );
      if (commonMonths.length < MIN_CATEGORY_PAIR_MONTHS) continue;

      const pairs: Array<[number, number]> = [];
      for (const month of commonMonths) {
        const valueA = monthsA.get(month);
        const valueB = monthsB.get(month);
        if (valueA == null || valueB == null) continue;
        pairs.push([valueA, valueB]);
      }

      results.push({
        categoryA,
        categoryB,
        n: commonMonths.length,
        coefficient: pearsonCorrelation(pairs),
      });
    }
  }

  return results
    .filter((entry) => entry.coefficient > 0)
    .sort((a, b) => b.coefficient - a.coefficient)
    .slice(0, TOP_CATEGORY_PAIRS);
}
