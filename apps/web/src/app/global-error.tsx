"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect, type ReactNode } from "react";

/**
 * @spec SPEC-20260716-002 RF-05
 * Error boundary global do App Router — captura erros de renderização RSC e
 * client-side não tratados por nenhum error.tsx local.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }): ReactNode {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
