"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { getMostRecentCacheTimestamp } from "@/lib/pwa/get-cache-age";
import { formatCacheAge } from "@/lib/pwa/format-cache-age";

/**
 * Pill compacto no Header, ao lado do `VehicleContextChip` — não banner full-width (D8).
 * Online: ausente (sem CLS, espaço reservado pela altura fixa do Header). Offline:
 * "Offline · Atualizado [Hoje/Ontem/DD-MM-AA HH:mm]" (RF-13.1/R-PWA-07).
 *
 * @spec SPEC-20260712-001 RF-13
 */
export function ConnectivityIndicator(): ReactNode {
  const isOnline = useOnlineStatus();
  const pathname = usePathname();
  const [ageLabel, setAgeLabel] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOnline) {
      setAgeLabel(null);
      return;
    }
    let cancelled = false;
    getMostRecentCacheTimestamp(pathname).then((timestamp) => {
      if (cancelled) return;
      setAgeLabel(timestamp ? formatCacheAge(timestamp) : null);
    });
    return () => {
      cancelled = true;
    };
  }, [isOnline, pathname]);

  // Primeiro render do client precisa ser idêntico ao SSR (sem `navigator`), senão
  // `navigator.onLine` já offline no mount causa hydration mismatch (RF-13).
  if (!mounted || isOnline) return null;

  return (
    <span
      role="status"
      aria-live="polite"
      className="ml-auto flex h-8 items-center rounded-lg border border-amber-300 bg-amber-50 px-2.5 text-xs font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200"
    >
      Offline{ageLabel ? ` · Atualizado ${ageLabel}` : ""}
    </span>
  );
}
