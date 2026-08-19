"use client";

import { createOdometerCycleInputSchema } from "@navestory/validators";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Alert,
  Button,
  Container,
  EmptyState,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@navestory/ui";
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

  const {
    data: cycles,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["odometer-cycles", vehicleId],
    queryFn: () =>
      apiClient<OdometerCycle[]>(`/vehicles/${vehicleId}/odometer-cycles`),
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
      void queryClient.invalidateQueries({
        queryKey: ["odometer-cycles", vehicleId],
      });
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

  if (vehicleId === null || isLoading)
    return <main className="p-8">Carregando…</main>;
  if (isError)
    return (
      <main className="p-8">
        <Alert
          variant="error"
          description="Não foi possível carregar os ciclos de odômetro."
        />
      </main>
    );

  return (
    <Container size="2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Ciclos de odômetro</h1>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsModalOpen(true)}
        >
          Reiniciar odômetro
        </Button>
      </div>

      {cycles?.length === 0 && (
        <EmptyState
          title="Nenhum reinício de odômetro registrado"
          description="Se o odômetro do veículo foi zerado (troca de painel, revenda, etc.), registre um novo ciclo para manter seus analytics precisos."
        />
      )}

      {cycles && cycles.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ciclo</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Valor inicial (km)</TableHead>
              <TableHead>Máximo anterior (km)</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cycles.map((cycle, index) => (
              <TableRow key={cycle.id} striped={index % 2 === 1}>
                <TableCell>{cycle.cycle_number}</TableCell>
                <TableCell>
                  {new Date(cycle.started_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell>{cycle.starting_value}</TableCell>
                <TableCell>{cycle.previous_cycle_max ?? "—"}</TableCell>
                <TableCell>{cycle.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {isModalOpen && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3"
          role="dialog"
        >
          <label htmlFor="starting_value">Valor inicial (km)</label>
          <Input
            id="starting_value"
            type="number"
            min={0}
            value={startingValue}
            onChange={(event) => setStartingValue(event.target.value)}
          />

          <label htmlFor="reason">Motivo</label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
          />

          {fieldError && <Alert variant="error" description={fieldError} />}
          {mutation.isError && (
            <Alert
              variant="error"
              description="Não foi possível registrar o novo ciclo."
            />
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Confirmar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </Container>
  );
}
