"use client";

import { useEffect, type ReactNode } from "react";
import { useUIStore } from "@/lib/stores/ui-store";

const AUTO_DISMISS_MS = 5000;

/**
 * Toast não-obstrutivo para avisos de staleness de contexto.
 * @spec SPEC-20260602-001 RF-16, RNF-04
 */
export function ContextStaleToast(): ReactNode {
  const message = useUIStore((state) => state.contextStaleNotice);
  const clearContextStaleNotice = useUIStore((state) => state.clearContextStaleNotice);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => clearContextStaleNotice(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [message, clearContextStaleNotice]);

  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-[150] flex items-center gap-3 rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm shadow-lg"
    >
      <span>{message}</span>
      <button
        type="button"
        aria-label="Fechar aviso"
        onClick={() => clearContextStaleNotice()}
        className="text-neutral-500 hover:text-neutral-800"
      >
        ×
      </button>
    </div>
  );
}
