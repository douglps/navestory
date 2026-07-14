"use client";

import { createOdometerCycleInputSchema } from "@nave/validators";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";

interface OdometerCycle {
  id: string;
  cycle_number: number;
  started_at: string;
  starting_value: number;
  previous_cycle_max: number | null;
  reason: string;
}

/**
 * @spec SPEC-20260711-001 RF-22
 */
export default function OdometerCyclesPage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}): ReactNode {
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    void params.then((resolved) => setVehicleId(resolved.vehicleId));
  }, [params]);

  const { data: cycles, isLoading, isError } = useQuery({
    queryKey: ["odometer-cycles", vehicleId],
    queryFn: () => apiClient<OdometerCycle[]>(`/vehicles/${vehicleId}/odometer-cycles`),
    enabled: vehicleId !== null,
    retry: false,
  });

  const [startingValue, setStartingValue] = useState("0");
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: (input: { starting_value: number; reason: string }) =>
      apiClient<OdometerCycle>(`/vehicles/${vehicleId}/odometer-cycles`, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["odometer-cycles", vehicleId] });
      setReason("");
      setStartingValue("0");
      setIsModalOpen(false);
    },
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setFieldError(null);

    const result = createOdometerCycleInputSchema.safeParse({
      starting_value: Number(startingValue),
      reason,
    });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    mutation.mutate(result.data);
  }

  if (vehicleId === null || isLoading) return <main className="p-8">Carregando...</main>;
  if (isError) return <main className="p-8" role="alert">Não foi possível carregar os ciclos de odômetro.</main>;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Ciclos de odômetro</h1>
        <button type="button" onClick={() => setIsModalOpen(true)}>
          Reiniciar odômetro
        </button>
      </div>

      {cycles?.length === 0 && (
        <p>
          Nenhum reinício de odômetro registrado. Se o odômetro do veículo foi zerado (troca de
          painel, revenda, etc.), registre um novo ciclo para manter seus analytics precisos.
        </p>
      )}

      {cycles && cycles.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Ciclo</th>
              <th>Início</th>
              <th>Valor inicial (km)</th>
              <th>Máximo anterior (km)</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {cycles.map((cycle) => (
              <tr key={cycle.id}>
                <td>{cycle.cycle_number}</td>
                <td>{new Date(cycle.started_at).toLocaleDateString("pt-BR")}</td>
                <td>{cycle.starting_value}</td>
                <td>{cycle.previous_cycle_max ?? "—"}</td>
                <td>{cycle.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isModalOpen && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" role="dialog">
          <label htmlFor="starting_value">Valor inicial (km)</label>
          <input
            id="starting_value"
            type="number"
            min={0}
            value={startingValue}
            onChange={(event) => setStartingValue(event.target.value)}
          />

          <label htmlFor="reason">Motivo</label>
          <textarea
            id="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
          />

          {fieldError && <p role="alert">{fieldError}</p>}
          {mutation.isError && <p role="alert">Não foi possível registrar o novo ciclo.</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Confirmar"}
            </button>
            <button type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
