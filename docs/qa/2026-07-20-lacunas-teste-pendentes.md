# Lacunas de Teste Pendentes (2026-07-20)

**Origem:** primeira execução de `scripts/check-test-pairing.mjs` (pipeline de captura de
necessidade de novos testes, ver `.github/workflows/ci.yml` job `test-pairing-gate`), rodada
contra o diff acumulado desde o commit `36a637c` (limpeza de `.agents/`) até `HEAD`.

**Contexto:** esses arquivos foram criados nas rodadas de T1 (exclusão de conta), T2
(privacidade/termos) e T6/T9 (landing pública), commitados antes de o gate existir — por isso
passaram sem serem barrados. O gate agora impede que casos assim entrem sem justificativa.

## Achados

O check aponta arquivo de código novo em `src/` sem nenhum `.spec`/`.test` correspondente no
mesmo diretório. Isso **não significa necessariamente que o comportamento está descoberto** —
alguns desses arquivos podem já ser exercitados indiretamente por um teste de um componente pai.
Cada item abaixo precisa de uma checagem rápida antes de decidir se falta teste de verdade ou se
é falso-positivo do critério "arquivo por arquivo".

| Arquivo | O que é | A checar |
|---|---|---|
| `apps/web/src/app/(app)/error.tsx` | Error boundary do App Router (`Sentry.captureException`) | Provavelmente sem cobertura nenhuma — error boundaries do Next.js não são triviais de montar em teste unitário puro (precisam de `error`/`reset` simulados). Verificar se vale um teste dedicado ou se documentar como exceção justificada (Next.js App Router error boundary, padrão do framework). |
| `apps/web/src/app/(app)/settings/account/delete-account-dialog.tsx` | Dialog de confirmação em duas etapas (digitar `EXCLUIR`) para exclusão de conta | Verificar se `apps/web/src/app/(app)/settings/account/page.spec.tsx` já exercita o fluxo do dialog através da página pai. Se sim, considerar aceitável (cobertura indireta); se não, é o candidato mais crítico da lista — envolve confirmação de ação destrutiva (LGPD Art. 18, SPEC-20260719-001). |
| `apps/web/src/app/page.tsx` | Landing pública (`/`) | Verificar se há teste e2e ou de página cobrindo os dois estados (CTA "Entrar"/"Criar conta" deslogado vs. redirect para `/dashboard` logado) — o redirect já é testado em `middleware.spec.ts`, mas o conteúdo/CTA da própria landing pode não estar. |
| `apps/web/src/components/legal-document.tsx` | Renderiza Markdown (`react-markdown` + `remark-gfm`) do conteúdo legal | Verificar se `privacidade/page.spec.tsx` e `termos/page.spec.tsx` já cobrem a renderização via esse componente compartilhado (cobertura indireta provável, dado que são as duas únicas páginas que o usam). |
| `apps/web/src/components/legal-footer.tsx` | Rodapé com links para `/privacidade` e `/termos` | Componente pequeno e puramente apresentacional, usado em `/`, `/login` e `/register`. Candidato mais forte a "cosmético, não precisa de teste dedicado" (`specs/TESTS_SPEC.md`, seção "O que NÃO Testar") — mas confirmar que os links corretos aparecem em pelo menos um teste dos pais que o consomem. |

## Próximo passo sugerido

Para cada linha: abrir o arquivo `.spec.tsx` do componente pai (se existir) e confirmar se o
comportamento do filho é exercitado. Se sim, não é necessário teste dedicado — mas vale registrar
isso explicitamente (comentário ou nota na spec) para o gate não continuar reclamando a cada PR
que toque esses arquivos (o check atual só olha "arquivo novo", então PRs futuros que só editem
esses arquivos não disparam o alerta de novo — mas se algum deles for recriado/movido, dispara).
Onde não houver cobertura indireta real, escrever o teste faltante seguindo o padrão de
`specs/TESTS_SPEC.md`.

Nenhuma dessas lacunas foi corrigida nesta sessão — fica para a próxima rodada de implementação.
