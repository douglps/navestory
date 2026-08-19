"use client";

import type { ReceiptUrls } from "@navestory/validators";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";

function DocumentIcon(): ReactNode {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

/**
 * @spec SPEC-20260814-004 US-02
 * Ícone pequeno de "tem comprovante" para uso em listagens — sem buscar signed URL (evita N
 * requisições por página de listagem). O clique/visualização completa fica na tela de detalhe
 * (`ReceiptViewer`).
 */
export function ReceiptIndicator(): ReactNode {
  return (
    <span
      className="inline-flex items-center text-muted-foreground"
      aria-label="Despesa com comprovante anexado"
      title="Comprovante anexado"
    >
      <DocumentIcon />
    </span>
  );
}

/**
 * @spec SPEC-20260814-004 RF-07, RF-05, RF-06, RNF-03, US-02
 * Decisão de thumbnail assíncrono (2026-08-14): enquanto `receipt_thumbnail_status === 'pending'`
 * (upload de imagem recente, geração ainda rodando em job fire-and-forget), exibe fallback
 * "preparando prévia" — nunca bloqueia a visualização do arquivo original, que já está disponível
 * desde o upload síncrono. PDF e falhas de geração (`failed`) caem no mesmo ícone estático de
 * documento permanentemente (R-RCP-05).
 */
export function ReceiptViewer({
  expenseId,
  hasReceipt,
}: {
  expenseId: string;
  hasReceipt: boolean;
}): ReactNode {
  const { data, isLoading } = useQuery({
    queryKey: ["expenses", expenseId, "receipt"],
    queryFn: () => apiClient<ReceiptUrls>(`/expenses/${expenseId}/receipt`),
    enabled: hasReceipt,
    retry: false,
  });

  if (!hasReceipt) return null;

  if (isLoading || !data) {
    return (
      <p className="text-sm text-muted-foreground">Carregando comprovante…</p>
    );
  }

  const showThumbnail =
    !data.is_pdf && data.thumbnail_status === "completed" && data.thumbnail_url;
  const preparing = !data.is_pdf && data.thumbnail_status === "pending";

  return (
    <a
      href={data.original_url}
      target="_blank"
      rel="noreferrer"
      className="flex w-fit items-center gap-2 rounded-md border border-border p-2 text-sm hover:bg-muted"
    >
      {showThumbnail ? (
        <img
          src={data.thumbnail_url ?? undefined}
          alt="Prévia do comprovante"
          className="h-12 w-12 rounded object-cover"
        />
      ) : (
        <span
          className="flex h-12 w-12 items-center justify-center rounded bg-muted text-muted-foreground"
          aria-hidden="true"
        >
          <DocumentIcon />
        </span>
      )}
      <span>
        {preparing ? "Comprovante anexado — preparando prévia" : "Ver comprovante"}
      </span>
    </a>
  );
}
