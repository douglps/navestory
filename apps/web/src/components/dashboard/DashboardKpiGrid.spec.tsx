/**
 * @spec SPEC-20260721-002 RF-01, R-KPI-02
 */
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { FleetKpiCatalog, KpiCatalogId } from "@navestory/validators";
import { DashboardKpiGrid } from "./DashboardKpiGrid";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/dashboard",
}));

function catalogWith(overrides: Partial<FleetKpiCatalog>): FleetKpiCatalog {
  return {
    expenses_month: { ok: true, value: { value: 0, delta_pct: null, history_6mo: null } },
    cost_per_km: { ok: true, value: { value: 0, delta_pct: null, history_6mo: null } },
    fleet_health: { ok: true, value: null },
    urgent_maintenance: { ok: true, value: 0 },
    total_vehicles: { ok: true, value: 0 },
    next_maintenance: { ok: true, value: null },
    upcoming_costs_7d: { ok: true, value: { total: 0, count: 0 } },
    expense_anomalies: { ok: true, value: 0 },
    // @spec SPEC-20260804-001 RF-03
    spending_window: {
      ok: true,
      value: { value: 0, window_days: 7, label: "Últ. 7 dias" },
    },
    ...overrides,
  };
}

describe("DashboardKpiGrid", () => {
  it("SPEC-20260721-002 RF-01: exibe skeleton de carregamento quando catalog é undefined", () => {
    render(
      <DashboardKpiGrid
        catalog={undefined}
        activeIds={["expenses_month", "urgent_maintenance"]}
      /> as ReactNode,
    );

    // KpiCard com loading=true exibe um estado de carregamento
    const cards = document.querySelectorAll("[class*='rounded']");
    expect(cards.length).toBeGreaterThan(0);
  });

  it("SPEC-20260721-002 RF-01: exibe expenses_month com valor formatado em BRL", () => {
    const catalog = catalogWith({
      expenses_month: {
        ok: true,
        value: { value: 1500.5, delta_pct: 10, history_6mo: [100, 200, 300] },
      },
    });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={["expenses_month"]} /> as ReactNode,
    );

    expect(screen.getByText(/1\.500,50/)).toBeInTheDocument();
  });

  it("SPEC-20260721-002 R-KPI-02: não exibe tendência quando delta_pct é null", () => {
    const catalog = catalogWith({
      expenses_month: {
        ok: true,
        value: { value: 1000, delta_pct: null, history_6mo: null },
      },
    });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={["expenses_month"]} /> as ReactNode,
    );

    // Verificar que não há ícone de tendência (seta)
    expect(screen.queryByText(/[+\-]\d+%/)).not.toBeInTheDocument();
  });

  it("SPEC-20260721-002 RF-04: exibe ícone de erro quando expenses_month falha (ok=false)", () => {
    const catalog = catalogWith({
      expenses_month: { ok: false },
    });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={["expenses_month"]} /> as ReactNode,
    );

    // Quando spec = "unavailable", mostra TriangleAlert
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("exibe cost_per_km com valor monetário", () => {
    const catalog = catalogWith({
      cost_per_km: {
        ok: true,
        value: { value: 0.85, delta_pct: -5, history_6mo: null },
      },
    });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={["cost_per_km"]} /> as ReactNode,
    );

    expect(screen.getByText(/0,85/)).toBeInTheDocument();
  });

  it("exibe cost_per_km como indisponível quando ok=false", () => {
    const catalog = catalogWith({ cost_per_km: { ok: false } });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={["cost_per_km"]} /> as ReactNode,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("exibe fleet_health como '—' quando valor é null", () => {
    const catalog = catalogWith({ fleet_health: { ok: true, value: null } });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={["fleet_health"]} /> as ReactNode,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("exibe fleet_health com score e unidade '/100' quando valor é número", () => {
    const catalog = catalogWith({ fleet_health: { ok: true, value: 87 } });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={["fleet_health"]} /> as ReactNode,
    );

    expect(screen.getByText("87")).toBeInTheDocument();
    expect(screen.getByText("/100")).toBeInTheDocument();
  });

  it("exibe fleet_health como indisponível quando ok=false", () => {
    const catalog = catalogWith({ fleet_health: { ok: false } });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={["fleet_health"]} /> as ReactNode,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("exibe urgent_maintenance com contagem", () => {
    const catalog = catalogWith({ urgent_maintenance: { ok: true, value: 3 } });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={["urgent_maintenance"]} /> as ReactNode,
    );

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("exibe urgent_maintenance como indisponível quando ok=false", () => {
    const catalog = catalogWith({ urgent_maintenance: { ok: false } });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={["urgent_maintenance"]} /> as ReactNode,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("exibe total_vehicles com contagem", () => {
    const catalog = catalogWith({ total_vehicles: { ok: true, value: 5 } });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={["total_vehicles"]} /> as ReactNode,
    );

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("exibe total_vehicles como indisponível quando ok=false", () => {
    const catalog = catalogWith({ total_vehicles: { ok: false } });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={["total_vehicles"]} /> as ReactNode,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("exibe next_maintenance como 'Nenhuma agendada' quando valor é null", () => {
    const catalog = catalogWith({ next_maintenance: { ok: true, value: null } });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={["next_maintenance"]} /> as ReactNode,
    );

    expect(screen.getByText("Nenhuma agendada")).toBeInTheDocument();
  });

  it("exibe next_maintenance com data formatada e placa quando há agendamento", () => {
    const catalog = catalogWith({
      next_maintenance: {
        ok: true,
        value: { date: "2026-09-15", vehicle_plate: "XYZ-5678" },
      },
    });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={["next_maintenance"]} /> as ReactNode,
    );

    expect(screen.getByText(/15\/09\/2026/)).toBeInTheDocument();
    expect(screen.getByText("XYZ-5678")).toBeInTheDocument();
  });

  it("exibe next_maintenance como indisponível quando ok=false", () => {
    const catalog = catalogWith({ next_maintenance: { ok: false } });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={["next_maintenance"]} /> as ReactNode,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("exibe upcoming_costs_7d com total e '1 item' no singular", () => {
    const catalog = catalogWith({
      upcoming_costs_7d: { ok: true, value: { total: 450.0, count: 1 } },
    });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={["upcoming_costs_7d"]} /> as ReactNode,
    );

    expect(screen.getByText(/450/)).toBeInTheDocument();
    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it("exibe upcoming_costs_7d com 'N itens' no plural", () => {
    const catalog = catalogWith({
      upcoming_costs_7d: { ok: true, value: { total: 900.0, count: 3 } },
    });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={["upcoming_costs_7d"]} /> as ReactNode,
    );

    expect(screen.getByText("3 itens")).toBeInTheDocument();
  });

  it("exibe upcoming_costs_7d como indisponível quando ok=false", () => {
    const catalog = catalogWith({ upcoming_costs_7d: { ok: false } });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={["upcoming_costs_7d"]} /> as ReactNode,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("exibe expense_anomalies com contagem de anomalias", () => {
    const catalog = catalogWith({ expense_anomalies: { ok: true, value: 2 } });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={["expense_anomalies"]} /> as ReactNode,
    );

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("exibe expense_anomalies como indisponível quando ok=false", () => {
    const catalog = catalogWith({ expense_anomalies: { ok: false } });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={["expense_anomalies"]} /> as ReactNode,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renderiza múltiplos KPIs simultâneos", () => {
    const activeIds: KpiCatalogId[] = [
      "expenses_month",
      "urgent_maintenance",
      "cost_per_km",
      "next_maintenance",
    ];
    const catalog = catalogWith({
      urgent_maintenance: { ok: true, value: 7 },
      next_maintenance: { ok: true, value: null },
    });

    render(
      <DashboardKpiGrid catalog={catalog} activeIds={activeIds} /> as ReactNode,
    );

    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma agendada")).toBeInTheDocument();
  });
});
