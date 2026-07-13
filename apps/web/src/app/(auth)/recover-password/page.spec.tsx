import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import RecoverPasswordPage from "./page";

const searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

describe("RecoverPasswordPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    searchParams.delete("email");
  });

  it("pré-preenche o e-mail vindo da query string (RF-07 da SPEC-002)", () => {
    searchParams.set("email", "ana@example.com");
    render(
      <QueryProvider>
        <RecoverPasswordPage />
      </QueryProvider>,
    );

    expect(screen.getByLabelText("E-mail")).toHaveValue("ana@example.com");
  });

  it("mostra mensagem genérica de sucesso mesmo quando o e-mail não existe (anti-enumeração)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ message: "ok" });
    render(
      <QueryProvider>
        <RecoverPasswordPage />
      </QueryProvider>,
    );

    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "inexistente@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar instruções" }));

    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
  });
});
