"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";

interface Vehicle {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  year: number | null;
  nickname: string | null;
}

/**
 * @spec SPEC-20260602-002 RF-03
 */
export default function VehiclesPage(): ReactNode {
  const { data: vehicles, isLoading, isError } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient<Vehicle[]>("/vehicles"),
    retry: false,
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Meus veículos</h1>
        <Link href="/vehicles/new">Novo veículo</Link>
      </div>

      {isLoading && <p>Carregando...</p>}
      {isError && <p role="alert">Não foi possível carregar os veículos.</p>}
      {!isLoading && !isError && vehicles?.length === 0 && (
        <p>Você ainda não cadastrou nenhum veículo.</p>
      )}

      <ul className="flex flex-col gap-2">
        {vehicles?.map((vehicle) => (
          <li key={vehicle.id}>
            <Link href={`/vehicles/${vehicle.id}`}>
              {vehicle.nickname ?? `${vehicle.make} ${vehicle.model}`} — {vehicle.plate}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
