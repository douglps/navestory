import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { useVehicleContextField } from "./use-vehicle-context-field";

const vehicles = [
  { id: "v1", vehicle_type: "carro", make: "Fiat", model: "Uno" },
  { id: "v2", vehicle_type: "moto", make: "Honda", model: "CG" },
];

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useVehicleContextField", () => {
  beforeEach(() => {
    localStorage.clear();
    useDashboardStore.getState().clearAllSelection();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) }),
    );
  });

  it("RF-07: modo none inicia com vehicleId vazio e não inherited", () => {
    const { result } = renderHook(() => useVehicleContextField(vehicles), { wrapper });

    expect(result.current.vehicleId).toBe("");
    expect(result.current.isInherited).toBe(false);
  });

  it("RF-07/RF-08: modo single herda o veículo ativo", () => {
    useDashboardStore.getState().setActiveVehicle("v1");
    const { result } = renderHook(() => useVehicleContextField(vehicles), { wrapper });

    expect(result.current.vehicleId).toBe("v1");
    expect(result.current.isInherited).toBe(true);
  });

  it("RF-10: modo multi expõe os veículos selecionados como quickPicks", () => {
    useDashboardStore.getState().setMultiSelected(["v1", "v2"]);
    const { result } = renderHook(() => useVehicleContextField(vehicles), { wrapper });

    expect(result.current.quickPicks.map((v) => v.id)).toEqual(["v1", "v2"]);
    expect(result.current.contextHint).toMatch(/2 veículos selecionados/);
  });

  it("RF-11: modo attribute filtra a lista pelo atributo ativo", () => {
    useDashboardStore.getState().setAttributeFilter({ attribute: "vehicle_type", value: "moto" });
    const { result } = renderHook(() => useVehicleContextField(vehicles), { wrapper });

    expect(result.current.filteredVehicles.map((v) => v.id)).toEqual(["v2"]);
  });
});
