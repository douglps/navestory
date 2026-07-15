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

describe("ExpenseDetailPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const VEHICLE_ID = "11111111-1111-4111-8111-111111111111";
  const expense = {
    id: "e1",
    vehicle_id: VEHICLE_ID,
    category: "fuel",
    amount: 150,
    date: "2026-07-14",
    description: null,
    odometer_km: 50_000,
    liters: null,
    fuel_type: null,
    full_tank: null,
    supplier: null,
    is_readonly: false,
  };

  function renderPage() {
    return render(
      <QueryProvider>
        <ExpenseDetailPage params={Promise.resolve({ id: "e1" })} />
      </QueryProvider>,
    );
  }

  it("mostra 404 quando a despesa não é encontrada (CA-08)", async () => {
    vi.mocked(apiClient).mockRejectedValue(new Error("not found"));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Despesa não encontrada.");
  });

  it("atualiza campos parciais da despesa (RF-05, CA-13)", async () => {
    vi.mocked(apiClient)
      .mockResolvedValueOnce(expense)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ ...expense, amount: 200 });
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
    vi.mocked(apiClient)
      .mockResolvedValueOnce(expense)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce(undefined);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Remover despesa" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/expenses"));
    expect(apiClient).toHaveBeenCalledWith("/expenses/e1", { method: "DELETE" });
  });

  it("bloqueia edição e remoção quando a despesa é readonly (RF-07, R-LED-01)", async () => {
    vi.mocked(apiClient)
      .mockResolvedValueOnce({ ...expense, is_readonly: true })
      .mockResolvedValueOnce({ data: [] });
    renderPage();

    expect(await screen.findByRole("button", { name: "Remover despesa" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("salva a despesa como modelo (SPEC-20260601-003 RF-06, CA-10)", async () => {
    vi.mocked(apiClient)
      .mockResolvedValueOnce(expense)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: { id: "t1", name: "Abastecimento Semanal" } });
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
    vi.mocked(apiClient).mockResolvedValueOnce(expense).mockResolvedValueOnce({ data: [] });
    renderPage();

    await screen.findByLabelText("Data *");
    fireEvent.change(screen.getByLabelText("Ano"), { target: { value: "2020" } });

    expect(screen.getByLabelText("Data *")).toHaveValue("2020-07-14");
  });

  /**
   * @spec SPEC-20260612-001 RF-05.3
   */
  it("exibe a linha-resumo quando amount/liters/price_per_liter estão consistentes", async () => {
    vi.mocked(apiClient)
      .mockResolvedValueOnce({ ...expense, amount: 50, liters: 10 })
      .mockResolvedValueOnce({ data: [] });
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
    vi.mocked(apiClient)
      .mockResolvedValueOnce(expense)
      .mockResolvedValueOnce({ data: [] })
      .mockRejectedValueOnce(new ApiError("Odômetro inválido: informe um valor igual ou maior.", 400));
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
    vi.mocked(apiClient).mockResolvedValueOnce(expense).mockResolvedValueOnce({ data: [] });
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
    vi.mocked(apiClient).mockResolvedValueOnce(expense).mockResolvedValueOnce({ data: [] });
    renderPage();

    await screen.findByLabelText("Valor (R$) *");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith("/expenses");
  });
});
