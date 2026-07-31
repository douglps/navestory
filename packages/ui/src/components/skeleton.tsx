import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * @spec SPEC-20260730-001 RF-02 — substitui `animate-pulse rounded-* bg-muted` duplicado em
 * 5 lugares, incluindo dentro do próprio pacote (`kpi-card.tsx`, `chart-wrapper.tsx`).
 * Sem tamanho default — cada consumidor define `h-*`/`w-*` via `className`.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactNode {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}
