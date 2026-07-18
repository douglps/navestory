"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  AnalyticsInsight,
  ExpenseAnomaly,
  FleetBenchmarkEntry,
  FuelTrendPoint,
  MonthlyForecastPoint,
  SeasonalHeatmapCell,
  VehicleTco,
} from "@nave/validators";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiClient } from "@/lib/http/api-client";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { TcoBreakdownChart } from "@/components/charts/tco-breakdown-chart";
import { FuelTrendChart } from "@/components/charts/fuel-trend-chart";

interface Vehicle {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  nickname: string | null;
}

function vehicleLabel(vehicle: Vehicle | undefined): string {
  if (!vehicle) return "—";
  return vehicle.nickname ?? (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate);
}

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * @spec SPEC-20260622-001 RF-01, RF-13, R-ANA-04
 */
function TcoSection({ tco }: { tco: VehicleTco | undefined }): ReactNode {
  if (!tco) return null;

  if (tco.total === 0) {
    return (
      <section aria-label="Custo total de propriedade" className="rounded border p-4">
        <h2 className="font-semibold">TCO — Custo Total de Propriedade</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Registre despesas para ver o custo total de propriedade.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Custo total de propriedade" className="flex flex-col gap-3 rounded border p-4">
      <h2 className="font-semibold">TCO — Custo Total de Propriedade</h2>

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
            {tco.cost_per_month == null ? "—" : currency(tco.cost_per_month)}
          </p>
        </div>
      </div>

      <TcoBreakdownChart breakdown={tco.breakdown} />
    </section>
  );
}

/**
 * @spec SPEC-20260622-001 RF-02, RF-13, R-ANA-01, R-FUEL-02, R-FUEL-03
 */
function FuelTrendSection({ points }: { points: FuelTrendPoint[] | undefined }): ReactNode {
  if (!points) return null;

  if (points.length === 0) {
    return (
      <section aria-label="Tendência de consumo de combustível" className="rounded border p-4">
        <h2 className="font-semibold">Combustível</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Registre abastecimentos com tanque cheio para ver a tendência de consumo.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Tendência de consumo de combustível"
      className="flex flex-col gap-3 rounded border p-4"
    >
      <h2 className="font-semibold">Combustível — Tendência de km/L</h2>
      <FuelTrendChart points={points} />
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
 * @spec SPEC-20260622-001 RF-03, RF-09, RF-13, R-ANA-02
 */
function AnomaliesSection({ anomalies }: { anomalies: ExpenseAnomaly[] | undefined }): ReactNode {
  if (!anomalies) return null;

  if (anomalies.length === 0) {
    return (
      <section aria-label="Despesas anômalas" className="rounded border p-4">
        <h2 className="font-semibold">Anomalias</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Mais registros são necessários para detectar anomalias.
        </p>
      </section>
    );
  }

  const top5 = anomalies.slice(0, 5);

  return (
    <section aria-label="Despesas anômalas" className="flex flex-col gap-3 rounded border p-4">
      <h2 className="font-semibold">Anomalias — Despesas fora do padrão</h2>
      <ul className="flex flex-col gap-2">
        {top5.map((anomaly) => (
          <li
            key={anomaly.expense_id}
            role="alert"
            className="rounded border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950"
          >
            <p className="font-medium">
              {categoryLabel(anomaly.category)} — {currency(anomaly.amount)} em {anomaly.date}
            </p>
            <p className="text-muted-foreground">
              {anomaly.z_score.toFixed(1)}σ acima da média ({currency(anomaly.avg_amount)})
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * @spec SPEC-20260622-001 RF-04, RF-10, RF-13, R-ANA-05
 */
function BenchmarkSection({ entries }: { entries: FleetBenchmarkEntry[] | undefined }): ReactNode {
  if (!entries) return null;

  if (entries.length < 2) {
    return (
      <section aria-label="Comparativo de eficiência da frota" className="rounded border p-4">
        <h2 className="font-semibold">Benchmarking</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Adicione pelo menos 2 veículos para comparar eficiência.
        </p>
        <Link href="/vehicles/new" className="mt-2 inline-block text-sm text-blue-600 underline">
          Adicionar Veículo →
        </Link>
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
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={100} />
            <Tooltip formatter={(value) => currency(Number(value))} />
            <Bar dataKey="cost_per_km" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground">Ver dados em tabela</summary>
        <table className="mt-2 w-full text-sm">
          <caption className="sr-only">Ranking de eficiência entre veículos</caption>
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
                <td>{entry.cost_per_km == null ? "—" : currency(entry.cost_per_km)}</td>
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

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/**
 * @spec SPEC-20260622-001 RF-05, RF-11, RF-13, RF-15, R-ANA-03
 * Empty state quando nenhum ponto tem is_forecast=true — indica que a RPC não teve os 6 meses
 * de histórico exigidos por R-ANA-03 e retornou apenas dados reais.
 */
function ForecastSection({ points }: { points: MonthlyForecastPoint[] | undefined }): ReactNode {
  if (!points) return null;

  const hasForecast = points.some((point) => point.is_forecast);
  if (!hasForecast) {
    return (
      <section aria-label="Projeção de custos" className="rounded border p-4">
        <h2 className="font-semibold">Projeção</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Projeções requerem pelo menos 6 meses de dados.
        </p>
      </section>
    );
  }

  const chartData = points.map((point) => ({
    month: point.month,
    band: [point.projected_low, point.projected_high] as [number, number],
    amount: point.projected_amount,
  }));

  return (
    <section aria-label="Projeção de custos" className="flex flex-col gap-3 rounded border p-4">
      <h2 className="font-semibold">Projeção — Custos futuros</h2>

      <div aria-hidden="true" className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => currency(Number(value))} />
            <Area
              type="monotone"
              dataKey="band"
              name="Banda de confiança"
              stroke="none"
              fill="#93c5fd"
              fillOpacity={0.4}
            />
            <Line type="monotone" dataKey="amount" name="Projeção" stroke="#2563eb" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground">Ver dados em tabela</summary>
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

/**
 * @spec SPEC-20260622-001 RF-06, RF-12, RF-13, RF-15, R-ANA-07
 */
function SeasonalitySection({ cells }: { cells: SeasonalHeatmapCell[] | undefined }): ReactNode {
  if (!cells) return null;

  if (cells.length === 0) {
    return (
      <section aria-label="Sazonalidade de gastos" className="rounded border p-4">
        <h2 className="font-semibold">Sazonalidade</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Análise sazonal requer pelo menos 6 meses de registros.
        </p>
      </section>
    );
  }

  const categories = [...new Set(cells.map((cell) => cell.category))].sort();
  const maxAmount = Math.max(...cells.map((cell) => cell.avg_amount));
  const cellByKey = new Map(cells.map((cell) => [`${cell.month_number}-${cell.category}`, cell]));

  return (
    <section
      aria-label="Sazonalidade de gastos"
      className="flex flex-col gap-3 rounded border p-4"
    >
      <h2 className="font-semibold">Sazonalidade — Gastos por mês e categoria</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Média de gastos por mês do calendário e categoria</caption>
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
                    const intensity = cell && maxAmount > 0 ? cell.avg_amount / maxAmount : 0;
                    return (
                      <td
                        key={category}
                        aria-label={
                          cell
                            ? `${label}, ${categoryLabel(category)}: ${currency(cell.avg_amount)}`
                            : `${label}, ${categoryLabel(category)}: sem dados`
                        }
                        style={{ backgroundColor: `rgba(37, 99, 235, ${intensity * 0.6})` }}
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
function InsightsSection({ insights }: { insights: AnalyticsInsight[] | undefined }): ReactNode {
  if (!insights) return null;

  if (insights.length === 0) {
    return (
      <section aria-label="Insights" className="rounded border p-4">
        <h2 className="font-semibold">Insights</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Continue registrando para receber recomendações personalizadas.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Insights" className="flex flex-col gap-3 rounded border p-4">
      <h2 className="font-semibold">Insights — Recomendações</h2>
      <ul className="flex flex-col gap-2">
        {insights.map((insight, index) => (
          <li key={`${insight.type}-${index}`} className="rounded border bg-muted/30 p-3 text-sm">
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
      className="text-sm text-blue-600 underline"
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
  const storeActiveVehicleId = useDashboardStore((state) => state.activeVehicleId);
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
    queryFn: () => apiClient<FuelTrendPoint[]>(`/analytics/fuel-trend/${selectedVehicleId}?limit=20`),
    enabled: Boolean(selectedVehicleId),
    retry: false,
  });

  const {
    data: anomalies,
    isLoading: isAnomaliesLoading,
    isError: isAnomaliesError,
  } = useQuery({
    queryKey: ["analytics", "anomalies", selectedVehicleId],
    queryFn: () =>
      apiClient<ExpenseAnomaly[]>(`/analytics/anomalies?vehicle_id=${selectedVehicleId}`),
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
      apiClient<MonthlyForecastPoint[]>(`/analytics/forecast?vehicle_id=${selectedVehicleId}`),
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
      apiClient<SeasonalHeatmapCell[]>(`/analytics/seasonal?vehicle_id=${selectedVehicleId}`),
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
      apiClient<AnalyticsInsight[]>(`/analytics/insights?vehicle_id=${selectedVehicleId}`),
    enabled: Boolean(selectedVehicleId),
    retry: false,
  });

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Analytics</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            Veículo
            <select
              value={selectedVehicleId}
              onChange={(event) => setSelectedVehicleId(event.target.value)}
              className="rounded border px-2 py-1"
            >
              {(vehicles ?? []).map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicleLabel(vehicle)}
                </option>
              ))}
            </select>
          </label>
          {selectedVehicleId && <ExportButton vehicleId={selectedVehicleId} />}
        </div>
      </div>

      {!selectedVehicleId && <p>Nenhum veículo cadastrado ainda.</p>}

      {(isTcoLoading ||
        isFuelLoading ||
        isAnomaliesLoading ||
        isForecastLoading ||
        isSeasonalLoading ||
        isInsightsLoading) &&
        Boolean(selectedVehicleId) && <p>Carregando...</p>}
      {(isTcoError ||
        isFuelError ||
        isAnomaliesError ||
        isBenchmarkError ||
        isForecastError ||
        isSeasonalError ||
        isInsightsError) && <p role="alert">Não foi possível carregar os dados de analytics.</p>}

      {!isTcoError && <TcoSection tco={tco} />}
      {!isFuelError && <FuelTrendSection points={fuelTrend} />}
      {!isAnomaliesError && <AnomaliesSection anomalies={anomalies} />}
      {!isBenchmarkError && !isBenchmarkLoading && <BenchmarkSection entries={benchmark} />}
      {!isForecastError && <ForecastSection points={forecast} />}
      {!isSeasonalError && <SeasonalitySection cells={seasonal} />}
      {!isInsightsError && <InsightsSection insights={insights} />}
    </main>
  );
}
