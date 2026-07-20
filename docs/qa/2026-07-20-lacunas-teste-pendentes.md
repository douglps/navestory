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

## Resultado da checagem (2026-07-20, execução deste documento)

| Arquivo | Veredito | Detalhe |
|---|---|---|
| `apps/web/src/app/(app)/error.tsx` | **Teste dedicado escrito** | Apesar da suposição inicial, o componente é uma função React comum (`error`/`reset` como props) — testável direto com RTL sem harness especial do App Router. Criado `apps/web/src/app/(app)/error.spec.tsx`: valida `Sentry.captureException(error)` e o clique em "Tentar novamente" chamando `reset`. |
| `apps/web/src/app/(app)/settings/account/delete-account-dialog.tsx` | **Cobertura indireta confirmada** | `page.spec.tsx` já exercita o fluxo completo do dialog (abrir, digitar `EXCLUIR`, confirmar, erro mantém dialog aberto e limpa campo) através da página pai. Nenhum teste novo necessário. |
| `apps/web/src/app/page.tsx` | **Teste dedicado escrito** | Não havia spec nem e2e cobrindo o conteúdo da landing (o redirect para usuário logado já é coberto por `apps/web/middleware.spec.ts`). Criado `apps/web/src/app/page.spec.tsx`: valida links "Entrar"→`/login` e "Criar conta"→`/register`. |
| `apps/web/src/components/legal-document.tsx` | **Cobertura indireta confirmada** | `privacidade/page.spec.tsx` e `termos/page.spec.tsx` renderizam a página real (sem mock), lendo o Markdown de `docs/legal/*.md` de verdade e verificando heading + conteúdo — exercita o `ReactMarkdown`+`remark-gfm` do componente compartilhado. Nenhum teste novo necessário. |
| `apps/web/src/components/legal-footer.tsx` | **Resolvido via teste da landing** | Em vez de um `legal-footer.spec.tsx` isolado, o novo `apps/web/src/app/page.spec.tsx` já verifica os links corretos ("Termos de Uso"→`/termos`, "Política de Privacidade"→`/privacidade`) através de um dos três pais que o consomem (`/`), como sugerido abaixo. |

**Nota para o gate:** `delete-account-dialog.tsx` e `legal-document.tsx` continuam sem `.spec` próprio — o check `check-test-pairing.mjs` só olha "arquivo novo por nome", então se algum dos dois for recriado/movido em um PR futuro, o alerta dispara de novo. Isso é esperado e aceitável (falso-positivo já documentado); não requer ação adicional, só re-consultar esta tabela.

Rodado `npx vitest run src/app/page.spec.tsx "src/app/(app)/error.spec.tsx"` em `apps/web` — 2 arquivos, 4 testes, todos passando.
