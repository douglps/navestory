"use client";

import { Drawer } from "vaul";
import type { ReactNode } from "react";
import { VehicleSwitcherContent } from "./vehicle-switcher-content";

interface VehicleContextSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Sheet bottom-up de seleção de veículo/grupo — mobile (< 768px).
 * @spec SPEC-20260603-001 RF-11, RF-12, RF-13, RF-14
 */
export function VehicleContextSheet({ open, onOpenChange }: VehicleContextSheetProps): ReactNode {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} snapPoints={[0.7]}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[200] bg-black/20" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[201] flex h-[70vh] flex-col rounded-t-2xl border border-neutral-200 bg-white p-4">
          <Drawer.Title className="sr-only">Selecionar veículo ou grupo</Drawer.Title>
          <div
            aria-hidden
            className="mx-auto mb-3 h-1 w-8 shrink-0 rounded-full bg-neutral-300"
          />
          <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
            <VehicleSwitcherContent onClose={() => onOpenChange(false)} />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
