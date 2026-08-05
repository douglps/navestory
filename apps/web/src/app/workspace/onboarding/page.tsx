"use client";

import { Alert, Button, Container, Input, Skeleton } from "@navestory/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";

interface MyWorkspace {
  id: string;
}

interface DriverSettings {
  requireCnhNumber: boolean;
  requireCnhExpiry: boolean;
  requireCnhCategory: boolean;
  requirePhone: boolean;
}

interface MemberProfile {
  cnhNumber: string | null;
  cnhCategory: string | null;
  cnhExpiresAt: string | null;
  phone: string | null;
}

/**
 * @spec specs/fleet-admin/SPEC-20260804-003-fleet-settings.md RF-04, RF-05, RF-06, US-02
 */
export default function WorkspaceOnboardingPage(): ReactNode {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MemberProfile>({
    cnhNumber: "",
    cnhCategory: "",
    cnhExpiresAt: "",
    phone: "",
  });
  const [initialized, setInitialized] = useState(false);

  const workspaceQuery = useQuery({
    queryKey: ["workspaces", "me"],
    queryFn: () => apiClient<MyWorkspace>("/workspaces/me"),
  });
  const workspaceId = workspaceQuery.data?.id;

  const settingsQuery = useQuery({
    queryKey: ["workspaces", workspaceId, "driver-settings"],
    queryFn: () => apiClient<DriverSettings>(`/workspaces/${workspaceId}/driver-settings`),
    enabled: workspaceId !== undefined,
  });

  const profileQuery = useQuery({
    queryKey: ["workspaces", workspaceId, "members", "me", "profile"],
    queryFn: () => apiClient<MemberProfile | null>(`/workspaces/${workspaceId}/members/me/profile`),
    enabled: workspaceId !== undefined,
  });

  useEffect(() => {
    if (profileQuery.data && !initialized) {
      setForm({
        cnhNumber: profileQuery.data.cnhNumber ?? "",
        cnhCategory: profileQuery.data.cnhCategory ?? "",
        cnhExpiresAt: profileQuery.data.cnhExpiresAt ?? "",
        phone: profileQuery.data.phone ?? "",
      });
      setInitialized(true);
    }
  }, [profileQuery.data, initialized]);

  const mutation = useMutation({
    mutationFn: () =>
      apiClient(`/workspaces/${workspaceId}/members/me/profile`, {
        method: "PATCH",
        body: {
          cnhNumber: form.cnhNumber || null,
          cnhCategory: form.cnhCategory || null,
          cnhExpiresAt: form.cnhExpiresAt || null,
          phone: form.phone || null,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workspaces", workspaceId, "members", "me", "profile"] });
    },
  });

  if (workspaceQuery.isLoading || settingsQuery.isLoading || profileQuery.isLoading) {
    return (
      <Container size="sm" gap={4}>
        <Skeleton className="h-48 w-full" />
      </Container>
    );
  }

  if (!settingsQuery.data) {
    return (
      <Container size="sm" gap={4}>
        <Alert variant="error" description="Não foi possível carregar o checklist de cadastro." />
      </Container>
    );
  }

  const settings = settingsQuery.data;
  const pending: string[] = [];
  if (settings.requireCnhNumber && !form.cnhNumber) pending.push("Número da CNH");
  if (settings.requireCnhCategory && !form.cnhCategory) pending.push("Categoria da habilitação");
  if (settings.requireCnhExpiry && !form.cnhExpiresAt) pending.push("Validade da CNH");
  if (settings.requirePhone && !form.phone) pending.push("Telefone de contato");

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <Container size="sm" gap={4}>
      <h2 className="text-lg font-semibold">Complete seu cadastro de motorista</h2>

      {pending.length === 0 ? (
        <Alert variant="success" description="Cadastro completo! Você já pode usar os veículos atribuídos a você." />
      ) : (
        <Alert
          variant="warning"
          description={`Ainda faltam: ${pending.join(", ")}.`}
        />
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {settings.requireCnhNumber && (
          <Input
            placeholder="Número da CNH"
            value={form.cnhNumber ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, cnhNumber: event.target.value }))}
          />
        )}
        {settings.requireCnhCategory && (
          <Input
            placeholder="Categoria da habilitação (ex: B, E)"
            maxLength={5}
            value={form.cnhCategory ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, cnhCategory: event.target.value }))}
          />
        )}
        {settings.requireCnhExpiry && (
          <Input
            type="date"
            value={form.cnhExpiresAt ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, cnhExpiresAt: event.target.value }))}
          />
        )}
        {settings.requirePhone && (
          <Input
            type="tel"
            placeholder="Telefone de contato"
            value={form.phone ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
        )}

        {mutation.isError && <Alert variant="error" description="Não foi possível salvar o cadastro." />}

        <Button type="submit" aria-busy={mutation.isPending} disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </form>
    </Container>
  );
}
