import { create } from "zustand";
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
}

export const useUIStore = create<UIState>((set) => ({
  isMobileNavOpen: false,
  toggleMobileNav: () => set((state) => ({ isMobileNavOpen: !state.isMobileNavOpen })),
  isSidebarCollapsed: false,
  toggleSidebarCollapsed: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  toasts: [],
  pushToast: (toast) =>
    set((state) => ({ toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }] })),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
