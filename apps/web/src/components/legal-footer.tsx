import Link from "next/link";
import type { ReactNode } from "react";

/** @spec SPEC-20260720-001 RF-05 */
export function LegalFooter(): ReactNode {
  return (
    <footer className="flex justify-center gap-4 p-4 text-xs text-muted-foreground">
      <Link href="/termos" className="underline">
        Termos de Uso
      </Link>
      <Link href="/privacidade" className="underline">
        Política de Privacidade
      </Link>
    </footer>
  );
}
