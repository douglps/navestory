"use client";

import { useState, type ReactNode } from "react";
import { CONTEXT_LABELS } from "@/lib/context/context-labels";
import { useVehicleContext } from "@/lib/context/use-vehicle-context";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import type { SelectionMode } from "@/lib/stores/use-dashboard-store";
import { VehicleContextDialog } from "./vehicle-context-dialog";
import { VehicleContextSheet } from "./vehicle-context-sheet";

const MODE_ICONS: Record<SelectionMode, string> = {
  none: "",
  single: "🚗",
  group: "⬡",
  multi: "🚗",
  attribute: "🎚️",
};

/**
 * @spec SPEC-20260603-001 RF-02 — estados visuais por modo (sólido = permanente,
 * tracejado = temporário, mesma convenção da SPEC-20260602-001).
 */
function getModeStyles(mode: SelectionMode): string {
  switch (mode) {
    case "single":
      return "border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20";
    case "group":
      return "border border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20";
    case "multi":
      return "border border-dashed border-amber-400 bg-amber-100 dark:border-amber-600 dark:bg-amber-800/20";
    case "attribute":
      return "border border-dashed border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-900/20";
    default:
      return "border border-dashed border-border/40 bg-transparent";
  }
}

/**
 * Chip de contexto de veículo/grupo, permanentemente visível no header.
 * Abre um Dialog (desktop) ou Sheet (mobile) conforme o breakpoint.
 *
 * @spec SPEC-20260603-001 RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-24
 */
export function VehicleContextChip(): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { hasHydrated, selectionMode, label, ariaLabel, clearAllSelection } = useVehicleContext();

  // RF-24: skeleton estático enquanto o store não hidratou — nunca exibe `none` transitório.
  if (!hasHydrated) {
    return (
      <div
        aria-hidden
        className="h-11 min-w-[80px] w-32 animate-pulse rounded-lg bg-muted"
      />
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        aria-label={ariaLabel}
        className={`flex h-11 max-w-[140px] cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors duration-200 hover:ring-1 hover:ring-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${getModeStyles(selectionMode)}`}
      >
        {/* eslint-disable-next-line security/detect-object-injection -- selectionMode é SelectionMode, union fixa de 5 literais */}
        {MODE_ICONS[selectionMode] && (
          <span aria-hidden className="shrink-0 leading-none">
            {/* eslint-disable-next-line security/detect-object-injection -- idem */}
            {MODE_ICONS[selectionMode]}
          </span>
        )}
        <span className="truncate">{label}</span>
        {selectionMode !== "none" && (
          <button
            type="button"
            aria-label={CONTEXT_LABELS.viewAllFleet}
            onClick={(event) => {
              event.stopPropagation();
              clearAllSelection();
            }}
            className="shrink-0 rounded-full p-[10px] -m-[10px] text-neutral-500 hover:text-neutral-800"
          >
            <span aria-hidden>×</span>
          </button>
        )}
      </div>

      {isDesktop ? (
        <VehicleContextDialog open={isOpen} onOpenChange={setIsOpen} />
      ) : (
        <VehicleContextSheet open={isOpen} onOpenChange={setIsOpen} />
      )}
    </>
  );
}
