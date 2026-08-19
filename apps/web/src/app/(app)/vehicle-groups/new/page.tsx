"use client";

import {
  createGroupInputSchema,
  PRESET_GROUP_COLORS,
  type VehicleResponse as Vehicle,
} from "@navestory/validators";
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
  Checkbox,
  Container,
  Input,
} from "@navestory/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";
import { PRESET_COLOR_NAMES } from "@/lib/vehicle-groups/colors";

interface GroupResponse {
  id: string;
}

/**
 * @spec SPEC-20260602-003 RF-01, RF-05, RF-09
 */
export default function NewVehicleGroupPage(): ReactNode {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(PRESET_GROUP_COLORS[0]);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient<Vehicle[]>("/vehicles"),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const group = await apiClient<GroupResponse>("/vehicle-groups", {
        method: "POST",
        body: { name, color },
      });
      if (selectedVehicleIds.length > 0) {
        await apiClient(`/vehicle-groups/${group.id}/members`, {
          method: "PUT",
          body: { vehicleIds: selectedVehicleIds },
        });
      }
      return group;
    },
    onSuccess: () => router.push("/vehicle-groups"),
  });

  function toggleVehicle(vehicleId: string): void {
    setSelectedVehicleIds((current) =>
      current.includes(vehicleId)
        ? current.filter((id) => id !== vehicleId)
        : [...current, vehicleId],
    );
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setFieldError(null);

    const result = createGroupInputSchema.safeParse({ name, color });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    mutation.mutate();
  }

  const isDirty =
    name !== "" || color !== PRESET_GROUP_COLORS[0] || selectedVehicleIds.length > 0;

  function handleCancel(): void {
    if (isDirty) {
      setShowDiscardDialog(true);
      return;
    }
    router.push("/vehicle-groups");
  }

  return (
    <Container size="sm">
      <h1 className="text-xl font-semibold">Novo grupo de veículos</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="name">Nome</label>
        <Input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex: Frota de entregas, Veículos SP, Caminhões pesados..."
          required
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
        <p className="text-xs text-muted-foreground">
          Aparece na listagem de grupos e nos filtros do dashboard
        </p>

        <fieldset className="flex flex-col gap-1">
          <legend>
            Veículos do grupo
            {selectedVehicleIds.length > 0 && ` (${selectedVehicleIds.length} selecionados)`}
          </legend>
          <p className="text-xs text-muted-foreground">
            Opcional — você pode adicionar mais veículos depois
          </p>
          {vehicles?.map((vehicle) => (
            <label key={vehicle.id} className="flex items-center gap-2">
              <Checkbox
                checked={selectedVehicleIds.includes(vehicle.id)}
                onChange={() => toggleVehicle(vehicle.id)}
              />
              {vehicle.make} {vehicle.model} — {vehicle.plate}
            </label>
          ))}
        </fieldset>

        {fieldError && <Alert variant="error" description={fieldError} />}
        {mutation.isError && (
          <Alert
            variant="error"
            description="Não foi possível criar o grupo."
          />
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Criar grupo"}
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
        </div>
      </form>

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Os dados preenchidos serão descartados se você sair agora.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push("/vehicle-groups")}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Container>
  );
}
