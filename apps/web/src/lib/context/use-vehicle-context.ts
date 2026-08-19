"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CONTEXT_LABELS, VEHICLE_TYPE_ICONS } from "@/lib/context/context-labels";
import { apiClient } from "@/lib/http/api-client";
import { useDashboardStore, type SelectionMode } from "@/lib/stores/use-dashboard-store";

export interface VehicleSummary {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  nickname: string | null;
  vehicle_type: string;
}

export interface VehicleGroupSummary {
  id: string;
  name: string;
  member_count: number;
}

/**
 * Hook compartilhado do sistema "Em Foco": hidratação do store, queries de
 * veículos/grupos habilitadas sob demanda, e resolução de label/ícone/aria-label
 * por modo de contexto ativo (RF-05). Extraído de `focus-slot.tsx` para ser
 * reaproveitado pelo `VehicleContextChip`/`VehicleSwitcherContent` sem duplicar
 * fetch/label logic.
 *
 * @spec SPEC-20260603-001 RF-01, RF-02, RF-05, RF-24
 */
export function useVehicleContext(options: { needsLists?: boolean } = {}) {
  const { needsLists = false } = options;

  // `persist.*` só existe quando `storage` foi criado com sucesso (client-side —
  // no servidor, `sessionStorage` não existe e o middleware não anexa `.persist`).
  const [hasHydrated, setHasHydrated] = useState(
    () => useDashboardStore.persist?.hasHydrated() ?? false,
  );

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

  // Modo "none" também precisa da lista para o VehicleContextChip detectar
  // frota vazia e trocar o seletor por um CTA "Adicionar veículo" (RF-05).
  const needsVehicleList = selectionMode === "single" || selectionMode === "none" || needsLists;
  const needsGroupList = selectionMode === "group" || needsLists;

  const vehiclesQuery = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient<VehicleSummary[]>("/vehicles"),
    enabled: hasHydrated && needsVehicleList,
    retry: false,
    staleTime: 60_000,
  });

  const groupsQuery = useQuery({
    queryKey: ["vehicle-groups"],
    queryFn: () => apiClient<VehicleGroupSummary[]>("/vehicle-groups"),
    enabled: hasHydrated && needsGroupList,
    retry: false,
    staleTime: 60_000,
  });

  const vehicles = vehiclesQuery.data;
  const groups = groupsQuery.data;

  const activeVehicle = vehicles?.find((vehicle) => vehicle.id === activeVehicleId);
  const activeGroup = groups?.find((group) => group.id === activeGroupId);

  const label = getModeLabel({
    selectionMode,
    activeVehicle,
    activeGroup,
    multiCount: multiSelectedIds.length,
    attributeFilter,
  });

  const ariaLabel = getModeAriaLabel({
    selectionMode,
    activeVehicle,
    activeGroup,
    multiCount: multiSelectedIds.length,
    attributeFilter,
  });

  return {
    hasHydrated,
    selectionMode,
    activeVehicleId,
    activeGroupId,
    multiSelectedIds,
    attributeFilter,
    setActiveVehicle,
    setActiveGroup,
    clearAllSelection,
    vehicles,
    groups,
    activeVehicle,
    activeGroup,
    label,
    ariaLabel,
    vehiclesQuery,
    groupsQuery,
  };
}

function getModeLabel(params: {
  selectionMode: SelectionMode;
  activeVehicle: VehicleSummary | undefined;
  activeGroup: VehicleGroupSummary | undefined;
  multiCount: number;
  attributeFilter: { attribute: string; value: string } | null;
}): string {
  const { selectionMode, activeVehicle, activeGroup, multiCount, attributeFilter } = params;

  switch (selectionMode) {
    case "single":
      return activeVehicle
        ? `${VEHICLE_TYPE_ICONS[activeVehicle.vehicle_type] ?? "🚗"} ${activeVehicle.nickname ?? `${activeVehicle.plate} · ${activeVehicle.model ?? activeVehicle.make ?? ""}`}`
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
      // @spec SPEC-20260804-002 RF-01 — "none" já funciona como "toda a frota" em todos os
      // filtros de query; o rótulo agora reflete isso em vez de comunicar tarefa pendente.
      return CONTEXT_LABELS.allFleet;
  }
}

/**
 * @spec SPEC-20260603-001 RF-05 — aria-label dinâmico descrevendo o contexto ativo.
 */
function getModeAriaLabel(params: {
  selectionMode: SelectionMode;
  activeVehicle: VehicleSummary | undefined;
  activeGroup: VehicleGroupSummary | undefined;
  multiCount: number;
  attributeFilter: { attribute: string; value: string } | null;
}): string {
  const { selectionMode, activeVehicle, activeGroup, multiCount, attributeFilter } = params;

  switch (selectionMode) {
    case "single":
      return activeVehicle
        ? `Em foco: ${activeVehicle.plate} — ${[activeVehicle.make, activeVehicle.model].filter(Boolean).join(" ")}`
        : "Em foco: veículo selecionado";
    case "group":
      return activeGroup
        ? `Em foco: grupo ${activeGroup.name} — ${activeGroup.member_count} veículos`
        : "Em foco: grupo selecionado";
    case "multi":
      return `Em foco: seleção personalizada — ${multiCount} veículos`;
    case "attribute":
      return attributeFilter
        ? `Em foco: filtro de frota — ${attributeFilter.attribute} = ${attributeFilter.value}`
        : "Em foco: filtro de frota";
    default:
      // @spec SPEC-20260804-002 RF-02
      return "Toda a frota — clique para selecionar um veículo ou grupo";
  }
}
