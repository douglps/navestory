import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { VehicleContextChip } from "./vehicle-context-chip";

const isDesktopMock = vi.fn(() => true);

vi.mock("@/lib/hooks/use-media-query", () => ({
  useMediaQuery: () => isDesktopMock(),
}));

const VEHICLES = [
  { id: "v1", plate: "ABC1234", make: "Toyota", model: "Hilux", vehicle_type: "caminhao" },
];
const GROUPS = [{ id: "g1", name: "Frota SP", member_count: 3 }];

function renderChip(): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <VehicleContextChip />
    </QueryClientProvider> as ReactNode,
  );
}

describe("VehicleContextChip", () => {
  beforeEach(() => {
    sessionStorage.clear();
    isDesktopMock.mockReturnValue(true);
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

  it("modo none: convite a selecionar veículo, sem botão X", async () => {
    renderChip();

    await waitFor(() => expect(screen.getByText(/Selecionar veículo/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Ver toda a frota" })).not.toBeInTheDocument();
  });

  it("modo single: exibe placa e modelo do veículo em foco", async () => {
    useDashboardStore.getState().setActiveVehicle("v1");
    renderChip();

    await waitFor(() => expect(screen.getByText(/ABC1234 · Hilux/)).toBeInTheDocument());
  });

  it("modo group: exibe nome do grupo e contagem de membros", async () => {
    useDashboardStore.getState().setActiveGroup("g1");
    renderChip();

    await waitFor(() => expect(screen.getByText(/Frota SP · 3 membros/)).toBeInTheDocument());
  });

  it("modo multi: exibe contagem de seleção personalizada", async () => {
    renderChip();
    // multi/attribute são efêmeros (R-CTX-02): o `set()` de teste antes da montagem
    // seria sobrescrito pela reidratação (`rehydrate()`, que lê o storage vazio para
    // esses modos). Por isso a seleção é aplicada só após a hidratação inicial.
    await waitFor(() => expect(screen.getByText(/Selecionar veículo/)).toBeInTheDocument());

    useDashboardStore.getState().setMultiSelected(["v1", "v2"]);

    await waitFor(() => expect(screen.getByText(/Seleção personalizada · 2/)).toBeInTheDocument());
  });

  it("modo attribute: exibe label do filtro de frota ativo", async () => {
    renderChip();
    await waitFor(() => expect(screen.getByText(/Selecionar veículo/)).toBeInTheDocument());

    useDashboardStore.getState().setAttributeFilter({ attribute: "vehicle_type", value: "moto" });

    await waitFor(() =>
      expect(screen.getByText(/Filtro de frota: vehicle_type = moto/)).toBeInTheDocument(),
    );
  });

  it("RF-04: botão X chama clearAllSelection e interrompe propagação (não abre o switcher)", async () => {
    useDashboardStore.getState().setActiveVehicle("v1");
    renderChip();

    await waitFor(() => expect(screen.getByText(/ABC1234/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Ver toda a frota" }));

    expect(useDashboardStore.getState().selectionMode).toBe("none");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("RF-07: em desktop, clicar no chip abre o Dialog", async () => {
    isDesktopMock.mockReturnValue(true);
    renderChip();

    await waitFor(() => expect(screen.getByText(/Selecionar veículo/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Sem contexto/ }));

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
  });

  it("RF-05 (SPEC-20260721-001): sem veículo cadastrado, exibe CTA 'Adicionar veículo' em vez do seletor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        const path = url.replace("/api/backend", "");
        const data = path === "/vehicles" ? [] : GROUPS;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data }),
        });
      }),
    );
    renderChip();

    const cta = await screen.findByRole("link", { name: "Adicionar veículo" });
    expect(cta).toHaveAttribute("href", "/vehicles/new");
    expect(screen.queryByRole("button", { name: /Sem contexto/ })).not.toBeInTheDocument();
  });

  it("RF-11: em mobile, clicar no chip abre o Sheet (vaul)", async () => {
    isDesktopMock.mockReturnValue(false);
    renderChip();

    await waitFor(() => expect(screen.getByText(/Selecionar veículo/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Sem contexto/ }));

    await waitFor(() =>
      expect(screen.getByPlaceholderText("Buscar veículo ou grupo...")).toBeInTheDocument(),
    );
  });
});
