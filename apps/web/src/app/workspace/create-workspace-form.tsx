"use client";

import { Alert, Button, Container, Input } from "@navestory/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";

/**
 * @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md US-01, RF-01
 */
export function CreateWorkspaceForm(): ReactNode {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const mutation = useMutation({
    mutationFn: () => apiClient("/workspaces", { method: "POST", body: { name } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workspaces", "me"] });
    },
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    if (name.trim().length === 0) return;
    mutation.mutate();
  }

  return (
    <Container size="sm">
      <h2 className="mb-2 text-lg font-semibold">Criar workspace</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Crie um workspace para convidar motoristas e gerenciar sua frota em equipe. Após
        criar, você poderá gerar links de convite para os motoristas.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="workspaceName">Nome do workspace</label>
        <Input
          id="workspaceName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex: Transportadora Silva"
          maxLength={60}
          required
        />
        {mutation.isError && (
          <Alert variant="error" description="Não foi possível criar o workspace." />
        )}
        <Button type="submit" aria-busy={mutation.isPending} disabled={mutation.isPending}>
          {mutation.isPending ? "Criando..." : "Criar workspace"}
        </Button>
      </form>
    </Container>
  );
}
