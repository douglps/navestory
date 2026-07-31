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
  templateResponse?: unknown;
}

function mockApi(overrides: MockOverrides = {}) {
  vi.mocked(apiClient).mockImplementation((path: string, options?: { method?: string }) => {
    const method = options?.method ?? "GET";
    if (path === "/expenses/e1" && method === "GET") {
      return Promise.resolve(overrides.expense ?? baseExpense) as never;
    }
    if (path === "/preferences") {
      return Promise.resolve(overrides.preferences ?? { timezone: "UTC" }) as never;
    }
    if (path === "/expenses/suppliers") return Promise.resolve({ data: [] }) as never;
    if (path === "/expenses/e1?strict=true" && method === "PATCH") {
      if (overrides.patchError) return Promise.reject(overrides.patchError) as never;
      return Promise.resolve(overrides.patchResponse ?? baseExpense) as never;
    }
    if (path === "/expenses/e1" && method === "DELETE") return Promise.resolve(undefined) as never;
    if (path === "/expense-templates" && method === "POST") {
      return Promise.resolve(
        overrides.templateResponse ?? { data: { id: "t1", name: "Abastecimento Semanal" } },
      ) as never;
    }
    return Promise.reject(new Error(`unexpected call: ${method} ${path}`));
  });
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
      if (path === "/expenses/e1") return Promise.reject(new Error("not found")) as never;
      return Promise.resolve({ timezone: "UTC" }) as never;
    });
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Despesa não encontrada.");
  });

  it("atualiza campos parciais da despesa (RF-05, CA-13)", async () => {
    mockApi({ patchResponse: { ...baseExpense, amount: 200 } });
    renderPage();

    const amountInput = await screen.findByLabelText("Valor (R$) *");
    for (let i = 0; i < 5; i++) fireEvent.keyDown(amountInput, { key: "Backspace" });
    typeDigits(amountInput, "20000");
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/expenses/e1?strict=true",
        expect.objectContaining({ method: "PATCH", body: expect.objectContaining({ amount: 200 }) }),
      ),
    );
  });

  it("remove a despesa após confirmação e redireciona (RF-06, CA-11)", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockApi();
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Remover despesa" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/expenses"));
    expect(apiClient).toHaveBeenCalledWith("/expenses/e1", { method: "DELETE" });
  });

  it("bloqueia edição e remoção quando a despesa é readonly (RF-07, R-LED-01)", async () => {
    mockApi({ expense: { ...baseExpense, is_readonly: true } });
    renderPage();

    expect(await screen.findByRole("button", { name: "Remover despesa" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("salva a despesa como modelo (SPEC-20260601-003 RF-06, CA-10)", async () => {
    mockApi();
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Salvar como modelo" }));
    fireEvent.change(screen.getByLabelText("Nome do modelo"), {
      target: { value: "Abastecimento Semanal" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar modelo" }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/expense-templates",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            name: "Abastecimento Semanal",
            vehicle_id: VEHICLE_ID,
            category: "fuel",
            amount: 150,
          }),
        }),
      ),
    );
    expect(await screen.findByText("Modelo 'Abastecimento Semanal' criado com sucesso.")).toBeInTheDocument();
  });

  /**
   * @spec SPEC-20260612-002 RF-02
   */
  it("altera o ano mantendo mês e dia (RF-02)", async () => {
    mockApi();
    renderPage();

    await screen.findByLabelText("Data e hora *");
    fireEvent.change(screen.getByLabelText("Ano"), { target: { value: "2020" } });

    expect(screen.getByLabelText("Data e hora *")).toHaveValue("2020-07-14T00:00");
  });

  /**
   * @spec SPEC-20260612-001 RF-05.3
   */
  it("exibe a linha-resumo quando amount/liters/price_per_liter estão consistentes", async () => {
    mockApi({ expense: { ...baseExpense, amount: 50, liters: 10 } });
    renderPage();

    const priceInput = await screen.findByLabelText("Valor por litro");
    typeDigits(priceInput, "500");

    expect(await screen.findByText("10 L × R$ 5/L = R$ 50")).toBeInTheDocument();
  });

  /**
   * @spec SPEC-20260612-001 RF-06
   */
  it("exibe a mensagem de erro do servidor ao falhar a atualização (RF-06.3)", async () => {
    const { ApiError } = await vi.importActual<typeof import("@/lib/http/api-client")>(
      "@/lib/http/api-client",
    );
    mockApi({
      patchError: new ApiError("Odômetro inválido: informe um valor igual ou maior.", 400),
    });
    renderPage();

    await screen.findByLabelText("Valor (R$) *");
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Odômetro inválido");
  });

  /**
   * @spec SPEC-20260619-001 R-FORM-05
   */
  it("pede confirmação ao cancelar com alterações não salvas", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    mockApi();
    renderPage();

    const amountInput = await screen.findByLabelText("Valor (R$) *");
    typeDigits(amountInput, "9");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(confirmSpy).toHaveBeenCalledWith("Descartar alterações?");
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
});
