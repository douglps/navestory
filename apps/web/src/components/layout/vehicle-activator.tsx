"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";

/**
 * Único ponto de sincronização entre URL searchParams e o store de contexto global.
 * Não renderiza UI — apenas efeitos de sincronização.
 *
 * @spec SPEC-20260602-001 RF-15, R-CTX-04
 */
export function VehicleActivator(): null {
  const router = useRouter();
  const hasBootstrapped = useRef(false);

  const selectionMode = useDashboardStore((state) => state.selectionMode);
  const activeVehicleId = useDashboardStore((state) => state.activeVehicleId);
  const activeGroupId = useDashboardStore((state) => state.activeGroupId);
  const setActiveVehicle = useDashboardStore((state) => state.setActiveVehicle);
  const setActiveGroup = useDashboardStore((state) => state.setActiveGroup);

  // Bootstrap único: URL -> store. Um deep link com ?vehicleId=/?groupId= tem
  // precedência sobre o contexto persistido em localStorage.
  useEffect(() => {
    if (hasBootstrapped.current) return;
    hasBootstrapped.current = true;

    const params = new URLSearchParams(window.location.search);
    const vehicleId = params.get("vehicleId");
    const groupId = params.get("groupId");

    if (vehicleId) {
      setActiveVehicle(vehicleId);
    } else if (groupId) {
      setActiveGroup(groupId);
    }
  }, [setActiveVehicle, setActiveGroup]);

  // ContextFilterSync: store -> URL. Reage exclusivamente aos valores do store;
  // lê searchParams via window.location.search (não-reativo) para não disparar
  // re-sincronização em resposta a filtros locais de página (RF-17.1).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete("vehicleId");
    params.delete("groupId");

    if (selectionMode === "single" && activeVehicleId) {
      params.set("vehicleId", activeVehicleId);
    } else if (selectionMode === "group" && activeGroupId) {
      params.set("groupId", activeGroupId);
    }

    const nextSearch = params.toString();
    const currentSearch = window.location.search.replace(/^\?/, "");
    if (nextSearch === currentSearch) return;

    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
    router.replace(nextUrl, { scroll: false });
  }, [selectionMode, activeVehicleId, activeGroupId, router]);

  return null;
}
