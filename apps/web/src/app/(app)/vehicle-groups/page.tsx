"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import { Alert, Container, EmptyState } from "@nave/ui";
import { apiClient } from "@/lib/http/api-client";

interface VehicleGroup {
  id: string;
  name: string;
  color: string;
  member_count: number;
}

/**
 * @spec SPEC-20260602-003 RF-08
 */
export default function VehicleGroupsPage(): ReactNode {
  const { data: groups, isLoading, isError } = useQuery({
    queryKey: ["vehicle-groups"],
    queryFn: () => apiClient<VehicleGroup[]>("/vehicle-groups"),
    retry: false,
  });

  return (
    <Container size="2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Grupos de veículos</h1>
        <Link href="/vehicle-groups/new">Novo grupo</Link>
      </div>

      {isLoading && <p>Carregando...</p>}
      {isError && <Alert variant="error" description="Não foi possível carregar os grupos." />}
      {!isLoading && !isError && groups?.length === 0 && (
        <EmptyState size="sm" title="Você ainda não criou nenhum grupo." />
      )}

      <ul className="flex flex-col gap-2">
        {groups?.map((group) => (
          <li key={group.id}>
            <Link href={`/vehicle-groups/${group.id}`} className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              {group.name} — {group.member_count} veículo{group.member_count === 1 ? "" : "s"}
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
