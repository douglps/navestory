"use client";

import { useCallback, useEffect, useState } from "react";

function draftKey(route: string): string {
  return `navestory_form_draft_${route}`;
}

/**
 * @spec SPEC-20260524-001 STORY-07b
 * Persiste dados de formulário em sessionStorage para sobreviver a um logout por
 * expiração de sessão (idle timeout). Genérico — não conhece rotas específicas;
 * cada página de formulário (`/expenses/new`, `/maintenance/new`, `/vehicles/new`
 * quando existirem) passa sua própria `route` como chave.
 */
export function useFormDraft<T extends Record<string, unknown>>(route: string) {
  const [draft, setDraftState] = useState<T | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(draftKey(route));
    if (stored) {
      try {
        setDraftState(JSON.parse(stored) as T);
      } catch {
        setDraftState(null);
      }
    }
  }, [route]);

  const saveDraft = useCallback(
    (values: T) => {
      sessionStorage.setItem(draftKey(route), JSON.stringify(values));
      setDraftState(values);
    },
    [route],
  );

  const clearDraft = useCallback(() => {
    sessionStorage.removeItem(draftKey(route));
    setDraftState(null);
  }, [route]);

  return { draft, saveDraft, clearDraft };
}
