import Link from "next/link";
import type { ReactNode } from "react";
import { LegalFooter } from "@/components/legal-footer";
import { PublicHeader } from "@/components/public-header";

/**
 * @spec SPEC-20260524-001 STORY-REG-01
 * Landing pública: primeiro contato de quem não está logado, com acesso a login e cadastro.
 * Usuários já autenticados são redirecionados para /dashboard pelo middleware.
 */
export default function LandingPage(): ReactNode {
  return (
    <>
      {/* @spec SPEC-20260731-004 RF-06 */}
      <PublicHeader />
      <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-sm flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Nave</h1>
          <p className="text-sm text-muted-foreground">Gestão inteligente de veículos e frota.</p>
        </div>

        <div className="flex w-full flex-col gap-3">
          {/* @spec SPEC-20260731-001 RF-02 — migrado de bg-black/text-white/border sem token para
              os tokens de marca (primary/border), fechando o único ponto de entrada público que
              ainda ignorava a paleta Azul-Índigo e o dark mode. */}
          <Link
            href="/login"
            className="w-full rounded-md bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="w-full rounded-md border border-border px-4 py-2 text-center text-sm font-medium hover:bg-muted"
          >
            Criar conta
          </Link>
        </div>

        <LegalFooter />
      </main>
    </>
  );
}
