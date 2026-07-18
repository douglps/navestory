import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import { VehicleSpotlight, type SpotlightVehicle } from "./VehicleSpotlight";

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

const vehicle: SpotlightVehicle = {
  id: "v1",
  plate: "ABC1234",
  make: "Honda",
  model: "Civic",
  nickname: null,
  documents: { ipva: "overdue", insurance: "ok", crlv: "ok" },
};

function mockApi(overrides: Record<string, unknown> = {}) {
  vi.mocked(apiClient).mockImplementation((path: string) => {
    if (path.startsWith("/analytics/tco/")) return Promise.resolve(overrides.tco ?? { total: 0 }) as never;
    if (path.startsWith("/analytics/fuel-trend/"))
      return Promise.resolve(overrides.fuelTrend ?? []) as never;
    if (path.startsWith("/recurring-costs")) return Promise.resolve(overrides.recurringCosts ?? []) as never;
    if (path.startsWith("/dashboard/vehicle-history"))
      return Promise.resolve(overrides.history ?? []) as never;
    return Promise.reject(new Error(`unmocked path: ${path}`));
  });
}

function renderSpotlight(props: Partial<Parameters<typeof VehicleSpotlight>[0]> = {}) {
  return render(
    <QueryProvider>
      <VehicleSpotlight vehicle={vehicle} onClear={vi.fn()} {...props} />
    </QueryProvider>,
  );
}

describe("VehicleSpotlight", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as never;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("RF-DB-08: exibe empty state quando não há veículo em foco", () => {
    mockApi();
    render(
      <QueryProvider>
        <VehicleSpotlight vehicle={undefined} onClear={vi.fn()} />
      </QueryProvider>,
    );

    expect(
      screen.getByText("Selecione um veículo acima para ver a análise detalhada"),
    ).toBeInTheDocument();
  });

  it("RF-DB-01: exibe o chip sticky com a nomenclatura canônica Em Foco", async () => {
    mockApi();
    renderSpotlight();

    expect(screen.getByText("Em Foco: Honda Civic")).toBeInTheDocument();
  });

  it("RF-DB-02: em mobile, exibe tabs e só a seção ativa", async () => {
    mockApi();
    renderSpotlight();

    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("RF-DB-06: badge Pago sobrepõe Vencido quando há recurring cost pago no ano corrente", async () => {
    mockApi({ recurringCosts: [{ cost_type: "ipva", paid_at: "2026-01-10" }] });
    renderSpotlight();

    fireEvent.click(screen.getByRole("tab", { name: "Docs" }));

    await waitFor(() => expect(screen.getByText("Pago")).toBeInTheDocument());
  });

  it("RF-DB-06: mantém Vencido quando não há reconciliação de pagamento", async () => {
    mockApi({ recurringCosts: [] });
    renderSpotlight();

    fireEvent.click(screen.getByRole("tab", { name: "Docs" }));

    await waitFor(() => expect(screen.getByText("Vencido")).toBeInTheDocument());
  });

  it("RF-DB-04: exibe estado de dados insuficientes quando o TCO está zerado", async () => {
    mockApi({ tco: { total: 0, breakdown: { fuel: 0, maintenance: 0, fines: 0, recurring: 0, other: 0 } } });
    renderSpotlight();

    await waitFor(() =>
      expect(
        screen.getByText("Registre despesas deste veículo para ver o gráfico por categoria."),
      ).toBeInTheDocument(),
    );
  });

  it("RF-DB-07: exibe histórico combinado com links para despesas e manutenções", async () => {
    mockApi({
      history: [{ id: "e1", type: "expense", date: "2026-07-01", description: "Combustível", amount: 200 }],
    });
    renderSpotlight();

    fireEvent.click(screen.getByRole("tab", { name: "Histórico" }));

    await waitFor(() => expect(screen.getByText("Combustível")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "ver todas as despesas" })).toHaveAttribute(
      "href",
      "/expenses?vehicleId=v1",
    );
    expect(screen.getByRole("link", { name: "ver todas as manutenções" })).toHaveAttribute(
      "href",
      "/maintenance?vehicleId=v1",
    );
  });
});
