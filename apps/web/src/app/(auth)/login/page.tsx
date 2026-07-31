"use client";

import { Alert, Button, Checkbox, Container, Input } from "@nave/ui";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent, type ReactNode } from "react";
import { LegalFooter } from "@/components/legal-footer";
import { PasswordInput } from "@/components/password-input";
import { apiClient, ApiError } from "@/lib/http/api-client";

interface LoginResponse {
  message: string;
}

/**
 * @spec SPEC-20260524-001 STORY-01, STORY-02, STORY-03
 */
export default function LoginPage(): ReactNode {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm(): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      apiClient<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password, rememberMe },
      }),
    /**
     * @spec SPEC-20260719-001 RF-13
     * Confirma que a conta não está em soft-delete antes de navegar ao dashboard.
     * Se `GET /users/me` retornar 403 ACCOUNT_PENDING_DELETION, `apiClient` já dispara o
     * redirecionamento global para `/restore-account` (ver `redirectToRestoreAccount`) —
     * aqui só evitamos empurrar o usuário para `/dashboard` nesse caso. Qualquer outro erro
     * ao checar o perfil não deve travar o login (falha aberta: segue para o dashboard).
     */
    onSuccess: async () => {
      try {
        await apiClient("/users/me");
      } catch (error) {
        if (error instanceof ApiError && error.code === "ACCOUNT_PENDING_DELETION") {
          return;
        }
      }
      const redirect = searchParams.get("redirect") ?? "/dashboard";
      router.push(redirect);
    },
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    mutation.mutate();
  }

  const isLocked =
    mutation.error instanceof ApiError && mutation.error.statusCode === 403;

  // @spec SPEC-20260719-001 RF-09, US-03
  const showAccountDeletedNotice = searchParams.get("message") === "conta_excluida";

  return (
    <Container size="sm">
      <h1 className="text-xl font-semibold">Entrar</h1>

      {showAccountDeletedNotice && (
        <Alert
          variant="info"
          description="Sua solicitação de exclusão de conta foi registrada. Você tem 30 dias para cancelar fazendo login novamente."
        />
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="email">E-mail</label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="password">Senha</label>
        <PasswordInput
          id="password"
          aria-label="Senha"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <label className="flex items-center gap-2">
          <Checkbox
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          Lembrar de mim
        </label>

        {mutation.isError && (
          <Alert
            variant="error"
            description={
              isLocked
                ? "Conta temporariamente bloqueada por excesso de tentativas. Tente novamente mais tarde."
                : "E-mail ou senha inválidos."
            }
          />
        )}

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Entrando..." : "Entrar"}
        </Button>

        <Link href="/recover-password" className="text-sm underline">
          Esqueci minha senha
        </Link>
      </form>

      <p className="text-sm">
        Ainda não tem conta?{" "}
        <Link href="/register" className="underline">
          Criar conta
        </Link>
      </p>

      <LegalFooter />
    </Container>
  );
}
