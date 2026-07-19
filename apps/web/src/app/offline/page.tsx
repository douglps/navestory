"use client";

import type { ReactNode } from "react";

/**
 * Fallback de navegação quando uma rota nunca visitada é acessada sem conexão (EC-01).
 * Rota dedicada, não overlay (D12/Q2) — apontada por `precacheFallback` em sw.ts.
 *
 * @spec SPEC-20260712-001 RF-07
 */
export default function OfflinePage(): ReactNode {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#fafafa] px-6 text-center dark:bg-neutral-950">
      <span className="text-4xl" aria-hidden="true">
        📴
      </span>
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        Você está sem conexão
      </h1>
      <p className="max-w-sm text-sm text-neutral-600 dark:text-neutral-400">
        Algumas informações podem não estar disponíveis. Esta página ainda não foi visitada com
        internet, por isso não há uma cópia salva para exibir agora.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
      >
        Tentar novamente
      </button>
    </main>
  );
}
