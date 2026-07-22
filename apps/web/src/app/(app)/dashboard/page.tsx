"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_DASHBOARD_KPI_IDS, type FleetKpiCatalog, type KpiCatalogId } from "@nave/validators";
import { apiClient } from "@/lib/http/api-client";
import { ActionDock } from "@/components/layout/action-dock";
import { SystemFooter } from "@/components/layout/system-footer";
import { DashboardKpiGrid } from "@/components/dashboard/DashboardKpiGrid";
import { FleetAlertBar, type FleetAlertItem } from "@/components/dashboard/FleetAlertBar";
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

function capitalizeFirst(text: string): string {
  return text.length > 0 ? text[0]!.toUpperCase() + text.slice(1) : text;
}

/**
 * @spec SPEC-20260721-002 RF-07
 * Formato abreviado "Qua, 22 Jul. 26" — saudação removida (decisão do usuário em 2026-07-22):
 * sem dado de identidade do usuário disponível client-side, o texto "Bom dia/Boa tarde/Boa
 * noite" era genérico e não agregava valor. `h1` de "Dashboard" mantido apenas para leitores
 * de tela (`sr-only`) — a data abreviada é o único conteúdo visível.
 */
function DashboardDateHeader(): ReactNode {
  const now = new Date();
  const weekday = capitalizeFirst(
    new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(now).replace(/\.$/, ""),
  );
  const day = String(now.getDate()).padStart(2, "0");
  const month = capitalizeFirst(new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(now));
  const year = String(now.getFullYear()).slice(-2);

  return (
    <div>
      <h1 className="sr-only">Dashboard</h1>
      <p className="text-sm text-muted-foreground">
        {weekday}, {day} {month} {year}
      </p>
    </div>
  );
}

/**
 * @spec SPEC-20260531-001 seção 12.3 (migração incremental)
 * @spec SPEC-20260721-002 RF-05
 * Controles preservados do stub original (SPEC-20260521-003 RF-07) — reposicionados para o
 * final da página (após a Zona B) e com estados de loading/erro reais via `fetch` + `Blob`
 * (antes: `<a download>` sem feedback nenhum).
 *
 * Gap registrado em IMPACTO-040: o estado "desabilitado para plano Grátis" (R-BIZ-12) depende
 * do plano do usuário, que — assim como o nome em RF-07 — não está disponível client-side ainda.
 * Não implementado nesta rodada.
 */
function ExportControls({ vehicles }: { vehicles: VehicleCardData[] | undefined }): ReactNode {
  const [period, setPeriod] = useState(currentPeriod());
  const [vehicleId, setVehicleId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleExport(): Promise<void> {
    setStatus("loading");
    const exportUrl = `/api/backend/dashboard/export?period=${encodeURIComponent(period)}${
      vehicleId ? `&vehicle_id=${encodeURIComponent(vehicleId)}` : ""
    }`;

    try {
      const response = await fetch(exportUrl);
      if (!response.ok) throw new Error(`Falha na exportação: ${response.status}`);

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `nave-despesas-${period}.csv`;
      link.click();
      URL.revokeObjectURL(objectUrl);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      <div className="flex flex-wrap items-end gap-3">
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

        <button type="button" onClick={handleExport} disabled={status === "loading"}>
          {status === "loading" ? "Exportando…" : "Exportar CSV"}
        </button>
      </div>

      {status === "error" && (
        <p role="alert" className="text-sm text-danger">
          Não foi possível exportar. Tente novamente.
        </p>
      )}
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
    queryFn: () => apiClient<{ dashboard_kpi_ids?: KpiCatalogId[] }>("/preferences"),
    retry: false,
  });
  const activeKpiIds = preferences?.dashboard_kpi_ids ?? DEFAULT_DASHBOARD_KPI_IDS;

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
        <DashboardDateHeader />
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
          <div className="flex flex-col gap-2">
            <DashboardKpiGrid catalog={kpiCatalog} activeIds={activeKpiIds} />
            <KpiPicker activeIds={activeKpiIds} />
          </div>
          {vehicles && (
            <VehicleGrid
              vehicles={vehicles}
              healthByVehicleId={healthByVehicleId}
              flagsByVehicleId={flagsByVehicleId}
              activeVehicleId={activeVehicleId}
              onSelect={handleSelectVehicle}
            />
          )}

          <div ref={spotlightRef}>
            <VehicleSpotlight vehicle={activeVehicle} onClear={clearAllSelection} />
          </div>

          <UpcomingCostsWidget />

          <ExportControls vehicles={vehicles} />
        </>
      )}

      <ActionDock />
      <SystemFooter />
    </main>
  );
}
