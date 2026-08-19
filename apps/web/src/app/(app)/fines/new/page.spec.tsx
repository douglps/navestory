import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import NewFinePage from "./page";

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

/** Digita dígito por dígito num CurrencyInput/OdometerInput (estilo caixa eletrônico). */
function typeDigits(input: HTMLElement, digits: string): void {
  for (const digit of digits) {
    fireEvent.keyDown(input, { key: digit });
  }
}

/** Abre o Combobox pelo aria-label e seleciona a opção com o texto informado. */
async function selectCombobox(label: string, optionText: string): Promise<void> {
  await userEvent.click(screen.getByLabelText(label));
  await userEvent.click(await screen.findByRole("option", { name: optionText }));
}

/** Aguarda a lista de veículos carregar (Combobox sai do estado "Carregando…"). */
async function waitForVehiclesLoaded(): Promise<void> {
  await waitFor(() => expect(screen.getByLabelText("Veículo *")).not.toHaveTextContent("Carregando"));
}

function mockLookups(overrides: Record<string, unknown> = {}) {
  vi.mocked(apiClient).mockImplementation((path: string) => {
    if (path === "/vehicles") return Promise.resolve(overrides.vehicles ?? vehicles) as never;
    return Promise.resolve({ id: "f1" }) as never;
  });
}

describe("NewFinePage", () => {
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
        <NewFinePage />
      </QueryProvider>,
    );
  }

  async function fillValidForm() {
    await waitForVehiclesLoaded();
    await selectCombobox("Veículo *", "Fiat Uno");
    fireEvent.change(screen.getByLabelText("Infração *"), {
      target: { value: "Excesso de velocidade" },
    });
    typeDigits(screen.getByLabelText("Valor (R$) *"), "19523");
    fireEvent.change(screen.getByLabelText("Data da infração *"), {
      target: { value: "2026-07-01" },
    });
  }

  it("registra a multa e redireciona para /fines (RF-06, CA-08)", async () => {
    mockLookups();
    renderPage();

    await fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Salvar multa" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/fines"));
    expect(apiClient).toHaveBeenCalledWith(
      "/fines",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          vehicle_id: VEHICLE_ID,
          description: "Excesso de velocidade",
          amount: 195.23,
          occurred_at: "2026-07-01",
        }),
      }),
    );
  });

  it("bloqueia envio quando valor com desconto é maior que o valor original (CA-09)", async () => {
    mockLookups();
    renderPage();

    await fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Dados do auto de infração (opcional)" }));
    typeDigits(screen.getByLabelText("Valor com desconto"), "99999");
    fireEvent.click(screen.getByRole("button", { name: "Salvar multa" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Valor com desconto não pode ser maior que o valor original",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("exibe empty state com CTA quando não há veículos cadastrados (R-FORM-07, CA-16)", async () => {
    mockLookups({ vehicles: [] });
    renderPage();

    expect(await screen.findByText("Nenhum veículo cadastrado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar veículo" }));
    expect(pushMock).toHaveBeenCalledWith("/vehicles/new");
  });

  it("pede confirmação via AlertDialog ao cancelar com o formulário sujo (CA-10, R-FORM-05, SPEC-20260807-005 RF-03)", async () => {
    mockLookups();
    renderPage();

    await fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByRole("alertdialog")).toHaveAccessibleName(
      "Descartar alterações?",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("cancela sem confirmação quando o formulário está limpo", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    mockLookups();
    renderPage();

    await waitForVehiclesLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/fines");
  });

  it("exibe erro da API quando o POST falha (onError)", async () => {
    const { ApiError: RealApiError } = await import("@/lib/http/api-client");
    vi.mocked(apiClient).mockImplementation((path: string) => {
      if (path === "/vehicles") return Promise.resolve(vehicles) as never;
      return Promise.reject(new RealApiError("Veículo já possui multa com este número de auto", 409)) as never;
    });
    renderPage();

    await fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Salvar multa" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Veículo já possui multa com este número de auto",
      ),
    );
  });

  it("altera os campos opcionais dos detalhes da infração (onChange handlers)", async () => {
    // Cobre: onChange de autoNumber, infractionCode, dueDate, appealDeadline,
    // location, driverName, notes + branch setShowDetails
    mockLookups();
    renderPage();

    await waitForVehiclesLoaded();
    // Abre a seção de detalhes (cobre o onClick de setShowDetails)
    fireEvent.click(screen.getByRole("button", { name: "Dados do auto de infração (opcional)" }));

    // Altera os campos opcionais
    fireEvent.change(screen.getByLabelText("Número do auto de infração"), { target: { value: "AI-999" } });
    fireEvent.change(screen.getByLabelText("Código da infração"), { target: { value: "55680" } });
    fireEvent.change(screen.getByLabelText("Vencimento"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("Prazo para recurso"), { target: { value: "2026-08-15" } });
    fireEvent.change(screen.getByLabelText("Local"), { target: { value: "Rua das Flores" } });
    fireEvent.change(screen.getByLabelText("Condutor"), { target: { value: "Maria" } });
    fireEvent.change(screen.getByLabelText("Observações"), { target: { value: "Nota extra" } });

    expect(screen.getByLabelText("Número do auto de infração")).toHaveValue("AI-999");
    expect(screen.getByLabelText("Código da infração")).toHaveValue("55680");
    expect(screen.getByLabelText("Local")).toHaveValue("Rua das Flores");
    expect(screen.getByLabelText("Condutor")).toHaveValue("Maria");
    expect(screen.getByLabelText("Observações")).toHaveValue("Nota extra");

    // Fecha a seção (cobre a inversão do estado showDetails)
    fireEvent.click(screen.getByRole("button", { name: "Ocultar dados do auto de infração" }));
    expect(screen.queryByLabelText("Número do auto de infração")).not.toBeInTheDocument();
  });
});
