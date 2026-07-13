import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import { ApiError } from "@/lib/http/api-client";
import LoginPage from "./page";

const pushMock = vi.fn();
const searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParams,
}));

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

describe("LoginPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    searchParams.delete("redirect");
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <LoginPage />
      </QueryProvider>,
    );
  }

  it("redireciona para / após login bem-sucedido (STORY-01)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ message: "ok" });
    renderPage();

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "abc12!" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
  });

  it("redireciona para a rota de destino salva na query string (STORY-01)", async () => {
    searchParams.set("redirect", "/dashboard");
    vi.mocked(apiClient).mockResolvedValue({ message: "ok" });
    renderPage();

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "abc12!" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("mostra mensagem genérica de credenciais inválidas (anti-enumeração, STORY-02)", async () => {
    vi.mocked(apiClient).mockRejectedValue(new ApiError("INVALID_CREDENTIALS", 401));
    renderPage();

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "errada" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText(/e-mail ou senha inválidos/i)).toBeInTheDocument();
  });

  it("mostra mensagem de bloqueio após excesso de tentativas (STORY-03)", async () => {
    vi.mocked(apiClient).mockRejectedValue(new ApiError("bloqueado", 403));
    renderPage();

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "errada" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText(/temporariamente bloqueada/i)).toBeInTheDocument();
  });
});
