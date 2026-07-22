import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { FinancialSubheader } from "./financial-subheader";

interface FetchStub {
  data?: unknown;
}

function stubFetch(byPath: Record<string, FetchStub>): void {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      const match = Object.keys(byPath).find((path) => url.includes(path));
      // eslint-disable-next-line security/detect-object-injection -- match vem de Object.keys(byPath), nunca de input externo
      const body = match ? byPath[match] : { data: [] };
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(body),
      });
    }),
  );
}

function renderSubheader(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <FinancialSubheader />
    </QueryClientProvider> as ReactNode,
  );
}

describe("FinancialSubheader", () => {
  beforeEach(() => {
    sessionStorage.clear();
    useDashboardStore.getState().clearAllSelection();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // @spec SPEC-20260722-004 US-01, RF-04
  it("RF-04: renderiza até 3 chips de categoria com valor formatado e navegação para /expenses", async () => {
    stubFetch({
      "/dashboard/spending-highlights": {
        data: [
          { category: "fuel", label: "Combustível", total_amount: 1500, count: 3 },
          { category: "toll", label: "Pedágio", total_amount: 42, count: 1 },
        ],
      },
      "/dashboard/fines-status": { data: { status: "none", count: 0 } },
    });

    renderSubheader();

    expect(await screen.findByText("Combustível")).toBeInTheDocument();
    expect(screen.getByText("R$ 1,5k")).toBeInTheDocument();
    expect(screen.getByText("Pedágio")).toBeInTheDocument();
    expect(screen.getByText("R$ 42")).toBeInTheDocument();

    const link = screen.getByText("Combustível").closest("a");
    expect(link).toHaveAttribute("href", "/expenses?category=fuel");
  });

  // @spec SPEC-20260722-004 US-01
  it("não renderiza chip nenhum quando não há despesas no mês (área vazia, sem erro)", async () => {
    stubFetch({
      "/dashboard/spending-highlights": { data: [] },
      "/dashboard/fines-status": { data: { status: "none", count: 0 } },
    });

    renderSubheader();

    await waitFor(() => expect(screen.getByText("Despesas")).toBeInTheDocument());
    expect(screen.queryByText("Combustível")).not.toBeInTheDocument();
  });

  // @spec SPEC-20260722-004 US-02
  it("RF-05: exibe atalhos estáticos para /expenses e /maintenance", async () => {
    stubFetch({
      "/dashboard/spending-highlights": { data: [] },
      "/dashboard/fines-status": { data: { status: "none", count: 0 } },
    });

    renderSubheader();

    expect(screen.getByText("Despesas").closest("a")).toHaveAttribute("href", "/expenses");
    expect(screen.getByText("Manutenções").closest("a")).toHaveAttribute("href", "/maintenance");
  });

  // @spec SPEC-20260722-004 US-03, R-SUB-04
  it("RF-06: aplica estilo de perigo e badge quando há multa vencida", async () => {
    stubFetch({
      "/dashboard/spending-highlights": { data: [] },
      "/dashboard/fines-status": { data: { status: "overdue", count: 2 } },
    });

    renderSubheader();

    await waitFor(() => expect(screen.getByText("Multas").closest("a")).toHaveClass("text-danger"));
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  // @spec SPEC-20260722-004 US-03
  it("RF-06: estilo neutro e sem badge quando não há multas ativas", async () => {
    stubFetch({
      "/dashboard/spending-highlights": { data: [] },
      "/dashboard/fines-status": { data: { status: "none", count: 0 } },
    });

    renderSubheader();

    const finesLink = await screen.findByText("Multas");
    expect(finesLink.closest("a")).toHaveClass("text-muted-foreground");
  });

  // @spec SPEC-20260722-004 US-01
  it("RF-01: propaga vehicleId do contexto single para o link do chip (R-SUB-02)", async () => {
    useDashboardStore.getState().setActiveVehicle("veh-1");
    stubFetch({
      "/dashboard/spending-highlights": {
        data: [{ category: "fuel", label: "Combustível", total_amount: 100, count: 1 }],
      },
      "/dashboard/fines-status": { data: { status: "none", count: 0 } },
    });

    renderSubheader();

    const link = await screen.findByText("Combustível");
    expect(link.closest("a")).toHaveAttribute("href", "/expenses?category=fuel&vehicleId=veh-1");
  });
});
