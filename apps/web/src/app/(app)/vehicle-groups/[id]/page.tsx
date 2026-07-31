"use client";

import { updateGroupInputSchema } from "@nave/validators";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Alert, Button, Checkbox, Container, Input } from "@nave/ui";
import { apiClient } from "@/lib/http/api-client";

interface VehicleGroup {
  id: string;
  name: string;
  color: string;
}

interface Vehicle {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
}

/**
 * @spec SPEC-20260602-003 RF-03, RF-04, RF-05
 */
export default function VehicleGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): ReactNode {
  const [id, setId] = useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    void params.then((resolved) => setId(resolved.id));
  }, [params]);

  const { data: group, isLoading, isError } = useQuery({
    queryKey: ["vehicle-groups", id],
    queryFn: () =>
      apiClient<VehicleGroup[]>("/vehicle-groups").then(
        (groups) => groups.find((candidate) => candidate.id === id) ?? null,
      ),
    enabled: id !== null,
    retry: false,
  });

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient<Vehicle[]>("/vehicles"),
    enabled: id !== null,
    retry: false,
  });

  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setColor(group.color);
    }
  }, [group]);

  const updateMutation = useMutation({
    mutationFn: () => apiClient<VehicleGroup>(`/vehicle-groups/${id}`, {
      method: "PATCH",
      body: { name, color },
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicle-groups"] });
    },
  });

  const setMembersMutation = useMutation({
    mutationFn: () =>
      apiClient(`/vehicle-groups/${id}/members`, {
        method: "PUT",
        body: { vehicleIds: selectedVehicleIds },
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient<void>(`/vehicle-groups/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicle-groups"] });
      router.push("/vehicle-groups");
    },
  });

  function toggleVehicle(vehicleId: string): void {
    setSelectedVehicleIds((current) =>
      current.includes(vehicleId)
        ? current.filter((v) => v !== vehicleId)
        : [...current, vehicleId],
    );
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setFieldError(null);

    const result = updateGroupInputSchema.safeParse({ name, color });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    updateMutation.mutate();
  }

  function handleDelete(): void {
    if (window.confirm("Remover este grupo? Os veículos membros não serão afetados.")) {
      deleteMutation.mutate();
    }
  }

  if (id === null || isLoading) return <main className="p-8">Carregando...</main>;
  if (isError || !group)
    return (
      <main className="p-8">
        <Alert variant="error" description="Grupo não encontrado." />
      </main>
    );

  return (
    <Container size="sm">
      <h1 className="text-xl font-semibold">{group.name}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="name">Nome</label>
        <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />

        <label htmlFor="color">Cor</label>
        <Input id="color" value={color} onChange={(event) => setColor(event.target.value)} />

        {fieldError && <Alert variant="error" description={fieldError} />}
        {updateMutation.isError && (
          <Alert variant="error" description="Não foi possível atualizar o grupo." />
        )}
        {updateMutation.isSuccess && <p>Grupo atualizado.</p>}

        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </form>

      <fieldset className="flex flex-col gap-1">
        <legend>Veículos membros</legend>
        {vehicles?.map((vehicle) => (
          <label key={vehicle.id} className="flex items-center gap-2">
            <Checkbox
              checked={selectedVehicleIds.includes(vehicle.id)}
              onChange={() => toggleVehicle(vehicle.id)}
            />
            {vehicle.make} {vehicle.model} — {vehicle.plate}
          </label>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => setMembersMutation.mutate()}
          disabled={setMembersMutation.isPending}
        >
          {setMembersMutation.isPending ? "Salvando membros..." : "Salvar membros"}
        </Button>
        {setMembersMutation.isError && (
          <Alert variant="error" description="Não foi possível atualizar os membros do grupo." />
        )}
      </fieldset>

      <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
        {deleteMutation.isPending ? "Removendo..." : "Remover grupo"}
      </Button>
      {deleteMutation.isError && (
        <Alert variant="error" description="Não foi possível remover o grupo." />
      )}
    </Container>
  );
}
