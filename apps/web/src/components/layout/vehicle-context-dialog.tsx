"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { VehicleHealthScore } from "@navestory/ui";
import type { FleetHealthEntry } from "@navestory/validators";
import { apiClient } from "@/lib/http/api-client";
import { useVehicleContext } from "@/lib/context/use-vehicle-context";
import { FLAG_LABEL } from "@/components/dashboard/VehicleHealthCard";
import { VehicleSwitcherContent } from "./vehicle-switcher-content";

interface VehicleContextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * @spec SPEC-20260813-001 RF-08
 * Preview do veículo em foco (health score, flags, quick links) abaixo da lista de
 * seleção — entrega o valor informativo do antigo painel lateral fixo de frota
 * (removido em SPEC-20260603-001) sem reintroduzir um painel permanente de 282px.
 */
function VehicleActivePreview({ onNavigate }: { onNavigate: () => void }): ReactNode {
  const { selectionMode, activeVehicle } = useVehicleContext();
  const { data: fleetHealth } = useQuery({
    queryKey: ["dashboard", "fleet-health"],
    queryFn: () => apiClient<FleetHealthEntry[]>("/dashboard/fleet-health"),
    enabled: selectionMode === "single",
    retry: false,
  });

  if (selectionMode !== "single" || !activeVehicle) return null;

  const healthEntry = fleetHealth?.find((entry) => entry.vehicle_id === activeVehicle.id);

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex items-center gap-2">
        <VehicleHealthScore score={healthEntry?.score} size={32} />
        <div className="flex flex-col">
          <span className="text-sm font-medium">{activeVehicle.plate}</span>
          <span className="text-xs text-muted-foreground">
            {activeVehicle.model ?? activeVehicle.make ?? ""}
          </span>
        </div>
      </div>

      {healthEntry?.flags && healthEntry.flags.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {healthEntry.flags.slice(0, 2).map((flag) => (
            <li key={flag.type} className="text-xs text-muted-foreground">
              {FLAG_LABEL[flag.type]?.(flag) ?? flag.type}
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-xs text-muted-foreground">Nenhum problema identificado</span>
      )}

      <div className="flex gap-3 text-xs">
        <Link
          href={`/expenses?vehicleId=${activeVehicle.id}`}
          className="underline"
          onClick={onNavigate}
        >
          Ver despesas
        </Link>
        <Link
          href={`/maintenance?vehicleId=${activeVehicle.id}`}
          className="underline"
          onClick={onNavigate}
        >
          Ver manutenção
        </Link>
      </div>
    </div>
  );
}

/**
 * Dialog centralizado de seleção de veículo/grupo — desktop (>= 768px).
 * @spec SPEC-20260603-001 RF-07, RF-08, RF-09, RF-10
 */
export function VehicleContextDialog({ open, onOpenChange }: VehicleContextDialogProps): ReactNode {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:duration-150" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[201] w-[calc(100%-2rem)] max-w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-4 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:duration-150"
          onEscapeKeyDown={(event) => {
            // RF-08: evita conflito com o handler global do sidebar (Esc fecha drawer mobile).
            event.stopPropagation();
          }}
        >
          <Dialog.Title className="sr-only">Selecionar veículo ou grupo</Dialog.Title>
          <VehicleSwitcherContent onClose={() => onOpenChange(false)} />
          <VehicleActivePreview onNavigate={() => onOpenChange(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
