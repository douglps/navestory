"use client";

import {
  updateVehicleInputSchema,
  type UpdateVehicleInput,
} from "@navestory/validators";
import { Alert, Button, Container, OdometerInput } from "@navestory/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, apiClient } from "@/lib/http/api-client";

interface Vehicle {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  nickname: string | null;
  odometer: number | null;
}

function vehicleLabel(vehicle: Vehicle): string {
  return (
    vehicle.nickname ??
    (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || vehicle.plate)
  );
}

/**
 * @spec SPEC-20260531-001 RF-DC-02
 * Tela mínima criada para a ação "Registrar KM" do dock (RF-DC-02, item 4) — a spec aponta para
 * esta rota, mas ela não existia em nenhuma outra feature do projeto. Reaproveita
 * `PATCH /vehicles/:id` (campo `odometer` já aceito pelo backend desde SPEC-20260602-002), sem
 * criar endpoint novo.
 */
export default function VehicleOdometerPage({
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

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ["vehicles", id],
    queryFn: () => apiClient<Vehicle>(`/vehicles/${id}`),
    enabled: id !== null,
    retry: false,
  });

  const [odometer, setOdometer] = useState<number | undefined>(undefined);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicle) setOdometer(vehicle.odometer ?? undefined);
  }, [vehicle]);

  const mutation = useMutation({
    mutationFn: (input: UpdateVehicleInput) =>
      apiClient<Vehicle>(`/vehicles/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.push("/dashboard");
    },
    onError: (error) => {
      if (error instanceof ApiError) setFieldError(error.message);
    },
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setFieldError(null);

    const result = updateVehicleInputSchema.safeParse({
      odometer: odometer ?? null,
    });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    mutation.mutate(result.data);
  }

  if (isLoading || !vehicle) {
    return (
      <Container size="sm">
        <p>Carregando…</p>
      </Container>
    );
  }

  return (
    <Container size="sm">
      <h1 className="text-xl font-semibold">
        Registrar KM — {vehicleLabel(vehicle)}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="odometer">Odômetro atual (km) *</label>
        <OdometerInput
          id="odometer"
          value={odometer}
          onChange={setOdometer}
          required
        />

        {fieldError && <Alert variant="error" description={fieldError} />}
        {mutation.isError && !fieldError && (
          <Alert
            variant="error"
            description="Não foi possível atualizar o odômetro."
          />
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard")}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Container>
  );
}
