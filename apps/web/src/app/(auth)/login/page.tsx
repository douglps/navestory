"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent, type ReactNode } from "react";
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
    onSuccess: () => {
      const redirect = searchParams.get("redirect") ?? "/";
      router.push(redirect);
    },
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    mutation.mutate();
  }

  const isLocked =
    mutation.error instanceof ApiError && mutation.error.statusCode === 403;

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Entrar</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="email">E-mail</label>
        <input
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
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          Lembrar de mim
        </label>

        {mutation.isError && (
          <p role="alert" className="text-sm text-red-600">
            {isLocked
              ? "Conta temporariamente bloqueada por excesso de tentativas. Tente novamente mais tarde."
              : "E-mail ou senha inválidos."}
          </p>
        )}

        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Entrando..." : "Entrar"}
        </button>

        <Link href="/recover-password" className="text-sm underline">
          Esqueci minha senha
        </Link>
      </form>
    </main>
  );
}
