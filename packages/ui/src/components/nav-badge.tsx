import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface NavBadgeProps {
  /** Contagem real — o truncamento em "9+" é responsabilidade interna do componente (R-DS-01). */
  count: number;
  className?: string;
}

/**
 * @spec SPEC-20260721-001 RF-04
 * Badge de contagem para itens de navegação (sidebar/header). `count <= 0` oculta o badge —
 * nunca renderiza "0". `count > 9` sempre exibe "9+", nunca o valor real (R-DS-01), para que o
 * layout da navegação nunca precise acomodar mais de dois caracteres visuais.
 */
export function NavBadge({ count, className }: NavBadgeProps): ReactNode {
  if (count <= 0) return null;

  const label = count > 9 ? "9+" : String(count);

  return (
    <span
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1",
        "text-[10px] font-bold leading-none text-danger-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}
