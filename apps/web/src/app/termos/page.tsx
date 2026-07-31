import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { BackLink } from "@/components/back-link";
import { LegalDocument } from "@/components/legal-document";
import { LegalFooter } from "@/components/legal-footer";
import { PublicHeader } from "@/components/public-header";

/**
 * @spec SPEC-20260720-001 RF-02
 * Rota pública fora dos grupos (auth)/(app) — não exige sessão. Lê o Markdown diretamente
 * de `docs/legal/terms-of-service.md` (fonte única de verdade, ver RNF-02 da spec).
 *
 * @spec SPEC-20260731-004 RF-06, RF-07, RF-12 — header/footer públicos e navegação de retorno
 */
export default function TermsOfServicePage(): ReactNode {
  const filePath = join(process.cwd(), "..", "..", "docs", "legal", "terms-of-service.md");
  const content = readFileSync(filePath, "utf-8");
  return (
    <>
      <PublicHeader />
      <div className="mx-auto max-w-3xl px-8 pt-4">
        <BackLink fallback="/" label="Voltar" />
      </div>
      <LegalDocument content={content} />
      <LegalFooter />
    </>
  );
}
