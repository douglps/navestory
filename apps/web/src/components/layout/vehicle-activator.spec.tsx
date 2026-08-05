import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { VehicleActivator } from "./vehicle-activator";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const VEHICLES = [{ id: "v1", plate: "ABC1234", make: "Toyota", model: "Hilux", vehicle_type: "caminhao" }];
const GROUPS = [{ id: "g1", name: "Frota SP", member_count: 3 }];

function stubFetch(preferences: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const path = url.replace("/api/backend", "");
      let data: unknown;
      if (path === "/preferences") data = preferences;
      else if (path === "/vehicles") data = VEHICLES;
      else if (path === "/vehicle-groups") data = GROUPS;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data }),
      });
    }),
  );
}

async function renderActivator(): Promise<void> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    (
      <QueryClientProvider client={queryClient}>
        <VehicleActivator />
      </QueryClientProvider>
    ) as ReactNode,
  );
  // Na aplicação real, `VehicleContextChip`/`useVehicleContext` (montado junto no layout) dispara
  // a reidratação do store (`persist.rehydrate()`). Reproduz essa ordem aqui: o bootstrap de URL
  // roda de forma síncrona antes disso, exatamente como em produção (RF-11).
  await act(async () => {
    await useDashboardStore.persist?.rehydrate();
  });
}

describe("VehicleActivator", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    localStorage.clear();
    sessionStorage.clear();
    useDashboardStore.getState().clearAllSelection();
    window.history.pushState({}, "", "/dashboard");
    stubFetch({ default_context_type: null, default_context_id: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("RF-15: bootstrap ativa o veículo a partir de ?vehicleId= na URL", async () => {
    window.history.pushState({}, "", "/dashboard?vehicleId=v1");

    await renderActivator();

    await waitFor(() => {
      expect(useDashboardStore.getState().selectionMode).toBe("single");
      expect(useDashboardStore.getState().activeVehicleId).toBe("v1");
    });
  });

  it("RF-17.1: sincroniza store -> URL ao ativar um veículo (single)", async () => {
    await renderActivator();

    act(() => {
      useDashboardStore.getState().setActiveVehicle("v2");
    });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/dashboard?vehicleId=v2", { scroll: false });
    });
  });

  it("RF-17.1: remove vehicleId/groupId da URL fora dos modos single/group", async () => {
    window.history.pushState({}, "", "/dashboard?vehicleId=v1");
    await renderActivator();

    await waitFor(() => expect(useDashboardStore.getState().selectionMode).toBe("single"));
    replaceMock.mockClear();

    act(() => {
      useDashboardStore.getState().setMultiSelected(["v1", "v2"]);
    });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/dashboard", { scroll: false });
    });
  });

  // @spec SPEC-20260804-002 RF-09
  it("RF-09: aplica default_context_type='single' do banco quando sessionStorage está vazio", async () => {
    stubFetch({ default_context_type: "single", default_context_id: "v1" });

    await renderActivator();

    await waitFor(() => {
      expect(useDashboardStore.getState().selectionMode).toBe("single");
      expect(useDashboardStore.getState().activeVehicleId).toBe("v1");
    });
  });

  // @spec SPEC-20260804-002 RF-09
  it("RF-09: aplica default_context_type='group' do banco quando sessionStorage está vazio", async () => {
    stubFetch({ default_context_type: "group", default_context_id: "g1" });

    await renderActivator();

    await waitFor(() => {
      expect(useDashboardStore.getState().selectionMode).toBe("group");
      expect(useDashboardStore.getState().activeGroupId).toBe("g1");
    });
  });

  // @spec SPEC-20260804-002 RF-10
  it("RF-10: ignora silenciosamente quando o veículo padrão não existe mais (soft-delete)", async () => {
    stubFetch({ default_context_type: "single", default_context_id: "stale-id" });

    await renderActivator();

    await waitFor(() => {
      expect(useDashboardStore.getState().selectionMode).toBe("none");
    });
  });

  // @spec SPEC-20260804-002 RF-11
  it("RF-11: sessionStorage (deep link) tem precedência sobre a preferência do banco", async () => {
    window.history.pushState({}, "", "/dashboard?vehicleId=v1");
    stubFetch({ default_context_type: "group", default_context_id: "g1" });

    await renderActivator();

    await waitFor(() => expect(useDashboardStore.getState().selectionMode).toBe("single"));
    // a preferência de grupo do banco nunca é aplicada, pois o bootstrap de URL já
    // colocou o store fora de "none" antes do efeito de RF-09 decidir buscar /preferences
    expect(useDashboardStore.getState().activeVehicleId).toBe("v1");
  });
});
