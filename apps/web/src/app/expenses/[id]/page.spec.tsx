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

describe("ExpenseDetailPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const expense = {
    id: "e1",
    vehicle_id: "v1",
    category: "fuel",
    amount: 150,
    date: "2026-07-14",
    description: null,
    odometer_km: null,
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
      .mockResolvedValueOnce({ ...expense, amount: 200 });
    renderPage();

    fireEvent.change(await screen.findByLabelText("Valor (R$)"), { target: { value: "200" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/expenses/e1",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
  });

  it("remove a despesa após confirmação e redireciona (RF-06, CA-11)", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(apiClient).mockResolvedValueOnce(expense).mockResolvedValueOnce(undefined);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Remover despesa" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/expenses"));
    expect(apiClient).toHaveBeenCalledWith("/expenses/e1", { method: "DELETE" });
  });

  it("bloqueia edição e remoção quando a despesa é readonly (RF-07, R-LED-01)", async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({ ...expense, is_readonly: true });
    renderPage();

    expect(await screen.findByRole("button", { name: "Remover despesa" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });
});
