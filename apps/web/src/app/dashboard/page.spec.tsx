import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import DashboardPage from "./page";

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

describe("DashboardPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <DashboardPage />
      </QueryProvider>,
    );
  }

  it("monta o link de exportação com o período do mês atual (RF-01, RF-02, RF-07, CA-08)", async () => {
    vi.mocked(apiClient).mockResolvedValue([
      { id: "v1", plate: "ABC1234", make: "Fiat", model: "Uno", nickname: null },
    ] as never);
    renderPage();

    const link = await screen.findByRole("link", { name: "Exportar CSV" });
    const period = new Date().toISOString().slice(0, 7);
    expect(link).toHaveAttribute("href", `/api/backend/dashboard/export?period=${period}`);
  });

  it("lista os veículos no seletor (RF-03)", async () => {
    vi.mocked(apiClient).mockResolvedValue([
      { id: "v1", plate: "ABC1234", make: "Fiat", model: "Uno", nickname: null },
    ] as never);
    renderPage();

    expect(await screen.findByText("Fiat Uno")).toBeInTheDocument();
  });
});
