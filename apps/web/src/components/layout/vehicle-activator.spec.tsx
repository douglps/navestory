import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { VehicleActivator } from "./vehicle-activator";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

describe("VehicleActivator", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    localStorage.clear();
    useDashboardStore.getState().clearAllSelection();
    window.history.pushState({}, "", "/dashboard");
  });

  it("RF-15: bootstrap ativa o veículo a partir de ?vehicleId= na URL", async () => {
    window.history.pushState({}, "", "/dashboard?vehicleId=v1");

    render(<VehicleActivator />);

    await waitFor(() => {
      expect(useDashboardStore.getState().selectionMode).toBe("single");
      expect(useDashboardStore.getState().activeVehicleId).toBe("v1");
    });
  });

  it("RF-17.1: sincroniza store -> URL ao ativar um veículo (single)", async () => {
    render(<VehicleActivator />);

    act(() => {
      useDashboardStore.getState().setActiveVehicle("v2");
    });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/dashboard?vehicleId=v2", { scroll: false });
    });
  });

  it("RF-17.1: remove vehicleId/groupId da URL fora dos modos single/group", async () => {
    window.history.pushState({}, "", "/dashboard?vehicleId=v1");
    render(<VehicleActivator />);

    await waitFor(() => expect(useDashboardStore.getState().selectionMode).toBe("single"));
    replaceMock.mockClear();

    act(() => {
      useDashboardStore.getState().setMultiSelected(["v1", "v2"]);
    });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/dashboard", { scroll: false });
    });
  });
});
