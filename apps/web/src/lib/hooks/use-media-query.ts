"use client";

import { useEffect, useState } from "react";

/**
 * Hook reativo de media query, SSR-safe.
 *
 * Retorna `false` até o componente montar no client, evitando hydration
 * mismatch (o servidor não tem `window.matchMedia`). O primeiro render no
 * client já corrige o valor via `useEffect`.
 *
 * @spec SPEC-20260603-001 Notas Técnicas — Resolução de breakpoint
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);

    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQueryList.addEventListener("change", listener);
    return () => mediaQueryList.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
