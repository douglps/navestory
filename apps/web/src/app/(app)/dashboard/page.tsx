"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DEFAULT_DASHBOARD_KPI_IDS,
  type FleetHealthEntry,
  type FleetKpiCatalog,
  type KpiCatalogId,
} from "@navestory/validators";
import { Button, Container, EmptyState } from "@navestory/ui";
import { apiClient } from "@/lib/http/api-client";
import { ActionDock } from "@/components/layout/action-dock";
import { DashboardKpiGrid } from "@/components/dashboard/DashboardKpiGrid";
import {
  FleetAlertBar,
  type FleetAlertItem,
} from "@/components/dashboard/FleetAlertBar";
import { FleetChartsSection } from "@/components/dashboard/FleetCharts";
import { KpiPicker } from "@/components/dashboard/KpiPicker";
import { UpcomingCostsWidget } from "@/components/dashboard/UpcomingCostsWidget";
import {
  VehicleHealthCard,
  type HealthFlag,
  type VehicleCardData,
} from "@/components/dashboard/VehicleHealthCard";
import { VehicleSpotlight } from "@/components/dashboard/VehicleSpotlight";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";

const GRID_LIMIT_NO_VIRTUALIZATION = 15;
const GRID_INITIAL_PAGE_SIZE = 10;

/**
 * @spec SPEC-20260531-001 RF-DA-09
 */
function NoVehiclesEmptyState(): ReactNode {
  const router = useRouter();
  return (
    <EmptyState
      icon="🚗"
      title="Bem-vindo à navestory"
      description="Cadastre seu primeiro veículo para começar a acompanhar despesas, manutenções e a saúde da sua frota."
      action={{
        label: "Cadastrar veículo",
        onClick: () => router.push("/vehicles/new"),
      }}
    />
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
      (a, b) =>
        (healthByVehicleId.get(a.id) ?? 100) -
        (healthByVehicleId.get(b.id) ?? 100),
    );
  }, [vehicles, needsPagination, healthByVehicleId]);

  const visible =
    needsPagination && !showAll
      ? ordered.slice(0, GRID_INITIAL_PAGE_SIZE)
      : ordered;

  return (
    <div className="flex flex-col gap-3">
      {/* @spec SPEC-20260721-002 RF-06 — depende de RF-02 (VehicleHealthScore com prop size) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(true)}
          className="self-start"
        >
          ver mais ({ordered.length - GRID_INITIAL_PAGE_SIZE})
        </Button>
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
  const clearAllSelection = useDashboardStore(
    (state) => state.clearAllSelection,
  );
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

  const { data: kpiCatalog } = useQuery({
    queryKey: ["dashboard", "kpi-catalog", activeVehicleId],
    queryFn: () =>
      apiClient<FleetKpiCatalog>(
        `/dashboard/kpi-catalog${activeVehicleId ? `?vehicle_id=${activeVehicleId}` : ""}`,
      ),
    retry: false,
  });

  /** @spec SPEC-20260721-002 RF-01, R-KPI-01 */
  const { data: preferences } = useQuery({
    queryKey: ["preferences"],
    queryFn: () =>
      apiClient<{ dashboard_kpi_ids?: KpiCatalogId[] }>("/preferences"),
    retry: false,
  });
  const activeKpiIds =
    preferences?.dashboard_kpi_ids ?? DEFAULT_DASHBOARD_KPI_IDS;

  // RF-DA-08: auto-seleciona quando a frota tem exatamente 1 veículo e nada está em foco ainda.
  useEffect(() => {
    if (!hasHydrated || selectionMode !== "none" || !vehicles) return;
    if (vehicles.length === 1 && vehicles[0]) {
      setActiveVehicle(vehicles[0].id);
    }
  }, [hasHydrated, selectionMode, vehicles, setActiveVehicle]);

  const healthByVehicleId = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of fleetHealth ?? [])
      map.set(entry.vehicle_id, entry.score);
    return map;
  }, [fleetHealth]);

  const flagsByVehicleId = useMemo(() => {
    const map = new Map<string, HealthFlag[]>();
    for (const entry of fleetHealth ?? [])
      map.set(entry.vehicle_id, entry.flags);
    return map;
  }, [fleetHealth]);

  const activeVehicle = vehicles?.find(
    (vehicle) => vehicle.id === activeVehicleId,
  );

  /** @spec SPEC-20260531-001 RF-DA-05 */
  function handleSelectVehicle(vehicleId: string): void {
    setActiveVehicle(vehicleId);
    spotlightRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  const hasNoVehicles = vehicles?.length === 0;

  return (
    <Container size="6xl" className="pb-24">
      <h1 className="sr-only">Dashboard</h1>

      {/* @spec SPEC-20260813-001 RF-04 — ActionDock desktop sai do fim da página (abaixo de 5
          seções, fora do alcance sem scroll) para uma barra sticky logo abaixo do header, com
          acesso imediato às 4 ações mais frequentes. Mobile mantém o FAB inalterado. */}
      <div className="sticky top-14 z-10 mb-4 flex items-center justify-end border-b border-border bg-background/95 py-2 backdrop-blur-sm">
        <ActionDock />
      </div>

      {hasNoVehicles ? (
        <NoVehiclesEmptyState />
      ) : (
        <>
          {/* @spec SPEC-20260804-006 RF-16 */}
          {alerts && alerts.length > 0 && (
            <div>
              <h2 className="kicker pb-2">Alertas</h2>
              <FleetAlertBar alerts={alerts} />
            </div>
          )}

          {/* @spec SPEC-20260804-006 RF-16, RF-17 — KpiPicker separado do grid por divider próprio,
              para não parecer mais um card do grid (era um card colado, ambíguo entre indicador e ação). */}
          <div>
            <h2 className="kicker pb-2">Indicadores</h2>
            <DashboardKpiGrid
              catalog={kpiCatalog}
              activeIds={activeKpiIds}
              isFleetContext={selectionMode !== "single"}
            />
            <div className="mt-3 flex justify-end border-t border-border pt-2">
              <KpiPicker activeIds={activeKpiIds} />
            </div>
          </div>

          {vehicles && (
            <div>
              <h2 className="kicker pb-2">Frota</h2>
              <VehicleGrid
                vehicles={vehicles}
                healthByVehicleId={healthByVehicleId}
                flagsByVehicleId={flagsByVehicleId}
                activeVehicleId={activeVehicleId}
                onSelect={handleSelectVehicle}
              />
            </div>
          )}

          <div ref={spotlightRef}>
            <h2 className="kicker pb-2">Em Foco</h2>
            <VehicleSpotlight
              vehicle={activeVehicle}
              flags={activeVehicleId ? flagsByVehicleId.get(activeVehicleId) : undefined}
              onClear={clearAllSelection}
            />
          </div>

          <UpcomingCostsWidget />

          <div>
            <h2 className="kicker pb-2">Gráficos</h2>
            <FleetChartsSection />
          </div>
        </>
      )}
    </Container>
  );
}
