"use client";

import * as Sentry from "@sentry/nextjs";
import { Alert } from "@navestory/ui";
import { useEffect, type ReactNode } from "react";

/**
 * @spec SPEC-20260716-002 RF-05
 * Error boundary do App Router para toda a área autenticada `(app)` — Header/Sidebar do
 * layout continuam de pé, só o conteúdo quebra e mostra este fallback amigável em vez da
 * tela branca crua do erro não tratado (achado do teste de ambiente local em 2026-07-19:
 * um crash de render com dado inesperado — ex. resposta antiga presa no cache do Service
 * Worker — derrubava a página inteira sem nenhum boundary local).
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): ReactNode {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="p-6">
      <Alert
        variant="error"
        title="Algo deu errado nesta tela"
        description="Não foi possível carregar o conteúdo. Tente novamente — se persistir, recarregue a página."
        action={{ label: "Tentar novamente", onClick: reset }}
      />
    </div>
  );
}
