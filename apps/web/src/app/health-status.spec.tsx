import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HealthStatus } from "./health-status";

function renderWithClient(): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <HealthStatus />
    </QueryClientProvider>,
  );
}

describe("HealthStatus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mostra status ok quando a API responde", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: "ok", timestamp: "2026-07-13T00:00:00.000Z" }),
      }),
    );

    renderWithClient();

    await waitFor(() => expect(screen.getByText(/API: ok/)).toBeInTheDocument());
  });

  it("mostra erro quando a API falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    renderWithClient();

    await waitFor(() => expect(screen.getByText("API indisponível")).toBeInTheDocument());
  });
});
