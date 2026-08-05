"use client";

import { Alert, Button, Container, Skeleton } from "@navestory/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";

interface InviteDetails {
  workspaceName: string;
  email: string;
}

/**
 * @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md US-03, RF-04, RF-05
 */
export default function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}): ReactNode {
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    void params.then((resolved) => setToken(resolved.token));
  }, [params]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["workspaces", "invites", token],
    queryFn: () => apiClient<InviteDetails>(`/workspaces/invites/${token}`),
    enabled: token !== null,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () => apiClient(`/workspaces/invites/${token}/accept`, { method: "POST" }),
    onSuccess: () => {
      router.push("/workspace/onboarding");
    },
  });

  if (token === null || isLoading) {
    return (
      <Container size="sm" gap={4}>
        <Skeleton className="h-32 w-full" />
      </Container>
    );
  }

  if (isError || !data) {
    return (
      <Container size="sm" gap={4}>
        <Alert variant="error" description="Convite inválido ou expirado." />
      </Container>
    );
  }

  return (
    <Container size="sm" gap={4}>
      <h2 className="text-lg font-semibold">Convite para {data.workspaceName}</h2>
      <p className="text-sm text-muted-foreground">
        Você foi convidado como motorista do workspace <strong>{data.workspaceName}</strong>.
      </p>
      {mutation.isError && (
        <Alert variant="error" description="Não foi possível aceitar o convite. Verifique se você já pertence a outro workspace." />
      )}
      <Button
        type="button"
        aria-busy={mutation.isPending}
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? "Aceitando..." : "Aceitar convite"}
      </Button>
    </Container>
  );
}
