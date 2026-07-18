import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import AnalyticsPage from "./page";

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

const VEHICLE = { id: "v1", plate: "ABC1234", make: "Fiat", model: "Uno", nickname: null };

const TCO = {
  total: 1000,
  breakdown: { fuel: 400, maintenance: 300, fines: 100, recurring: 100, other: 100 },
  cost_per_km: 0.5,
  cost_per_month: 200,
  total_km: 2000,
  period_days: 150,
};

function mockApi(overrides: Record<string, unknown> = {}) {
  vi.mocked(apiClient).mockImplementation((path: string) => {
    if (path === "/vehicles") return Promise.resolve(overrides.vehicles ?? [VEHICLE]) as never;
    if (path === "/analytics/tco/v1") return Promise.resolve(overrides.tco ?? TCO) as never;
    if (path === "/analytics/fuel-trend/v1?limit=20")
      return Promise.resolve(overrides.fuelTrend ?? []) as never;
    if (path === "/analytics/anomalies?vehicle_id=v1")
      return Promise.resolve(overrides.anomalies ?? []) as never;
    if (path === "/analytics/benchmark")
      return Promise.resolve(overrides.benchmark ?? []) as never;
    if (path === "/analytics/forecast?vehicle_id=v1")
      return Promise.resolve(overrides.forecast ?? []) as never;
    if (path === "/analytics/seasonal?vehicle_id=v1")
      return Promise.resolve(overrides.seasonal ?? []) as never;
    if (path === "/analytics/insights?vehicle_id=v1")
      return Promise.resolve(overrides.insights ?? []) as never;
    return Promise.reject(new Error(`unexpected path: ${path}`));
  });
}

