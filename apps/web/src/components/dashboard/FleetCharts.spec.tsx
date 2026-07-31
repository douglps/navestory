import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FleetChartsResponse } from "@nave/validators";
import { QueryProvider } from "@/lib/query/providers";
import { FleetChartsSection } from "./FleetCharts";

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

function mockApi(response: FleetChartsResponse) {
  vi.mocked(apiClient).mockImplementation((path: string) => {
    if (path === "/dashboard/fleet-charts") return Promise.resolve(response) as never;
    return Promise.reject(new Error(`unmocked path: ${path}`));
  });
}

function renderSection() {
  return render(
    <QueryProvider>
      <FleetChartsSection />
    </QueryProvider>,
  );
}

describe("FleetChartsSection (SPEC-20260721-002 RF-08, US-08)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("busca /dashboard/fleet-charts e renderiza os 3 gráficos", async () => {
    mockApi({
      cost_per_km: [{ month: "2026-07", value: 0.5 }],
      fuel_liters: [{ month: "2026-07", value: 40 }],
      category_breakdown: [{ category: "fuel", label: "Combustível", total_amount: 300, count: 4 }],
    });
    renderSection();

    await waitFor(() => {
      expect(screen.getByText("Custo por km")).toBeInTheDocument();
      expect(screen.getByText("Combustível abastecido")).toBeInTheDocument();
      expect(screen.getByText("Gastos por categoria")).toBeInTheDocument();
    });
  });

  it("exibe empty state por gráfico quando as séries estão zeradas/vazias (RNF-05)", async () => {
    mockApi({ cost_per_km: [{ month: "2026-07", value: 0 }], fuel_liters: [], category_breakdown: [] });
    renderSection();

    expect(await screen.findByText("Sem dados de custo/km no período.")).toBeInTheDocument();
    expect(screen.getByText("Sem abastecimentos registrados no período.")).toBeInTheDocument();
    expect(screen.getByText("Sem despesas registradas neste mês.")).toBeInTheDocument();
  });
});
