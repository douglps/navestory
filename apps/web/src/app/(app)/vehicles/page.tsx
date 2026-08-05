"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import type {
  FleetHealthEntry,
  VehicleResponse as Vehicle,
} from "@navestory/validators";
import {
  Alert,
  Container,
  EmptyState,
  VehicleHealthScore,
} from "@navestory/ui";
import { apiClient } from "@/lib/http/api-client";

/**
 * @spec SPEC-20260730-001 RF-15
 * `undefined` (score ainda não calculado) vai para o fim — não é "pior" nem "melhor",
 * é desconhecido, então não deve aparecer antes de veículos com score realmente baixo.
 */
function byScoreAscending(scores: Map<string, number | undefined>) {
  return (a: Vehicle, b: Vehicle): number => {
    const scoreA = scores.get(a.id);
    const scoreB = scores.get(b.id);
    if (scoreA === undefined && scoreB === undefined) return 0;
    if (scoreA === undefined) return 1;
    if (scoreB === undefined) return -1;
    return scoreA - scoreB;
  };
}

/**
 * @spec SPEC-20260602-002 RF-03
 * @spec SPEC-20260730-001 RF-13, RF-14, RF-15, RF-16
 */
export default function VehiclesPage(): ReactNode {
  const {
    data: vehicles,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient<Vehicle[]>("/vehicles"),
    retry: false,
  });

  // RF-14: calcula/atualiza a saúde da frota ao carregar. RF-16: falha aqui nunca bloqueia
  // a listagem nem exibe erro — os scores só ficam undefined (estado neutro "Calculando").
  const { data: fleetHealth } = useQuery({
    queryKey: ["dashboard", "fleet-health"],
    queryFn: () => apiClient<FleetHealthEntry[]>("/dashboard/fleet-health"),
    retry: false,
  });

  const scores = new Map<string, number | undefined>(
    fleetHealth?.map((entry) => [entry.vehicle_id, entry.score]),
  );

  const sortedVehicles = vehicles
    ? [...vehicles].sort(byScoreAscending(scores))
    : vehicles;

  return (
    <Container size="2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Meus veículos</h1>
        <Link href="/vehicles/new">Novo veículo</Link>
      </div>

      {isLoading && <p>Carregando...</p>}
      {isError && (
        <Alert
          variant="error"
          description="Não foi possível carregar os veículos."
        />
      )}
      {!isLoading && !isError && vehicles?.length === 0 && (
        <EmptyState
          size="sm"
          title="Você ainda não cadastrou nenhum veículo."
        />
      )}

      <ul className="flex flex-col gap-2">
        {sortedVehicles?.map((vehicle) => (
          <li key={vehicle.id}>
            <Link
              href={`/vehicles/${vehicle.id}`}
              className="flex items-center gap-2"
            >
              <VehicleHealthScore score={scores.get(vehicle.id)} size={28} />
              {vehicle.nickname ?? `${vehicle.make} ${vehicle.model}`} —{" "}
              {vehicle.plate}
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
