import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import ExpenseDetailPage from "./page";

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

/** Digita dígito por dígito num CurrencyInput/OdometerInput (estilo caixa eletrônico). */
function typeDigits(input: HTMLElement, digits: string): void {
  for (const digit of digits) {
    fireEvent.keyDown(input, { key: digit });
  }
}

const VEHICLE_ID = "11111111-1111-4111-8111-111111111111";
const baseExpense = {
  id: "e1",
  vehicle_id: VEHICLE_ID,
  category: "fuel",
  amount: 150,
  occurred_at: "2026-07-14T00:00:00.000Z",
  description: null,
  odometer_km: 50_000,
  liters: null,
  fuel_type: null,
  full_tank: null,
  supplier: null,
  is_readonly: false,
};

interface MockOverrides {
  expense?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
  patchResponse?: Record<string, unknown>;
  patchError?: Error;
  /** @spec SPEC-20260814-004 RF-07 */
  receiptUrls?: Record<string, unknown>;
}

function mockApi(overrides: MockOverrides = {}) {
  vi.mocked(apiClient).mockImplementation(
    (path: string, options?: { method?: string }) => {
      const method = options?.method ?? "GET";
      if (path === "/expenses/e1" && method === "GET") {
        return Promise.resolve(overrides.expense ?? baseExpense) as never;
      }
      if (path === "/preferences") {
        return Promise.resolve(
          overrides.preferences ?? { timezone: "UTC" },
        ) as never;
      }
      if (path === "/expenses/suppliers") return Promise.resolve([]) as never;
      if (path === "/categories")
        return Promise.resolve({
          default: [{ value: "fuel", label: "Combustível" }],
          custom: [],
        }) as never;
      if (path === "/expenses/e1?strict=true" && method === "PATCH") {
        if (overrides.patchError)
          return Promise.reject(overrides.patchError) as never;
        return Promise.resolve(overrides.patchResponse ?? baseExpense) as never;
      }
      if (path === "/expenses/e1" && method === "DELETE")
        return Promise.resolve(undefined) as never;
      if (path === "/expenses/e1/receipt" && method === "GET") {
        return Promise.resolve(
          overrides.receiptUrls ?? {
            original_url: "https://signed/original.jpg",
            thumbnail_url: null,
            thumbnail_status: "pending",
            is_pdf: false,
          },
        ) as never;
      }
      return Promise.reject(new Error(`unexpected call: ${method} ${path}`));
    },
  );
}

