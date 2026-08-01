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
    searchParams.delete("message");
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <LoginPage />
      </QueryProvider>,
    );
  }

  it("redireciona para /dashboard após login bem-sucedido (STORY-01)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ message: "ok" });
    renderPage();

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "abc12!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("redireciona para a rota de destino salva na query string (STORY-01)", async () => {
    searchParams.set("redirect", "/dashboard");
    vi.mocked(apiClient).mockResolvedValue({ message: "ok" });
    renderPage();

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "abc12!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("mostra mensagem genérica de credenciais inválidas (anti-enumeração, STORY-02)", async () => {
    vi.mocked(apiClient).mockRejectedValue(
      new ApiError("INVALID_CREDENTIALS", 401),
    );
    renderPage();

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "errada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(
      await screen.findByText(/e-mail ou senha inválidos/i),
    ).toBeInTheDocument();
  });

  it("mostra mensagem de bloqueio após excesso de tentativas (STORY-03)", async () => {
    vi.mocked(apiClient).mockRejectedValue(new ApiError("bloqueado", 403));
    renderPage();

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "errada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(
      await screen.findByText(/temporariamente bloqueada/i),
    ).toBeInTheDocument();
  });

  it("SPEC-20260719-001 RF-13: não navega para /dashboard quando a conta está soft-deleted", async () => {
    vi.mocked(apiClient).mockImplementation((path: string) => {
      if (path === "/auth/login") return Promise.resolve({ message: "ok" });
      return Promise.reject(
        new ApiError(
          "Conta marcada para exclusão.",
          403,
          "ACCOUNT_PENDING_DELETION",
        ),
      );
    });
    renderPage();

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "abc12!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(apiClient).toHaveBeenCalledWith("/users/me"));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("navega para /dashboard quando a checagem de /users/me falha por outro motivo (falha aberta)", async () => {
    vi.mocked(apiClient).mockImplementation((path: string) => {
      if (path === "/auth/login") return Promise.resolve({ message: "ok" });
      return Promise.reject(new ApiError("Serviço indisponível", 503));
    });
    renderPage();

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "abc12!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("SPEC-20260719-001 US-03: exibe aviso de exclusão registrada quando ?message=conta_excluida", () => {
    searchParams.set("message", "conta_excluida");
    renderPage();

    expect(
      screen.getByText(/solicitação de exclusão de conta foi registrada/i),
    ).toBeInTheDocument();
  });

  it("não exibe o aviso de exclusão sem o parâmetro message na URL", () => {
    renderPage();

    expect(
      screen.queryByText(/solicitação de exclusão de conta foi registrada/i),
    ).not.toBeInTheDocument();
  });
});
