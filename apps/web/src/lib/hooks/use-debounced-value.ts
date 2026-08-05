"use client";

import { useEffect, useState } from "react";

/**
 * @spec SPEC-20260801-002 RF-04, RF-05
 * Debounce genérico — usado pela simulação "e se" para recalcular só 200ms após o usuário
 * parar de interagir com os controles (slider/select), sem chamada ao backend.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
