"use client";

import { useEffect } from "react";
import { useConnectivityStore } from "@/lib/pwa/connectivity-store";

/**
 * Hook reativo de status de conectividade via eventos `online`/`offline`.
 *
 * Reaproveita `useConnectivityStore` (SPEC-20260712-001) como fonte única de verdade — não é
 * mais um `useState` isolado por instância: falhas de rede reais detectadas em
 * `api-client.ts` (RF-11.1/EC-08, `navigator.onLine` mentindo) agora também se refletem
 * aqui, então todo consumidor deste hook (ex: `VehicleSwitcherContent`, `ConnectivityIndicator`)
 * vê o mesmo estado corrigido, não apenas o sinal bruto do navegador.
 *
 * @spec SPEC-20260603-001 RF-14
 * @spec SPEC-20260712-001 RF-11, RF-13, RNF-04
 */
export function useOnlineStatus(): boolean {
  const isOnline = useConnectivityStore((state) => state.isOnline);
  const markOnline = useConnectivityStore((state) => state.markOnline);
  const markOffline = useConnectivityStore((state) => state.markOffline);

  useEffect(() => {
    const goOnline = () => markOnline();
    const goOffline = () => markOffline();

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [markOnline, markOffline]);

  return isOnline;
}
