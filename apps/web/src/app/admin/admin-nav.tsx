import Link from "next/link";
import type { ReactNode } from "react";

/**
 * @spec SPEC-20260731-008 RF-08, RNF-04
 */
export function AdminNav(): ReactNode {
  return (
    <header className="flex items-center justify-between border-b border-border p-4">
      <h1 className="text-lg font-semibold">Painel de Administração</h1>
      <Link href="/dashboard" className="text-sm text-primary underline">
        Voltar ao Nave
      </Link>
    </header>
  );
}
