import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { Header } from "./header";

describe("Header", () => {
  beforeEach(() => {
    sessionStorage.clear();
    useDashboardStore.getState().clearAllSelection();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("RF-01: exibe o logo e o chip de contexto", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <Header />
      </QueryClientProvider> as ReactNode,
    );

    expect(screen.getByText("Nave")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Selecionar veículo/)).toBeInTheDocument());
  });
});
