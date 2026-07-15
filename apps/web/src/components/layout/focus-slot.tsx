"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { CONTEXT_LABELS, VEHICLE_TYPE_ICONS } from "@/lib/context/context-labels";
import { apiClient } from "@/lib/http/api-client";
import { useDashboardStore, type SelectionMode } from "@/lib/stores/use-dashboard-store";

interface VehicleSummary {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  vehicle_type: string;
}

interface VehicleGroupSummary {
  id: string;
  name: string;
  member_count: number;
}

function getModeStyles(mode: SelectionMode): string {
  switch (mode) {
    case "single":
      return "border border-amber-300 bg-amber-50";
    case "group":
      return "border border-blue-300 bg-blue-50";
    case "multi":
      return "border border-dashed border-amber-400 bg-amber-100";
    case "attribute":
      return "border border-dashed border-violet-300 bg-violet-50";
    default:
      return "border border-dashed border-neutral-300 bg-transparent";
  }
}

/**
 * Slot "Em Foco" — visibilidade persistente do contexto de veículo/grupo/seleção.
 * @spec SPEC-20260602-001 RF-01, RF-02, RF-03, RF-04, RF-05, RF-06
 */
export function FocusSlot({ collapsed = false }: { collapsed?: boolean }): ReactNode {
  // `persist.*` só existe quando `storage` foi criado com sucesso (client-side —
  // no servidor, `localStorage` não existe e o middleware não anexa `.persist`).
  const [hasHydrated, setHasHydrated] = useState(
    () => useDashboardStore.persist?.hasHydrated() ?? false,
  );
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = useDashboardStore.persist?.onFinishHydration(() => setHasHydrated(true));
    void useDashboardStore.persist?.rehydrate();
    return unsubscribe;
  }, []);

  const selectionMode = useDashboardStore((state) => state.selectionMode);
  const activeVehicleId = useDashboardStore((state) => state.activeVehicleId);
  const activeGroupId = useDashboardStore((state) => state.activeGroupId);
  const multiSelectedIds = useDashboardStore((state) => state.multiSelectedIds);
  const attributeFilter = useDashboardStore((state) => state.attributeFilter);
  const setActiveVehicle = useDashboardStore((state) => state.setActiveVehicle);
  const setActiveGroup = useDashboardStore((state) => state.setActiveGroup);
  const clearAllSelection = useDashboardStore((state) => state.clearAllSelection);

  const needsVehicleList = selectionMode === "single" || isPickerOpen;
  const needsGroupList = selectionMode === "group" || isPickerOpen;

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient<VehicleSummary[]>("/vehicles"),
    enabled: hasHydrated && needsVehicleList,
    retry: false,
  });

  const { data: groups } = useQuery({
    queryKey: ["vehicle-groups"],
    queryFn: () => apiClient<VehicleGroupSummary[]>("/vehicle-groups"),
    enabled: hasHydrated && needsGroupList,
    retry: false,
  });

  // RNF-01: reserva o mesmo espaço antes/depois da hidratação para não gerar layout shift.
  if (!hasHydrated) {
    return <div className={collapsed ? "h-10 w-10" : "h-[68px] w-full"} aria-hidden />;
  }

  const activeVehicle = vehicles?.find((vehicle) => vehicle.id === activeVehicleId);
  const activeGroup = groups?.find((group) => group.id === activeGroupId);

  const label = getModeLabel({
    selectionMode,
    activeVehicle,
    activeGroup,
    multiCount: multiSelectedIds.length,
    attributeFilter,
  });

  if (collapsed) {
    return (
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-md ${getModeStyles(selectionMode)}`}
        title={`${CONTEXT_LABELS.focus}: ${label}`}
      >
        <span aria-hidden className="text-base leading-none">
          {selectionMode === "none" ? "⊕" : "●"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className={`flex flex-col gap-1 rounded-md p-3 ${getModeStyles(selectionMode)}`}>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-medium uppercase tracking-wide text-neutral-500">
            {CONTEXT_LABELS.focus}
          </span>
          <button
            type="button"
            onClick={() => setIsPickerOpen((open) => !open)}
            className="text-xs text-neutral-600 hover:underline"
          >
            {CONTEXT_LABELS.swap}
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm">{label}</span>
          {selectionMode !== "none" && (
            <button
              type="button"
              aria-label={CONTEXT_LABELS.viewAllFleet}
              onClick={() => clearAllSelection()}
              className="shrink-0 text-neutral-500 hover:text-neutral-800"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {isPickerOpen && (
        <div className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-white p-2 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-medium uppercase text-neutral-500">Veículos</span>
            {vehicles?.map((vehicle) => (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => {
                  setActiveVehicle(vehicle.id);
                  setIsPickerOpen(false);
                }}
                className="rounded px-2 py-1 text-left hover:bg-neutral-100"
              >
                {VEHICLE_TYPE_ICONS[vehicle.vehicle_type] ?? "🚗"} {vehicle.plate} ·{" "}
                {vehicle.model ?? vehicle.make}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-medium uppercase text-neutral-500">Grupos</span>
            {groups?.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => {
                  setActiveGroup(group.id);
                  setIsPickerOpen(false);
                }}
                className="rounded px-2 py-1 text-left hover:bg-neutral-100"
              >
                ⬡ {group.name} · {group.member_count} membros
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getModeLabel(params: {
  selectionMode: string;
  activeVehicle: VehicleSummary | undefined;
  activeGroup: VehicleGroupSummary | undefined;
  multiCount: number;
  attributeFilter: { attribute: string; value: string } | null;
}): string {
  const { selectionMode, activeVehicle, activeGroup, multiCount, attributeFilter } = params;

  switch (selectionMode) {
    case "single":
      return activeVehicle
        ? `${VEHICLE_TYPE_ICONS[activeVehicle.vehicle_type] ?? "🚗"} ${activeVehicle.plate} · ${activeVehicle.model ?? activeVehicle.make ?? ""}`
        : "…";
    case "group":
      return activeGroup ? `⬡ ${activeGroup.name} · ${activeGroup.member_count} membros` : "…";
    case "multi":
      return `${CONTEXT_LABELS.customSelection} · ${multiCount}~`;
    case "attribute":
      return attributeFilter
        ? `${CONTEXT_LABELS.fleetFilter}: ${attributeFilter.attribute} = ${attributeFilter.value}`
        : CONTEXT_LABELS.fleetFilter;
    default:
      return `⊕ ${CONTEXT_LABELS.selectVehiclePrompt}`;
  }
}
