/**
 * @spec SPEC-20260804-006 RF-04
 * Extraído de `apps/web/src/app/(app)/dashboard/concept/page.tsx` (mesma lógica, sem alterar o
 * protótipo — RNF-04). Único ponto de formatação de prazo relativo reutilizado pelo dashboard
 * de produção.
 */
export function relativeLabel(days: number): string {
  if (days < 0) {
    const n = Math.abs(days);
    return `Venceu há ${n} ${n === 1 ? "dia" : "dias"}`;
  }
  if (days === 0) return "Hoje";
  return `Em ${days} ${days === 1 ? "dia" : "dias"}`;
}
