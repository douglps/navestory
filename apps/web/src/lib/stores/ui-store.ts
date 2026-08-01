import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ToastItem } from "@nave/ui";

/**
 * Exemplo de estado puramente client-side (ADR-008): nunca guardar dado
 * de servidor aqui — isso é responsabilidade do TanStack Query.
 */
interface UIState {
  isMobileNavOpen: boolean;
  toggleMobileNav: () => void;
  isSidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  // @spec SPEC-20260525-001 §8.2 — fila única de toasts; migra os campos dedicados de
  // SPEC-20260602-001 RF-16 (contextStaleNotice) e SPEC-20260712-001 RF-14/RF-11.1
  // (swUpdateAvailable/offlineWriteBlockedNotice), removidos nesta tarefa.
  toasts: ToastItem[];
  pushToast: (toast: Omit<ToastItem, "id">) => void;
  dismissToast: (id: string) => void;
  // @spec SPEC-20260730-002 RF-06, RNF-05
  hasHydrated: boolean;
  markHydrated: () => void;
}

/**
 * @spec SPEC-20260730-002 RF-06 — `isSidebarCollapsed` sobrevive a reload/nova aba via
 * `sessionStorage` (mesma convenção de `use-dashboard-store.ts`); `skipHydration: true` +
 * `hasHydrated`/`markHydrated()` evitam hydration mismatch no SSR (RNF-05) — a rehidratação
 * é disparada manualmente no client (ver `Sidebar`).
 */
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isMobileNavOpen: false,
      toggleMobileNav: () => set((state) => ({ isMobileNavOpen: !state.isMobileNavOpen })),
      isSidebarCollapsed: false,
      toggleSidebarCollapsed: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      toasts: [],
      pushToast: (toast) =>
        set((state) => ({ toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }] })),
      dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
      hasHydrated: false,
      markHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: "nave-ui-state",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
      partialize: (state) => ({ isSidebarCollapsed: state.isSidebarCollapsed }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
