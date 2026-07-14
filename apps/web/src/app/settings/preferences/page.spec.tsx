import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import PreferencesPage from "./page";

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

describe("PreferencesPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <PreferencesPage />
      </QueryProvider>,
    );
  }

  it("carrega o valor atual da preferência (RF-01.3)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ auto_draft_enabled: true });
    renderPage();

    const checkbox = await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    await waitFor(() => expect(checkbox).toBeChecked());
  });

  it("default desativado quando ausente (R-PREF-01, R-PREF-02)", async () => {
    vi.mocked(apiClient).mockResolvedValue({ auto_draft_enabled: false });
    renderPage();

    const checkbox = await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    expect(checkbox).not.toBeChecked();
  });

  it("botão Salvar fica desabilitado até alterar o toggle", async () => {
    vi.mocked(apiClient).mockResolvedValue({ auto_draft_enabled: false });
    renderPage();

    await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("salva a preferência ao clicar em Salvar (RF-02)", async () => {
    vi.mocked(apiClient).mockImplementation((path: string, options?: { method?: string }) => {
      if (options?.method === "PATCH") {
        return Promise.resolve({ auto_draft_enabled: true });
      }
      return Promise.resolve({ auto_draft_enabled: false });
    });
    renderPage();

    const checkbox = await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(apiClient).toHaveBeenCalledWith(
        "/preferences",
        expect.objectContaining({ method: "PATCH", body: { auto_draft_enabled: true } }),
      ),
    );
    expect(await screen.findByText("✓ Salvo")).toBeInTheDocument();
  });

  it("mostra erro quando o salvamento falha", async () => {
    vi.mocked(apiClient).mockImplementation((path: string, options?: { method?: string }) => {
      if (options?.method === "PATCH") {
        return Promise.reject(new Error("falhou"));
      }
      return Promise.resolve({ auto_draft_enabled: false });
    });
    renderPage();

    const checkbox = await screen.findByRole("checkbox", { name: /Rascunho automático/ });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
