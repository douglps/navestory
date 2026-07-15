import { create } from "zustand";

/**
 * Exemplo de estado puramente client-side (ADR-008): nunca guardar dado
 * de servidor aqui — isso é responsabilidade do TanStack Query.
 */
interface UIState {
  isMobileNavOpen: boolean;
  toggleMobileNav: () => void;
  isSidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  // @spec SPEC-20260602-001 RF-16, RNF-04 — aviso não-obstrutivo de staleness de contexto
  contextStaleNotice: string | null;
  setContextStaleNotice: (message: string) => void;
  clearContextStaleNotice: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMobileNavOpen: false,
  toggleMobileNav: () => set((state) => ({ isMobileNavOpen: !state.isMobileNavOpen })),
  isSidebarCollapsed: false,
  toggleSidebarCollapsed: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  contextStaleNotice: null,
  setContextStaleNotice: (message) => set({ contextStaleNotice: message }),
  clearContextStaleNotice: () => set({ contextStaleNotice: null }),
}));
