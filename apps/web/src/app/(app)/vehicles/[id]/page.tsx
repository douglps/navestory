"use client";

import { updateVehicleInputSchema, type UpdateVehicleInput } from "@nave/validators";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Alert, Button, Container, Input, VehicleHealthScore } from "@nave/ui";
import { FLAG_LABEL, type HealthFlag } from "@/components/dashboard/VehicleHealthCard";
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

interface VehicleHealth {
  score: number;
  flags: HealthFlag[];
}

/**
 * @spec SPEC-20260730-001 RF-20
 */
function flagActionLink(flag: HealthFlag, vehicleId: string): string | null {
  switch (flag.type) {
    case "maintenance_overdue":
      return `/maintenance?vehicleId=${vehicleId}&filter=overdue`;
    case "ipva_expiring":
    case "insurance_expiring":
    case "crlv_expiring":
      return `/vehicles/${vehicleId}`;
    case "fines_pending":
      return `/fines?vehicleId=${vehicleId}`;
    case "km_alert":
      return `/maintenance/new?vehicleId=${vehicleId}`;
    default:
      return null;
  }
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

  // RF-19: recalcula a saúde do veículo ao carregar a página.
  const { data: health } = useQuery({
    queryKey: ["vehicles", id, "health"],
    queryFn: () => apiClient<VehicleHealth>(`/vehicles/${id}/health`),
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
  if (isError || !vehicle)
    return (
      <main className="p-8">
        <Alert variant="error" description="Veículo não encontrado." />
      </main>
    );

  return (
    <Container size="sm">
      <h1 className="text-xl font-semibold">
        {vehicle.make} {vehicle.model} — {vehicle.plate}
      </h1>

      <section aria-label="Saúde do Veículo" className="flex flex-col gap-2 rounded-md border border-border p-3">
        <div className="flex items-center gap-2">
          <VehicleHealthScore score={health?.score} size={40} />
          <h2 className="text-sm font-medium">Saúde do Veículo</h2>
        </div>

        {health && health.flags.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum problema identificado.</p>
        )}

        {health && health.flags.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm">
            {health.flags.map((flag, index) => {
              const label = FLAG_LABEL[flag.type]?.(flag) ?? flag.type;
              const href = flagActionLink(flag, vehicle.id);
              return (
                // eslint-disable-next-line react/no-array-index-key -- flags não têm id próprio, ordem é estável dentro de uma mesma resposta
                <li key={index}>
                  {href ? (
                    <Link href={href} className="underline">
                      {label}
                    </Link>
                  ) : (
                    label
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="nickname">Apelido</label>
        <Input
          id="nickname"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
        />

        <label htmlFor="color">Cor</label>
        <Input id="color" value={color} onChange={(event) => setColor(event.target.value)} />

        {fieldError && <Alert variant="error" description={fieldError} />}
        {updateMutation.isError && (
          <Alert variant="error" description="Não foi possível atualizar o veículo." />
        )}
        {updateMutation.isSuccess && <p>Veículo atualizado.</p>}

        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </form>

      <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
        {deleteMutation.isPending ? "Removendo..." : "Remover veículo"}
      </Button>
      {deleteMutation.isError && (
        <Alert variant="error" description="Não foi possível remover o veículo." />
      )}
    </Container>
  );
}
