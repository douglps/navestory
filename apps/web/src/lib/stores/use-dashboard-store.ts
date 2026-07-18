import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type SelectionMode = "none" | "single" | "group" | "multi" | "attribute";

export interface AttributeFilter {
  attribute: string;
  value: string;
}

interface DashboardContextState {
  selectionMode: SelectionMode;
  activeVehicleId: string | null;
  activeGroupId: string | null;
  multiSelectedIds: string[];
  attributeFilter: AttributeFilter | null;
  hasHydrated: boolean;
  dockOpen: boolean;
  setActiveVehicle: (vehicleId: string) => void;
  setActiveGroup: (groupId: string) => void;
  setMultiSelected: (vehicleIds: string[]) => void;
  setAttributeFilter: (filter: AttributeFilter) => void;
  clearAllSelection: () => void;
  markHydrated: () => void;
  setDockOpen: (open: boolean) => void;
}

const EMPTY_SELECTION = {
  selectionMode: "none" as const,
  activeVehicleId: null,
  activeGroupId: null,
  multiSelectedIds: [] as string[],
  attributeFilter: null,
};

/**
 * Store global do sistema "Em Foco" — contexto de veículo/grupo/seleção.
 * @spec SPEC-20260602-001 R-CTX-01, R-CTX-02
 */
export const useDashboardStore = create<DashboardContextState>()(
  persist(
    (set) => ({
      ...EMPTY_SELECTION,
      hasHydrated: false,
      dockOpen: false,
      // R-CTX-01: ativar um modo zera os campos dos demais modos.
      setActiveVehicle: (vehicleId) =>
        set({ ...EMPTY_SELECTION, selectionMode: "single", activeVehicleId: vehicleId }),
      setActiveGroup: (groupId) =>
        set({ ...EMPTY_SELECTION, selectionMode: "group", activeGroupId: groupId }),
      setMultiSelected: (vehicleIds) =>
        set({ ...EMPTY_SELECTION, selectionMode: "multi", multiSelectedIds: vehicleIds }),
      setAttributeFilter: (filter) =>
        set({ ...EMPTY_SELECTION, selectionMode: "attribute", attributeFilter: filter }),
      clearAllSelection: () => set({ ...EMPTY_SELECTION }),
      markHydrated: () => set({ hasHydrated: true }),
      // @spec SPEC-20260531-001 RF-ST-01
      setDockOpen: (open) => set({ dockOpen: open }),
    }),
    {
      name: "nave-dashboard-context",
      // @spec SPEC-20260603-001 RF-21 — sessionStorage isola o contexto por aba
      // (corrige a decisão original de localStorage da SPEC-20260602-001).
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
      // R-CTX-02: apenas single/group sobrevivem ao reload; multi/attribute são efêmeros.
      partialize: (state) =>
        state.selectionMode === "single" || state.selectionMode === "group"
          ? {
              selectionMode: state.selectionMode,
              activeVehicleId: state.activeVehicleId,
              activeGroupId: state.activeGroupId,
            }
          : EMPTY_SELECTION,
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
