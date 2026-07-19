import { create } from "zustand";

interface ConnectivityState {
  isOnline: boolean;
  markOnline: () => void;
  markOffline: () => void;
}

/**
 * Fonte única de verdade de conectividade, compartilhada entre o hook de UI
 * (`useOnlineStatus`, RF-13) e `api-client.ts` (RF-11/RF-11.1). Inicializa a partir de
 * `navigator.onLine`; falhas de rede reais com `navigator.onLine === true` (EC-08) chamam
 * `markOffline()` diretamente do `api-client.ts`, corrigindo o falso positivo (R-PWA-08/D11).
 *
 * @spec SPEC-20260712-001 RF-11, RF-11.1, RF-13, R-PWA-08
 */
export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
  markOnline: () => set({ isOnline: true }),
  markOffline: () => set({ isOnline: false }),
}));
