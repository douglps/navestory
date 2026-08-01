"use client";

import { registerInputSchema } from "@navestory/validators";
import { Alert, Button, Checkbox, Container, Input } from "@navestory/ui";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { LegalFooter } from "@/components/legal-footer";
import { PublicHeader } from "@/components/public-header";
import { PasswordInput } from "@/components/password-input";
import { apiClient, ApiError } from "@/lib/http/api-client";

interface RegisterResponse {
  message: string;
}

/**
 * @spec SPEC-20260524-001 STORY-REG-01, SPEC-20260524-002 STORY-01
 */
export default function RegisterPage(): ReactNode {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const mutation = useMutation({
    mutationFn: (input: { name: string; email: string; password: string }) =>
      apiClient<RegisterResponse>("/auth/register", {
        method: "POST",
        body: input,
      }),
    onSuccess: () => router.push("/login"),
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setFieldError(null);
    setEmailAlreadyExists(false);

    const result = registerInputSchema.safeParse({ name, email, password });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    mutation.mutate(result.data, {
      onError: (error) => {
        if (error instanceof ApiError && error.statusCode === 409) {
          setEmailAlreadyExists(true);
          return;
        }
      },
    });
  }

  return (
    <>
      {/* @spec SPEC-20260731-004 RF-05 */}
      <PublicHeader navLink={{ label: "Entrar", href: "/login" }} />
      <Container size="sm">
        <h1 className="text-xl font-semibold">Criar conta</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label htmlFor="name">Nome</label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

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
            placeholder="6+ caracteres, 1 letra, 1 número, 1 especial"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {fieldError && <Alert variant="error" description={fieldError} />}

          {emailAlreadyExists && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-md bg-warning-pastel p-3 text-sm text-foreground"
            >
              <p>Este e-mail já está cadastrado.</p>
              <div className="mt-2 flex gap-2">
                <Link href="/login" className="underline">
                  Entrar com este e-mail
                </Link>
                <Link
                  href={`/recover-password?email=${encodeURIComponent(email)}`}
                  className="underline"
                >
                  Recuperar senha
                </Link>
              </div>
            </div>
          )}

          {mutation.isError && !emailAlreadyExists && (
            <Alert
              variant="error"
              description="Não foi possível criar a conta. Tente novamente."
            />
          )}

          {/* @spec SPEC-20260720-001 RF-06, US-03 */}
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              required
            />
            <span>
              Li e concordo com os{" "}
              <Link href="/termos" target="_blank" className="underline">
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link href="/privacidade" target="_blank" className="underline">
                Política de Privacidade
              </Link>
            </span>
          </label>

          <Button type="submit" disabled={mutation.isPending || !acceptedTerms}>
            {mutation.isPending ? "Criando Conta..." : "Criar conta"}
          </Button>
        </form>

        <LegalFooter />
      </Container>
    </>
  );
}
