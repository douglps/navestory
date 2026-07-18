"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { VEHICLE_TYPE_ICONS } from "@/lib/context/context-labels";
import {
  useVehicleContext,
  type VehicleGroupSummary,
  type VehicleSummary,
} from "@/lib/context/use-vehicle-context";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

const ERROR_RETRY_TIMEOUT_MS = 8000;

/**
 * Normaliza texto para busca client-side: remove diacríticos e hífens (placas).
 * @spec SPEC-20260603-001 RNF-05
 */
const DIACRITIC_MARKS_PATTERN = /[̀-ͯ]/g;

function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITIC_MARKS_PATTERN, "")
    .replace(/-/g, "")
    .toLowerCase();
}

function matchesQuery(haystack: string[], query: string): boolean {
  if (!query) return true;
  const normalizedQuery = normalizeForSearch(query);
  return haystack.some((value) => normalizeForSearch(value).includes(normalizedQuery));
}

interface VehicleSwitcherContentProps {
  onClose: () => void;
}

/**
 * Conteúdo compartilhado do Dialog (desktop) e Sheet (mobile) de seleção de
 * veículo/grupo. Reaproveita 100% da lógica de fetch/label de `useVehicleContext`
 * (extraída do antigo `FocusSlot`), sem duplicação.
 *
 * @spec SPEC-20260603-001 RF-07, RF-09, RF-11, RF-14, RF-18, RF-19, RNF-05
 */
export function VehicleSwitcherContent({ onClose }: VehicleSwitcherContentProps): ReactNode {
  const [query, setQuery] = useState("");
  const isOnline = useOnlineStatus();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // RF-07: campo de busca é o primeiro elemento focado ao abrir o Dialog/Sheet.
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const {
    vehicles,
    groups,
    setActiveVehicle,
    setActiveGroup,
    vehiclesQuery,
    groupsQuery,
  } = useVehicleContext({ needsLists: true });

  const isLoading = vehiclesQuery.isLoading || groupsQuery.isLoading;
  const isError = vehiclesQuery.isError || groupsQuery.isError;

  const [showRetry, setShowRetry] = useState(false);
  // RF-09: exibe "Tentar novamente" somente após 8s de erro contínuo.
  useEffect(() => {
    if (!isError) {
      setShowRetry(false);
      return;
    }
    const timer = setTimeout(() => setShowRetry(true), ERROR_RETRY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isError]);

  const filteredVehicles = useMemo(() => {
    return (vehicles ?? []).filter((vehicle: VehicleSummary) =>
      matchesQuery([vehicle.plate, vehicle.make ?? "", vehicle.model ?? ""], query),
    );
  }, [vehicles, query]);

  const filteredGroups = useMemo(() => {
    return (groups ?? []).filter((group: VehicleGroupSummary) => matchesQuery([group.name], query));
  }, [groups, query]);

  function handleSelectVehicle(vehicleId: string): void {
    setActiveVehicle(vehicleId);
    onClose();
  }

  function handleSelectGroup(groupId: string): void {
    setActiveGroup(groupId);
    onClose();
  }

  function handleRetry(): void {
    setShowRetry(false);
    void vehiclesQuery.refetch();
    void groupsQuery.refetch();
  }

  return (
    <div className="flex flex-col gap-3">
      {!isOnline && (
        <div
          role="status"
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800"
        >
          Sem conexão — dados podem estar desatualizados
        </div>
      )}

      <input
        ref={searchInputRef}
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar veículo ou grupo..."
        aria-label="Buscar veículo ou grupo"
        className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />

      {isLoading && (
        <div className="flex flex-col gap-2" aria-hidden>
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-9 w-full animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-4 text-sm text-red-700">
          <span>Não foi possível carregar veículos e grupos.</span>
          {showRetry && (
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-100"
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {!isLoading && !isError && (
        <div
          className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto"
          style={{ overscrollBehavior: "contain" }}
        >
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-medium uppercase tracking-wide text-neutral-500">
              Veículos
            </span>
            {filteredVehicles.length === 0 && (
              <span className="px-2 py-1 text-xs text-neutral-400">Nenhum veículo encontrado</span>
            )}
            {filteredVehicles.map((vehicle) => (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => handleSelectVehicle(vehicle.id)}
                className="rounded-md px-2 py-2 text-left text-sm hover:bg-neutral-100"
              >
                {VEHICLE_TYPE_ICONS[vehicle.vehicle_type] ?? "🚗"} {vehicle.plate} ·{" "}
                {vehicle.model ?? vehicle.make}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-medium uppercase tracking-wide text-neutral-500">
              Grupos
            </span>
            {filteredGroups.length === 0 && (
              <span className="px-2 py-1 text-xs text-neutral-400">Nenhum grupo encontrado</span>
            )}
            {filteredGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => handleSelectGroup(group.id)}
                className="rounded-md px-2 py-2 text-left text-sm hover:bg-neutral-100"
              >
                ⬡ {group.name} · {group.member_count} membros
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
    </div>
  );
}
