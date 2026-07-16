import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import NewExpensePage from "./page";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(),
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
const categories = { default: [{ value: "fuel", label: "Combustível" }], custom: [] };

const TEMPLATE_ID = "22222222-2222-4222-8222-222222222222";
const templates = [
  {
    id: TEMPLATE_ID,
    name: "Abastecimento Semanal",
    vehicle_id: VEHICLE_ID,
    category: "fuel",
    amount: 120,
    description: "Posto Ipiranga",
  },
];

/** Digita dígito por dígito num CurrencyInput/OdometerInput (estilo caixa eletrônico). */
function typeDigits(input: HTMLElement, digits: string): void {
  for (const digit of digits) {
    fireEvent.keyDown(input, { key: digit });
  }
}

function mockLookups(options?: { templates?: typeof templates }) {
  vi.mocked(apiClient).mockImplementation((path: string) => {
    if (path === "/vehicles") return Promise.resolve(vehicles) as never;
    if (path === "/categories") return Promise.resolve(categories) as never;
    if (path === "/expense-templates") {
      return Promise.resolve({ data: options?.templates ?? [] }) as never;
    }
    if (path === "/expenses/suppliers") return Promise.resolve({ data: [] }) as never;
    return Promise.resolve({ id: "e1" }) as never;
  });
}

