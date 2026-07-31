import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReactNode } from "react";

/**
 * @spec SPEC-20260720-001 RF-01, RF-02, RNF-02
 * Renderiza o Markdown lido diretamente de `docs/legal/*.md` (fonte única de verdade) — nenhum
 * texto jurídico é duplicado em `apps/web`.
 *
 * @spec SPEC-20260731-001 RF-02 — `dark:prose-invert`: sem essa variante, o plugin
 * `@tailwindcss/typography` renderiza sempre na paleta cinza-clara default dele, ignorando o
 * tema ativo e a paleta grafite Azul-Índigo em dark mode.
 */
export function LegalDocument({ content }: { content: string }): ReactNode {
  return (
    <article className="prose prose-sm dark:prose-invert mx-auto max-w-3xl p-8 prose-table:w-full prose-th:text-left">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  );
}
