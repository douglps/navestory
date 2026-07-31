"use client";

import { Alert, Button, Container } from "@nave/ui";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { apiClient, ApiError } from "@/lib/http/api-client";
import { logout } from "@/lib/auth/logout";
import { useUIStore } from "@/lib/stores/ui-store";

const RETENTION_DAYS = 30;

interface RestoreAccountResponse {
  message: string;
}

function formatProjectedDeletionDate(deletedAt: string | null): string | null {
  if (!deletedAt) return null;
  const deletedAtDate = new Date(deletedAt);
  if (Number.isNaN(deletedAtDate.getTime())) return null;
  const projected = new Date(deletedAtDate.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
  return projected.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

/**
 * @spec SPEC-20260719-001 RF-14, RF-15, US-06
 * Alcançada após um login bem-sucedido de uma conta em soft-delete (o
 * `SupabaseAuthGuard` retorna 403 `ACCOUNT_PENDING_DELETION` — ver
 * `redirectToRestoreAccount` em `api-client.ts`). Fica no grupo `(auth)`, não `(app)`: o
 * usuário chega aqui com uma conta bloqueada pela API do Nave, mesmo com JWT do Supabase
 * ainda tecnicamente válido.
 */
export default function RestoreAccountPage(): ReactNode {
  return (
    <Suspense>
      <RestoreAccountContent />
    </Suspense>
  );
}

function RestoreAccountContent(): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pushToast = useUIStore((state) => state.pushToast);
  const projectedDeletionDate = formatProjectedDeletionDate(searchParams.get("deletedAt"));

  const restoreMutation = useMutation({
    mutationFn: () => apiClient<RestoreAccountResponse>("/users/me/restore", { method: "POST" }),
    onSuccess: () => {
      pushToast({ variant: "success", title: "Sua conta foi restaurada com sucesso!", duration: 5000 });
      router.push("/dashboard");
    },
  });

  const errorMessage =
    restoreMutation.error instanceof ApiError
      ? restoreMutation.error.message
      : "Não foi possível restaurar sua conta agora. Tente novamente ou entre em contato com o suporte.";

  return (
    <Container size="md">
      <h1 className="text-xl font-semibold">Sua conta está marcada para exclusão</h1>

      <Alert
        variant="warning"
        title={projectedDeletionDate ? `Exclusão definitiva em ${projectedDeletionDate}` : undefined}
        description={
          "Você solicitou a exclusão da sua conta. Até essa data, você ainda pode cancelar " +
          "e continuar usando o Nave normalmente."
        }
      />

      <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Ao cancelar a exclusão, você recupera:</p>
        <ul className="list-inside list-disc">
          <li>Todos os seus veículos e grupos</li>
          <li>Histórico de despesas, manutenções e multas</li>
          <li>Nome e preferências da conta — nada foi anonimizado ainda</li>
        </ul>
      </div>

      {restoreMutation.isError && <Alert variant="error" description={errorMessage} />}

      <Button
        type="button"
        onClick={() => restoreMutation.mutate()}
        disabled={restoreMutation.isPending}
        aria-busy={restoreMutation.isPending}
      >
        {restoreMutation.isPending ? "Restaurando..." : "Cancelar exclusão e restaurar minha conta"}
      </Button>

      <Button
        type="button"
        variant="outline"
        onClick={() => void logout()}
        disabled={restoreMutation.isPending}
      >
        Continuar com a exclusão
      </Button>
    </Container>
  );
}
