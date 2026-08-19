"use client";

import {
  PRESET_GROUP_COLORS,
  updateGroupInputSchema,
  type VehicleResponse as Vehicle,
} from "@navestory/validators";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Alert,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  Checkbox,
  Container,
  Input,
} from "@navestory/ui";
import { apiClient } from "@/lib/http/api-client";
import { PRESET_COLOR_NAMES } from "@/lib/vehicle-groups/colors";

interface VehicleGroup {
  id: string;
  name: string;
  color: string;
  vehicleIds: string[];
}

/**
 * @spec SPEC-20260602-003 RF-03, RF-04, RF-05
 * @spec SPEC-20260804-005 RF-02, RF-03, RF-04, RF-05, RF-06
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

  const {
    data: group,
    isLoading,
    isError,
  } = useQuery({
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
  /**
   * @spec SPEC-20260807-005 RF-07, RF-08, RF-09
   * Estado genérico para as 3 confirmações de ação deste formulário — evita proliferação
   * de `useState` por diálogo, já que os três seguem o mesmo padrão de mensagem+confirmação.
   */
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description?: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setColor(group.color);
      setSelectedVehicleIds(group.vehicleIds ?? []);
    }
  }, [group]);

  const updateMutation = useMutation({
    mutationFn: () =>
      apiClient<VehicleGroup>(`/vehicle-groups/${id}`, {
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicle-groups"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiClient<void>(`/vehicle-groups/${id}`, { method: "DELETE" }),
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

  /**
   * @spec SPEC-20260807-005 RF-07, RF-08
   */
  function handleSaveMembers(): void {
    if (!group) return;

    const currentIds = group.vehicleIds ?? [];
    const added = selectedVehicleIds.filter((v) => !currentIds.includes(v)).length;
    const removed = currentIds.filter((v) => !selectedVehicleIds.includes(v)).length;

    if (selectedVehicleIds.length === 0 && currentIds.length > 0) {
      setConfirmDialog({
        title: "Remover todos os membros?",
        description: `Isso removerá ${currentIds.length === 1 ? "o único veículo" : `todos os ${currentIds.length} veículos`} deste grupo.`,
        onConfirm: () => setMembersMutation.mutate(),
      });
    } else {
      const parts: string[] = [];
      if (added > 0) parts.push(`adicionar ${added} veículo${added === 1 ? "" : "s"}`);
      if (removed > 0) parts.push(`remover ${removed} veículo${removed === 1 ? "" : "s"}`);
      setConfirmDialog({
        title: "Salvar alterações nos membros?",
        description:
          parts.length > 0 ? `Isso vai ${parts.join(" e ")}.` : "Nenhuma alteração nos membros.",
        confirmLabel: "Aplicar alterações",
        onConfirm: () => setMembersMutation.mutate(),
      });
    }
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

  /**
   * @spec SPEC-20260807-005 RF-09
   */
  function handleDelete(): void {
    setConfirmDialog({
      title: "Remover este grupo?",
      description: "Os veículos membros não serão afetados.",
      onConfirm: () => deleteMutation.mutate(),
    });
  }

  if (id === null || isLoading)
    return <main className="p-8">Carregando…</main>;
  if (isError || !group)
    return (
      <main className="p-8">
        <Alert variant="error" description="Grupo não encontrado." />
      </main>
    );

  return (
    <Container size="sm">
      <h1 className="text-xl font-semibold">{group.name}</h1>

      <h2 className="text-sm font-medium text-muted-foreground">Informações do grupo</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="name">Nome</label>
        <Input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <label htmlFor="color">Cor</label>
        <div className="flex gap-2">
          {PRESET_GROUP_COLORS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-label={PRESET_COLOR_NAMES[preset] ?? preset}
              aria-pressed={color === preset}
              onClick={() => setColor(preset)}
              className="h-6 w-6 rounded-full border border-border"
              style={{ backgroundColor: preset }}
            />
          ))}
        </div>
        <Input
          id="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
        />

        {fieldError && <Alert variant="error" description={fieldError} />}
        {updateMutation.isError && (
          <Alert
            variant="error"
            description="Não foi possível atualizar o grupo."
          />
        )}
        {updateMutation.isSuccess && (
          <Alert variant="success" description="Alterações salvas." />
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/vehicle-groups")}>
            Cancelar
          </Button>
        </div>
      </form>

      <h2 className="text-sm font-medium text-muted-foreground">Membros</h2>
      <fieldset className="flex flex-col gap-1">
        <legend className="sr-only">Veículos do grupo</legend>
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
          onClick={handleSaveMembers}
          disabled={setMembersMutation.isPending || isLoading || !group}
        >
          {setMembersMutation.isPending
            ? "Salvando membros..."
            : "Salvar membros"}
        </Button>
        {setMembersMutation.isError && (
          <Alert
            variant="error"
            description="Não foi possível atualizar os membros do grupo."
          />
        )}
      </fieldset>

      <Card className="flex flex-col gap-3 border-danger/40 p-6">
        <h2 className="text-lg font-medium text-danger">Zona de perigo</h2>
        <p className="text-sm text-muted-foreground">
          Remover este grupo é uma ação que não pode ser desfeita. Os veículos membros não
          serão afetados.
        </p>
        <div>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Removendo..." : "Remover grupo"}
          </Button>
        </div>
        {deleteMutation.isError && (
          <Alert
            variant="error"
            description="Não foi possível remover o grupo."
          />
        )}
      </Card>

      <AlertDialog
        open={confirmDialog !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog?.title}</AlertDialogTitle>
            {confirmDialog?.description && (
              <AlertDialogDescription>
                {confirmDialog.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmDialog?.onConfirm();
                setConfirmDialog(null);
              }}
            >
              {confirmDialog?.confirmLabel ?? "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Container>
  );
}
