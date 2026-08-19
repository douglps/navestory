"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Car, Layers, SlidersHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Icon, Skeleton } from "@navestory/ui";
import { CONTEXT_LABELS } from "@/lib/context/context-labels";
import { useVehicleContext } from "@/lib/context/use-vehicle-context";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import type { SelectionMode } from "@/lib/stores/use-dashboard-store";
import { VehicleContextDialog } from "./vehicle-context-dialog";
import { VehicleContextSheet } from "./vehicle-context-sheet";

/**
 * @spec SPEC-20260813-001 RF-19 — ícone Lucide via wrapper <Icon>, interino até a integração
 * de logo de marca do fabricante (Opção B, a implementar assim que houver fonte de dado viável).
 */
const MODE_ICONS: Record<SelectionMode, LucideIcon | null> = {
  none: null,
  single: Car,
  group: Layers,
  multi: Car,
  attribute: SlidersHorizontal,
};

/**
 * @spec SPEC-20260603-001 RF-02 — estados visuais por modo (sólido = permanente,
 * tracejado = temporário, mesma convenção da SPEC-20260602-001).
 * @spec SPEC-20260729-002 RF-02 — paleta categórica (não tem status real, R-DS-07): single/multi
 * compartilham o mesmo matiz (categorical-4/Sand), diferenciados só por borda sólida/tracejada e
 * intensidade; group usa categorical-1/Azure; attribute usa categorical-5/Plum.
 */
function getModeStyles(mode: SelectionMode): string {
  switch (mode) {
    case "single":
      return "border border-categorical-4 bg-categorical-4/10";
    case "group":
      return "border border-categorical-1 bg-categorical-1/10";
    case "multi":
      return "border border-dashed border-categorical-4 bg-categorical-4/20";
    case "attribute":
      return "border border-dashed border-categorical-5 bg-categorical-5/10";
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
  const {
    hasHydrated,
    selectionMode,
    label,
    ariaLabel,
    clearAllSelection,
    vehicles,
    vehiclesQuery,
  } = useVehicleContext();

  // RF-24: skeleton estático enquanto o store não hidratou — nunca exibe `none` transitório.
  if (!hasHydrated) {
    return <Skeleton className="h-11 min-w-[80px] w-32 rounded-lg" />;
  }

  // @spec SPEC-20260721-001 RF-05 — sem veículo cadastrado, o seletor vira CTA
  // "Adicionar veículo" em vez de abrir um Dialog/Sheet sem nada para listar.
  const hasNoVehicles =
    selectionMode === "none" &&
    vehiclesQuery.isSuccess &&
    (vehicles?.length ?? 0) === 0;

  if (hasNoVehicles) {
    return (
      <Link
        href="/vehicles/new"
        aria-label={CONTEXT_LABELS.addVehicleCta}
        className={`flex h-11 max-w-[160px] items-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors duration-200 hover:ring-1 hover:ring-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${getModeStyles("none")}`}
      >
        <span aria-hidden className="shrink-0 leading-none">
          +
        </span>
        <span className="truncate">{CONTEXT_LABELS.addVehicleCta}</span>
      </Link>
    );
  }

  // eslint-disable-next-line security/detect-object-injection -- selectionMode é SelectionMode, union fixa de 5 literais
  const modeIcon = MODE_ICONS[selectionMode];

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
        className={`flex h-11 max-w-[120px] cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors duration-200 hover:ring-1 hover:ring-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${getModeStyles(selectionMode)}`}
      >
        {modeIcon && <Icon icon={modeIcon} size="sm" className="shrink-0" />}
        <span className="truncate">{label}</span>
        {selectionMode !== "none" && (
          <button
            type="button"
            aria-label={CONTEXT_LABELS.viewAllFleet}
            onClick={(event) => {
              event.stopPropagation();
              clearAllSelection();
            }}
            className="shrink-0 rounded-full p-[10px] -m-[10px] text-muted-foreground hover:text-foreground"
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
