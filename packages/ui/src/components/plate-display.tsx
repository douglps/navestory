import type { ReactNode } from "react";
import { cn } from "../lib/cn";

// Azul oficial das placas Mercosul brasileiras — hardcode intencional,
// não derivado de token do tema (é uma cor documental, não de UI).
// A placa real não muda de cor com o tema claro/escuro.
const PLATE_BLUE = "#003399";

export type PlateDisplaySize = "compact" | "sm" | "lg";

export interface PlateDisplayProps {
  plate: string;
  /**
   * compact — chips e listas (faixa azul no topo, sem texto "BRASIL")
   * sm      — padrão para cards e tooltips
   * lg      — cabeçalhos de página (manage, detail)
   */
  size?: PlateDisplaySize;
  className?: string;
}

/**
 * Exibição visual de placa Mercosul brasileira — complemento ao PlateInput.
 * Usar este componente em modo de leitura (cards, listas, cabeçalhos).
 * Usar PlateInput para formulários de entrada.
 *
 * Portado de Nave-SaaS-main/apps/web/components/ui/mercosul-plate.tsx
 * com adaptação de import (cn de @navestory/ui → ../lib/cn).
 */
export function PlateDisplay({ plate, size = "sm", className }: PlateDisplayProps): ReactNode {
  const text = plate.toUpperCase();

  if (size === "compact") {
    return (
      <span
        className={cn("inline-flex shrink-0 flex-col overflow-hidden rounded-[2px]", className)}
        style={{ border: `1px solid ${PLATE_BLUE}` }}
      >
        {/* Faixa azul topo — evoca o cabeçalho BRASIL sem texto ilegível neste tamanho */}
        <span className="block h-[4px] w-full" style={{ backgroundColor: PLATE_BLUE }} />
        <span
          className="px-[5px] py-px font-mono text-[10px] font-black leading-none tabular-nums"
          style={{ color: PLATE_BLUE }}
        >
          {text}
        </span>
      </span>
    );
  }

  if (size === "lg") {
    return (
      <div
        className={cn(
          "flex shrink-0 flex-col overflow-hidden rounded-[3px] bg-white shadow-sm",
          className,
        )}
        style={{ border: `1.5px solid ${PLATE_BLUE}` }}
      >
        <div
          className="flex h-3.5 items-center justify-between px-1.5"
          style={{ backgroundColor: PLATE_BLUE }}
        >
          <span className="text-[9px] font-black italic tracking-tighter text-white">BRASIL</span>
        </div>
        <div className="flex items-center justify-center px-3 py-1">
          <span
            className="font-mono text-xl font-black leading-none tracking-tighter tabular-nums"
            style={{ color: PLATE_BLUE }}
          >
            {text}
          </span>
        </div>
      </div>
    );
  }

  // sm — padrão
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col overflow-hidden rounded-[2px] bg-white shadow-sm",
        className,
      )}
      style={{ border: `1px solid ${PLATE_BLUE}` }}
    >
      <div
        className="flex h-2.5 items-center justify-center px-1"
        style={{ backgroundColor: PLATE_BLUE }}
      >
        <span className="text-[6px] font-black italic tracking-[0.05rem] text-white">BRASIL</span>
      </div>
      <div className="flex items-center justify-center px-2 py-0.5">
        <span
          className="font-mono text-[13px] font-black leading-none tracking-tighter tabular-nums"
          style={{ color: PLATE_BLUE }}
        >
          {text}
        </span>
      </div>
    </div>
  );
}
