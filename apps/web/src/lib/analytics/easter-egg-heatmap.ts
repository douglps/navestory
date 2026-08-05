import type { SeasonalHeatmapCell } from "@navestory/validators";

export const EASTER_EGG_SEEN_KEY = "nave_easter_egg_heatmap_seen";
export const EASTER_EGG_UNLOCK_THRESHOLD = 0.4;
const FIRST_WEEK_DAYS = 7;

/**
 * @spec SPEC-20260801-001 RF-03, R-ANA-08
 * Presença mensal = percentual de `month_number` distintos (1–12) com ao menos 1 registro.
 * `seasonal_expense_heatmap` já agrega por mês do calendário (1-12) — equivalente à janela de
 * 12 meses enquanto o histórico do usuário não ultrapassar 2 anos (ver Notas Técnicas da spec).
 */
export function computeMonthlyPresence(cells: SeasonalHeatmapCell[]): number {
  const monthsWithData = new Set(
    cells
      .filter((cell) => cell.occurrence_count > 0)
      .map((cell) => cell.month_number),
  );
  return monthsWithData.size / 12;
}

/**
 * @spec SPEC-20260801-001 RF-03
 */
export function isUnlocked(cells: SeasonalHeatmapCell[]): boolean {
  return computeMonthlyPresence(cells) >= EASTER_EGG_UNLOCK_THRESHOLD;
}

/**
 * @spec SPEC-20260801-001 RF-02
 * Primeiros 7 dias após o primeiro login, comparando `Date.now()` com `createdAt + 7 dias`.
 */
export function isWithinFirstWeek(createdAt: string, now: Date): boolean {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  const expiresAt = created + FIRST_WEEK_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() < expiresAt;
}

/**
 * @spec SPEC-20260801-001 RF-01
 * Top N categorias por gasto total (avg_amount × occurrence_count), usadas para limitar o
 * grid do widget latente às 5 categorias mais relevantes.
 */
export function topCategories(
  cells: SeasonalHeatmapCell[],
  limit = 5,
): string[] {
  const totals = new Map<string, number>();
  for (const cell of cells) {
    const total = cell.avg_amount * cell.occurrence_count;
    totals.set(cell.category, (totals.get(cell.category) ?? 0) + total);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category]) => category);
}

export interface CategoryCooccurrence {
  categoryA: string;
  categoryB: string;
  monthCount: number;
}

/**
 * @spec SPEC-20260801-001 RF-04
 * Para cada par de categorias, conta em quantos `month_number` distintos ambas têm
 * `occurrence_count > 0` — sem chamada de rede adicional, deriva do cache de
 * `seasonal_expense_heatmap`.
 */
export function computeCategoryCooccurrence(
  cells: SeasonalHeatmapCell[],
): CategoryCooccurrence[] {
  const monthsByCategory = new Map<string, Set<number>>();
  for (const cell of cells) {
    if (cell.occurrence_count <= 0) continue;
    const months = monthsByCategory.get(cell.category) ?? new Set<number>();
    months.add(cell.month_number);
    monthsByCategory.set(cell.category, months);
  }

  const categories = [...monthsByCategory.keys()].sort();
  const results: CategoryCooccurrence[] = [];

  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      // eslint-disable-next-line security/detect-object-injection -- índices de loop, não input do usuário
      const categoryA = categories[i];
      // eslint-disable-next-line security/detect-object-injection -- índices de loop, não input do usuário
      const categoryB = categories[j];
      if (!categoryA || !categoryB) continue;

      const monthsA = monthsByCategory.get(categoryA);
      const monthsB = monthsByCategory.get(categoryB);
      if (!monthsA || !monthsB) continue;

      const monthCount = [...monthsA].filter((month) =>
        monthsB.has(month),
      ).length;
      if (monthCount === 0) continue;

      results.push({ categoryA, categoryB, monthCount });
    }
  }

  return results;
}
