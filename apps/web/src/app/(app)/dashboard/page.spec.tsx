import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import DashboardPage from "./page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
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

const okKpis = {
  total_this_month: { ok: true, value: 100 },
  urgent_maintenance_count: { ok: true, value: 0 },
  cost_per_km: { ok: true, value: null },
  next_maintenance: { ok: true, value: null },
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
    if (path.startsWith("/dashboard/fleet-kpis")) return Promise.resolve(okKpis) as never;
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
    expect(screen.getByRole("link", { name: /Cadastrar veículo/ })).toHaveAttribute(
      "href",
      "/vehicles/new",
    );
    expect(screen.queryByText("Gastos do mês")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Exportar CSV" })).not.toBeInTheDocument();
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

  it("preserva o seletor de mês/veículo e o link de export CSV dentro da nova estrutura (seção 12.3)", async () => {
    mockDashboardData([vehicleCard({ id: "v1", plate: "ABC1234" })]);
    renderPage();

    const link = await screen.findByRole("link", { name: "Exportar CSV" });
    const period = new Date().toISOString().slice(0, 7);
    expect(link).toHaveAttribute("href", `/api/backend/dashboard/export?period=${period}`);
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
