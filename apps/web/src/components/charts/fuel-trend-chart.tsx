import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FuelTrendPoint } from "@navestory/validators";
import { ChartTooltip } from "@navestory/ui";
import { CHART_CATEGORY_COLORS } from "@/lib/chart-colors";

/**
 * @spec SPEC-20260622-001 RF-02, RF-13, R-ANA-01, R-FUEL-02, R-FUEL-03
 * @spec SPEC-20260531-001 RF-DB-05
 * Extraído de apps/web/src/app/(app)/analytics/page.tsx (T6.1) para ser reaproveitado pelo
 * VehicleSpotlight (Sprint 2 do dashboard) sem duplicar a lógica de apresentação da tendência.
 */
export function FuelTrendChart({
  points,
}: {
  points: FuelTrendPoint[];
}): ReactNode {
  // Mesma defesa de TcoBreakdownChart: `points` ausente/malformado (ex: resposta antiga presa
  // no cache do Service Worker) não pode derrubar a tela.
  if (!points) {
    return (
      <p className="text-sm text-muted-foreground">
        Não foi possível carregar a tendência de consumo.
      </p>
    );
  }

  const chartData = [...points].reverse().map((point) => ({
    date: point.date,
    km_per_liter: point.km_per_liter,
    rolling_avg_kpl: point.rolling_avg_kpl,
  }));

  return (
    <div className="flex flex-col gap-3">
      <div aria-hidden="true" className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(var(--chart-grid))"
            />
            <XAxis dataKey="date" />
            <YAxis />
            {/* @spec SPEC-20260813-001 RF-23 — ChartTooltip do design system em vez do tooltip
                padrão do Recharts (perdia contraste no dark mode). */}
            <Tooltip
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload}
                  label={label}
                  formatter={(value) => `${value.toFixed(1)} km/L`}
                />
              )}
              allowEscapeViewBox={{ x: false, y: false }}
            />
            <Area
              type="monotone"
              dataKey="km_per_liter"
              name="km/L"
              stroke={CHART_CATEGORY_COLORS[0]}
              fill={CHART_CATEGORY_COLORS[0]}
              fillOpacity={0.15}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="rolling_avg_kpl"
              name="Média móvel (5)"
              stroke={CHART_CATEGORY_COLORS[1]}
              dot={false}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Ver dados em tabela
        </summary>
        <table className="mt-2 w-full text-sm">
          <caption className="sr-only">
            Consumo de combustível por abastecimento
          </caption>
          <thead>
            <tr className="text-left text-muted-foreground">
              <th scope="col">Data</th>
              <th scope="col">km/L</th>
              <th scope="col">Média móvel (5)</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row) => (
              <tr key={row.date}>
                <td>{row.date}</td>
                <td>{row.km_per_liter ?? "—"}</td>
                <td>{row.rolling_avg_kpl ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
