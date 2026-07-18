"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";
import { ActionDock } from "@/components/layout/action-dock";
import { FleetAlertBar, type FleetAlertItem } from "@/components/dashboard/FleetAlertBar";
import { FleetKpis, type FleetKpisData } from "@/components/dashboard/FleetKpis";
import {
  VehicleHealthCard,
  type HealthFlag,
  type VehicleCardData,
} from "@/components/dashboard/VehicleHealthCard";
import { VehicleSpotlight } from "@/components/dashboard/VehicleSpotlight";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";

const GRID_LIMIT_NO_VIRTUALIZATION = 15;
const GRID_INITIAL_PAGE_SIZE = 10;

interface FleetHealthEntry {
  vehicle_id: string;
  score: number;
  flags: HealthFlag[];
}

function vehicleLabel(vehicle: VehicleCardData): string {
  return vehicle.nickname ?? (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate);
}

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * @spec SPEC-20260531-001 seção 12.3 (migração incremental)
 * Controles preservados do stub original (SPEC-20260521-003 RF-07) dentro da nova estrutura —
 * não removidos, apenas reposicionados abaixo da Zona A.
 */
function ExportControls({ vehicles }: { vehicles: VehicleCardData[] | undefined }): ReactNode {
  const [period, setPeriod] = useState(currentPeriod());
  const [vehicleId, setVehicleId] = useState("");

  const exportUrl = `/api/backend/dashboard/export?period=${encodeURIComponent(period)}${
    vehicleId ? `&vehicle_id=${encodeURIComponent(vehicleId)}` : ""
  }`;

  return (
    <div className="flex flex-wrap items-end gap-3 border-t pt-4">
      <label className="flex flex-col gap-1">
        <span>Mês</span>
        <input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} />
      </label>

      <label className="flex flex-col gap-1">
        <span>Veículo</span>
        <select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
          <option value="">Todos os veículos</option>
          {vehicles?.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicleLabel(vehicle)}
            </option>
          ))}
        </select>
      </label>

      <a href={exportUrl} download={`nave-despesas-${period}.csv`}>
        Exportar CSV
      </a>
    </div>
  );
}

/**
 * @spec SPEC-20260531-001 RF-DA-09
 */
function NoVehiclesEmptyState(): ReactNode {
  return (
    <div className="flex flex-col items-center gap-2 rounded border p-8 text-center">
      <p className="text-lg font-medium">Bem-vindo à Nave 🚗</p>
      <p className="text-sm text-muted-foreground">
        Cadastre seu primeiro veículo para começar a acompanhar despesas, manutenções e a saúde da
        sua frota.
      </p>
      <Link href="/vehicles/new" className="underline">
        Cadastrar veículo →
      </Link>
    </div>
  );
}

/**
 * @spec SPEC-20260531-001 RF-DA-04, RF-DA-05, RF-DA-10
 */
function VehicleGrid({
  vehicles,
  healthByVehicleId,
  flagsByVehicleId,
  activeVehicleId,
  onSelect,
}: {
  vehicles: VehicleCardData[];
  healthByVehicleId: Map<string, number>;
  flagsByVehicleId: Map<string, HealthFlag[]>;
  activeVehicleId: string | null;
  onSelect: (vehicleId: string) => void;
}): ReactNode {
  const [showAll, setShowAll] = useState(false);

  const needsPagination = vehicles.length > GRID_LIMIT_NO_VIRTUALIZATION;

  const ordered = useMemo(() => {
    if (!needsPagination) return vehicles;
    // RF-DA-10: acima de 15 veículos, ordena por score ascendente (pior primeiro).
    return [...vehicles].sort(
      (a, b) => (healthByVehicleId.get(a.id) ?? 100) - (healthByVehicleId.get(b.id) ?? 100),
    );
  }, [vehicles, needsPagination, healthByVehicleId]);

  const visible = needsPagination && !showAll ? ordered.slice(0, GRID_INITIAL_PAGE_SIZE) : ordered;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((vehicle) => (
          <VehicleHealthCard
            key={vehicle.id}
            vehicle={vehicle}
            score={healthByVehicleId.get(vehicle.id)}
            flags={flagsByVehicleId.get(vehicle.id)}
            isActive={vehicle.id === activeVehicleId}
            onSelect={() => onSelect(vehicle.id)}
          />
        ))}
      </div>
      {needsPagination && !showAll && (
        <button type="button" onClick={() => setShowAll(true)} className="self-start text-sm underline">
          ver mais ({ordered.length - GRID_INITIAL_PAGE_SIZE})
        </button>
      )}
    </div>
  );
}

