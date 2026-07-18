import { beforeEach, describe, expect, it } from "vitest";
import { useDashboardStore } from "./use-dashboard-store";

function getPersisted(): { state: { selectionMode: string } } | null {
  const raw = sessionStorage.getItem("nave-dashboard-context");
  return raw ? JSON.parse(raw) : null;
}

describe("useDashboardStore", () => {
  beforeEach(() => {
    sessionStorage.clear();
    useDashboardStore.getState().clearAllSelection();
  });

  it("inicia no modo none, sem seleção", () => {
    const state = useDashboardStore.getState();
    expect(state.selectionMode).toBe("none");
    expect(state.activeVehicleId).toBeNull();
    expect(state.activeGroupId).toBeNull();
  });

  it("R-CTX-01: ativar single zera os campos de outros modos", () => {
    useDashboardStore.getState().setMultiSelected(["v1", "v2"]);
    useDashboardStore.getState().setActiveVehicle("v3");

    const state = useDashboardStore.getState();
    expect(state.selectionMode).toBe("single");
    expect(state.activeVehicleId).toBe("v3");
    expect(state.multiSelectedIds).toEqual([]);
  });

  it("R-CTX-01: ativar group zera activeVehicleId", () => {
    useDashboardStore.getState().setActiveVehicle("v1");
    useDashboardStore.getState().setActiveGroup("g1");

    const state = useDashboardStore.getState();
    expect(state.selectionMode).toBe("group");
    expect(state.activeGroupId).toBe("g1");
    expect(state.activeVehicleId).toBeNull();
  });

  it("clearAllSelection retorna ao modo none", () => {
    useDashboardStore.getState().setActiveVehicle("v1");
    useDashboardStore.getState().clearAllSelection();

    const state = useDashboardStore.getState();
    expect(state.selectionMode).toBe("none");
    expect(state.activeVehicleId).toBeNull();
  });

  it("R-CTX-02: persiste single em sessionStorage", () => {
    useDashboardStore.getState().setActiveVehicle("v1");

    expect(getPersisted()?.state.selectionMode).toBe("single");
  });

  it("R-CTX-02: não persiste multi (efêmero) em sessionStorage", () => {
    useDashboardStore.getState().setMultiSelected(["v1", "v2"]);

    expect(getPersisted()?.state.selectionMode).toBe("none");
  });

  it("R-CTX-02: não persiste attribute (efêmero) em sessionStorage", () => {
    useDashboardStore.getState().setAttributeFilter({ attribute: "tipo", value: "carro" });

    expect(getPersisted()?.state.selectionMode).toBe("none");
  });

  it("SPEC-20260531-001 RF-ST-01: dockOpen inicia fechado e alterna via setDockOpen", () => {
    expect(useDashboardStore.getState().dockOpen).toBe(false);

    useDashboardStore.getState().setDockOpen(true);
    expect(useDashboardStore.getState().dockOpen).toBe(true);

    useDashboardStore.getState().setDockOpen(false);
    expect(useDashboardStore.getState().dockOpen).toBe(false);
  });

  it("RF-ST-01: dockOpen não é persistido em sessionStorage (estado efêmero de UI)", () => {
    useDashboardStore.getState().setActiveVehicle("v1");
    useDashboardStore.getState().setDockOpen(true);

    const persisted = getPersisted() as { state: { dockOpen?: boolean } } | null;
    expect(persisted?.state.dockOpen).toBeUndefined();
  });
});