describe("ExpenseDetailPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <ExpenseDetailPage params={Promise.resolve({ id: "e1" })} />
      </QueryProvider>,
    );
  }

  it("mostra 404 quando a despesa não é encontrada (CA-08)", async () => {
    vi.mocked(apiClient).mockImplementation((path: string) => {
      if (path === "/expenses/e1")
        return Promise.reject(new Error("not found")) as never;
      return Promise.resolve({ timezone: "UTC" }) as never;
    });
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Despesa não encontrada.",
    );
  });

  /**
   * @spec SPEC-20260814-004 US-02, RF-07
   */
  it("mostra o ReceiptViewer quando a despesa já tem comprovante", async () => {
    mockApi({
      expense: { ...baseExpense, receipt_storage_key: "u1/abc.jpg" },
      receiptUrls: {
        original_url: "https://signed/original.jpg",
        thumbnail_url: "https://signed/thumb.jpg",
        thumbnail_status: "completed",
        is_pdf: false,
      },
    });
    renderPage();

    const img = await screen.findByAltText("Prévia do comprovante");
    expect(img).toHaveAttribute("src", "https://signed/thumb.jpg");
    expect(
      screen.queryByLabelText(/Comprovante \(opcional\)/),
    ).not.toBeInTheDocument();
  });

  /**
   * @spec SPEC-20260814-004 RF-01, RF-10, US-01
   */
  it("mostra o campo de upload quando a despesa ainda não tem comprovante", async () => {
    mockApi({ expense: { ...baseExpense, receipt_storage_key: null } });
    renderPage();

    expect(
      await screen.findByLabelText(/Comprovante \(opcional\)/),
    ).toBeInTheDocument();
  });

  /**
   * @spec SPEC-20260814-004 RF-01, RF-03 — fluxo de retry após falha no upload durante a criação
   */
  it("envia o comprovante selecionado depois via o botão 'Enviar comprovante'", async () => {
    mockApi({ expense: { ...baseExpense, receipt_storage_key: null } });
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    renderPage();

    const input = await screen.findByLabelText(/Comprovante \(opcional\)/);
    const file = new File(["x"], "cupom.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(
      screen.getByRole("button", { name: "Enviar comprovante" }),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/backend/expenses/e1/receipt",
        expect.objectContaining({ method: "POST", credentials: "include" }),
      ),
    );

    vi.unstubAllGlobals();
  });

  it("atualiza campos parciais da despesa (RF-05, CA-13)", async () => {
    mockApi({ patchResponse: { ...baseExpense, amount: 200 } });
    renderPage();

    const amountInput = await screen.findByLabelText("Valor (R$) *");
    for (let i = 0; i < 5; i++)
      fireEvent.keyDown(amountInput, { key: "Backspace" });
    typeDigits(amountInput, "20000");
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/expenses/e1?strict=true",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({ amount: 200 }),
        }),
      ),
    );
  });

  it("remove a despesa após confirmação e redireciona (RF-06, CA-11)", async () => {
    mockApi();
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Remover despesa" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Remover" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/expenses"));
    expect(apiClient).toHaveBeenCalledWith("/expenses/e1", {
      method: "DELETE",
    });
  });

  it("bloqueia edição e remoção quando a despesa é readonly (RF-07, R-LED-01)", async () => {
    mockApi({ expense: { ...baseExpense, is_readonly: true } });
    renderPage();

    expect(
      await screen.findByRole("button", { name: "Remover despesa" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  /**
   * @spec SPEC-20260612-002 RF-02
   */
  it("altera o ano mantendo mês e dia (RF-02)", async () => {
    mockApi();
    renderPage();

    await screen.findByLabelText("Data e hora *");
    fireEvent.change(screen.getByLabelText("Ano"), {
      target: { value: "2020" },
    });

    expect(screen.getByLabelText("Data e hora *")).toHaveValue(
      "2020-07-14T00:00",
    );
  });

  /**
   * @spec SPEC-20260612-001 RF-05.3
   */
  it("calcula amount a partir de litros e valor por litro (RF-05.3)", async () => {
    mockApi({ expense: { ...baseExpense, amount: 50, liters: 10 } });
    renderPage();

    const priceInput = await screen.findByLabelText("Valor por litro");
    typeDigits(priceInput, "500");

    expect(screen.getByLabelText("Valor (R$) *")).toHaveValue("50,00");
  });

  /**
   * @spec SPEC-20260612-001 RF-06
   */
  it("exibe a mensagem de erro do servidor ao falhar a atualização (RF-06.3)", async () => {
    const { ApiError } = await vi.importActual<
      typeof import("@/lib/http/api-client")
    >("@/lib/http/api-client");
    mockApi({
      patchError: new ApiError(
        "Odômetro inválido: informe um valor igual ou maior.",
        400,
      ),
    });
    renderPage();

    await screen.findByLabelText("Valor (R$) *");
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Odômetro inválido",
    );
  });

  /**
   * @spec SPEC-20260619-001 R-FORM-05
   * @spec SPEC-20260807-005 RF-02
   */
  it("pede confirmação via AlertDialog ao cancelar com alterações não salvas", async () => {
    mockApi();
    renderPage();

    const amountInput = await screen.findByLabelText("Valor (R$) *");
    typeDigits(amountInput, "9");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByRole("alertdialog")).toHaveAccessibleName(
      "Descartar alterações?",
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  /**
   * @spec SPEC-20260619-001 R-FORM-05
   */
  it("cancela sem confirmação quando não há alterações", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    mockApi();
    renderPage();

    await screen.findByLabelText("Valor (R$) *");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/expenses");
  });

  it("altera o campo de descrição (onChange da descrição)", async () => {
    mockApi();
    renderPage();

    await screen.findByLabelText("Valor (R$) *");
    const descInput = screen.getByLabelText("Descrição", { selector: "input" });
    fireEvent.change(descInput, { target: { value: "Abastecimento extra" } });

    expect(descInput).toHaveValue("Abastecimento extra");
  });

  it("clica no botão 'Sim' de tanque cheio altera o estado (isFuel)", async () => {
    mockApi({ expense: { ...baseExpense, category: "fuel" } });
    renderPage();

    await screen.findByLabelText("Valor (R$) *");
    const simBtn = screen.getByRole("button", { name: "Sim" });
    expect(simBtn).toBeInTheDocument();
    fireEvent.click(simBtn);

    // Após clicar, o botão fica "pressionado"
    expect(simBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("clica no botão 'Não' de tanque cheio (isFuel)", async () => {
    mockApi({ expense: { ...baseExpense, category: "fuel" } });
    renderPage();

    await screen.findByLabelText("Valor (R$) *");
    const naoBtn = screen.getByRole("button", { name: "Não" });
    fireEvent.click(naoBtn);

    expect(naoBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("exibe sugestões de fornecedores quando a API retorna suppliers (isFuel)", async () => {
    vi.mocked(apiClient).mockImplementation(
      (path: string, options?: { method?: string }) => {
        if (
          path === "/expenses/e1" &&
          (!options || options.method === undefined)
        )
          return Promise.resolve({ ...baseExpense, category: "fuel" }) as never;
        if (path === "/preferences")
          return Promise.resolve({ timezone: "UTC" }) as never;
        if (path === "/expenses/suppliers")
          return Promise.resolve([
            { supplier: "Posto Shell", source: "personal" },
            { supplier: "Posto Ipiranga", source: "personal" },
          ]) as never;
        if (path === "/expenses/e1?strict=true" && options?.method === "PATCH")
          return Promise.resolve(baseExpense) as never;
        if (path === "/expenses/e1" && options?.method === "DELETE")
          return Promise.resolve(undefined) as never;
        return Promise.resolve(undefined) as never;
      },
    );
    renderPage();

    await screen.findByLabelText("Valor (R$) *");
    // Aguarda os suppliers carregarem no DOM (datalist options)
    await waitFor(() => {
      const option = document.querySelector(
        'datalist option[value="Posto Shell"]',
      );
      expect(option).toBeInTheDocument();
    });
  });
});
