"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Maintenance, VehicleResponse as Vehicle } from "@navestory/validators";
import { Alert, Badge, Container, EmptyState } from "@navestory/ui";
import { apiClient } from "@/lib/http/api-client";
import { useVehicleContext } from "@/lib/context/use-vehicle-context";
import { formatDateInTz } from "@/lib/datetime-tz";
import { usePreferences } from "@/lib/hooks/use-preferences";
import {
  MAINTENANCE_STATUS_LABEL as STATUS_LABEL,
  MAINTENANCE_STATUS_BADGE_VARIANT as STATUS_VARIANT,
} from "@/lib/maintenance/status-badge";

function vehicleLabel(vehicle: Vehicle | undefined): string {
  if (!vehicle) return "—";
  return (
    vehicle.nickname ??
    (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate)
  );
}

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * @spec SPEC-20260715-001 RF-15
 */
export default function MaintenancePage(): ReactNode {
  const {
    data: maintenances,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["maintenances"],
    queryFn: () => apiClient<Maintenance[]>("/maintenances?limit=100"),
    retry: false,
  });

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient<Vehicle[]>("/vehicles"),
    retry: false,
  });

  const { data: preferences } = usePreferences();
  const tz = preferences?.timezone;

  const vehicleById = new Map(
    (vehicles ?? []).map((vehicle) => [vehicle.id, vehicle]),
  );

  // @spec SPEC-20260721-001 RF-05 — filtra pela seleção global de veículo em foco (modo "single").
  const { selectionMode, activeVehicleId } = useVehicleContext();
  const visibleMaintenances =
    selectionMode === "single" && activeVehicleId != null
      ? maintenances?.filter(
          (maintenance) => maintenance.vehicle_id === activeVehicleId,
        )
      : maintenances;

  return (
    <Container size="2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Manutenções</h1>
        <Link href="/maintenance/new">Nova manutenção</Link>
      </div>

      {isLoading && <p>Carregando...</p>}
      {isError && (
        <Alert
          variant="error"
          description="Não foi possível carregar as manutenções."
        />
      )}
      {!isLoading && !isError && visibleMaintenances?.length === 0 && (
        <EmptyState size="sm" title="Nenhuma manutenção agendada ainda." />
      )}

      <ul className="flex flex-col gap-2">
        {visibleMaintenances?.map((maintenance) => (
          <li key={maintenance.id}>
            <Link
              href={`/maintenance/${maintenance.id}`}
              className="flex items-center justify-between gap-4"
            >
              <div>
                <p>
                  {formatDateInTz(maintenance.scheduled_date, tz)} —{" "}
                  {maintenance.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {vehicleLabel(vehicleById.get(maintenance.vehicle_id))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {maintenance.cost != null && (
                  <span>{currency(maintenance.cost)}</span>
                )}
                <Badge variant={STATUS_VARIANT[maintenance.status]}>
                  {STATUS_LABEL[maintenance.status]}
                </Badge>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
