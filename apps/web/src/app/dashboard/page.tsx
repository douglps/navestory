"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { apiClient } from "@/lib/http/api-client";

interface Vehicle {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  nickname: string | null;
}

function vehicleLabel(vehicle: Vehicle): string {
  return vehicle.nickname ?? (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate);
}

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * @spec SPEC-20260521-003 RF-07
 */
export default function DashboardPage(): ReactNode {
  const [period, setPeriod] = useState(currentPeriod());
  const [vehicleId, setVehicleId] = useState("");

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient<Vehicle[]>("/vehicles"),
    retry: false,
  });

  const exportUrl = `/api/backend/dashboard/export?period=${encodeURIComponent(period)}${
    vehicleId ? `&vehicle_id=${encodeURIComponent(vehicleId)}` : ""
  }`;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span>Mês</span>
          <input
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          />
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
    </main>
  );
}
