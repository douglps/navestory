"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  AnalyticsInsight,
  ExpenseAnomaly,
  ExpenseCategoryMonthlySeries,
  FleetBenchmarkEntry,
  FuelTrendPoint,
  MonthlyForecastPoint,
  SeasonalHeatmapCell,
  VehicleResponse as Vehicle,
  VehicleTco,
} from "@navestory/validators";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Alert,
  ChartWrapper,
  Combobox,
  Container,
  EmptyState,
} from "@navestory/ui";
import { apiClient } from "@/lib/http/api-client";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { TcoBreakdownChart } from "@/components/charts/tco-breakdown-chart";
import { FuelTrendChart } from "@/components/charts/fuel-trend-chart";
import { CHART_CATEGORY_COLORS } from "@/lib/chart-colors";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
  buildAdjustedMonthlyTotals,
  categoryTotalsByMonth,
  projectMovingAverage,
} from "@/lib/analytics/simulation";
import {
  buildCategoryCorrelations,
  buildKmConsumptionPairs,
  pearsonCorrelation,
} from "@/lib/analytics/correlation";

function vehicleLabel(vehicle: Vehicle | undefined): string {
  if (!vehicle) return "—";
  return (
    vehicle.nickname ??
    (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate)
  );
}

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * @spec SPEC-20260622-001 RF-01, RF-13, R-ANA-04
 * @spec SPEC-20260525-001 §5.2 — migrado para `ChartWrapper` de `packages/ui`, consolidando o
 * header/empty state que antes era duplicado manualmente (ver matrices/rastreabilidade.md).
 */
function TcoSection({ tco }: { tco: VehicleTco | undefined }): ReactNode {
  if (!tco) return null;

  return (
    <section aria-label="Custo total de propriedade">
      <ChartWrapper
        title="TCO — Custo Total de Propriedade"
        isEmpty={tco.total === 0}
        emptyMessage="Registre despesas para ver o custo total de propriedade."
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded border p-3">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-lg font-semibold">{currency(tco.total)}</p>
            </div>
            <div className="rounded border p-3">
              <p className="text-sm text-muted-foreground">Custo/km</p>
              <p className="text-lg font-semibold">
                {tco.cost_per_km == null ? "—" : currency(tco.cost_per_km)}
              </p>
            </div>
            <div className="rounded border p-3">
              <p className="text-sm text-muted-foreground">Custo/mês</p>
              <p className="text-lg font-semibold">
                {tco.cost_per_month == null
                  ? "—"
                  : currency(tco.cost_per_month)}
              </p>
            </div>
          </div>

          <TcoBreakdownChart breakdown={tco.breakdown} />
        </div>
      </ChartWrapper>
    </section>
  );
}

/**
 * @spec SPEC-20260622-001 RF-02, RF-13, R-ANA-01, R-FUEL-02, R-FUEL-03
 * @spec SPEC-20260525-001 §5.2 — migrado para `ChartWrapper` de `packages/ui`.
 */
function FuelTrendSection({
  points,
}: {
  points: FuelTrendPoint[] | undefined;
}): ReactNode {
  if (!points) return null;

  return (
    <section aria-label="Tendência de consumo de combustível">
      <ChartWrapper
        title="Combustível — Tendência de km/L"
        isEmpty={points.length === 0}
        emptyMessage="Registre abastecimentos com tanque cheio para ver a tendência de consumo."
      >
        <FuelTrendChart points={points} />
      </ChartWrapper>
    </section>
  );
}

/**
 * @spec SPEC-20260801-002 RF-01, RF-06
 * Correlação de Pearson client-side entre km percorridos e km/L, derivada da série já em
 * cache de `fuel_consumption_trend` (SPEC-20260622-001 RF-02) — sem chamada de rede adicional.
 */
