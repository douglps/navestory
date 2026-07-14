import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  function fillValidForm() {
    fireEvent.change(screen.getByLabelText("Placa"), { target: { value: "abc-1234" } });
    fireEvent.change(screen.getByLabelText("Marca"), { target: { value: "Fiat" } });
    fireEvent.change(screen.getByLabelText("Modelo"), { target: { value: "Uno" } });
    fireEvent.change(screen.getByLabelText("Ano"), { target: { value: "2020" } });
  }

  it("mostra erro de validação client-side com placa inválida (CA-02)", async () => {
    renderPage();

    fillValidForm();
    fireEvent.change(screen.getByLabelText("Placa"), { target: { value: "AB1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(apiClient).not.toHaveBeenCalled();
  });

  it("cadastra o veículo e redireciona para /vehicles (RF-01, CA-01)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ id: "v1" });
    renderPage();

    fillValidForm();
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
});
