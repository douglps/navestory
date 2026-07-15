"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiClient } from "@/lib/http/api-client";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";
import { useUIStore } from "@/lib/stores/ui-store";

interface VehicleSummary {
  id: string;
}

interface VehicleGroupSummary {
  id: string;
}

/**
 * Detecta staleness do contexto ativo (veículo/grupo excluído via soft-delete) e
 * limpa o contexto. Reutiliza as mesmas query keys já usadas pelo `FocusSlot`
 * (`["vehicles"]`/`["vehicle-groups"]`) — o cache do TanStack Query deduplica a
 * requisição, sem chamada de rede extra (RNF-03). Não renderiza UI própria.
 *
 * @spec SPEC-20260602-001 RF-16, RNF-03
 */
export function FleetAside(): null {
  const selectionMode = useDashboardStore((state) => state.selectionMode);
  const activeVehicleId = useDashboardStore((state) => state.activeVehicleId);
  const activeGroupId = useDashboardStore((state) => state.activeGroupId);
  const clearAllSelection = useDashboardStore((state) => state.clearAllSelection);
  const setContextStaleNotice = useUIStore((state) => state.setContextStaleNotice);

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient<VehicleSummary[]>("/vehicles"),
    enabled: selectionMode === "single",
    retry: false,
  });

  const { data: groups } = useQuery({
    queryKey: ["vehicle-groups"],
    queryFn: () => apiClient<VehicleGroupSummary[]>("/vehicle-groups"),
    enabled: selectionMode === "group",
    retry: false,
  });

  useEffect(() => {
    if (selectionMode !== "single" || !activeVehicleId || !vehicles) return;
    const stillExists = vehicles.some((vehicle) => vehicle.id === activeVehicleId);
    if (stillExists) return;

    clearAllSelection();
    setContextStaleNotice("O veículo em foco foi removido. Contexto limpo — exibindo toda a frota.");
  }, [selectionMode, activeVehicleId, vehicles, clearAllSelection, setContextStaleNotice]);

  useEffect(() => {
    if (selectionMode !== "group" || !activeGroupId || !groups) return;
    const stillExists = groups.some((group) => group.id === activeGroupId);
    if (stillExists) return;

    // Grupo excluído: limpeza silenciosa, sem toast (critério de aceite da spec).
    clearAllSelection();
  }, [selectionMode, activeGroupId, groups, clearAllSelection]);

  return null;
}
