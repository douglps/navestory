"use client";

import { useEffect, type ReactNode } from "react";
import { useUIStore } from "@/lib/stores/ui-store";

const AUTO_DISMISS_MS = 5000;

/**
 * Toast disparado centralmente por `api-client.ts` sempre que uma mutação é bloqueada por
 * falta de conexão (RF-11) ou falha de rede real (RF-11.1) — nenhuma tela/formulário precisa
 * tratar isso individualmente. Mesmo padrão visual de `ContextStaleToast` (D10), mas com
 * store próprio: são avisos de specs e origens diferentes, não a mesma notificação.
 *
 * @spec SPEC-20260712-001 RF-11, RF-11.1, RF-12
 */
export function OfflineWriteBlockedToast(): ReactNode {
  const message = useUIStore((state) => state.offlineWriteBlockedNotice);
  const clearNotice = useUIStore((state) => state.clearOfflineWriteBlockedNotice);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => clearNotice(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [message, clearNotice]);

  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-[150] flex items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200"
    >
      <span>{message}</span>
      <button
        type="button"
        aria-label="Fechar aviso"
        onClick={() => clearNotice()}
        className="text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
      >
        ×
      </button>
    </div>
  );
}
