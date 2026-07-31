import Link from "next/link";
import type { ReactNode } from "react";
import { LegalFooter } from "@/components/legal-footer";

/**
 * @spec SPEC-20260524-001 STORY-REG-01
 * Landing pública: primeiro contato de quem não está logado, com acesso a login e cadastro.
 * Usuários já autenticados são redirecionados para /dashboard pelo middleware.
 */
export default function LandingPage(): ReactNode {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Nave</h1>
        <p className="text-sm text-muted-foreground">Gestão inteligente de veículos e frota.</p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <Link
          href="/login"
          className="w-full rounded bg-black px-4 py-2 text-center text-sm font-medium text-white"
        >
          Entrar
        </Link>
        <Link
          href="/register"
          className="w-full rounded border px-4 py-2 text-center text-sm font-medium"
        >
          Criar conta
        </Link>
      </div>

      <LegalFooter />
    </main>
  );
}
