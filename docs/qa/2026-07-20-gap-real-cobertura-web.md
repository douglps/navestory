# Gap Real de Cobertura em `apps/web` (2026-07-20)

**Origem:** ao investigar por que o job `Test (cobertura >= 88%)` do CI falhava reportando 37%
de cobertura em `apps/web`, identificado que o `vitest.config.ts` do app não excluía `.next/**`
do relatório de cobertura v8 — o build compilado do Next.js/Turbopack (nunca exercitado por
testes) estava sendo contado como "código não testado", derrubando a média artificialmente.
Corrigido em `apps/web/vitest.config.ts` (adicionado `.next/**` e `public/**` ao `coverage.exclude`,
e removida a exclusão de `src/app/page.tsx` já que agora tem teste dedicado).

Mesmo bug existia em `packages/validators` (contava `dist/**` compilado) — corrigido junto,
resultado 100% de cobertura real após dois specs novos (`analytics.schemas.spec.ts`,
`dashboard.schemas.spec.ts`) para schemas Zod que genuinamente não tinham teste.

## Estado real após a correção

Com `.next/` excluído, `apps/web` está em:

| Métrica | Real | Threshold |
|---|---|---|
| Statements | 89.53% | 88% ✓ |
| Lines | 89.53% | 88% ✓ |
| Branches | 84.42% | 88% ✗ |
| Functions | 80.62% | 88% ✗ |

O gap restante é genuíno, mas concentrado em poucas áreas — não espalhado uniformemente pelo app.

## Onde está o gap (arquivos com 0% ou cobertura muito baixa)

| Arquivo | Cobertura | Observação |
|---|---|---|
| `src/components/pwa/pwa-install-prompt-banner.tsx` | 0% | Banner de instalação PWA |
| `src/components/pwa/pwa-update-banner.tsx` | 0% | Banner de atualização de versão PWA |
| `src/components/pwa/service-worker-listener.tsx` | 0% | Listener de eventos do Service Worker |
| `src/lib/pwa/get-cache-age.ts` | 4.34% | Só uma função testada indiretamente via `format-cache-age.spec.ts`; a função principal do arquivo não tem teste próprio |
| `src/lib/pwa/*-plugin.ts`, `*-prompt.ts` | 0% | Glue de integração com Serwist/Workbox |
| `src/app/global-error.tsx` | 0% | Error boundary raiz do Next.js (equivalente ao `(app)/error.tsx`, que **foi** resolvido nesta sessão — mesmo padrão de teste deveria servir aqui) |
| `src/app/(app)/layout.tsx` | 0% | Layout da área autenticada |
| `src/app/offline/page.tsx` | 0% | Página de fallback offline do PWA |
| `src/app/serwist/[path]/route.ts` | 0% | Rota gerada pelo Serwist (glue de framework, possivelmente exceção justificada) |
| `src/app/instrumentation-client.ts`, `instrumentation.ts` | 0% | Setup do Sentry — glue, candidato a exceção justificada |
| `src/app/manifest.ts`, `sw.ts` | 0% | Geração de manifest.json / entry do service worker — config declarativa, candidato a exceção |
| Diversos `page.tsx` (dashboard, expenses, maintenance, vehicle-groups/new, etc.) | 60-90% em `functions`/`branches` | Edge cases pontuais não cobertos (branches de erro, estados vazios) — não são arquivos sem teste, só têm lacunas parciais |

## Próximo passo sugerido

1. **Quick wins com padrão já validado:** `global-error.tsx` pode reusar exatamente o padrão de
   teste criado para `(app)/error.tsx` nesta sessão (`apps/web/src/app/(app)/error.spec.tsx`) —
   é o mesmo tipo de componente (`error`/`reset` como props).
2. **Componentes PWA (banners, listener, `get-cache-age.ts`):** maior bloco de gap concentrado.
   Vale uma rodada dedicada com o agente `tester`, já que envolve mocks de `navigator.serviceWorker`
   e eventos `beforeinstallprompt`.
3. **Glue de framework** (`instrumentation*.ts`, `manifest.ts`, `sw.ts`, `serwist/[path]/route.ts`):
   avaliar com o `reviewer`/`tester` se são exceções justificadas (mesmo raciocínio já aplicado a
   `(app)/error.tsx` antes de se provar testável) ou se merecem teste de smoke.
4. **Edge cases pontuais nos `page.tsx`:** não é um gap estrutural, é polimento — revisar caso a
   caso ao tocar em cada página por outro motivo, não como projeto isolado.

Nenhuma dessas lacunas foi corrigida nesta sessão — o objetivo aqui foi eliminar o falso-positivo
de `.next/`/`dist/` no coverage e deixar o gap real, menor e documentado, para a próxima rodada.

## Addendum: `@nave/ui` também abaixo do threshold (branches 87.74% vs 88%)

Sem bug de config aqui (o pacote não gera `dist/`, `main` aponta direto para `src/index.ts`) —
é um gap real e pequeno (0,26 ponto percentual), concentrado em poucos branches de edge case:

| Arquivo | % Branch | Linhas descobertas |
|---|---|---|
| `src/components/kpi-card.tsx` | 68.57% | 21,23,26,33,37,39 |
| `src/components/breadcrumb.tsx` | 75% | 27,59,64-67 |
| `src/components/file-upload.tsx` | 75% | 117-122,142-144 |
| `src/components/combobox.tsx` | 89.47% | 32-48,111 |

Não corrigido nesta sessão (fora do escopo de investigar o pipeline de CI) — candidato a tarefa
pontual e rápida numa próxima rodada de QA do design system.
