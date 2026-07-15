import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import NewMaintenancePage from "./page";

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

function mockLookups() {
  vi.mocked(apiClient).mockImplementation((path: string) => {
    if (path === "/vehicles") return Promise.resolve(vehicles) as never;
    return Promise.resolve({ id: "m1" }) as never;
  });
}

describe("NewMaintenancePage", () => {
  beforeEach(() => {
    localStorage.clear();
    useDashboardStore.getState().clearAllSelection();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <NewMaintenancePage />
      </QueryProvider>,
    );
  }

  it("agenda a manutenção e redireciona para /maintenance (RF-01, RF-16)", async () => {
    mockLookups();
    renderPage();

    await screen.findByText("Fiat Uno");
    fireEvent.change(screen.getByLabelText("Veículo *"), { target: { value: VEHICLE_ID } });
    fireEvent.change(screen.getByLabelText("Descrição *"), {
      target: { value: "Troca de óleo" },
    });
    fireEvent.change(screen.getByLabelText("Data agendada *"), {
      target: { value: "2026-08-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Agendar" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/maintenance"));
    expect(apiClient).toHaveBeenCalledWith(
      "/maintenances",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          vehicle_id: VEHICLE_ID,
          description: "Troca de óleo",
          scheduled_date: "2026-08-01",
        }),
      }),
    );
  });

  it("mostra empty state quando não há veículos cadastrados (R-FORM-07)", async () => {
    vi.mocked(apiClient).mockImplementation((path: string) => {
      if (path === "/vehicles") return Promise.resolve([]) as never;
      return Promise.reject(new Error("unexpected"));
    });
    renderPage();

    expect(await screen.findByText("Nenhum veículo cadastrado")).toBeInTheDocument();
  });

  it("mostra erro de validação client-side sem descrição (CA)", async () => {
    mockLookups();
    renderPage();

    await screen.findByText("Fiat Uno");
    fireEvent.change(screen.getByLabelText("Veículo *"), { target: { value: VEHICLE_ID } });
    fireEvent.change(screen.getByLabelText("Data agendada *"), {
      target: { value: "2026-08-01" },
    });
    const form = screen.getByRole("button", { name: "Agendar" }).closest("form")!;
    fireEvent.submit(form);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  /**
   * @spec SPEC-20260602-001 RF-07, RF-08
   */
  it("herda o veículo do contexto em foco (modo single) com indicador ↩", async () => {
    useDashboardStore.getState().setActiveVehicle(VEHICLE_ID);
    mockLookups();
    renderPage();

    await screen.findByText("Fiat Uno");
    await screen.findByText(/Herdado do contexto em foco/);
    expect(screen.getByLabelText("Veículo *")).toHaveValue(VEHICLE_ID);
  });

  /**
   * @spec SPEC-20260602-001 RF-13
   */
  it("troca para indicador ✓ ao selecionar o veículo manualmente", async () => {
    mockLookups();
    renderPage();

    await screen.findByText("Fiat Uno");
    fireEvent.change(screen.getByLabelText("Veículo *"), { target: { value: VEHICLE_ID } });

    expect(await screen.findByText(/Selecionado manualmente/)).toBeInTheDocument();
  });
});
