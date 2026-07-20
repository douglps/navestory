import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import AccountSettingsPage from "./page";

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

describe("AccountSettingsPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <AccountSettingsPage />
      </QueryProvider>,
    );
  }

  it("SPEC-20260719-001 US-01: exibe nome e e-mail da conta", async () => {
    vi.mocked(apiClient).mockResolvedValue({ id: "u1", name: "Ana", email: "ana@example.com" });
    renderPage();

    expect(await screen.findByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Zona de perigo" })).toBeInTheDocument();
  });

  it("US-02: botão 'Confirmar exclusão' fica desabilitado até digitar EXCLUIR", async () => {
    vi.mocked(apiClient).mockResolvedValue({ id: "u1", name: "Ana", email: "ana@example.com" });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Excluir minha conta" }));
    const confirmButton = screen.getByRole("button", { name: "Confirmar exclusão" });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Para confirmar, digite/), {
      target: { value: "excluir" },
    });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Para confirmar, digite/), {
      target: { value: "EXCLUIR" },
    });
    expect(confirmButton).toBeEnabled();
  });

  it("US-03: confirma a exclusão chamando DELETE /users/me e redireciona para /login", async () => {
    vi.mocked(apiClient).mockImplementation((path: string, options?: { method?: string }) => {
      if (options?.method === "DELETE") return Promise.resolve(undefined);
      return Promise.resolve({ id: "u1", name: "Ana", email: "ana@example.com" });
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Excluir minha conta" }));
    fireEvent.change(screen.getByLabelText(/Para confirmar, digite/), {
      target: { value: "EXCLUIR" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/users/me",
        expect.objectContaining({ method: "DELETE", body: { confirm: true } }),
      ),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login?message=conta_excluida"));
  });

  it("US-03/US-05: em caso de erro mantém o dialog aberto e limpa o campo de confirmação", async () => {
    vi.mocked(apiClient).mockImplementation((path: string, options?: { method?: string }) => {
      if (options?.method === "DELETE") return Promise.reject(new Error("falhou"));
      return Promise.resolve({ id: "u1", name: "Ana", email: "ana@example.com" });
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Excluir minha conta" }));
    fireEvent.change(screen.getByLabelText(/Para confirmar, digite/), {
      target: { value: "EXCLUIR" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));

    expect(
      await screen.findByText(/Não foi possível processar sua solicitação/),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Para confirmar, digite/)).toHaveValue("");
  });
});
