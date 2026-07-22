import { KPI_CATALOG_IDS, type KpiCatalogId } from "@nave/validators";

export { KPI_CATALOG_IDS };

/**
 * @spec SPEC-20260721-002 RF-01, R-KPI-01
 * Metadados de apresentação (rótulo, ícone, rota de navegação) do catálogo fixo de KPIs —
 * a lista de ids em si vive em `@nave/validators` (fonte única, compartilhada com o backend).
 */
export interface KpiCatalogMeta {
  title: string;
  icon: string;
  href: string;
  /** @spec SPEC-20260721-002 RF-01 — quando a queda do valor é a melhora (ex: custo), não o aumento */
  reverseTrend?: boolean;
}

export const KPI_CATALOG_META: Record<KpiCatalogId, KpiCatalogMeta> = {
  expenses_month: { title: "Gastos do mês", icon: "💰", href: "/expenses" },
  cost_per_km: { title: "Custo/km", icon: "⛽", href: "/expenses", reverseTrend: true },
  fleet_health: { title: "Saúde da frota", icon: "❤️", href: "/vehicles" },
  urgent_maintenance: { title: "Manutenções urgentes", icon: "🔧", href: "/maintenance", reverseTrend: true },
  total_vehicles: { title: "Total de veículos", icon: "🚗", href: "/vehicles" },
  next_maintenance: { title: "Próxima manutenção", icon: "📅", href: "/maintenance" },
  upcoming_costs_7d: { title: "Próximos 7 dias", icon: "⏳", href: "/maintenance", reverseTrend: true },
  expense_anomalies: { title: "Anomalias de gasto", icon: "⚠️", href: "/analytics", reverseTrend: true },
};
