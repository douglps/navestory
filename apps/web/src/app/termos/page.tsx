import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { LegalDocument } from "@/components/legal-document";

/**
 * @spec SPEC-20260720-001 RF-02
 * Rota pública fora dos grupos (auth)/(app) — não exige sessão. Lê o Markdown diretamente
 * de `docs/legal/terms-of-service.md` (fonte única de verdade, ver RNF-02 da spec).
 */
export default function TermsOfServicePage(): ReactNode {
  const filePath = join(process.cwd(), "..", "..", "docs", "legal", "terms-of-service.md");
  const content = readFileSync(filePath, "utf-8");
  return <LegalDocument content={content} />;
}
