"use client";

import { Button, Container, Input } from "@navestory/ui";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent, type ReactNode } from "react";
import { BackLink } from "@/components/back-link";
import { LegalFooter } from "@/components/legal-footer";
import { PublicHeader } from "@/components/public-header";
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
    <>
      {/* @spec SPEC-20260731-004 RF-06 */}
      <PublicHeader />
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
            <p
              role="status"
              className="rounded-md bg-success-pastel p-3 text-sm text-foreground"
            >
              Se o e-mail existir, enviaremos instruções de redefinição.
            </p>
          )}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Enviando..." : "Enviar instruções"}
          </Button>

          {/* @spec SPEC-20260731-004 RF-08 */}
          <BackLink fallback="/login" label="Voltar para o login" />
        </form>

        <LegalFooter />
      </Container>
    </>
  );
}
