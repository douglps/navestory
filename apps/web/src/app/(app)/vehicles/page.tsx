"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import { Alert, Container, EmptyState } from "@nave/ui";
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
    <Container size="2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Meus veículos</h1>
        <Link href="/vehicles/new">Novo veículo</Link>
      </div>

      {isLoading && <p>Carregando...</p>}
      {isError && <Alert variant="error" description="Não foi possível carregar os veículos." />}
      {!isLoading && !isError && vehicles?.length === 0 && (
        <EmptyState size="sm" title="Você ainda não cadastrou nenhum veículo." />
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
    </Container>
  );
}
