import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import FinesPage from "./page";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

const VEHICLE_ID = "11111111-1111-4111-8111-111111111111";
const vehicles = [{ id: VEHICLE_ID, plate: "ABC1234", make: "Fiat", model: "Uno", nickname: null }];

function mockApi(overrides: Record<string, unknown> = {}) {
  vi.mocked(apiClient).mockImplementation((path: string, options?: { method?: string }) => {
    if (options?.method === "PATCH") return Promise.resolve({}) as never;
    if (path === "/fines") return Promise.resolve(overrides.fines ?? []) as never;
    if (path === "/vehicles") return Promise.resolve(overrides.vehicles ?? vehicles) as never;
    if (path === "/preferences")
      return Promise.resolve(overrides.preferences ?? { timezone: "America/Sao_Paulo" }) as never;
    return Promise.reject(new Error(`unexpected path: ${path}`));
  });
}

function makeFine(overrides: Record<string, unknown> = {}) {
  return {
    id: "f1",
    user_id: "u1",
    vehicle_id: VEHICLE_ID,
    description: "Excesso de velocidade",
    amount: 195.23,
    amount_with_discount: null,
    occurred_at: "2026-07-01",
    auto_number: null,
    infraction_code: null,
    due_date: null,
    paid_at: null,
    appeal_deadline: null,
    location: null,
    odometer_km: null,
    driver_name: null,
    status: "pending",
    notes: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

describe("FinesPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <FinesPage />
      </QueryProvider>,
    );
  }

  it("lista as multas com veículo resolvido (SPEC-20260722-005 RF-01)", async () => {
    mockApi({ fines: [makeFine()] });
    renderPage();

    expect(await screen.findByText(/Excesso de velocidade/)).toBeInTheDocument();
    expect(await screen.findByText(/Fiat Uno/)).toBeInTheDocument();
  });

  it("mostra estado vazio com CTA quando não há multas (CA-03)", async () => {
    mockApi();
    renderPage();

    expect(await screen.findByText("Nenhuma multa registrada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar multa" })).toBeInTheDocument();
  });

  it("mostra erro quando a listagem falha", async () => {
    vi.mocked(apiClient).mockImplementation((path: string) => {
      if (path === "/fines") return Promise.reject(new Error("falhou")) as never;
      if (path === "/vehicles") return Promise.resolve(vehicles) as never;
      if (path === "/preferences") return Promise.resolve({ timezone: null }) as never;
      return Promise.resolve([]) as never;
    });
    renderPage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("exibe os KpiCards: total pendente, vencidas e pago no ano (CA-01)", async () => {
    mockApi({
      fines: [
        makeFine({ id: "f1", status: "pending", amount: 100, due_date: "2020-01-01" }),
        makeFine({ id: "f2", status: "paid", amount: 50, paid_at: `${new Date().getFullYear()}-01-01` }),
      ],
    });
    renderPage();

    expect((await screen.findAllByText("R$ 100,00")).length).toBeGreaterThan(0);
    expect(screen.getByText("Total pendente")).toBeInTheDocument();
    expect(screen.getByText("Multas vencidas")).toBeInTheDocument();
    expect(screen.getByText("Total pago no ano")).toBeInTheDocument();
    expect(screen.getAllByText("R$ 50,00").length).toBeGreaterThan(0);
  });

  it("tab 'Em aberto' exclui multas pagas e canceladas (CA-04)", async () => {
    mockApi({
      fines: [
        makeFine({ id: "f1", status: "pending", description: "Multa pendente" }),
        makeFine({ id: "f2", status: "paid", description: "Multa paga" }),
      ],
    });
    renderPage();

    await screen.findByText(/Multa pendente/);
    await userEvent.click(screen.getByText("Em aberto"));

    expect(screen.getByText(/Multa pendente/)).toBeInTheDocument();
    expect(screen.queryByText(/Multa paga/)).not.toBeInTheDocument();
  });

  it("ação 'Pagar' dispara PATCH com status=paid e não exibe ações para status terminal (CA-05, CA-06)", async () => {
    mockApi({ fines: [makeFine({ status: "pending" })] });
    renderPage();

    await screen.findByText(/Excesso de velocidade/);
    await userEvent.click(screen.getByRole("button", { name: "Pagar" }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/fines/f1",
        expect.objectContaining({ method: "PATCH", body: { status: "paid" } }),
      ),
    );
  });

  it("multa 'appealing' só mostra Pagar e Cancelar, não Recorrer (CA-07)", async () => {
    mockApi({ fines: [makeFine({ status: "appealing" })] });
    renderPage();

    await screen.findByText(/Excesso de velocidade/);
    expect(screen.getByRole("button", { name: "Pagar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Recorrer" })).not.toBeInTheDocument();
  });

  it("multa 'paid' não exibe nenhum botão de ação", async () => {
    mockApi({ fines: [makeFine({ status: "paid" })] });
    renderPage();

    await screen.findByText(/Excesso de velocidade/);
    expect(screen.queryByRole("button", { name: "Pagar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });
});
