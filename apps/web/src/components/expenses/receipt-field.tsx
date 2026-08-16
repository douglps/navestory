"use client";

import {
  RECEIPT_ALLOWED_MIME_TYPES,
  RECEIPT_MAX_SIZE_BYTES,
} from "@navestory/validators";
import { FileUpload } from "@navestory/ui";
import { useEffect, useState, type ReactNode } from "react";

export interface ReceiptFieldProps {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

const ACCEPT = RECEIPT_ALLOWED_MIME_TYPES.join(",");

function DocumentIcon(): ReactNode {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
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
 * @spec SPEC-20260814-004 RF-01, RF-04, RF-10, RF-12, RNF-04, RNF-07
 * Decisão de arquitetura do gate técnico da spec: `POST /expenses/:id/receipt` exige uma despesa
 * já existente — diferente do fluxo original de US-01 (upload durante o preenchimento). Aqui o
 * arquivo fica em memória (estado do formulário) e só é enviado após a despesa ser criada
 * (`new/page.tsx`); "Remover" (RF-12) só limpa o estado local, sem chamada ao servidor, já que
 * nada foi enviado ainda. Reaproveita `FileUpload` de `@navestory/ui` (allowlist, limite de
 * tamanho e drag-and-drop já implementados — RNF-07 sem duplicar validação client-side).
 */
export function ReceiptField({
  file,
  onChange,
  disabled,
}: ReceiptFieldProps): ReactNode {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || file.type === "application/pdf") {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (file) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Comprovante</span>
        <div className="flex items-center gap-3 rounded-md border border-border p-2">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Prévia do comprovante selecionado"
              className="h-16 w-16 shrink-0 rounded object-cover"
            />
          ) : (
            <span
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground"
              aria-hidden="true"
            >
              <DocumentIcon />
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm">{file.name}</span>
            <span className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(0)}KB
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            aria-label="Remover comprovante"
            className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            Remover
          </button>
        </div>
      </div>
    );
  }

  return (
    <FileUpload
      label="Comprovante (opcional)"
      accept={ACCEPT}
      maxSize={RECEIPT_MAX_SIZE_BYTES}
      maxFiles={1}
      disabled={disabled}
      hint="Foto ou PDF do cupom fiscal. Para melhor extração futura, prefira fotos nítidas (≥1200px)."
      onFilesChange={(files) => onChange(files[0] ?? null)}
    />
  );
}
