import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

/** Abre o Combobox pelo aria-label e seleciona a opção com o texto informado. */
async function selectCombobox(label: string, optionText: string): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText(label));
  await user.click(await screen.findByRole("option", { name: optionText }));
}

/** Aguarda a lista de veículos carregar (Combobox sai do estado "Carregando..."). */
async function waitForVehiclesLoaded(): Promise<void> {
  await waitFor(() => expect(screen.getByLabelText("Veículo *")).not.toHaveTextContent("Carregando"));
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

    await waitForVehiclesLoaded();
    await selectCombobox("Veículo *", "Fiat Uno");
    fireEvent.change(screen.getByLabelText("O que será feito? *"), {
      target: { value: "Troca de óleo" },
    });
    fireEvent.change(screen.getByLabelText("Data e hora agendada *"), {
      target: { value: "2026-08-01T10:00" },
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
          scheduled_date: "2026-08-01T10:00:00.000Z",
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

    await waitForVehiclesLoaded();
    await selectCombobox("Veículo *", "Fiat Uno");
    fireEvent.change(screen.getByLabelText("Data e hora agendada *"), {
      target: { value: "2026-08-01T10:00" },
    });
    const form = screen.getByRole("button", { name: "Agendar" }).closest("form")!;
    fireEvent.submit(form);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  /**
   * @spec SPEC-20260602-001 RF-07, RF-08
   */
  it("herda o veículo do contexto em foco (modo single) com indicador de preenchimento automático", async () => {
    useDashboardStore.getState().setActiveVehicle(VEHICLE_ID);
    mockLookups();
    renderPage();

    await waitForVehiclesLoaded();
    await screen.findByText(/Preenchido automaticamente pelo veículo em destaque/);
    expect(screen.getByLabelText("Veículo *")).toHaveTextContent("Fiat Uno");
  });

  /**
   * @spec SPEC-20260602-001 RF-13
   */
  it("remove o indicador de preenchimento automático ao selecionar o veículo manualmente", async () => {
    mockLookups();
    renderPage();

    await waitForVehiclesLoaded();
    await selectCombobox("Veículo *", "Fiat Uno");

    expect(
      screen.queryByText(/Preenchido automaticamente pelo veículo em destaque/),
    ).not.toBeInTheDocument();
  });

  it("SPEC-20260619-001 R-FORM-05: cancela sem confirmação quando o formulário está limpo", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    mockLookups();
    renderPage();

    await waitForVehiclesLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/maintenance");
  });

  it("SPEC-20260619-001 R-FORM-05, SPEC-20260807-005 RF-05: pede confirmação via AlertDialog ao cancelar com o formulário sujo", async () => {
    mockLookups();
    renderPage();

    await waitForVehiclesLoaded();
    // Torna o formulário sujo preenchendo a descrição
    fireEvent.change(screen.getByLabelText("O que será feito? *"), { target: { value: "Troca de pneu" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByRole("alertdialog")).toHaveAccessibleName(
      "Descartar alterações?",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("exibe erro da API quando o POST falha (onError)", async () => {
    const { ApiError: RealApiError } = await import("@/lib/http/api-client");
    vi.mocked(apiClient).mockImplementation((path: string) => {
      if (path === "/vehicles") return Promise.resolve(vehicles) as never;
      return Promise.reject(new RealApiError("Veículo não encontrado", 404)) as never;
    });
    renderPage();

    await waitForVehiclesLoaded();
    await selectCombobox("Veículo *", "Fiat Uno");
    fireEvent.change(screen.getByLabelText("O que será feito? *"), { target: { value: "Revisão" } });
    fireEvent.change(screen.getByLabelText("Data e hora agendada *"), {
      target: { value: "2026-08-01T10:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Agendar" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Veículo não encontrado"),
    );
  });
});
