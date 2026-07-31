"use client";

import type { ReactNode } from "react";
import { Button } from "@nave/ui";

/**
 * Fallback de navegação quando uma rota nunca visitada é acessada sem conexão (EC-01).
 * Rota dedicada, não overlay (D12/Q2) — apontada por `precacheFallback` em sw.ts.
 *
 * @spec SPEC-20260712-001 RF-07
 * @spec SPEC-20260729-002 — migrado de cor hardcoded (#fafafa/neutral-*) para tokens
 */
export default function OfflinePage(): ReactNode {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="text-4xl" aria-hidden="true">
        📴
      </span>
      <h1 className="text-lg font-semibold text-foreground">Você está sem conexão</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Algumas informações podem não estar disponíveis. Esta página ainda não foi visitada com
        internet, por isso não há uma cópia salva para exibir agora.
      </p>
      <Button type="button" variant="outline" onClick={() => window.location.reload()}>
        Tentar novamente
      </Button>
    </main>
  );
}
