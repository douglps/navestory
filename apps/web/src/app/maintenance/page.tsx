"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";

interface Maintenance {
  id: string;
  vehicle_id: string;
  description: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  scheduled_date: string;
  cost: number | null;
}

interface Vehicle {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  nickname: string | null;
}

function vehicleLabel(vehicle: Vehicle | undefined): string {
  if (!vehicle) return "—";
  return vehicle.nickname ?? (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate);
}

function currency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_LABEL: Record<Maintenance["status"], string> = {
  scheduled: "Agendada",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const STATUS_CLASS: Record<Maintenance["status"], string> = {
  scheduled: "border-sky-400 bg-sky-50 text-sky-700",
  in_progress: "border-amber-400 bg-amber-50 text-amber-700",
  completed: "border-green-500 bg-green-50 text-green-700",
  cancelled: "border-muted text-muted-foreground",
};

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

  const vehicleById = new Map((vehicles ?? []).map((vehicle) => [vehicle.id, vehicle]));

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Manutenções</h1>
        <Link href="/maintenance/new">Nova manutenção</Link>
      </div>

      {isLoading && <p>Carregando...</p>}
      {isError && <p role="alert">Não foi possível carregar as manutenções.</p>}
      {!isLoading && !isError && maintenances?.length === 0 && (
        <p>Nenhuma manutenção agendada ainda.</p>
      )}

      <ul className="flex flex-col gap-2">
        {maintenances?.map((maintenance) => (
          <li key={maintenance.id}>
            <Link href={`/maintenance/${maintenance.id}`} className="flex items-center justify-between gap-4">
              <div>
                <p>
                  {maintenance.scheduled_date} — {maintenance.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {vehicleLabel(vehicleById.get(maintenance.vehicle_id))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {maintenance.cost != null && <span>{currency(maintenance.cost)}</span>}
                <span
                  className={`rounded border px-1.5 py-0.5 text-xs ${STATUS_CLASS[maintenance.status]}`}
                >
                  {STATUS_LABEL[maintenance.status]}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
