"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  FleetChartsResponse,
  MonthlySeriesPoint,
} from "@navestory/validators";
import { ChartWrapper } from "@navestory/ui";
import { apiClient } from "@/lib/http/api-client";
import { CHART_CATEGORY_COLORS } from "@/lib/chart-colors";

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function monthLabel(month: string): string {
  const [year, monthNum] = month.split("-");
  return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(
    new Date(Date.UTC(Number(year), Number(monthNum) - 1, 1)),
  );
}

function toChartData(
  series: MonthlySeriesPoint[],
): Array<{ month: string; value: number }> {
  return series.map((point) => ({
    month: monthLabel(point.month),
    value: point.value,
  }));
}

/** @spec SPEC-20260721-002 RF-08, US-08 */
export function CostPerKmChart({
  series,
}: {
  series: MonthlySeriesPoint[] | undefined;
}): ReactNode {
  const isEmpty = !series || series.every((point) => point.value === 0);

  return (
    <ChartWrapper
      title="Custo por km"
      description="Últimos 6 meses, frota inteira"
      isEmpty={isEmpty}
      emptyMessage="Sem dados de custo/km no período."
    >
      <div aria-hidden="true" className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series ? toChartData(series) : []}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(var(--chart-grid))"
            />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => currency(Number(value))} />
            <Area
              type="monotone"
              dataKey="value"
              name="R$/km"
              stroke={CHART_CATEGORY_COLORS[0]}
              fill={CHART_CATEGORY_COLORS[0]}
              fillOpacity={0.15}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}

/**
 * @spec SPEC-20260721-002 RF-08, US-08
 * Volume de combustível (litros) por mês, não eficiência km/L — ver nota em `FleetChartsResponse`
 * (`@navestory/validators`) sobre por que km/L não agrega de forma significativa numa frota mista.
 */
export function FuelConsumptionChart({
  series,
}: {
  series: MonthlySeriesPoint[] | undefined;
}): ReactNode {
  const isEmpty = !series || series.every((point) => point.value === 0);

  return (
    <ChartWrapper
      title="Combustível abastecido"
      description="Litros por mês, frota inteira"
      isEmpty={isEmpty}
      emptyMessage="Sem abastecimentos registrados no período."
    >
      <div aria-hidden="true" className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series ? toChartData(series) : []}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(var(--chart-grid))"
            />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `${Number(value).toFixed(1)} L`} />
            <Bar
              dataKey="value"
              name="Litros"
              fill={CHART_CATEGORY_COLORS[1]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}

/** @spec SPEC-20260721-002 RF-08, US-08 */
export function ExpenseCategoryPie({
  breakdown,
}: {
  breakdown: FleetChartsResponse["category_breakdown"] | undefined;
}): ReactNode {
  const isEmpty = !breakdown || breakdown.length === 0;
  const data =
    breakdown?.map((item) => ({
      name: item.label,
      value: item.total_amount,
    })) ?? [];

  return (
    <ChartWrapper
      title="Gastos por categoria"
      description="Mês corrente, frota inteira"
      isEmpty={isEmpty}
      emptyMessage="Sem despesas registradas neste mês."
    >
      <div aria-hidden="true" className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={80}
              label
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={
                    CHART_CATEGORY_COLORS[index % CHART_CATEGORY_COLORS.length]
                  }
                />
              ))}
            </Pie>
            <Tooltip formatter={(value) => currency(Number(value))} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  );
}

/**
 * @spec SPEC-20260721-002 RF-08, RNF-05
 * Seção desacoplada dos demais RFs desta spec — sua ausência/erro não afeta o resto do dashboard
 * (RNF-05). Uma única query React Query cobre os 3 gráficos (mesmo endpoint, `Promise.all` no
 * backend); loading/empty é responsabilidade de cada `ChartWrapper` individualmente.
 */
export function FleetChartsSection(): ReactNode {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "fleet-charts"],
    queryFn: () => apiClient<FleetChartsResponse>("/dashboard/fleet-charts"),
    retry: false,
  });

  return (
    <section
      aria-label="Gráficos de frota"
      className="grid grid-cols-1 gap-4 lg:grid-cols-3"
    >
      {isLoading ? (
        <>
          <ChartWrapper title="Custo por km" loading>
            {null}
          </ChartWrapper>
          <ChartWrapper title="Combustível abastecido" loading>
            {null}
          </ChartWrapper>
          <ChartWrapper title="Gastos por categoria" loading>
            {null}
          </ChartWrapper>
        </>
      ) : (
        <>
          <CostPerKmChart series={data?.cost_per_km} />
          <FuelConsumptionChart series={data?.fuel_liters} />
          <ExpenseCategoryPie breakdown={data?.category_breakdown} />
        </>
      )}
    </section>
  );
}
