"use client";

import { useEffect, type ReactNode } from "react";
import { useSerwist } from "@serwist/turbopack/react";
import { useUIStore } from "@/lib/stores/ui-store";

/**
 * Ouve o evento "waiting" do Service Worker (nova versão instalada, aguardando ativação) e
 * exibe um toast persistente. `skipWaiting()`/`clientsClaim()` só rodam após o clique em
 * "Recarregar" — nunca automaticamente (RNF-07).
 *
 * Não reaproveita `ContextStaleToast` diretamente: aquele componente auto-descarta em 5s e
 * não tem botão de ação, o que contraria RF-14 (persistente, com ação). Reaproveita o mesmo
 * padrão visual e o `ui-store` (Zustand), conforme D10 — sem introduzir lib de toast nova.
 *
 * @spec SPEC-20260712-001 RF-14, RF-15
 */
export function ServiceWorkerUpdateToast(): ReactNode {
  const { serwist } = useSerwist();
  const isVisible = useUIStore((state) => state.swUpdateAvailable);
  const setSwUpdateAvailable = useUIStore((state) => state.setSwUpdateAvailable);

  useEffect(() => {
    if (!serwist) return;
    const onWaiting = () => setSwUpdateAvailable(true);
    serwist.addEventListener("waiting", onWaiting);
    return () => serwist.removeEventListener("waiting", onWaiting);
  }, [serwist, setSwUpdateAvailable]);

  const handleReload = () => {
    if (!serwist) return;
    serwist.addEventListener("controlling", () => window.location.reload());
    serwist.messageSkipWaiting();
  };

  if (!isVisible) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-[150] flex items-center gap-3 rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
    >
      <span>Nova versão disponível.</span>
      <button
        type="button"
        onClick={handleReload}
        className="rounded-md bg-[#3b70ca] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
      >
        Recarregar
      </button>
    </div>
  );
}
