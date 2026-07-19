import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { FleetAside } from "./fleet-aside";

function renderFleetAside(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <FleetAside />
    </QueryClientProvider> as ReactNode,
  );
}

describe("FleetAside", () => {
  beforeEach(() => {
    localStorage.clear();
    useDashboardStore.getState().clearAllSelection();
    useUIStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("RF-16: limpa o contexto e exibe toast quando o veículo em foco foi excluído", async () => {
    useDashboardStore.getState().setActiveVehicle("v-stale");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [{ id: "v-outro" }] }),
      }),
    );

    renderFleetAside();

    await waitFor(() => expect(useDashboardStore.getState().selectionMode).toBe("none"));
    expect(useUIStore.getState().toasts[0]?.title).toMatch(/veículo em foco foi removido/);
  });

  it("não altera o contexto quando o veículo em foco ainda existe", async () => {
    useDashboardStore.getState().setActiveVehicle("v1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [{ id: "v1" }] }),
      }),
    );

    renderFleetAside();

    await waitFor(() => expect(useDashboardStore.getState().activeVehicleId).toBe("v1"));
    expect(useUIStore.getState().toasts).toHaveLength(0);
  });

  it("RF-16: limpa o contexto silenciosamente (sem toast) quando o grupo em foco foi excluído", async () => {
    useDashboardStore.getState().setActiveGroup("g-stale");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [{ id: "g-outro" }] }),
      }),
    );

    renderFleetAside();

    await waitFor(() => expect(useDashboardStore.getState().selectionMode).toBe("none"));
    expect(useUIStore.getState().toasts).toHaveLength(0);
  });
});