/**
 * @spec SPEC-20260531-001 Sprint 1 + Sprint 2 + Sprint 3
 * Zona A (Fleet Command, RF-DA-01 a RF-DA-10, RF-DC-01 a RF-DC-06) + Zona B (Vehicle Spotlight,
 * RF-DB-01 a RF-DB-08) + score de saúde (RF-SH-01 a RF-SH-04). Clicar num card atualiza o
 * veículo em foco (RF-DA-05) e rola suavemente até a Zona B.
 */
export default function DashboardPage(): ReactNode {
  const hasHydrated = useDashboardStore((state) => state.hasHydrated);
  const selectionMode = useDashboardStore((state) => state.selectionMode);
  const activeVehicleId = useDashboardStore((state) => state.activeVehicleId);
  const setActiveVehicle = useDashboardStore((state) => state.setActiveVehicle);
  const clearAllSelection = useDashboardStore((state) => state.clearAllSelection);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const { data: vehicles } = useQuery({
    queryKey: ["dashboard", "vehicle-cards"],
    queryFn: () => apiClient<VehicleCardData[]>("/dashboard/vehicle-cards"),
    retry: false,
  });

  const { data: fleetHealth } = useQuery({
    queryKey: ["dashboard", "fleet-health"],
    queryFn: () => apiClient<FleetHealthEntry[]>("/dashboard/fleet-health"),
    retry: false,
  });

  const { data: alerts } = useQuery({
    queryKey: ["dashboard", "alerts"],
    queryFn: () => apiClient<FleetAlertItem[]>("/dashboard/alerts"),
    retry: false,
  });

  const { data: kpis } = useQuery({
    queryKey: ["dashboard", "fleet-kpis", activeVehicleId],
    queryFn: () =>
      apiClient<FleetKpisData>(
        `/dashboard/fleet-kpis${activeVehicleId ? `?vehicle_id=${activeVehicleId}` : ""}`,
      ),
    retry: false,
  });

  // RF-DA-08: auto-seleciona quando a frota tem exatamente 1 veículo e nada está em foco ainda.
  useEffect(() => {
    if (!hasHydrated || selectionMode !== "none" || !vehicles) return;
    if (vehicles.length === 1 && vehicles[0]) {
      setActiveVehicle(vehicles[0].id);
    }
  }, [hasHydrated, selectionMode, vehicles, setActiveVehicle]);

  const healthByVehicleId = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of fleetHealth ?? []) map.set(entry.vehicle_id, entry.score);
    return map;
  }, [fleetHealth]);

  const flagsByVehicleId = useMemo(() => {
    const map = new Map<string, HealthFlag[]>();
    for (const entry of fleetHealth ?? []) map.set(entry.vehicle_id, entry.flags);
    return map;
  }, [fleetHealth]);

  const activeVehicle = vehicles?.find((vehicle) => vehicle.id === activeVehicleId);

  /** @spec SPEC-20260531-001 RF-DA-05 */
  function handleSelectVehicle(vehicleId: string): void {
    setActiveVehicle(vehicleId);
    spotlightRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const hasNoVehicles = vehicles?.length === 0;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-8 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        {/*
          @spec SPEC-20260602-005 RF-16
          Fora do ActionDock por decisão de RF-DC-02.1/RF-DC-03 (dock fixo em 4 itens,
          ver action-dock.tsx) — link direto satisfaz o mesmo objetivo de acesso rápido.
        */}
        <Link href="/atividades" className="flex items-center gap-1 text-sm text-muted-foreground underline">
          <span aria-hidden>🛡️</span>
          Histórico de Atividades
        </Link>
      </div>

      {hasNoVehicles ? (
        <NoVehiclesEmptyState />
      ) : (
        <>
          {alerts && <FleetAlertBar alerts={alerts} />}
          {kpis && <FleetKpis kpis={kpis} />}
          {vehicles && (
            <VehicleGrid
              vehicles={vehicles}
              healthByVehicleId={healthByVehicleId}
              flagsByVehicleId={flagsByVehicleId}
              activeVehicleId={activeVehicleId}
              onSelect={handleSelectVehicle}
            />
          )}
          <ExportControls vehicles={vehicles} />

          <div ref={spotlightRef}>
            <VehicleSpotlight vehicle={activeVehicle} onClear={clearAllSelection} />
          </div>
        </>
      )}

      <ActionDock />
    </main>
  );
}
