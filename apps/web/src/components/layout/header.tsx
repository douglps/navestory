"use client";

import type { ReactNode } from "react";
import { VehicleContextChip } from "./vehicle-context-chip";

/**
 * Header superior fixo do app shell — logo + chip de contexto de veículo,
 * sempre visível em todos os breakpoints (substitui o `FocusSlot` do sidebar).
 *
 * @spec SPEC-20260603-001 RF-01
 */
export function Header(): ReactNode {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-neutral-200 bg-white px-4">
      <span className="text-base font-semibold">Nave</span>
      <VehicleContextChip />
    </header>
  );
}
