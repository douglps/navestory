import Link from "next/link";
import type { ReactNode } from "react";

/**
 * @spec specs/workspace/SPEC-20260804-004-workspace-foundation.md RF-12
 */
export function WorkspaceNav(): ReactNode {
  return (
    <header className="flex items-center justify-between border-b border-border p-4">
      <h1 className="text-lg font-semibold">Workspace</h1>
      <Link href="/dashboard" className="text-sm text-primary underline">
        Voltar ao navestory
      </Link>
    </header>
  );
}
