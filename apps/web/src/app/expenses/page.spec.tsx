import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/lib/query/providers";
import ExpensesPage from "./page";

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";

describe("ExpensesPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function renderPage() {
    return render(
      <QueryProvider>
        <ExpensesPage />
      </QueryProvider>,
    );
  }

  it("lista as despesas com veículo resolvido (RF-11)", async () => {
    vi.mocked(apiClient).mockImplementation((path: string) => {
      if (path === "/expenses") {
        return Promise.resolve([
          { id: "e1", vehicle_id: "v1", category: "fuel", amount: 150, date: "2026-07-14", description: null },
        ]) as never;
      }
      if (path === "/vehicles") {
        return Promise.resolve([
          { id: "v1", plate: "ABC1234", make: "Fiat", model: "Uno", nickname: null },
        ]) as never;
      }
      return Promise.reject(new Error("unexpected path"));
    });
    renderPage();

    expect(await screen.findByText(/fuel/)).toBeInTheDocument();
    expect(await screen.findByText(/Fiat Uno/)).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há despesas", async () => {
    vi.mocked(apiClient).mockImplementation((path: string) => {
      if (path === "/expenses") return Promise.resolve([]) as never;
      return Promise.resolve([]) as never;
    });
    renderPage();

    expect(await screen.findByText("Nenhuma despesa registrada ainda.")).toBeInTheDocument();
  });

  it("mostra erro quando a listagem falha", async () => {
    vi.mocked(apiClient).mockImplementation((path: string) => {
      if (path === "/expenses") return Promise.reject(new Error("falhou")) as never;
      return Promise.resolve([]) as never;
    });
    renderPage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
