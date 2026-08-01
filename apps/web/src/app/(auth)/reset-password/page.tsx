"use client";

import { passwordSchema } from "@navestory/validators";
import { Alert, Button, Container } from "@navestory/ui";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent, type ReactNode } from "react";
import { BackLink } from "@/components/back-link";
import { LegalFooter } from "@/components/legal-footer";
import { PublicHeader } from "@/components/public-header";
import { PasswordInput } from "@/components/password-input";
import { apiClient } from "@/lib/http/api-client";

interface ResetPasswordResponse {
  message: string;
}

/**
 * @spec SPEC-20260524-001 STORY-05
 */
export default function ResetPasswordPage(): ReactNode {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm(): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      apiClient<ResetPasswordResponse>("/auth/reset-password", {
        method: "POST",
        body: { token, password },
      }),
    onSuccess: () => router.push("/login"),
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setFieldError(null);

    const result = passwordSchema.safeParse(password);
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? "Senha inválida");
      return;
    }

    mutation.mutate();
  }

  return (
    <>
      {/* @spec SPEC-20260731-004 RF-06 */}
      <PublicHeader />
      <Container size="sm">
        <h1 className="text-xl font-semibold">Redefinir senha</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label htmlFor="password">Nova senha</label>
          <PasswordInput
            id="password"
            aria-label="Nova senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {fieldError && <Alert variant="error" description={fieldError} />}

          {mutation.isError && (
            <Alert
              variant="error"
              description="Link de redefinição inválido ou expirado."
            />
          )}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Redefinindo..." : "Redefinir senha"}
          </Button>

          {/* @spec SPEC-20260731-004 RF-09 */}
          <BackLink fallback="/login" label="Voltar para o login" />
        </form>

        <LegalFooter />
      </Container>
    </>
  );
}
