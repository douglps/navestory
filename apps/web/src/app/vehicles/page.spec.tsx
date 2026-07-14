import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import VehiclesPage from "./page";

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

describe("VehiclesPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <VehiclesPage />
      </QueryProvider>,
    );
  }

  it("lista os veículos ativos do usuário (RF-03, CA-04)", async () => {
    vi.mocked(apiClient).mockResolvedValue([
      { id: "v1", plate: "ABC1234", make: "Fiat", model: "Uno", year: 2020, nickname: null },
    ]);
    renderPage();

    expect(await screen.findByText(/ABC1234/)).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há veículos", async () => {
    vi.mocked(apiClient).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("Você ainda não cadastrou nenhum veículo.")).toBeInTheDocument();
  });

  it("mostra erro quando a listagem falha", async () => {
    vi.mocked(apiClient).mockRejectedValue(new Error("falhou"));
    renderPage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
