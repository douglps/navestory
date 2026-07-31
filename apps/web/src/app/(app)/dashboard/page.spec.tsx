import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import DashboardPage from "./page";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: pushMock }),
}));

// jsdom não implementa scrollIntoView (RF-DA-05 depende dele).
Element.prototype.scrollIntoView = vi.fn();

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

const okKpiCatalog = {
  expenses_month: { ok: true, value: { value: 100, delta_pct: null, history_6mo: null } },
  cost_per_km: { ok: true, value: { value: 0, delta_pct: null, history_6mo: null } },
  fleet_health: { ok: true, value: null },
  urgent_maintenance: { ok: true, value: 0 },
  total_vehicles: { ok: true, value: 1 },
  next_maintenance: { ok: true, value: null },
  upcoming_costs_7d: { ok: true, value: { total: 0, count: 0 } },
  expense_anomalies: { ok: true, value: 0 },
};

const defaultPreferences = {
  dashboard_kpi_ids: ["expenses_month", "urgent_maintenance", "cost_per_km", "next_maintenance"],
};

function vehicleCard(overrides: Record<string, unknown>) {
  return {
    make: "Honda",
    model: "Civic",
    nickname: null,
    odometer: 1000,
    last_fuel_date: null,
    last_fuel_amount: null,
    last_fuel_odometer_missing: false,
    documents: { ipva: "ok", insurance: "ok", crlv: "ok" },
    ...overrides,
  };
}

function mockDashboardData(vehicles: unknown[]) {
  vi.mocked(apiClient).mockImplementation((path: string) => {
    if (path === "/dashboard/vehicle-cards") return Promise.resolve(vehicles) as never;
    if (path === "/dashboard/fleet-health") return Promise.resolve([]) as never;
    if (path === "/dashboard/alerts") return Promise.resolve([]) as never;
    if (path.startsWith("/dashboard/kpi-catalog")) return Promise.resolve(okKpiCatalog) as never;
    if (path === "/preferences") return Promise.resolve(defaultPreferences) as never;
    if (path.startsWith("/analytics/tco/")) return Promise.resolve({ total: 0 }) as never;
    if (path.startsWith("/analytics/fuel-trend/")) return Promise.resolve([]) as never;
    if (path.startsWith("/recurring-costs")) return Promise.resolve([]) as never;
    if (path.startsWith("/dashboard/vehicle-history")) return Promise.resolve([]) as never;
    return Promise.reject(new Error(`unmocked path: ${path}`));
  });
}

function renderPage() {
  return render(
    <QueryProvider>
      <DashboardPage />
    </QueryProvider>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    localStorage.clear();
    useDashboardStore.getState().clearAllSelection();
    useDashboardStore.getState().markHydrated();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("RF-DA-09: exibe empty state de boas-vindas quando não há veículos, sem KPIs nem controles de export", async () => {
    mockDashboardData([]);
    renderPage();

    await waitFor(() => expect(screen.getByText(/Bem-vindo à Nave/)).toBeInTheDocument());
    screen.getByRole("button", { name: "Cadastrar veículo" }).click();
    expect(pushMock).toHaveBeenCalledWith("/vehicles/new");
    expect(screen.queryByText("Gastos do mês")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Exportar CSV" })).not.toBeInTheDocument();
  });

  it("RF-DA-08: auto-seleciona o único veículo da frota quando nada está em foco", async () => {
    mockDashboardData([vehicleCard({ id: "v1", plate: "ABC1234" })]);
    renderPage();

    await waitFor(() => expect(useDashboardStore.getState().activeVehicleId).toBe("v1"));
    expect(useDashboardStore.getState().selectionMode).toBe("single");
  });

  it("não auto-seleciona quando a frota tem mais de 1 veículo", async () => {
    mockDashboardData([
      vehicleCard({ id: "v1", plate: "ABC1234" }),
      vehicleCard({ id: "v2", plate: "DEF5678" }),
    ]);
    renderPage();

    await waitFor(() => expect(screen.getByText("ABC1234")).toBeInTheDocument());
    expect(useDashboardStore.getState().selectionMode).toBe("none");
  });

  it("preserva o seletor de mês/veículo e o botão de export CSV, reposicionado após a Zona B (RF-05)", async () => {
    mockDashboardData([vehicleCard({ id: "v1", plate: "ABC1234" })]);
    renderPage();

    expect(await screen.findByRole("button", { name: "Exportar CSV" })).toBeInTheDocument();
  });

  it("RF-05: exibe estado de loading e depois erro quando a exportação falha", async () => {
    mockDashboardData([vehicleCard({ id: "v1", plate: "ABC1234" })]);
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 500 } as Response);
    renderPage();

    const button = await screen.findByRole("button", { name: "Exportar CSV" });
    button.click();

    expect(await screen.findByRole("alert")).toHaveTextContent(/Não foi possível exportar/);
    expect(await screen.findByRole("button", { name: "Exportar CSV" })).toBeInTheDocument();

    fetchMock.mockRestore();
  });

  it("RF-DA-03: renderiza os 4 KPIs da Zona A", async () => {
    mockDashboardData([vehicleCard({ id: "v1", plate: "ABC1234" })]);
    renderPage();

    await waitFor(() => expect(screen.getByText("Gastos do mês")).toBeInTheDocument());
    expect(screen.getByText("Manutenções urgentes")).toBeInTheDocument();
    expect(screen.getByText("Custo/km")).toBeInTheDocument();
    expect(screen.getByText("Próxima manutenção")).toBeInTheDocument();
  });

  it("RF-DB-08: exibe o empty state da Zona B quando nenhum veículo está em foco", async () => {
    mockDashboardData([
      vehicleCard({ id: "v1", plate: "ABC1234" }),
      vehicleCard({ id: "v2", plate: "DEF5678" }),
    ]);
    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Selecione um veículo acima para ver a análise detalhada")).toBeInTheDocument(),
    );
  });

  it("RF-DA-05: clicar num card ativa o veículo e exibe o chip Em Foco da Zona B", async () => {
    mockDashboardData([
      vehicleCard({ id: "v1", plate: "ABC1234" }),
      vehicleCard({ id: "v2", plate: "DEF5678", make: "Toyota", model: "Corolla" }),
    ]);
    renderPage();

    const card = await screen.findByRole("button", { name: /Ver análise de Honda Civic/ });
    card.click();

    await waitFor(() => expect(screen.getByText(/Em Foco: Honda Civic/)).toBeInTheDocument());
    expect(useDashboardStore.getState().activeVehicleId).toBe("v1");
  });
});
