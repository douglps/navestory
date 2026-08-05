"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { FleetKpiCatalog, KpiCatalogId } from "@navestory/validators";
import { TriangleAlert } from "lucide-react";
import { KpiCard, type KpiCardProps } from "@navestory/ui";
import { KPI_CATALOG_META } from "./kpi-catalog";

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("pt-BR");
}

type CardSpec = Pick<KpiCardProps, "value" | "unit" | "trend" | "sparkline">;

/** @spec SPEC-20260721-002 RF-01, R-KPI-02 — `delta_pct` nulo nunca vira seta de tendência */
function specForId(
  id: KpiCatalogId,
  catalog: FleetKpiCatalog,
): CardSpec | "unavailable" {
  switch (id) {
    case "expenses_month": {
      const result = catalog.expenses_month;
      if (!result.ok) return "unavailable";
      return {
        value: currency(result.value.value),
        trend:
          result.value.delta_pct === null
            ? undefined
            : { value: result.value.delta_pct },
        sparkline: result.value.history_6mo ?? undefined,
      };
    }
    case "cost_per_km": {
      const result = catalog.cost_per_km;
      if (!result.ok) return "unavailable";
      return {
        value: currency(result.value.value),
        trend:
          result.value.delta_pct === null
            ? undefined
            : { value: result.value.delta_pct },
        sparkline: result.value.history_6mo ?? undefined,
      };
    }
    case "fleet_health": {
      const result = catalog.fleet_health;
      if (!result.ok) return "unavailable";
      return result.value === null
        ? { value: "—" }
        : { value: result.value, unit: "/100" };
    }
    case "urgent_maintenance": {
      const result = catalog.urgent_maintenance;
      if (!result.ok) return "unavailable";
      return { value: result.value };
    }
    case "total_vehicles": {
      const result = catalog.total_vehicles;
      if (!result.ok) return "unavailable";
      return { value: result.value };
    }
    case "next_maintenance": {
      const result = catalog.next_maintenance;
      if (!result.ok) return "unavailable";
      return result.value === null
        ? { value: "Nenhuma agendada" }
        : {
            value: formatDate(result.value.date),
            unit: result.value.vehicle_plate,
          };
    }
    case "upcoming_costs_7d": {
      const result = catalog.upcoming_costs_7d;
      if (!result.ok) return "unavailable";
      return {
        value: currency(result.value.total),
        unit: `${result.value.count} ${result.value.count === 1 ? "item" : "itens"}`,
      };
    }
    case "expense_anomalies": {
      const result = catalog.expense_anomalies;
      if (!result.ok) return "unavailable";
      return { value: result.value };
    }
    case "spending_window": {
      // @spec SPEC-20260804-001 RF-04 — sem trend/sparkline por design (janela desloca a base
      // de comparação a cada dia; delta seria ruído, não tendência).
      const result = catalog.spending_window;
      if (!result.ok) return "unavailable";
      return { value: currency(result.value.value), unit: result.value.label };
    }
  }
}

/**
 * @spec SPEC-20260721-002 RF-01
 * Renderiza os KPIs ativos do usuário (`activeIds`, de `user_preferences.dashboard_kpi_ids`) a
 * partir do catálogo completo já carregado (`GET /dashboard/kpi-catalog`) — cada card navega ao
 * clicar (rota do metadado) e nunca exibe seta de tendência quando `delta_pct` é `null` (R-KPI-02).
 */
export function DashboardKpiGrid({
  catalog,
  activeIds,
}: {
  catalog: FleetKpiCatalog | undefined;
  activeIds: KpiCatalogId[];
}): ReactNode {
  if (!catalog) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {activeIds.map((id) => {
          // eslint-disable-next-line security/detect-object-injection -- id é KpiCatalogId, união fixa de 9 literais
          const meta = KPI_CATALOG_META[id];
          return <KpiCard key={id} title={meta.title} value="" loading />;
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {activeIds.map((id) => {
        // eslint-disable-next-line security/detect-object-injection -- id é KpiCatalogId, união fixa de 9 literais
        const meta = KPI_CATALOG_META[id];
        const spec = specForId(id, catalog);

        if (spec === "unavailable") {
          return (
            <div
              key={id}
              className="min-w-[150px] max-w-[220px] rounded-lg border border-border bg-card p-3"
            >
              <p className="text-sm text-muted-foreground">{meta.title}</p>
              <div
                className="mt-1 flex items-center gap-1 text-lg font-semibold text-muted-foreground"
                title="Não foi possível carregar. Tente novamente."
              >
                {/* @spec SPEC-20260731-007 RF-04 */}
                <TriangleAlert size={16} aria-hidden />
                <span>—</span>
              </div>
            </div>
          );
        }

        return (
          <Link
            key={id}
            href={meta.href}
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <KpiCard
              title={meta.title}
              icon={<meta.icon size={16} aria-hidden />}
              reverseTrend={meta.reverseTrend}
              {...spec}
            />
          </Link>
        );
      })}
    </div>
  );
}
