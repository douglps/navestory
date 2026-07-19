"use client";

import { useEffect, type ReactNode } from "react";
import { useSerwist } from "@serwist/turbopack/react";
import { useUIStore } from "@/lib/stores/ui-store";

/**
 * @spec SPEC-20260525-001 §8.2 — migra `ServiceWorkerUpdateToast` (SPEC-20260712-001 RF-14)
 * para a fila única de toasts. Componente headless: só ouve o evento `"waiting"` do Serwist
 * e empurra um toast persistente (`duration: 0`) com a ação "Recarregar" — o mesmo
 * comportamento visual de antes, agora renderizado por `<ToastViewport />`.
 */
export function ServiceWorkerUpdateListener(): ReactNode {
  const { serwist } = useSerwist();
  const pushToast = useUIStore((state) => state.pushToast);

  useEffect(() => {
    if (!serwist) return;

    const onWaiting = () => {
      const handleReload = () => {
        serwist.addEventListener("controlling", () => window.location.reload());
        serwist.messageSkipWaiting();
      };

      pushToast({
        variant: "info",
        title: "Nova versão disponível.",
        duration: 0,
        action: { label: "Recarregar", onClick: handleReload },
      });
    };

    serwist.addEventListener("waiting", onWaiting);
    return () => serwist.removeEventListener("waiting", onWaiting);
  }, [serwist, pushToast]);

  return null;
}
