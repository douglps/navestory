"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { VehicleSwitcherContent } from "./vehicle-switcher-content";

interface VehicleContextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
