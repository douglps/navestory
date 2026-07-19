/**
 * Remove o Cache Storage de dados de API (`nave-api-data`), preservando o precache de
 * assets estáticos públicos (`nave-pages`, RF-05) — que não contêm dado de usuário.
 *
 * Ponto de gancho real: este projeto não usa Supabase Auth Client no browser (sessão via
 * cookie httpOnly + JWT, ver `apps/web/middleware.ts`), então não existe
 * `supabase.auth.onAuthStateChange`/evento `SIGNED_OUT` no cliente como a spec original
 * pressupõe (§11.2/Apêndice) — chamado a partir de `logout.ts` no lugar. Ver changelog da
 * spec (correção técnica pós-aprovação).
 *
 * @spec SPEC-20260712-001 RF-16, S6
 */
export async function clearApiCache(): Promise<void> {
  if (typeof caches === "undefined") return;
  await caches.delete("nave-api-data").catch(() => {
    // Cache Storage indisponível/falha ao remover — não deve impedir o restante do logout.
  });
}
