import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import { ApiError } from "@/lib/http/api-client";
import { useUIStore } from "@/lib/stores/ui-store";
import RestoreAccountPage from "./page";

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

const logoutMock = vi.fn();
vi.mock("@/lib/auth/logout", () => ({ logout: () => logoutMock() }));

import { apiClient } from "@/lib/http/api-client";

describe("RestoreAccountPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    searchParams.delete("deletedAt");
    useUIStore.setState({ toasts: [] });
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <RestoreAccountPage />
      </QueryProvider>,
    );
  }

  it("SPEC-20260719-001 US-06: exibe a data projetada de exclusão definitiva (30 dias após deletedAt)", () => {
    const deletedAt = "2026-07-20T00:00:00.000Z";
    searchParams.set("deletedAt", deletedAt);
    renderPage();

    const expected = new Date(new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(
      "pt-BR",
      { day: "2-digit", month: "long", year: "numeric" },
    );
    expect(screen.getByText(/exclusão definitiva em/i)).toHaveTextContent(expected);
  });

  it("chama POST /users/me/restore e navega para /dashboard com toast de sucesso ao confirmar", async () => {
    vi.mocked(apiClient).mockResolvedValue({ message: "ok" });
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar exclusão e restaurar minha conta" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/dashboard"));
    expect(apiClient).toHaveBeenCalledWith("/users/me/restore", { method: "POST" });
    expect(useUIStore.getState().toasts[0]?.title).toBe("Sua conta foi restaurada com sucesso!");
  });

  it("exibe erro e não navega quando o restore falha, sem deslogar o usuário", async () => {
    vi.mocked(apiClient).mockRejectedValue(new ApiError("Conflito", 409));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar exclusão e restaurar minha conta" }));

    expect(await screen.findByText("Conflito")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
    expect(logoutMock).not.toHaveBeenCalled();
  });

  it("aciona logout ao clicar em 'Continuar com a exclusão'", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Continuar com a exclusão" }));

    expect(logoutMock).toHaveBeenCalled();
  });
});
