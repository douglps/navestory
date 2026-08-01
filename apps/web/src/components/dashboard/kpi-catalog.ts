import { KPI_CATALOG_IDS, type KpiCatalogId } from "@navestory/validators";
import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  Car,
  Fuel,
  HeartPulse,
  Timer,
  TriangleAlert,
  Wallet,
  Wrench,
} from "lucide-react";

export { KPI_CATALOG_IDS };

/**
 * @spec SPEC-20260721-002 RF-01, R-KPI-01
 * Metadados de apresentação (rótulo, ícone, rota de navegação) do catálogo fixo de KPIs —
 * a lista de ids em si vive em `@navestory/validators` (fonte única, compartilhada com o backend).
 */
export interface KpiCatalogMeta {
  title: string;
  /** @spec SPEC-20260731-007 RF-01 — componente Lucide, nunca emoji */
  icon: LucideIcon;
  href: string;
  /** @spec SPEC-20260721-002 RF-01 — quando a queda do valor é a melhora (ex: custo), não o aumento */
  reverseTrend?: boolean;
}

/** @spec SPEC-20260731-007 RF-02 */
export const KPI_CATALOG_META: Record<KpiCatalogId, KpiCatalogMeta> = {
  expenses_month: { title: "Gastos do mês", icon: Wallet, href: "/expenses" },
  cost_per_km: {
    title: "Custo/km",
    icon: Fuel,
    href: "/expenses",
    reverseTrend: true,
  },
  fleet_health: {
    title: "Saúde da frota",
    icon: HeartPulse,
    href: "/vehicles",
  },
  urgent_maintenance: {
    title: "Manutenções urgentes",
    icon: Wrench,
    href: "/maintenance",
    reverseTrend: true,
  },
  total_vehicles: { title: "Total de veículos", icon: Car, href: "/vehicles" },
  next_maintenance: {
    title: "Próxima manutenção",
    icon: CalendarClock,
    href: "/maintenance",
  },
  upcoming_costs_7d: {
    title: "Próximos 7 dias",
    icon: Timer,
    href: "/maintenance",
    reverseTrend: true,
  },
  expense_anomalies: {
    title: "Anomalias de gasto",
    icon: TriangleAlert,
    href: "/analytics",
    reverseTrend: true,
  },
};
