import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { FocusSlot } from "./focus-slot";

const VEHICLES = [
  { id: "v1", plate: "ABC1234", make: "Toyota", model: "Hilux", vehicle_type: "caminhao" },
];
const GROUPS = [{ id: "g1", name: "Frota SP", member_count: 3 }];

function renderFocusSlot(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <FocusSlot />
    </QueryClientProvider> as ReactNode,
  );
}

describe("FocusSlot", () => {
  beforeEach(() => {
    localStorage.clear();
    useDashboardStore.getState().clearAllSelection();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        const path = url.replace("/api/backend", "");
        const data = path === "/vehicles" ? VEHICLES : GROUPS;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data }),
        });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("modo none: exibe convite à seleção", async () => {
    renderFocusSlot();

    await waitFor(() => expect(screen.getByText(/Selecionar veículo/)).toBeInTheDocument());
  });

  it("modo single: exibe placa e modelo do veículo em foco", async () => {
    useDashboardStore.getState().setActiveVehicle("v1");
    renderFocusSlot();

    await waitFor(() => expect(screen.getByText(/ABC1234 · Hilux/)).toBeInTheDocument());
  });

  it("modo group: exibe nome do grupo e contagem de membros", async () => {
    useDashboardStore.getState().setActiveGroup("g1");
    renderFocusSlot();

    await waitFor(() => expect(screen.getByText(/Frota SP · 3 membros/)).toBeInTheDocument());
  });

  it("botão × limpa a seleção e volta ao modo none (RF-06)", async () => {
    useDashboardStore.getState().setActiveVehicle("v1");
    renderFocusSlot();

    await waitFor(() => expect(screen.getByText(/ABC1234/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Ver toda a frota" }));

    expect(useDashboardStore.getState().selectionMode).toBe("none");
  });
});
