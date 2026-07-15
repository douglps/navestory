import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import VehicleGroupsPage from "./page";

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

describe("VehicleGroupsPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <VehicleGroupsPage />
      </QueryProvider>,
    );
  }

  it("lista os grupos do usuário com contagem de membros (RF-08)", async () => {
    vi.mocked(apiClient).mockResolvedValue([
      { id: "g1", name: "Motos", color: "#ef4444", member_count: 3 },
    ]);
    renderPage();

    expect(await screen.findByText(/Motos — 3 veículos/)).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há grupos", async () => {
    vi.mocked(apiClient).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("Você ainda não criou nenhum grupo.")).toBeInTheDocument();
  });

  it("mostra erro quando a listagem falha", async () => {
    vi.mocked(apiClient).mockRejectedValue(new Error("falhou"));
    renderPage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
