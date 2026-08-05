"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UserPreferences } from "@navestory/validators";
import { apiClient } from "@/lib/http/api-client";
import type {
  VehicleGroupSummary,
  VehicleSummary,
} from "@/lib/context/use-vehicle-context";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";

/**
 * Único ponto de sincronização entre URL searchParams e o store de contexto global.
 * Não renderiza UI — apenas efeitos de sincronização.
 *
 * @spec SPEC-20260602-001 RF-15, R-CTX-04
 * @spec SPEC-20260804-002 RF-09, RF-10, RF-11 — aplica o contexto padrão do usuário
 * (`user_preferences.default_context_type/id`) uma única vez por sessão de aba, e só quando
 * o sessionStorage não trouxe contexto próprio (deep link tem precedência, ver bootstrap acima).
 */
export function VehicleActivator(): null {
  const router = useRouter();
  const hasBootstrapped = useRef(false);
  const hasAppliedDefaultContext = useRef(false);

  const hasHydrated = useDashboardStore((state) => state.hasHydrated);
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

  // @spec SPEC-20260804-002 RF-09, RF-11 — só busca a preferência padrão quando a hidratação já
  // rodou e o sessionStorage não trouxe contexto (RF-11: sessionStorage sempre vence). O bootstrap
  // de URL acima roda no mesmo `useEffect` de montagem, então `selectionMode` já reflete um deep
  // link antes deste efeito decidir se busca a preferência.
  const shouldApplyDefaultContext =
    hasHydrated &&
    !hasAppliedDefaultContext.current &&
    selectionMode === "none";

  const { data: preferences } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => apiClient<UserPreferences>("/preferences"),
    enabled: shouldApplyDefaultContext,
    retry: false,
    staleTime: 60_000,
  });

  const needsVehicleCheck = preferences?.default_context_type === "single";
  const needsGroupCheck = preferences?.default_context_type === "group";

  // RF-10: valida que a entidade ainda existe antes de ativá-la — evita reativar um veículo/grupo
  // já excluído (soft-delete). Só busca a lista necessária conforme o tipo de preferência.
  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient<VehicleSummary[]>("/vehicles"),
    enabled: shouldApplyDefaultContext && needsVehicleCheck,
    retry: false,
    staleTime: 60_000,
  });

  const { data: groups } = useQuery({
    queryKey: ["vehicle-groups"],
    queryFn: () => apiClient<VehicleGroupSummary[]>("/vehicle-groups"),
    enabled: shouldApplyDefaultContext && needsGroupCheck,
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!shouldApplyDefaultContext || !preferences) return;

    const { default_context_type, default_context_id } = preferences;

    if (default_context_type === "single" && default_context_id) {
      if (vehicles === undefined) return; // aguarda a lista antes de decidir (RF-10)
      hasAppliedDefaultContext.current = true;
      if (vehicles.some((vehicle) => vehicle.id === default_context_id)) {
        setActiveVehicle(default_context_id);
      }
      // else: entidade excluída — permanece "none" silenciosamente, sem toast (RF-10, RNF-02)
    } else if (default_context_type === "group" && default_context_id) {
      if (groups === undefined) return;
      hasAppliedDefaultContext.current = true;
      if (groups.some((group) => group.id === default_context_id)) {
        setActiveGroup(default_context_id);
      }
    } else {
      // 'all' ou ausência de preferência: nada a fazer, o store já está em "none" (R-PREF-01)
      hasAppliedDefaultContext.current = true;
    }
  }, [
    shouldApplyDefaultContext,
    preferences,
    vehicles,
    groups,
    setActiveVehicle,
    setActiveGroup,
  ]);

  return null;
}
