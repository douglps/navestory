"use client";

import { Alert, Card, Container } from "@navestory/ui";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";
import { DeleteAccountDialog } from "./delete-account-dialog";

interface AccountProfileResponse {
  id: string;
  name: string;
  email: string | null;
}

/**
 * @spec SPEC-20260719-001 RF-04, RF-05, US-01
 * Rota protegida pelo middleware SSR (S1). Se a conta estiver em soft-delete, o
 * `SupabaseAuthGuard` já bloqueia esta chamada com 403 `ACCOUNT_PENDING_DELETION` antes de
 * qualquer dado chegar aqui — a interceptação global em `apiClient` redireciona para
 * `/restore-account`, então esta página nunca renderiza para uma conta pendente de exclusão.
 */
export default function AccountSettingsPage(): ReactNode {
  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => apiClient<AccountProfileResponse>("/users/me"),
    retry: false,
  });

  if (isLoading) return <main className="p-8">Carregando…</main>;
  if (isError || !profile) {
    return (
      <main className="p-8">
        <Alert
          variant="error"
          description="Não foi possível carregar as informações da conta."
        />
      </main>
    );
  }

  return (
    <Container size="2xl" gap={8}>
      <h1 className="text-xl font-semibold">Minha conta</h1>

      <Card className="flex flex-col gap-1 p-6">
        <span className="text-sm text-muted-foreground">Nome</span>
        <span className="font-medium">{profile.name}</span>
        <span className="mt-3 text-sm text-muted-foreground">E-mail</span>
        <span className="font-medium">{profile.email ?? "—"}</span>
      </Card>

      <Card className="flex flex-col gap-3 border-danger/40 p-6">
        <h2 className="text-lg font-medium text-danger">Zona de perigo</h2>
        <p className="text-sm text-muted-foreground">
          Excluir sua conta é uma ação séria. Você terá 30 dias para se
          arrepender e cancelar a exclusão fazendo login novamente antes que ela
          se torne definitiva.
        </p>
        <div>
          <DeleteAccountDialog />
        </div>
      </Card>
    </Container>
  );
}
