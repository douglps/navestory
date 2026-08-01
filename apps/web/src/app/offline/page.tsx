"use client";

import type { ReactNode } from "react";
import { Button } from "@navestory/ui";
import { LegalFooter } from "@/components/legal-footer";
import { PublicHeader } from "@/components/public-header";

/**
 * Fallback de navegação quando uma rota nunca visitada é acessada sem conexão (EC-01).
 * Rota dedicada, não overlay (D12/Q2) — apontada por `precacheFallback` em sw.ts.
 *
 * @spec SPEC-20260712-001 RF-07
 * @spec SPEC-20260729-002 — migrado de cor hardcoded (#fafafa/neutral-*) para tokens
 * @spec SPEC-20260731-004 RF-06, RF-07 — header e footer públicos consistentes
 */
export default function OfflinePage(): ReactNode {
  return (
    <>
      <PublicHeader />
      <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <span className="text-4xl" aria-hidden="true">
          📴
        </span>
        <h1 className="text-lg font-semibold text-foreground">
          Você está sem conexão
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Algumas informações podem não estar disponíveis. Esta página ainda não
          foi visitada com internet, por isso não há uma cópia salva para exibir
          agora.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.location.reload()}
        >
          Tentar novamente
        </Button>
      </main>
      <LegalFooter />
    </>
  );
}