function FuelCorrelationSection({
  points,
}: {
  points: FuelTrendPoint[] | undefined;
}): ReactNode {
  if (!points) return null;

  const pairs = buildKmConsumptionPairs(points);

  if (pairs.length < 5) {
    return (
      <section
        aria-label="Correlação entre distância e consumo"
        className="rounded border p-4"
      >
        <EmptyState
          size="sm"
          title="Correlação km × consumo"
          description="Registre mais abastecimentos com tanque cheio para ver correlações de consumo."
        />
      </section>
    );
  }

  const coefficient = pearsonCorrelation(
    pairs.map((pair) => [pair.kmDelta, pair.kmPerLiter]),
  );
  const direction =
    coefficient > 0.1
      ? "maior distância mensal associada a maior consumo (km/L)"
      : coefficient < -0.1
        ? "maior distância mensal associada a menor consumo (km/L)"
        : "sem direção clara entre distância e consumo";

  const chartData = pairs.map((pair) => ({
    x: pair.kmDelta,
    y: pair.kmPerLiter,
  }));

  return (
    <section
      aria-label="Correlação entre distância e consumo"
      className="flex flex-col gap-3 rounded border p-4"
    >
      <h2 className="font-semibold">Correlação — Distância × Consumo</h2>
      <p className="text-sm text-muted-foreground">
        Padrão observado com {pairs.length} registros: coeficiente{" "}
        {coefficient.toFixed(2)} — {direction}.
      </p>

      <div aria-hidden="true" className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(var(--chart-grid))"
            />
            <XAxis type="number" dataKey="x" name="Distância (km)" />
            <YAxis type="number" dataKey="y" name="Consumo (km/L)" />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={chartData} fill={CHART_CATEGORY_COLORS[0]} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Ver dados em tabela
        </summary>
        <table className="mt-2 w-full text-sm">
          <caption className="sr-only">
            Pares de distância percorrida e consumo
          </caption>
          <thead>
            <tr className="text-left text-muted-foreground">
              <th scope="col">Distância (km)</th>
              <th scope="col">Consumo (km/L)</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair, index) => (
              <tr key={`${pair.kmDelta}-${index}`}>
                <td>{pair.kmDelta}</td>
                <td>{pair.kmPerLiter.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

const CATEGORY_LABEL: Record<string, string> = {
  fuel: "Combustível",
  maintenance: "Manutenção",
  fines: "Multas",
  recurring: "Custo recorrente",
  other: "Outros",
};

function categoryLabel(category: string): string {
  // eslint-disable-next-line security/detect-object-injection -- category vem da RPC, não de input do usuário
  return CATEGORY_LABEL[category] ?? category;
}

/**
 * @spec SPEC-20260801-002 RF-02, RF-06, R-ANA-09
 * Correlação de Pearson entre pares de categorias com N ≥ 8 meses completos, derivada da
 * série `expense_category_monthly_series` (RF-03). Guardrail R-ANA-09: pares abaixo do
 * mínimo ficam em empty state inline — não em estado de erro.
 */
function CategoryCorrelationSection({
  series,
}: {
  series: ExpenseCategoryMonthlySeries[] | undefined;
}): ReactNode {
  if (!series) return null;

  const correlations = buildCategoryCorrelations(series);

  if (correlations.length === 0) {
    return (
      <section
        aria-label="Correlação entre categorias de gasto"
        className="rounded border p-4"
      >
        <EmptyState
          size="sm"
          title="Correlação categoria × categoria"
          description="Dados insuficientes para calcular correlações entre categorias. Continue registrando."
        />
      </section>
    );
  }

  return (
    <section
      aria-label="Correlação entre categorias de gasto"
      className="flex flex-col gap-3 rounded border p-4"
    >
      <h2 className="font-semibold">
        Correlação — Categorias que ocorrem juntas
      </h2>
      <ul className="flex flex-col gap-2">
        {correlations.map((entry) => (
          <li
            key={`${entry.categoryA}-${entry.categoryB}`}
            className="rounded border bg-muted/30 p-3 text-sm"
          >
            <p className="font-medium">
              {categoryLabel(entry.categoryA)} × {categoryLabel(entry.categoryB)}
            </p>
            <p className="text-muted-foreground">
              Padrão observado com {entry.n} registros: coeficiente{" "}
              {entry.coefficient.toFixed(2)}.
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * @spec SPEC-20260622-001 RF-03, RF-09, RF-13, R-ANA-02
 */
function AnomaliesSection({
  anomalies,
}: {
  anomalies: ExpenseAnomaly[] | undefined;
}): ReactNode {
  if (!anomalies) return null;

  if (anomalies.length === 0) {
    return (
      <section aria-label="Despesas anômalas" className="rounded border p-4">
        <EmptyState
          size="sm"
          title="Anomalias"
          description="Mais registros são necessários para detectar anomalias."
        />
      </section>
    );
  }

  const top5 = anomalies.slice(0, 5);

  return (
    <section
      aria-label="Despesas anômalas"
      className="flex flex-col gap-3 rounded border p-4"
    >
      <h2 className="font-semibold">Anomalias — Despesas fora do padrão</h2>
      <ul className="flex flex-col gap-2">
        {top5.map((anomaly) => (
          <li key={anomaly.expense_id}>
            <Alert
              variant="warning"
              title={`${categoryLabel(anomaly.category)} — ${currency(anomaly.amount)} em ${anomaly.date}`}
              description={`${anomaly.z_score.toFixed(1)}σ acima da média (${currency(anomaly.avg_amount)})`}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * @spec SPEC-20260622-001 RF-04, RF-10, RF-13, R-ANA-05
 */
function BenchmarkSection({
  entries,
}: {
  entries: FleetBenchmarkEntry[] | undefined;
}): ReactNode {
  const router = useRouter();
  if (!entries) return null;

  if (entries.length < 2) {
    return (
      <section
        aria-label="Comparativo de eficiência da frota"
        className="rounded border p-4"
      >
        <EmptyState
          size="sm"
          title="Benchmarking"
          description="Adicione pelo menos 2 veículos para comparar eficiência."
          action={{
            label: "Adicionar veículo",
            onClick: () => router.push("/vehicles/new"),
          }}
        />
      </section>
    );
  }

  const chartData = entries.map((entry) => ({
    name: entry.vehicle_name,
    cost_per_km: entry.cost_per_km ?? 0,
  }));

  return (
    <section
      aria-label="Comparativo de eficiência da frota"
      className="flex flex-col gap-3 rounded border p-4"
    >
      <h2 className="font-semibold">Benchmarking — Custo/km por veículo</h2>

      <div aria-hidden="true" className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(var(--chart-grid))"
            />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={100} />
            <Tooltip formatter={(value) => currency(Number(value))} />
            <Bar dataKey="cost_per_km" fill={CHART_CATEGORY_COLORS[0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Ver dados em tabela
        </summary>
        <table className="mt-2 w-full text-sm">
          <caption className="sr-only">
            Ranking de eficiência entre veículos
          </caption>
          <thead>
            <tr className="text-left text-muted-foreground">
              <th scope="col">#</th>
              <th scope="col">Veículo</th>
              <th scope="col">Custo/km</th>
              <th scope="col">km/L médio</th>
              <th scope="col">Score</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.vehicle_id}>
                <td>{entry.efficiency_rank}</td>
                <td>{entry.vehicle_name}</td>
                <td>
                  {entry.cost_per_km == null
                    ? "—"
                    : currency(entry.cost_per_km)}
                </td>
                <td>{entry.avg_km_per_liter ?? "—"}</td>
                <td>{entry.health_score ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

/**
 * @spec SPEC-20260622-001 RF-05, RF-11, RF-13, RF-15, R-ANA-03
 * Empty state quando nenhum ponto tem is_forecast=true — indica que a RPC não teve os 6 meses
 * de histórico exigidos por R-ANA-03 e retornou apenas dados reais.
 */
function ForecastSection({
  points,
}: {
  points: MonthlyForecastPoint[] | undefined;
}): ReactNode {
  if (!points) return null;

  const hasForecast = points.some((point) => point.is_forecast);
  if (!hasForecast) {
    return (
      <section aria-label="Projeção de custos" className="rounded border p-4">
        <EmptyState
          size="sm"
          title="Projeção"
          description="Projeções requerem pelo menos 6 meses de dados."
        />
      </section>
    );
  }

  const chartData = points.map((point) => ({
    month: point.month,
    band: [point.projected_low, point.projected_high] as [number, number],
    amount: point.projected_amount,
  }));

  return (
    <section
      aria-label="Projeção de custos"
      className="flex flex-col gap-3 rounded border p-4"
    >
      <h2 className="font-semibold">Projeção — Custos futuros</h2>

      <div aria-hidden="true" className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(var(--chart-grid))"
            />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => currency(Number(value))} />
            <Area
              type="monotone"
              dataKey="band"
              name="Banda de confiança"
              stroke="none"
              fill={CHART_CATEGORY_COLORS[0]}
              fillOpacity={0.2}
            />
            <Line
              type="monotone"
              dataKey="amount"
              name="Projeção"
              stroke={CHART_CATEGORY_COLORS[0]}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Ver dados em tabela
        </summary>
        <table className="mt-2 w-full text-sm">
          <caption className="sr-only">Projeção mensal de custos</caption>
          <thead>
            <tr className="text-left text-muted-foreground">
              <th scope="col">Mês</th>
              <th scope="col">Valor</th>
              <th scope="col">Mínimo</th>
              <th scope="col">Máximo</th>
              <th scope="col">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.month}>
                <td>{point.month}</td>
                <td>{currency(point.projected_amount)}</td>
                <td>{currency(point.projected_low)}</td>
                <td>{currency(point.projected_high)}</td>
                <td>{point.is_forecast ? "Projetado" : "Histórico"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

const SIMULATION_PERIOD_OPTIONS = [
  { value: "3", label: "3 meses" },
  { value: "6", label: "6 meses" },
];

const DEFAULT_SIMULATION_CATEGORY = "fuel";

/**
 * @spec SPEC-20260801-002 RF-04, RF-05, RF-06
 * Simulador "e se" determinístico client-side: reimplementa a média móvel de 3 meses de
 * `forecast_monthly_costs` sobre a série histórica ajustada pelo parâmetro de variação
 * percentual da categoria alvo. Estado efêmero por sessão — reseta ao default a cada
 * montagem do componente (RF-05); recálculo com debounce de 200ms, sem chamada ao backend.
 */
function SimulationSection({
  forecast,
  categorySeries,
}: {
  forecast: MonthlyForecastPoint[] | undefined;
  categorySeries: ExpenseCategoryMonthlySeries[] | undefined;
}): ReactNode {
  const [category, setCategory] = useState(DEFAULT_SIMULATION_CATEGORY);
  const [variationPct, setVariationPct] = useState(0);
  const [periodMonths, setPeriodMonths] = useState(3);

  const debouncedCategory = useDebouncedValue(category, 200);
  const debouncedVariationPct = useDebouncedValue(variationPct, 200);
  const debouncedPeriodMonths = useDebouncedValue(periodMonths, 200);

  if (!forecast || !categorySeries) return null;

  const historicalTotals = forecast
    .filter((point) => !point.is_forecast)
    .map((point) => ({ month: point.month, total: point.projected_amount }));

  if (historicalTotals.length < 6) {
    return (
      <section
        aria-label="Simulação de gastos"
        className="rounded border p-4"
      >
        <EmptyState
          size="sm"
          title="Simulação"
          description="Projeções e simulações requerem pelo menos 6 meses de dados."
        />
      </section>
    );
  }

  const categoryOptions = [
    ...new Set(categorySeries.map((row) => row.category)),
  ].sort();

  const categoryTotals = categoryTotalsByMonth(
    categorySeries,
    debouncedCategory,
  );
  const adjustedTotals = buildAdjustedMonthlyTotals(
    historicalTotals,
    categoryTotals,
    debouncedVariationPct,
  );
  const baseline = projectMovingAverage(
    historicalTotals,
    debouncedPeriodMonths,
  );
  const simulated = projectMovingAverage(
    adjustedTotals,
    debouncedPeriodMonths,
  );

  const chartData = baseline.map((point, index) => ({
    month: point.month,
    base: point.projectedAmount,
    // eslint-disable-next-line security/detect-object-injection -- índice de loop, não input do usuário
    simulated: simulated[index]?.projectedAmount ?? point.projectedAmount,
  }));

  return (
    <section
      aria-label="Simulação de gastos"
      className="flex flex-col gap-3 rounded border p-4"
    >
      <h2 className="font-semibold">
        Simulação — projeção com ajuste de categoria
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Categoria</span>
          <Combobox
            aria-label="Categoria alvo da simulação"
            options={categoryOptions.map((cat) => ({
              value: cat,
              label: categoryLabel(cat),
            }))}
            value={category}
            onValueChange={setCategory}
            placeholder="Selecione uma categoria"
            searchPlaceholder="Buscar categoria..."
            emptyMessage="Nenhuma categoria encontrada"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="simulation-variation"
            className="text-sm text-muted-foreground"
          >
            Variação: {variationPct > 0 ? `+${variationPct}` : variationPct}%
          </label>
          {/* R-DS-09: exceção documentada — não há componente `Slider` em @navestory/ui;
              input range nativo estilizado é o controle de forma customizada que a API
              do design system ainda não cobre. */}
          <input
            id="simulation-variation"
            type="range"
            min={-50}
            max={50}
            step={5}
            value={variationPct}
            onChange={(event) => setVariationPct(Number(event.target.value))}
            aria-label="Variação percentual de gasto"
            className="w-full accent-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">
            Período de referência
          </span>
          <Combobox
            aria-label="Período de referência da simulação"
            options={SIMULATION_PERIOD_OPTIONS}
            value={String(periodMonths)}
            onValueChange={(value) => setPeriodMonths(Number(value))}
            placeholder="Selecione o período"
          />
        </div>
      </div>

      <div aria-hidden="true" className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(var(--chart-grid))"
            />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => currency(Number(value))} />
            <Line
              type="monotone"
              dataKey="base"
              name="Projeção original"
              stroke={CHART_CATEGORY_COLORS[0]}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="simulated"
              name="Projeção simulada"
              stroke={CHART_CATEGORY_COLORS[1]}
              strokeDasharray="4 4"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Ver dados em tabela
        </summary>
        <table className="mt-2 w-full text-sm">
          <caption className="sr-only">
            Projeção original comparada à projeção simulada
          </caption>
          <thead>
            <tr className="text-left text-muted-foreground">
              <th scope="col">Mês</th>
              <th scope="col">Projeção original</th>
              <th scope="col">Projeção simulada</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row) => (
              <tr key={row.month}>
                <td>{row.month}</td>
                <td>{currency(row.base)}</td>
                <td>{currency(row.simulated)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

/**
 * @spec SPEC-20260622-001 RF-06, RF-12, RF-13, RF-15, R-ANA-07
 */
function SeasonalitySection({
  cells,
}: {
  cells: SeasonalHeatmapCell[] | undefined;
}): ReactNode {
  if (!cells) return null;

  if (cells.length === 0) {
    return (
      <section
        aria-label="Sazonalidade de gastos"
        className="rounded border p-4"
      >
        <EmptyState
          size="sm"
          title="Sazonalidade"
          description="Análise sazonal requer pelo menos 6 meses de registros."
        />
      </section>
    );
  }

  const categories = [...new Set(cells.map((cell) => cell.category))].sort();
  const maxAmount = Math.max(...cells.map((cell) => cell.avg_amount));
  const cellByKey = new Map(
    cells.map((cell) => [`${cell.month_number}-${cell.category}`, cell]),
  );

  return (
    <section
      aria-label="Sazonalidade de gastos"
      className="flex flex-col gap-3 rounded border p-4"
    >
      <h2 className="font-semibold">
        Sazonalidade — Gastos por mês e categoria
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Média de gastos por mês do calendário e categoria
          </caption>
          <thead>
            <tr className="text-left text-muted-foreground">
              <th scope="col">Mês</th>
              {categories.map((category) => (
                <th key={category} scope="col">
                  {categoryLabel(category)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MONTH_LABELS.map((label, index) => {
              const monthNumber = index + 1;
              return (
                <tr key={monthNumber}>
                  <td>{label}</td>
                  {categories.map((category) => {
                    const cell = cellByKey.get(`${monthNumber}-${category}`);
                    const intensity =
                      cell && maxAmount > 0 ? cell.avg_amount / maxAmount : 0;
                    return (
                      <td
                        key={category}
                        aria-label={
                          cell
                            ? `${label}, ${categoryLabel(category)}: ${currency(cell.avg_amount)}`
                            : `${label}, ${categoryLabel(category)}: sem dados`
                        }
                        style={{
                          backgroundColor: `rgba(37, 99, 235, ${intensity * 0.6})`,
                        }}
                        className="px-2 py-1 text-center"
                      >
                        {cell ? currency(cell.avg_amount) : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const INSIGHT_LABEL: Record<AnalyticsInsight["type"], string> = {
  efficiency: "Eficiência",
  fuel_degradation: "Consumo",
  fines_discount: "Multas",
  cheaper_supplier: "Fornecedor",
  forecast_increase: "Projeção",
};

/**
 * @spec SPEC-20260622-001 RF-14, RF-13, RF-15
 */
function InsightsSection({
  insights,
}: {
  insights: AnalyticsInsight[] | undefined;
}): ReactNode {
  if (!insights) return null;

  if (insights.length === 0) {
    return (
      <section aria-label="Insights" className="rounded border p-4">
        <EmptyState
          size="sm"
          title="Insights"
          description="Continue registrando para receber recomendações personalizadas."
        />
      </section>
    );
  }

  return (
    <section
      aria-label="Insights"
      className="flex flex-col gap-3 rounded border p-4"
    >
      <h2 className="font-semibold">Insights — Recomendações</h2>
      <ul className="flex flex-col gap-2">
        {insights.map((insight, index) => (
          <li
            key={`${insight.type}-${index}`}
            className="rounded border bg-muted/30 p-3 text-sm"
          >
            <p className="font-medium">{INSIGHT_LABEL[insight.type]}</p>
            <p className="text-muted-foreground">{insight.message}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * @spec SPEC-20260622-001 RF-16
 */
function ExportButton({ vehicleId }: { vehicleId: string }): ReactNode {
  const exportUrl = `/api/backend/analytics/export${
    vehicleId ? `?vehicle_id=${encodeURIComponent(vehicleId)}` : ""
  }`;

  return (
    <a
      href={exportUrl}
      download={`analytics-${new Date().toISOString().slice(0, 10)}.csv`}
      className="text-sm text-primary underline"
    >
      Exportar
    </a>
  );
}

/**
 * @spec SPEC-20260622-001 RF-13
 * T6.3 (Prediction): seções de projeção, sazonalidade e insights somam-se ao TCO, tendência de
 * combustível, anomalias e benchmarking das fases anteriores, completando RF-13/RF-15.
 */
export default function AnalyticsPage(): ReactNode {
  const router = useRouter();
  const storeActiveVehicleId = useDashboardStore(
    (state) => state.activeVehicleId,
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient<Vehicle[]>("/vehicles"),
    retry: false,
  });

  useEffect(() => {
    if (selectedVehicleId) return;
    const fallback = storeActiveVehicleId ?? vehicles?.[0]?.id;
    if (fallback) setSelectedVehicleId(fallback);
  }, [selectedVehicleId, storeActiveVehicleId, vehicles]);

  const {
    data: tco,
    isLoading: isTcoLoading,
    isError: isTcoError,
  } = useQuery({
    queryKey: ["analytics", "tco", selectedVehicleId],
    queryFn: () => apiClient<VehicleTco>(`/analytics/tco/${selectedVehicleId}`),
    enabled: Boolean(selectedVehicleId),
    retry: false,
  });

  const {
    data: fuelTrend,
    isLoading: isFuelLoading,
    isError: isFuelError,
  } = useQuery({
    queryKey: ["analytics", "fuel-trend", selectedVehicleId],
    queryFn: () =>
      apiClient<FuelTrendPoint[]>(
        `/analytics/fuel-trend/${selectedVehicleId}?limit=20`,
      ),
    enabled: Boolean(selectedVehicleId),
    retry: false,
  });

  const {
    data: categorySeries,
    isLoading: isCategorySeriesLoading,
    isError: isCategorySeriesError,
  } = useQuery({
    queryKey: ["analytics", "category-series", selectedVehicleId],
    queryFn: () =>
      apiClient<ExpenseCategoryMonthlySeries[]>(
        `/analytics/category-series?vehicle_id=${selectedVehicleId}`,
      ),
    enabled: Boolean(selectedVehicleId),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  const {
    data: anomalies,
    isLoading: isAnomaliesLoading,
    isError: isAnomaliesError,
  } = useQuery({
    queryKey: ["analytics", "anomalies", selectedVehicleId],
    queryFn: () =>
      apiClient<ExpenseAnomaly[]>(
        `/analytics/anomalies?vehicle_id=${selectedVehicleId}`,
      ),
    enabled: Boolean(selectedVehicleId),
    retry: false,
  });

  const {
    data: benchmark,
    isLoading: isBenchmarkLoading,
    isError: isBenchmarkError,
  } = useQuery({
    queryKey: ["analytics", "benchmark"],
    queryFn: () => apiClient<FleetBenchmarkEntry[]>("/analytics/benchmark"),
    retry: false,
  });

  const {
    data: forecast,
    isLoading: isForecastLoading,
    isError: isForecastError,
  } = useQuery({
    queryKey: ["analytics", "forecast", selectedVehicleId],
    queryFn: () =>
      apiClient<MonthlyForecastPoint[]>(
        `/analytics/forecast?vehicle_id=${selectedVehicleId}`,
      ),
    enabled: Boolean(selectedVehicleId),
    retry: false,
  });

  const {
    data: seasonal,
    isLoading: isSeasonalLoading,
    isError: isSeasonalError,
  } = useQuery({
    queryKey: ["analytics", "seasonal", selectedVehicleId],
    queryFn: () =>
      apiClient<SeasonalHeatmapCell[]>(
        `/analytics/seasonal?vehicle_id=${selectedVehicleId}`,
      ),
    enabled: Boolean(selectedVehicleId),
    retry: false,
  });

  const {
    data: insights,
    isLoading: isInsightsLoading,
    isError: isInsightsError,
  } = useQuery({
    queryKey: ["analytics", "insights", selectedVehicleId],
    queryFn: () =>
      apiClient<AnalyticsInsight[]>(
        `/analytics/insights?vehicle_id=${selectedVehicleId}`,
      ),
    enabled: Boolean(selectedVehicleId),
    retry: false,
  });

  return (
    <Container size="3xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Analytics</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span>Veículo</span>
            <Combobox
              aria-label="Veículo"
              options={(vehicles ?? []).map((vehicle) => ({
                value: vehicle.id,
                label: vehicleLabel(vehicle),
              }))}
              value={selectedVehicleId}
              onValueChange={setSelectedVehicleId}
              placeholder="Selecione um veículo"
              searchPlaceholder="Buscar veículo..."
              emptyMessage="Nenhum veículo encontrado"
              className="w-56"
            />
          </div>
          {selectedVehicleId && <ExportButton vehicleId={selectedVehicleId} />}
        </div>
      </div>

      {!selectedVehicleId && (
        <EmptyState
          title="Nenhum veículo cadastrado"
          description="Cadastre um veículo para ver as análises da frota."
          action={{
            label: "Cadastrar veículo",
            onClick: () => router.push("/vehicles/new"),
          }}
        />
      )}

      {(isTcoLoading ||
        isFuelLoading ||
        isCategorySeriesLoading ||
        isAnomaliesLoading ||
        isForecastLoading ||
        isSeasonalLoading ||
        isInsightsLoading) &&
        Boolean(selectedVehicleId) && <p>Carregando…</p>}
      {(isTcoError ||
        isFuelError ||
        isCategorySeriesError ||
        isAnomaliesError ||
        isBenchmarkError ||
        isForecastError ||
        isSeasonalError ||
        isInsightsError) && (
        <Alert
          variant="error"
          description="Não foi possível carregar os dados de analytics."
        />
      )}

      {!isTcoError && <TcoSection tco={tco} />}
      {!isFuelError && <FuelTrendSection points={fuelTrend} />}
      {!isFuelError && <FuelCorrelationSection points={fuelTrend} />}
      {!isCategorySeriesError && (
        <CategoryCorrelationSection series={categorySeries} />
      )}
      {!isAnomaliesError && <AnomaliesSection anomalies={anomalies} />}
      {!isBenchmarkError && !isBenchmarkLoading && (
        <BenchmarkSection entries={benchmark} />
      )}
      {!isForecastError && <ForecastSection points={forecast} />}
      {!isForecastError && !isCategorySeriesError && (
        <SimulationSection forecast={forecast} categorySeries={categorySeries} />
      )}
      {!isSeasonalError && <SeasonalitySection cells={seasonal} />}
      {!isInsightsError && <InsightsSection insights={insights} />}
    </Container>
  );
}
