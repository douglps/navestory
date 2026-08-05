"use client";

import type { VehicleResponse } from "@navestory/validators";
import { Alert, Combobox, EmptyState, Skeleton } from "@navestory/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";
import { useUIStore } from "@/lib/stores/ui-store";

interface WorkspaceMember {
  id: string;
  name: string | null;
  email: string | null;
}

interface VehicleAssignment {
  vehicleId: string;
  memberId: string | null;
}

interface VehiclesTabProps {
  workspaceId: string;
}

const UNASSIGNED = "unassigned";

/**
 * @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md US-04, RF-08, RF-09, R-WS-04
 */
export function VehiclesTab({ workspaceId }: VehiclesTabProps): ReactNode {
  const queryClient = useQueryClient();
  const pushToast = useUIStore((state) => state.pushToast);

  const vehiclesQuery = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient<VehicleResponse[]>("/vehicles"),
  });
  const membersQuery = useQuery({
    queryKey: ["workspaces", workspaceId, "members"],
    queryFn: () => apiClient<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),
  });
  const assignmentsQuery = useQuery({
    queryKey: ["workspaces", workspaceId, "vehicle-assignments"],
    queryFn: () => apiClient<VehicleAssignment[]>(`/workspaces/${workspaceId}/vehicle-assignments`),
  });

  const assignMutation = useMutation({
    mutationFn: ({ vehicleId, memberId }: { vehicleId: string; memberId: string }) =>
      apiClient(`/workspaces/${workspaceId}/vehicles/${vehicleId}/assign`, {
        method: "PUT",
        body: { memberId },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workspaces", workspaceId, "vehicle-assignments"] });
      pushToast({ variant: "success", title: "Veículo atribuído", duration: 3000 });
    },
    onError: () => {
      pushToast({ variant: "error", title: "Não foi possível atribuir o veículo", duration: 5000 });
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (vehicleId: string) =>
      apiClient(`/workspaces/${workspaceId}/vehicles/${vehicleId}/assign`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workspaces", workspaceId, "vehicle-assignments"] });
    },
  });

  if (vehiclesQuery.isLoading || membersQuery.isLoading || assignmentsQuery.isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }
  if (vehiclesQuery.isError || membersQuery.isError || !vehiclesQuery.data || !membersQuery.data) {
    return <Alert variant="error" description="Não foi possível carregar veículos e motoristas." />;
  }
  if (vehiclesQuery.data.length === 0) {
    return <EmptyState title="Nenhum veículo cadastrado" description="Cadastre veículos para poder atribuí-los a motoristas." />;
  }

  const assignmentByVehicle = new Map(
    (assignmentsQuery.data ?? []).map((assignment) => [assignment.vehicleId, assignment.memberId]),
  );
  const memberOptions = [
    { value: UNASSIGNED, label: "Sem motorista atribuído" },
    ...membersQuery.data.map((member) => ({ value: member.id, label: member.name ?? member.email ?? member.id })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Atribua cada veículo a um motorista da equipe. O motorista só vê os veículos atribuídos a ele.
      </p>
      {vehiclesQuery.data.map((vehicle) => (
        <div key={vehicle.id} className="flex items-center justify-between gap-4 rounded border border-border p-3">
          <div>
            <p className="font-medium">{vehicle.nickname ?? `${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim()}</p>
            <p className="text-xs text-muted-foreground">{vehicle.plate}</p>
          </div>
          <Combobox
            value={assignmentByVehicle.get(vehicle.id) ?? UNASSIGNED}
            onValueChange={(memberId) => {
              if (memberId === UNASSIGNED) {
                unassignMutation.mutate(vehicle.id);
              } else {
                assignMutation.mutate({ vehicleId: vehicle.id, memberId });
              }
            }}
            options={memberOptions}
            aria-label={`Motorista atribuído ao veículo ${vehicle.plate}`}
          />
        </div>
      ))}
    </div>
  );
}
