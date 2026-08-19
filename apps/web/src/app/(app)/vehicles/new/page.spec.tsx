import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import NewVehiclePage from "./page";

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

describe("NewVehiclePage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <NewVehiclePage />
      </QueryProvider>,
    );
  }

  async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("Placa *"), "abc1234");
    fireEvent.change(screen.getByLabelText("Marca *"), { target: { value: "Fiat" } });
    fireEvent.change(screen.getByLabelText("Modelo *"), { target: { value: "Uno" } });
    fireEvent.change(screen.getByLabelText("Ano *"), { target: { value: "2020" } });
  }

  it("mostra erro de validação client-side com placa inválida (CA-02)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Placa *"), "ab1234");
    fireEvent.change(screen.getByLabelText("Marca *"), { target: { value: "Fiat" } });
    fireEvent.change(screen.getByLabelText("Modelo *"), { target: { value: "Uno" } });
    fireEvent.change(screen.getByLabelText("Ano *"), { target: { value: "2020" } });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(apiClient).not.toHaveBeenCalled();
  });

  it("cadastra o veículo e redireciona para /vehicles (RF-01, CA-01)", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient).mockResolvedValue({ id: "v1" });
    renderPage();

    await fillValidForm(user);
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/vehicles"));
    expect(apiClient).toHaveBeenCalledWith(
      "/vehicles",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({ plate: "ABC1234" }),
      }),
    );
  });

  /**
   * @spec SPEC-20260807-003 RF-03
   */
  it("aplica máscara de placa BR enquanto digita (RF-03)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Placa *"), "abc1234");

    expect(screen.getByLabelText("Placa *")).toHaveValue("ABC-1234");
  });

  /**
   * @spec SPEC-20260807-003 RF-08
   */
  it("exibe todos os erros de validação simultaneamente (RF-08)", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Ano *"), { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findAllByRole("alert")).toHaveLength(4);
    expect(apiClient).not.toHaveBeenCalled();
  });
});