describe("AnalyticsPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    useDashboardStore.getState().clearAllSelection();
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <AnalyticsPage />
      </QueryProvider>,
    );
  }

  it("carrega TCO e tendência de combustível do veículo selecionado (RF-01, RF-02, RF-13)", async () => {
    mockApi({
      fuelTrend: [
        {
          expense_id: "e1",
          date: "2026-07-01",
          liters: 40,
          amount: 240,
          odometer_km: 1000,
          km_per_liter: 12.5,
          price_per_liter: 6,
          rolling_avg_kpl: null,
        },
      ],
    });
    renderPage();

    expect(await screen.findByText("R$ 1.000,00")).toBeInTheDocument();
    expect(screen.getByText("Combustível — Tendência de km/L")).toBeInTheDocument();
  });

  it("exibe empty state de TCO quando o veículo não tem despesas (RF-15)", async () => {
    mockApi({ tco: { ...TCO, total: 0 } });
    renderPage();

    expect(
      await screen.findByText("Registre despesas para ver o custo total de propriedade."),
    ).toBeInTheDocument();
  });

  it("exibe empty state de combustível quando não há abastecimentos (RF-15)", async () => {
    mockApi();
    renderPage();

    expect(
      await screen.findByText(
        "Registre abastecimentos com tanque cheio para ver a tendência de consumo.",
      ),
    ).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há veículos cadastrados", async () => {
    mockApi({ vehicles: [] });
    renderPage();

    expect(await screen.findByText("Nenhum veículo cadastrado ainda.")).toBeInTheDocument();
  });

  it("mostra erro quando o carregamento falha", async () => {
    vi.mocked(apiClient).mockImplementation((path: string) => {
      if (path === "/vehicles") return Promise.resolve([VEHICLE]) as never;
      return Promise.reject(new Error("fail"));
    });
    renderPage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("usa o veículo ativo do contexto global como seleção inicial (RF-13)", async () => {
    useDashboardStore.getState().setActiveVehicle("v1");
    mockApi();
    renderPage();

    expect(await screen.findByDisplayValue("Fiat Uno")).toBeInTheDocument();
  });

  it("exibe as top 5 anomalias do veículo selecionado (RF-03, RF-09)", async () => {
    mockApi({
      anomalies: [
        {
          expense_id: "e1",
          vehicle_id: "v1",
          category: "fuel",
          amount: 900,
          date: "2026-07-01",
          z_score: 3.2,
          avg_amount: 300,
          stddev_amount: 150,
        },
      ],
    });
    renderPage();

    expect(await screen.findByText("Anomalias — Despesas fora do padrão")).toBeInTheDocument();
    expect(screen.getByText(/Combustível — R\$ 900,00 em 2026-07-01/)).toBeInTheDocument();
  });

  it("exibe empty state de anomalias quando não há dados suficientes (RF-15, R-ANA-02)", async () => {
    mockApi();
    renderPage();

    expect(
      await screen.findByText("Mais registros são necessários para detectar anomalias."),
    ).toBeInTheDocument();
  });

  it("exibe o ranking de benchmarking com 2+ veículos (RF-04, RF-13)", async () => {
    mockApi({
      benchmark: [
        {
          vehicle_id: "v1",
          plate: "ABC1234",
          vehicle_name: "Fiat Uno",
          total_expenses: 1000,
          total_km: 2000,
          cost_per_km: 0.5,
          avg_km_per_liter: 12,
          maintenance_count: 1,
          fines_count: 0,
          health_score: 90,
          efficiency_rank: 1,
        },
        {
          vehicle_id: "v2",
          plate: "XYZ9876",
          vehicle_name: "Onix",
          total_expenses: 2000,
          total_km: 2000,
          cost_per_km: 1,
          avg_km_per_liter: 10,
          maintenance_count: 0,
          fines_count: 1,
          health_score: 80,
          efficiency_rank: 2,
        },
      ],
    });
    renderPage();

    expect(await screen.findByText("Benchmarking — Custo/km por veículo")).toBeInTheDocument();
  });

  it("exibe empty state de benchmarking com menos de 2 veículos (RF-15)", async () => {
    mockApi();
    renderPage();

    expect(
      await screen.findByText("Adicione pelo menos 2 veículos para comparar eficiência."),
    ).toBeInTheDocument();
  });

  it("exibe o gráfico de projeção quando há meses projetados (RF-05, RF-13)", async () => {
    mockApi({
      forecast: [
        { month: "2026-06-01", projected_amount: 1000, projected_low: 1000, projected_high: 1000, is_forecast: false },
        { month: "2026-07-01", projected_amount: 1200, projected_low: 1000, projected_high: 1400, is_forecast: true },
      ],
    });
    renderPage();

    expect(await screen.findByText("Projeção — Custos futuros")).toBeInTheDocument();
  });

  it("exibe empty state de projeção com menos de 6 meses de histórico (RF-15, R-ANA-03)", async () => {
    mockApi();
    renderPage();

    expect(
      await screen.findByText("Projeções requerem pelo menos 6 meses de dados."),
    ).toBeInTheDocument();
  });

  it("exibe o heatmap de sazonalidade quando há dados suficientes (RF-06, RF-13)", async () => {
    mockApi({
      seasonal: [{ month_number: 7, category: "fuel", avg_amount: 300, occurrence_count: 4 }],
    });
    renderPage();

    expect(await screen.findByText("Sazonalidade — Gastos por mês e categoria")).toBeInTheDocument();
  });

  it("exibe empty state de sazonalidade com menos de 6 meses de dados (RF-15, R-ANA-07)", async () => {
    mockApi();
    renderPage();

    expect(
      await screen.findByText("Análise sazonal requer pelo menos 6 meses de registros."),
    ).toBeInTheDocument();
  });

  it("exibe os insights recomendados quando há triggers acionados (RF-14, RF-13)", async () => {
    mockApi({
      insights: [{ type: "efficiency", vehicle_id: "v1", message: "O veículo ABC1234 tem custo/km 80% acima da média. Considere revisão." }],
    });
    renderPage();

    expect(await screen.findByText("Insights — Recomendações")).toBeInTheDocument();
    expect(
      screen.getByText("O veículo ABC1234 tem custo/km 80% acima da média. Considere revisão."),
    ).toBeInTheDocument();
  });

  it("exibe empty state de insights quando nenhum trigger é acionado (RF-15)", async () => {
    mockApi();
    renderPage();

    expect(
      await screen.findByText("Continue registrando para receber recomendações personalizadas."),
    ).toBeInTheDocument();
  });

  it("exibe o botão de exportar CSV apontando para o endpoint de export (RF-16)", async () => {
    mockApi();
    renderPage();

    const exportLink = await screen.findByRole("link", { name: "Exportar" });
    expect(exportLink).toHaveAttribute("href", "/api/backend/analytics/export?vehicle_id=v1");
  });
});
