"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/http/api-client";
import {
  useDashboardStore,
  type AttributeFilter,
  type SelectionMode,
} from "@/lib/stores/use-dashboard-store";
import { getRecentVehicleIds, recordVehicleAccess } from "@/lib/vehicle-recency";

interface VehicleLike {
  id: string;
  vehicle_type?: string;
  make?: string | null;
  model?: string | null;
}

interface VehicleGroupSummary {
  id: string;
  name: string;
  member_count: number;
}

interface ContextSnapshot {
  mode: SelectionMode;
  vehicleId: string | null;
  groupId: string | null;
  multiIds: string[];
  attribute: AttributeFilter | null;
}

function getVehicleAttribute(vehicle: VehicleLike, attribute: string): string | null | undefined {
  switch (attribute) {
    case "vehicle_type":
      return vehicle.vehicle_type;
    case "make":
      return vehicle.make;
    case "model":
      return vehicle.model;
    default:
      return undefined;
  }
}

/**
 * Herança de contexto para o campo `vehicle_id` de formulários transacionais.
 * Captura o contexto ativo apenas no mount (R-CTX-06); mudanças posteriores do
 * store nunca resetam o campo sozinhas — apenas disparam um aviso com opção de
 * atualizar manualmente (RF-14).
 *
 * @spec SPEC-20260602-001 RF-07, RF-08, RF-09, RF-10, RF-11, RF-12, RF-13, RF-14, R-CTX-06
 */
export function useVehicleContextField<V extends VehicleLike>(vehicles: V[] | undefined) {
  const [snapshot] = useState<ContextSnapshot>(() => {
    const state = useDashboardStore.getState();
    return {
      mode: state.selectionMode,
      vehicleId: state.activeVehicleId,
      groupId: state.activeGroupId,
      multiIds: state.multiSelectedIds,
      attribute: state.attributeFilter,
    };
  });

  const [vehicleId, setVehicleIdState] = useState(
    snapshot.mode === "single" && snapshot.vehicleId ? snapshot.vehicleId : "",
  );
  const [isInherited, setIsInherited] = useState(snapshot.mode === "single" && !!snapshot.vehicleId);
  const [contextChangeNotice, setContextChangeNotice] = useState<string | null>(null);
  const pendingVehicleIdRef = useRef<string | null>(null);

  const { data: groups } = useQuery({
    queryKey: ["vehicle-groups"],
    queryFn: () => apiClient<VehicleGroupSummary[]>("/vehicle-groups"),
    enabled: snapshot.mode === "group",
    retry: false,
  });

  // RF-14: reage a mudanças do store após o mount, mas nunca altera o campo sozinho.
  useEffect(() => {
    const unsubscribe = useDashboardStore.subscribe((state) => {
      if (
        state.selectionMode === "single" &&
        state.activeVehicleId &&
        state.activeVehicleId !== snapshot.vehicleId
      ) {
        pendingVehicleIdRef.current = state.activeVehicleId;
        setContextChangeNotice("O contexto ativo mudou.");
      }
    });
    return unsubscribe;
  }, [snapshot.vehicleId]);

  function setVehicleId(id: string): void {
    setVehicleIdState(id);
    setIsInherited(false);
    if (id) recordVehicleAccess(id);
  }

  function applyContextChange(): void {
    if (pendingVehicleIdRef.current) {
      setVehicleIdState(pendingVehicleIdRef.current);
      setIsInherited(true);
      recordVehicleAccess(pendingVehicleIdRef.current);
    }
    setContextChangeNotice(null);
  }

  function dismissContextChangeNotice(): void {
    setContextChangeNotice(null);
  }

  const activeGroup = groups?.find((group) => group.id === snapshot.groupId);

  const contextHint: string | null = (() => {
    switch (snapshot.mode) {
      case "group":
        return activeGroup
          ? `Grupo em foco: ${activeGroup.name}. Selecione o veículo de destino.`
          : null;
      case "multi":
        return `${snapshot.multiIds.length} veículos selecionados — qual o destino?`;
      case "attribute":
        return snapshot.attribute
          ? `Filtro de frota ativo: ${snapshot.attribute.attribute} = ${snapshot.attribute.value}`
          : null;
      default:
        return null;
    }
  })();

  const quickPicks: V[] = (() => {
    if (!vehicles) return [];
    if (snapshot.mode === "multi") {
      return vehicles.filter((vehicle) => snapshot.multiIds.includes(vehicle.id));
    }
    if (snapshot.mode === "none") {
      const recentIds = getRecentVehicleIds(5);
      return recentIds
        .map((id) => vehicles.find((vehicle) => vehicle.id === id))
        .filter((vehicle): vehicle is V => vehicle !== undefined);
    }
    return [];
  })();

  const filteredVehicles: V[] = (() => {
    if (!vehicles) return [];
    if (snapshot.mode === "attribute" && snapshot.attribute) {
      const { attribute, value } = snapshot.attribute;
      return vehicles.filter((vehicle) => getVehicleAttribute(vehicle, attribute) === value);
    }
    return vehicles;
  })();

  return {
    vehicleId,
    setVehicleId,
    isInherited,
    contextMode: snapshot.mode,
    contextHint,
    quickPicks,
    filteredVehicles,
    contextChangeNotice,
    applyContextChange,
    dismissContextChangeNotice,
  };
}
