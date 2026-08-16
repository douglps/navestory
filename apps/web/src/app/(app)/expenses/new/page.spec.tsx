import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
const vehicles = [
  {
    id: VEHICLE_ID,
    plate: "ABC1234",
    make: "Fiat",
    model: "Uno",
    nickname: null,
  },
];
const categories = {
  default: [{ value: "fuel", label: "Combustível" }],
  custom: [],
};

/** Digita dígito por dígito num CurrencyInput/OdometerInput (estilo caixa eletrônico). */
function typeDigits(input: HTMLElement, digits: string): void {
  for (const digit of digits) {
    fireEvent.keyDown(input, { key: digit });
  }
}

/** Abre o Combobox pelo aria-label e seleciona a opção com o texto informado. */
async function selectCombobox(
  label: string,
  optionText: string,
): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText(label));
  await user.click(await screen.findByRole("option", { name: optionText }));
}

/** Aguarda a lista de veículos carregar (Combobox sai do estado "Carregando..."). */
async function waitForVehiclesLoaded(): Promise<void> {
  await waitFor(() =>
    expect(screen.getByLabelText("Veículo *")).not.toHaveTextContent(
      "Carregando",
    ),
  );
}

function mockLookups() {
  vi.mocked(apiClient).mockImplementation((path: string) => {
    if (path === "/vehicles") return Promise.resolve(vehicles) as never;
    if (path === "/categories") return Promise.resolve(categories) as never;
    if (path.startsWith("/expenses/suppliers"))
      return Promise.resolve([]) as never;
    if (path.startsWith("/expenses/fuel-stats"))
      return Promise.resolve(null) as never;
    if (path === "/workspaces/me")
      return Promise.reject({ statusCode: 404 }) as never;
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
    await waitForVehiclesLoaded();
    await selectCombobox("Veículo *", "Fiat Uno");
    await selectCombobox("Categoria *", "Combustível");
    typeDigits(screen.getByLabelText("Valor (R$) *"), "15000");
    fireEvent.change(screen.getByLabelText("Data e hora *"), {
      target: { value: "2026-07-14T10:00" },
    });
    typeDigits(screen.getByLabelText("Odômetro (km) *"), "50000");
  }

  it("mostra erro de validação client-side com valor inválido (CA-02)", async () => {
    mockLookups();
    renderPage();

    await fillValidForm();
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(screen.getByLabelText("Valor (R$) *"), {
        key: "Backspace",
      });
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
        body: expect.objectContaining({
          vehicle_id: VEHICLE_ID,
          category: "fuel",
          amount: 150,
        }),
      }),
    );
  });

  /**
   * @spec SPEC-20260814-004 RF-01, RF-03, RF-10
   */
  it("envia o comprovante selecionado depois que a despesa é criada", async () => {
    mockLookups();
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    renderPage();

    await fillValidForm();
    const file = new File(["x"], "cupom.pdf", { type: "application/pdf" });
    await userEvent.upload(
      screen.getByLabelText(/Comprovante \(opcional\)/),
      file,
    );
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/expenses"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/expenses/e1/receipt",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    const formData = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    expect(formData.get("file")).toBe(file);

    vi.unstubAllGlobals();
  });

  /**
   * @spec SPEC-20260814-004 RF-01, RF-03 — não-bloqueante: despesa já criada permanece válida
   */
  it("falha no upload do comprovante não desfaz a despesa criada e mostra aviso com link para retry", async () => {
    mockLookups();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: "boom" }),
      }),
    );
    renderPage();

    await fillValidForm();
    await userEvent.upload(
      screen.getByLabelText(/Comprovante \(opcional\)/),
      new File(["x"], "cupom.pdf", { type: "application/pdf" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));

    expect(
      await screen.findByText(/não foi possível enviar o comprovante/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver despesa e tentar novamente" }),
    ).toHaveAttribute("href", "/expenses/e1");
    expect(pushMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  /**
   * @spec SPEC-20260720-002 RF-02 RF-03 RF-06
   */
  it("exibe aviso de duplicata e adia a navegação até 'Entendido' (RF-02, RF-03)", async () => {
    const DUPLICATE_ID = "33333333-3333-4333-8333-333333333333";
    vi.mocked(apiClient).mockImplementation((path: string) => {
      if (path === "/vehicles") return Promise.resolve(vehicles) as never;
      if (path === "/categories") return Promise.resolve(categories) as never;
      if (path.startsWith("/expenses/suppliers"))
        return Promise.resolve([]) as never;
      if (path.startsWith("/expenses/fuel-stats"))
        return Promise.resolve(null) as never;
      if (path === "/workspaces/me")
        return Promise.reject({ statusCode: 404 }) as never;
      return Promise.resolve({
        id: "e1",
        duplicate_warning: true,
        duplicate_id: DUPLICATE_ID,
      }) as never;
    });
    renderPage();

    await fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("já existe");
    expect(pushMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: "Ver despesa duplicada" }),
    ).toHaveAttribute("href", `/expenses/${DUPLICATE_ID}`);

    fireEvent.click(screen.getByRole("button", { name: "Entendido" }));
    expect(pushMock).toHaveBeenCalledWith("/expenses");
  });

  /**
   * @spec SPEC-20260612-002 RF-02
   */
  it("altera o ano mantendo mês e dia (RF-02)", async () => {
    mockLookups();
    renderPage();
    await waitForVehiclesLoaded();

    fireEvent.change(screen.getByLabelText("Data e hora *"), {
      target: { value: "2026-06-12T10:00" },
    });
    fireEvent.change(screen.getByLabelText("Ano"), {
      target: { value: "2023" },
    });

    expect(screen.getByLabelText("Data e hora *")).toHaveValue(
      "2023-06-12T10:00",
    );
  });

  /**
   * @spec SPEC-20260612-002 RF-03
   */
  it("Tanque cheio? é tri-state, começa sem seleção e alterna sim/não/nenhum", async () => {
    mockLookups();
    renderPage();
    await waitForVehiclesLoaded();
    await selectCombobox("Categoria *", "Combustível");

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
    await waitForVehiclesLoaded();
    await selectCombobox("Categoria *", "Combustível");

    typeDigits(screen.getByLabelText("Valor por litro"), "500");
    typeDigits(screen.getByLabelText("Litros"), "1000");

    expect(screen.getByLabelText("Valor (R$) *")).toHaveValue("50,00");
  });

  /**
   * @spec SPEC-20260619-001 R-FORM-07
   */
  it("exibe empty state com CTA quando não há veículos cadastrados", async () => {
    vi.mocked(apiClient).mockImplementation((path: string) => {
      if (path === "/vehicles") return Promise.resolve([]) as never;
      if (path === "/categories") return Promise.resolve(categories) as never;
      return Promise.resolve([]) as never;
    });
    renderPage();

    expect(
      await screen.findByText("Nenhum veículo cadastrado"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar veículo" }));
    expect(pushMock).toHaveBeenCalledWith("/vehicles/new");
    expect(screen.queryByLabelText("Veículo *")).not.toBeInTheDocument();
  });

  /**
   * @spec SPEC-20260619-001 R-FORM-05
   * @spec SPEC-20260807-005 RF-01
   */
  it("pede confirmação via AlertDialog ao cancelar com o formulário sujo", async () => {
    mockLookups();
    renderPage();

    await fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByRole("alertdialog")).toHaveAccessibleName(
      "Descartar alterações?",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  /**
   * @spec SPEC-20260807-005 RF-01
   */
  it("continua editando sem perder dados ao clicar em 'Continuar editando'", async () => {
    mockLookups();
    renderPage();

    await fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Continuar editando" }));

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  /**
   * @spec SPEC-20260807-005 RF-01
   */
  it("descarta e navega para /expenses ao confirmar no AlertDialog", async () => {
    mockLookups();
    renderPage();

    await fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));

    expect(pushMock).toHaveBeenCalledWith("/expenses");
  });

  /**
   * @spec SPEC-20260619-001 R-FORM-05
   */
  it("cancela sem confirmação quando o formulário está limpo", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    mockLookups();
    renderPage();

    await waitForVehiclesLoaded();
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

    await waitForVehiclesLoaded();
    await screen.findByText(/Preenchido automaticamente pelo veículo em destaque/);
    expect(screen.getByLabelText("Veículo *")).toHaveTextContent("Fiat Uno");
  });

  /**
   * @spec SPEC-20260602-001 RF-13
   */
  it("troca para indicador ✓ ao selecionar o veículo manualmente", async () => {
    mockLookups();
    renderPage();

    await waitForVehiclesLoaded();
    await selectCombobox("Veículo *", "Fiat Uno");

    expect(
      screen.queryByText(/Preenchido automaticamente pelo veículo em destaque/),
    ).not.toBeInTheDocument();
  });

  /**
   * @spec SPEC-20260602-001 RF-12
   */
  it("modo none: exibe os veículos recentes como atalhos", async () => {
    localStorage.setItem(
      "navestory-recent-vehicle-ids",
      JSON.stringify([VEHICLE_ID]),
    );
    mockLookups();
    renderPage();

    expect(
      await screen.findByRole("button", { name: "Fiat Uno" }),
    ).toBeInTheDocument();
  });

  /**
   * @spec SPEC-20260602-001 RF-14, R-CTX-06
   */
  it("mudança de contexto com o formulário aberto não reseta o campo, mas avisa", async () => {
    mockLookups();
    renderPage();
    await waitForVehiclesLoaded();

    await selectCombobox("Veículo *", "Fiat Uno");
    expect(screen.getByLabelText("Veículo *")).toHaveTextContent("Fiat Uno");

    useDashboardStore
      .getState()
      .setActiveVehicle("99999999-9999-4999-8999-999999999999");

    expect(
      await screen.findByText("O contexto ativo mudou."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Veículo *")).toHaveTextContent("Fiat Uno");

    fireEvent.click(screen.getByRole("button", { name: "Atualizar campo" }));
    expect(
      screen.queryByText("O contexto ativo mudou."),
    ).not.toBeInTheDocument();
  });
});
