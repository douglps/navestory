"use client";

import { updateVehicleInputSchema, type UpdateVehicleInput } from "@nave/validators";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";

interface Vehicle {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  year: number | null;
  nickname: string | null;
  color: string | null;
}

/**
 * @spec SPEC-20260602-002 RF-04, RF-05, RF-06
 */
export default function VehicleDetailPage({
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

  const { data: vehicle, isLoading, isError } = useQuery({
    queryKey: ["vehicles", id],
    queryFn: () => apiClient<Vehicle>(`/vehicles/${id}`),
    enabled: id !== null,
    retry: false,
  });

  const [nickname, setNickname] = useState("");
  const [color, setColor] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicle) {
      setNickname(vehicle.nickname ?? "");
      setColor(vehicle.color ?? "");
    }
  }, [vehicle]);

  const updateMutation = useMutation({
    mutationFn: (input: UpdateVehicleInput) =>
      apiClient<Vehicle>(`/vehicles/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient<void>(`/vehicles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      router.push("/vehicles");
    },
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setFieldError(null);

    const result = updateVehicleInputSchema.safeParse({
      nickname: nickname || null,
      color: color || null,
    });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    updateMutation.mutate(result.data);
  }

  function handleDelete(): void {
    if (window.confirm("Remover este veículo? O histórico de despesas e manutenções também será ocultado.")) {
      deleteMutation.mutate();
    }
  }

  if (id === null || isLoading) return <main className="p-8">Carregando...</main>;
  if (isError || !vehicle) return <main className="p-8" role="alert">Veículo não encontrado.</main>;

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">
        {vehicle.make} {vehicle.model} — {vehicle.plate}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="nickname">Apelido</label>
        <input
          id="nickname"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
        />

        <label htmlFor="color">Cor</label>
        <input id="color" value={color} onChange={(event) => setColor(event.target.value)} />

        {fieldError && <p role="alert">{fieldError}</p>}
        {updateMutation.isError && <p role="alert">Não foi possível atualizar o veículo.</p>}
        {updateMutation.isSuccess && <p>Veículo atualizado.</p>}

        <button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Salvando..." : "Salvar"}
        </button>
      </form>

      <button type="button" onClick={handleDelete} disabled={deleteMutation.isPending}>
        {deleteMutation.isPending ? "Removendo..." : "Remover veículo"}
      </button>
      {deleteMutation.isError && <p role="alert">Não foi possível remover o veículo.</p>}
    </main>
  );
}