describe("NewExpensePage", () => {
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
        <NewExpensePage />
      </QueryProvider>,
    );
  }

  async function fillValidForm() {
    await screen.findByText("Fiat Uno");
    fireEvent.change(screen.getByLabelText("Veículo *"), { target: { value: VEHICLE_ID } });
    fireEvent.change(screen.getByLabelText("Categoria *"), { target: { value: "fuel" } });
    typeDigits(screen.getByLabelText("Valor (R$) *"), "15000");
    fireEvent.change(screen.getByLabelText("Data *"), { target: { value: "2026-07-14" } });
    typeDigits(screen.getByLabelText("Odômetro (km) *"), "50000");
  }

  it("mostra erro de validação client-side com valor inválido (CA-02)", async () => {
    mockLookups();
    renderPage();

    await fillValidForm();
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(screen.getByLabelText("Valor (R$) *"), { key: "Backspace" });
    }
    typeDigits(screen.getByLabelText("Valor (R$) *"), "0");
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("registra a despesa e redireciona para /expenses (RF-01, CA-01)", async () => {
    mockLookups();
    renderPage();

    await fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/expenses"));
    expect(apiClient).toHaveBeenCalledWith(
      "/expenses?strict=true",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({ vehicle_id: VEHICLE_ID, category: "fuel", amount: 150 }),
      }),
    );
  });

  it("exibe estado vazio quando não há modelos (CA-02 da tray)", async () => {
    mockLookups();
    renderPage();

    expect(await screen.findByText("Nenhum modelo ainda. Toque em + para criar.")).toBeInTheDocument();
  });

  it("aplica modelo preenchendo os campos e dispara touch (RF-03, RF-04, RF-08)", async () => {
    mockLookups({ templates });
    renderPage();

    const card = await screen.findByRole("button", {
      name: "Aplicar modelo Abastecimento Semanal",
    });
    fireEvent.click(card);

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(`/expense-templates/${TEMPLATE_ID}/touch`, {
        method: "PATCH",
      }),
    );
    expect(screen.getByLabelText("Veículo *")).toHaveValue(VEHICLE_ID);
    expect(screen.getByLabelText("Categoria *")).toHaveValue("fuel");
    expect(screen.getByLabelText("Valor (R$) *")).toHaveValue("120,00");
  });

  /**
   * @spec SPEC-20260612-002 RF-02
   */
  it("altera o ano mantendo mês e dia (RF-02)", async () => {
    mockLookups();
    renderPage();
    await screen.findByText("Fiat Uno");

    fireEvent.change(screen.getByLabelText("Data *"), { target: { value: "2026-06-12" } });
    fireEvent.change(screen.getByLabelText("Ano"), { target: { value: "2023" } });

    expect(screen.getByLabelText("Data *")).toHaveValue("2023-06-12");
  });

  /**
   * @spec SPEC-20260612-002 RF-03
   */
  it("Tanque cheio? é tri-state, começa sem seleção e alterna sim/não/nenhum", async () => {
    mockLookups();
    renderPage();
    await screen.findByText("Fiat Uno");
    fireEvent.change(screen.getByLabelText("Categoria *"), { target: { value: "fuel" } });

    const simButton = screen.getByRole("button", { name: "Sim" });
    expect(simButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(simButton);
    expect(simButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(simButton);
    expect(simButton).toHaveAttribute("aria-pressed", "false");
  });

  /**
   * @spec SPEC-20260612-001 RF-05.2
   */
  it("calcula amount a partir de litros e valor por litro (RF-05)", async () => {
    mockLookups();
    renderPage();
    await screen.findByText("Fiat Uno");
    fireEvent.change(screen.getByLabelText("Categoria *"), { target: { value: "fuel" } });

    typeDigits(screen.getByLabelText("Valor por litro"), "500");
    typeDigits(screen.getByLabelText("Litros"), "1000");

    expect(screen.getByLabelText("Valor (R$) *")).toHaveValue("50,00");
  });

  /**
   * @spec SPEC-20260612-001 RF-05.3
   */
  it("exibe a linha-resumo quando amount/liters/price_per_liter estão consistentes", async () => {
    mockLookups();
    renderPage();
    await screen.findByText("Fiat Uno");
    fireEvent.change(screen.getByLabelText("Categoria *"), { target: { value: "fuel" } });

    typeDigits(screen.getByLabelText("Valor por litro"), "500");
    typeDigits(screen.getByLabelText("Litros"), "1000");

    expect(screen.getByText("10 L × R$ 5/L = R$ 50")).toBeInTheDocument();
  });

  it("cria um novo modelo a partir dos campos preenchidos no formulário", async () => {
    mockLookups();
    renderPage();

    await fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Criar novo modelo" }));
    fireEvent.change(screen.getByLabelText("Nome do modelo"), {
      target: { value: "Modelo Teste" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar modelo" }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/expense-templates",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({ name: "Modelo Teste", vehicle_id: VEHICLE_ID }),
        }),
      ),
    );
  });

  /**
   * @spec SPEC-20260619-001 R-FORM-07
   */
  it("exibe empty state com CTA quando não há veículos cadastrados", async () => {
    vi.mocked(apiClient).mockImplementation((path: string) => {
      if (path === "/vehicles") return Promise.resolve([]) as never;
      if (path === "/categories") return Promise.resolve(categories) as never;
      return Promise.resolve({ data: [] }) as never;
    });
    renderPage();

    expect(await screen.findByText("Nenhum veículo cadastrado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cadastrar veículo →" })).toHaveAttribute(
      "href",
      "/vehicles/new",
    );
    expect(screen.queryByLabelText("Veículo *")).not.toBeInTheDocument();
  });

  /**
   * @spec SPEC-20260619-001 R-FORM-05
   */
  it("pede confirmação ao cancelar com o formulário sujo", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    mockLookups();
    renderPage();

    await fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(confirmSpy).toHaveBeenCalledWith("Descartar alterações?");
    expect(pushMock).not.toHaveBeenCalled();
  });

  /**
   * @spec SPEC-20260619-001 R-FORM-05
   */
  it("cancela sem confirmação quando o formulário está limpo", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    mockLookups();
    renderPage();

    await screen.findByText("Fiat Uno");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/expenses");
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
    expect(screen.queryByText(/Herdado do contexto em foco/)).not.toBeInTheDocument();
  });

  /**
   * @spec SPEC-20260602-001 RF-12
   */
  it("modo none: exibe os veículos recentes como atalhos", async () => {
    localStorage.setItem("nave-recent-vehicle-ids", JSON.stringify([VEHICLE_ID]));
    mockLookups();
    renderPage();

    expect(await screen.findByRole("button", { name: "Fiat Uno" })).toBeInTheDocument();
  });

  /**
   * @spec SPEC-20260602-001 RF-14, R-CTX-06
   */
  it("mudança de contexto com o formulário aberto não reseta o campo, mas avisa", async () => {
    mockLookups();
    renderPage();
    await screen.findByText("Fiat Uno");

    fireEvent.change(screen.getByLabelText("Veículo *"), { target: { value: VEHICLE_ID } });
    expect(screen.getByLabelText("Veículo *")).toHaveValue(VEHICLE_ID);

    useDashboardStore.getState().setActiveVehicle("99999999-9999-4999-8999-999999999999");

    expect(await screen.findByText("O contexto ativo mudou.")).toBeInTheDocument();
    expect(screen.getByLabelText("Veículo *")).toHaveValue(VEHICLE_ID);

    fireEvent.click(screen.getByRole("button", { name: "Atualizar campo" }));
    expect(screen.queryByText("O contexto ativo mudou.")).not.toBeInTheDocument();
  });
});
