import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import ExpensesPage from "./page";

const pushMock = vi.fn();
let searchParamsValue = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/expenses",
  useSearchParams: () => new URLSearchParams(searchParamsValue),
}));

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

const kpis = {
  total_this_month: 100,
  total_prev_month: 50,
  delta_percent: 100,
  total_all_time: 500,
  upcoming_30_days_total: 30,
  upcoming_30_days_count: 1,
};

function mockApi(overrides: Record<string, unknown> = {}) {
  vi.mocked(apiClient).mockImplementation((path: string) => {
    if (path === "/expenses") return Promise.resolve(overrides.expenses ?? []) as never;
    if (path === "/expenses?limit=100")
      return Promise.resolve(overrides.byVehicle ?? overrides.expenses ?? []) as never;
    if (path === "/vehicles") return Promise.resolve(overrides.vehicles ?? []) as never;
    if (path === "/expenses/kpis") return Promise.resolve(overrides.kpis ?? kpis) as never;
    if (path === "/expenses/upcoming") return Promise.resolve(overrides.upcoming ?? []) as never;
    return Promise.reject(new Error(`unexpected path: ${path}`));
  });
}

describe("ExpensesPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    searchParamsValue = "";
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <ExpensesPage />
      </QueryProvider>,
    );
  }

  it("lista as despesas com veículo resolvido (RF-11)", async () => {
    mockApi({
      expenses: [
        {
          id: "e1",
          vehicle_id: "v1",
          category: "fuel",
          amount: 150,
          occurred_at: "2026-07-14",
          description: null,
        },
      ],
      vehicles: [{ id: "v1", plate: "ABC1234", make: "Fiat", model: "Uno", nickname: null }],
    });
    renderPage();

    expect(await screen.findByText(/fuel/)).toBeInTheDocument();
    expect(await screen.findByText(/Fiat Uno/)).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há despesas", async () => {
    mockApi();
    renderPage();

    expect(await screen.findByText("Nenhuma despesa registrada ainda.")).toBeInTheDocument();
  });

  it("mostra erro quando a listagem falha", async () => {
    vi.mocked(apiClient).mockImplementation((path: string) => {
      if (path === "/expenses") return Promise.reject(new Error("falhou")) as never;
      if (path === "/expenses/kpis") return Promise.resolve(kpis) as never;
      if (path === "/expenses/upcoming") return Promise.resolve([]) as never;
      return Promise.resolve([]) as never;
    });
    renderPage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("exibe os KPI cards com delta positivo (SPEC-20260608-002 RF-04, RF-05)", async () => {
    mockApi();
    renderPage();

    expect(await screen.findByText("R$ 100,00")).toBeInTheDocument();
    expect(await screen.findByText("↑")).toBeInTheDocument();
    expect(await screen.findByText("100%")).toBeInTheDocument();
  });

  it("mostra 'nenhum gasto previsto' quando upcoming_30_days_count = 0 (RF-06)", async () => {
    mockApi({ kpis: { ...kpis, upcoming_30_days_count: 0, upcoming_30_days_total: 0 } });
    renderPage();

    expect(await screen.findByText("nenhum gasto previsto")).toBeInTheDocument();
  });

  it("troca para a tab Próximas e lista os itens com badge de urgência (SPEC-20260608-001 RF-04)", async () => {
    mockApi({
      upcoming: [
        {
          source_type: "fine",
          source_id: "f1",
          title: "Excesso de velocidade",
          amount: 195.23,
          due_date: "2026-07-01",
          vehicle_id: "v1",
          vehicle_plate: "ABC1234",
          is_estimated: false,
        },
      ],
    });
    renderPage();

    await userEvent.click(screen.getByText("Próximas"));

    expect(await screen.findByText(/Multa — Excesso de velocidade/)).toBeInTheDocument();
  });

  it("mostra estado vazio na tab Próximas quando não há itens previstos", async () => {
    mockApi();
    renderPage();

    await userEvent.click(screen.getByText("Próximas"));

    expect(
      await screen.findByText("Nenhuma despesa prevista no horizonte selecionado."),
    ).toBeInTheDocument();
  });

  it("troca para a tab Por veículo e agrupa despesas com subtotal (SPEC-20260609-002 RF-02, RF-03)", async () => {
    mockApi({
      vehicles: [{ id: "v1", plate: "ABC1234", make: "Fiat", model: "Uno", nickname: null }],
      byVehicle: [
        {
          id: "e1",
          vehicle_id: "v1",
          category: "fuel",
          amount: 100,
          occurred_at: "2026-07-01",
          description: null,
        },
        {
          id: "e2",
          vehicle_id: "v1",
          category: "toll",
          amount: 50,
          occurred_at: "2026-07-02",
          description: null,
        },
      ],
    });
    renderPage();

    await userEvent.click(screen.getByText("Por veículo"));

    expect(await screen.findByText("Fiat Uno")).toBeInTheDocument();
    const totals = await screen.findAllByText("R$ 150,00");
    expect(totals).toHaveLength(2);
  });

  it("mostra estado vazio na tab Por veículo quando não há despesas", async () => {
    mockApi();
    renderPage();

    await userEvent.click(screen.getByText("Por veículo"));

    expect(await screen.findByText("Nenhuma despesa no período.")).toBeInTheDocument();
  });

  it("exibe o botão de exportação CSV consolidada (SPEC-20260609-003 RF-03)", async () => {
    mockApi();
    renderPage();

    const link = await screen.findByText("Exportar CSV Completo");
    expect(link.closest("a")).toHaveAttribute("href", "/api/backend/expenses/export");
  });
});
