"use client";

import { Button, Container, Input } from "@nave/ui";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";

interface RecoverPasswordResponse {
  message: string;
}

/**
 * @spec SPEC-20260524-001 STORY-04
 */
export default function RecoverPasswordPage(): ReactNode {
  return (
    <Suspense>
      <RecoverPasswordForm />
    </Suspense>
  );
}

function RecoverPasswordForm(): ReactNode {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      apiClient<RecoverPasswordResponse>("/auth/recover-password", {
        method: "POST",
        body: { email },
      }),
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <Container size="sm">
      <h1 className="text-xl font-semibold">Recuperar senha</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="email">E-mail</label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        {mutation.isSuccess && (
          <p role="status" className="rounded-md bg-success-pastel p-3 text-sm text-foreground">
            Se o e-mail existir, enviaremos instruções de redefinição.
          </p>
        )}

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Enviando..." : "Enviar instruções"}
        </Button>
      </form>
    </Container>
  );
}
