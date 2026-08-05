"use client";

import { Alert, Checkbox, Skeleton } from "@navestory/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";
import { useUIStore } from "@/lib/stores/ui-store";

interface DriverSettings {
  workspaceId: string;
  requireCnhNumber: boolean;
  requireCnhExpiry: boolean;
  requireCnhCategory: boolean;
  requirePhone: boolean;
}

interface DriverSettingsTabProps {
  workspaceId: string;
}

const FIELDS: Array<{ key: keyof Omit<DriverSettings, "workspaceId">; label: string }> = [
  { key: "requireCnhNumber", label: "Número da CNH" },
  { key: "requireCnhExpiry", label: "Validade da CNH" },
  { key: "requireCnhCategory", label: "Categoria da habilitação" },
  { key: "requirePhone", label: "Telefone de contato" },
];

/**
 * @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md RF-01, RF-02, R-FLEET-01
 * Defaults já vêm ativos do backend — esta tela é opcional para o owner, nunca obrigatória.
 */
export function DriverSettingsTab({ workspaceId }: DriverSettingsTabProps): ReactNode {
  const queryClient = useQueryClient();
  const pushToast = useUIStore((state) => state.pushToast);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["workspaces", workspaceId, "driver-settings"],
    queryFn: () => apiClient<DriverSettings>(`/workspaces/${workspaceId}/driver-settings`),
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<Omit<DriverSettings, "workspaceId">>) =>
      apiClient<DriverSettings>(`/workspaces/${workspaceId}/driver-settings`, {
        method: "PATCH",
        body: patch,
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(["workspaces", workspaceId, "driver-settings"], result);
      pushToast({ variant: "success", title: "Configuração salva", duration: 3000 });
    },
    onError: () => {
      pushToast({ variant: "error", title: "Não foi possível salvar a configuração", duration: 5000 });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }
  if (isError || !data) {
    return <Alert variant="error" description="Não foi possível carregar as configurações." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Campos que todo motorista precisa preencher antes do primeiro uso. Os padrões já estão
        ativos — desative apenas o que não fizer sentido para a sua frota.
      </p>
      <div className="flex flex-col gap-3">
        {FIELDS.map((field) => (
          <label key={field.key} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={data[field.key]}
              disabled={mutation.isPending}
              onChange={(event) => mutation.mutate({ [field.key]: event.target.checked })}
            />
            {field.label}
          </label>
        ))}
      </div>
    </div>
  );
}
