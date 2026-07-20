import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import { ApiError } from "@/lib/http/api-client";
import RegisterPage from "./page";

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

describe("RegisterPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <RegisterPage />
      </QueryProvider>,
    );
  }

  it("mostra erro de validação client-side sem chamar a API (senha fraca)", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(apiClient).not.toHaveBeenCalled();
  });

  it("redireciona para /login após registro bem-sucedido (STORY-REG-01)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ message: "ok" });
    renderPage();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "abc12!" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));
  });

  it("mostra bloco de aviso quando o e-mail já existe (409, RF-05/RF-06)", async () => {
    vi.mocked(apiClient).mockRejectedValue(new ApiError("E-mail já cadastrado", 409));
    renderPage();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "abc12!" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByText(/já está cadastrado/)).toBeInTheDocument();
  });

  it("SPEC-20260720-001 US-03: botão 'Criar conta' fica desabilitado até marcar o aceite dos termos", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "abc12!" } });

    expect(screen.getByRole("button", { name: "Criar conta" })).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));

    expect(screen.getByRole("button", { name: "Criar conta" })).toBeEnabled();
  });
});
