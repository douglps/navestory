/**
 * Remove o Cache Storage de dados de API (`navestory-api-data`) e o cache de navegação
 * (`navestory-pages`) no logout.
 *
 * Correção de auditoria (2026-07-20, T10 do plano de ação): o comentário original deste
 * arquivo afirmava que `navestory-pages` continha "só assets estáticos públicos" e "não contém
 * dado de usuário" — premissa incorreta. Em `apps/web/src/app/sw.ts`, `navestory-pages` é
 * populado por `NetworkFirst` para **qualquer** navegação (`request.mode === "navigate"`,
 * sem filtro de path), incluindo as rotas protegidas do grupo `(app)` (dashboard, vehicles,
 * expenses, etc.) — ou seja, o shell HTML dessas telas fica cacheado normalmente.
 *
 * Mecanismo do bypass: com o shell de uma rota protegida já em `navestory-pages` de uma sessão
 * anterior, uma limitação conhecida de Service Workers ao repassar ao cliente uma
 * `Response` que passou por redirect (o `middleware.ts` redireciona rota protegida
 * deslogada para `/login`) pode fazer o `NetworkFirst` tratar a falha de rede como
 * indisponibilidade e servir a versão cacheada do shell em vez do redirect — exibindo a
 * tela protegida sem dados (as chamadas de API continuam exigindo auth e falham, então não
 * há vazamento de dado de outro usuário, só do shell visual). Isso é uma falha real de
 * UX/segurança percebida em dispositivo compartilhado.
 *
 * Decisão: apagar `navestory-pages` por inteiro no logout, em vez de filtrar seletivamente as
 * entradas de rotas `(app)` — é a abordagem mais simples e robusta (não depende de manter
 * uma lista de paths protegidos sincronizada entre `middleware.ts` e este arquivo, que
 * divergiria silenciosamente a cada rota nova). O custo é perder o cache offline de páginas
 * públicas até a próxima visita; considerado baixo frente ao risco de shell protegido
 * vazando em dispositivo compartilhado.
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
  await Promise.all(
    ["navestory-api-data", "navestory-pages"].map((cacheName) =>
      caches.delete(cacheName).catch(() => {
        // Cache Storage indisponível/falha ao remover — não deve impedir o restante do logout.
      }),
    ),
  );
}
