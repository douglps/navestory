"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";
import { ActionDock } from "@/components/layout/action-dock";
import { FleetAlertBar, type FleetAlertItem } from "@/components/dashboard/FleetAlertBar";
import { FleetKpis, type FleetKpisData } from "@/components/dashboard/FleetKpis";
import { VehicleHealthCard, type VehicleCardData } from "@/components/dashboard/VehicleHealthCard";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";

const GRID_LIMIT_NO_VIRTUALIZATION = 15;
const GRID_INITIAL_PAGE_SIZE = 10;

interface FleetHealthEntry {
  vehicle_id: string;
  score: number;
  flags: unknown[];
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
  activeVehicleId,
  onSelect,
}: {
  vehicles: VehicleCardData[];
  healthByVehicleId: Map<string, number>;
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
 * @spec SPEC-20260531-001 Sprint 1 (RF-DA-01 a RF-DA-10, RF-DC-01 a RF-DC-06, RF-SH-01, RF-SH-02)
 * Zona B (Vehicle Spotlight) ainda não existe — entra na Sprint 2 (seção 12.3, migração
 * incremental). Clicar num card já atualiza o veículo em foco (RF-DA-05); o scroll suave até a
 * Zona B fica pendente até o container existir.
 */
export default function DashboardPage(): ReactNode {
  const hasHydrated = useDashboardStore((state) => state.hasHydrated);
  const selectionMode = useDashboardStore((state) => state.selectionMode);
  const activeVehicleId = useDashboardStore((state) => state.activeVehicleId);
  const setActiveVehicle = useDashboardStore((state) => state.setActiveVehicle);

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

  const hasNoVehicles = vehicles?.length === 0;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-8 pb-24">
      <h1 className="text-xl font-semibold">Dashboard</h1>

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
              activeVehicleId={activeVehicleId}
              onSelect={setActiveVehicle}
            />
          )}
          <ExportControls vehicles={vehicles} />
        </>
      )}

      <ActionDock />
    </main>
  );
}
