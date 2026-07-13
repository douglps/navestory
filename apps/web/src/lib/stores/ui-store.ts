import { create } from "zustand";

/**
 * Exemplo de estado puramente client-side (ADR-008): nunca guardar dado
 * de servidor aqui — isso é responsabilidade do TanStack Query.
 */
interface UIState {
  isMobileNavOpen: boolean;
  toggleMobileNav: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMobileNavOpen: false,
  toggleMobileNav: () => set((state) => ({ isMobileNavOpen: !state.isMobileNavOpen })),
}));
