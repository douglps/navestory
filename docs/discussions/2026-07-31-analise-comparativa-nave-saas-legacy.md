# Análise Comparativa: Nave-SaaS-main (legado) vs. Nave (atual)

**Data:** 2026-07-31
**Autor:** Douglas Lopes (lps.doug@protonmail.com), com Claude Code
**Objetivo:** levantamento de aproveitamento e insights para a evolução natural do Nave atual, a partir de comparação profunda com o repositório predecessor `C:\Dev\Antigravity\Nave-SaaS-main`.

---

## 0. Contexto que muda a natureza desta comparação

Antes de qualquer prós/contras: os dois repositórios **não são concorrentes independentes**. O próprio `Nave-SaaS-main` contém, em `docs/discussions/2026-07-11-migracao-docs-projeto-paralelo.md`, o registro da decisão de criar um projeto "clean-room" — implementado do zero, apenas a partir da documentação/specs, sem herdar código — com destino explicitamente aprovado: `C:\Dev\Nave`. Ou seja:

- **Nave-SaaS-main** = protótipo/fonte original, onde produto e specs nasceram organicamente, junto com o código.
- **Nave (atual)** = experimento derivado, reescrito do zero a partir apenas da documentação julgada confiável do legado, com processo de governança (specs → RULES.md → matrizes → ADRs) muito mais rígido desde o primeiro commit.

Essa relação de causalidade explica boa parte das diferenças observadas: o Nave atual não "evoluiu" organicamente a ponto de acumular a bagunça do legado, porque foi construído já filtrando o que funcionava e descartando o que não funcionava (specs conflitantes, ADRs duplicados, scaffolds vazios, código morto). O valor desta análise, portanto, não é decidir "qual é melhor" de forma abstrata, mas identificar **o que o legado tem que ainda não foi migrado/reaproveitado**, e **onde o processo mais rígido do atual já superou o legado**.

---

## 1. Visão geral lado a lado

| Aspecto | Nave-SaaS-main (legado) | Nave (atual) |
|---|---|---|
| Estado do repositório | Ativo até ~jul/2026, aparenta congelado/arquivado | Ativo, pré-lançamento (v0.0.0) |
| Maturidade declarada | Não usa o sistema de níveis 0/1/2 | Nível 2 (Produto) — declarado formalmente |
| Frontend | Next.js 15.2, React 19, Tailwind 3.3, Zustand 5 | Next.js (App Router), React, Tailwind 3/4 (tokens OKLCH), TanStack Query, Zustand |
| Backend | NestJS (versão inconsistente entre docs) | NestJS 11, Pino, Sentry |
| Banco | Postgres 15.1 via Supabase, RLS | Postgres via Supabase, RLS, 30 migrations versionadas |
| Monorepo | Turborepo 2 + pnpm 8.15 | Turborepo 2 + pnpm 11.1.3, Node ≥ 24 |
| Deploy alvo | Vercel + Supabase Edge (não confirmado como configurado) | Vercel + Railway (planejado, contas ainda não criadas) |
| Specs formais | ~50+ specs, RULES.md com dezenas de IDs R/S/P/C | **69 specs**, RULES.md ainda mais extenso (~55 regras R, S1-S12, P1-P7, C-DS-01/02+C1/C2) |
| Cobertura de testes backend | Boa (43 `.spec.ts`) | Excelente — praticamente 1:1 controller+service, guards inclusos, gate de cobertura 88% obrigatório em CI |
| Cobertura de testes frontend | Muito fraca (6 arquivos em todo `apps/web`) | Forte — `page.spec.tsx` pareado com quase toda rota |
| E2E | 2 specs Playwright | ~4 specs Playwright + baseline de regressão visual (nunca rodou de fato em CI por falta de secrets) |
| CI/CD | 4 workflows (ci, deploy, docs-validation, security-scan) | 9 jobs num único `ci.yml` (lint, type-check, test, test-pairing-gate, hardcoded-colors-gate, integration-test, build, secret-scan, e2e condicional, dependency-scan) + `cd.yml` pronto mas sem contas |
| Higiene de repositório | Ruim — dezenas de arquivos soltos na raiz (logs, mockups, scripts de debug, um nome de arquivo corrompido) | Boa — não há evidência de lixo equivalente na raiz |
| Design system | Documentado (`docs/ui-design/design-system.md` v3.1), OKLCH, glassmorphism | Muito mais rigoroso — tokens versionados, gate de CI (`hardcoded-colors-gate`), 3 iterações de identidade visual documentadas em <1 mês, contraste testado automaticamente |

---

## 2. Features implementadas — o que o legado tem que o atual (ainda) não tem

Esta é a seção mais acionável: funcionalidades que existem **codificadas e testadas** no legado e que não aparecem no levantamento do Nave atual.

### 2.1 Analytics avançado (Fases 2-3)
O legado tem uma spec aprovada (`SPEC-20260622-001-analytics-engine.md`) com **8 módulos de BI planejados**, dos quais 2 foram implementados (TCO — Total Cost of Ownership por veículo, e Fuel Consumption Trend). Os 6 restantes — detecção de anomalias, benchmark entre veículos/frota, forecast de custo, sazonalidade, previsão de manutenção preditiva, insights em linguagem natural — **nunca saíram do papel no legado**, mas a spec e as RPCs parciais (`calculate_vehicle_tco`, `fuel_consumption_trend`) já existem como referência de design de API.

O Nave atual tem um módulo `analytics` no backend, mas o levantamento não confirmou paridade com TCO/fuel-trend nem indícios de planejamento das fases 2-3.

**Recomendação:** revisar a spec de analytics do legado como ponto de partida para uma spec nova no Nave atual (ex. `specs/analytics/`), aproveitando o desenho de RPC (cálculo pesado no Postgres, não na aplicação) que já foi validado, sem herdar o código-fonte diretamente — reescrever no padrão de camadas já estabelecido no Nave atual.

### 2.2 Máquina de estados de manutenção mais rica
O legado tem transições de estado bem definidas para manutenção (`pending → in_progress/completed/cancelled`, `in_progress → completed/cancelled`) com testes dedicados. O Nave atual tem o módulo `maintenances`, mas o levantamento não detalhou se a máquina de estados foi replicada com a mesma granularidade — vale checar se `R7` (regra equivalente, já citada no RULES.md do legado) foi migrada com a mesma cobertura de teste.

### 2.3 Multas com grafo de status e vínculo automático a despesas
O legado tem `fines` com transição de status e criação/cancelamento automático de despesa vinculada (SPEC-20260607-001). O Nave atual também tem `fines` no backend com "máquina de estados" citada na matriz de permissões — aparentemente já portado. Vale apenas confirmar paridade de regras (o legado tinha 11 casos de teste de service, mas sem testes de repository/controller — um gap que o Nave atual, com sua disciplina de teste pareado, provavelmente já fechou).

### 2.4 Sistema de contexto global "Em Foco"
Presente nos dois — no legado via `SPEC-20260602-001`, no atual também (R-CTX-01..07, citado nas duas varreduras). Aparenta ter sido bem reaproveitado conceitualmente, com o atual mantendo compatibilidade de intenção mas reimplementando via componentes próprios (`vehicle-activator`, `vehicle-context-chip`, `vehicle-context-dialog`, `vehicle-context-sheet`).

### 2.5 Alertas de manutenção por e-mail — pendência histórica que se repete
**Achado notável:** no legado, o envio de alertas de manutenção por e-mail (Edge Function `send-maintenance-alerts` via Resend) foi **bloqueante e nunca implementado**, apesar de citado em 3 documentos diferentes como pendência crítica. No Nave atual, a memória de longo prazo do projeto (registrada em conversas anteriores) confirma que **alertas de manutenção por e-mail foram deliberadamente adiados para a Fase 9**, condicionados à existência de domínio próprio — ou seja, o Nave atual **não repetiu o erro de deixar isso como pendência silenciosa**: tratou explicitamente como decisão adiada e documentada, não como gap esquecido. Isso é um ponto positivo de processo a reconhecer, não uma lacuna a copiar.

### 2.6 Estratégia de negócio/monetização
Ambos têm uma spec de "business strategy" em `draft`: legado (`SPEC-20260620-001`) e atual (`SPEC-20260620-001-business-strategy-stories.md` — mesmo ID e data, forte indício de migração direta do documento). Isso sugere que essa spec específica **foi de fato herdada quase literalmente** do legado para o atual, o que faz sentido dado que estratégia de negócio (planos, trial, referral, grace period, workspaces) é conteúdo de produto, não de código, e não corre risco de herdar débito técnico.

### 2.7 Componentes de UI não confirmados no atual
O legado tem 39 componentes documentados em `packages/ui` (com Storybook), incluindo `chart-wrapper`, `combobox`, `date-picker`, `date-range-picker`, `empty-state`, `file-upload`, `masked-input`, `stats-card`, `steps`, `table`, `tabs`. O Nave atual tem 28 componentes listados — a diferença aparente (`chart-wrapper`, `table`, `tabs`, `steps`, `date-picker` avulso) pode ser real ausência ou apenas não ter sido varrida a fundo pelo agente de pesquisa. **Vale confirmar manualmente** antes de assumir gap, mas se `table` e `tabs` realmente não existirem como componentes do design system do Nave atual, são primitivos de UI de alta reutilização que valeria portar (sem herdar código, redesenhando com os tokens atuais).

### 2.8 Storybook
O legado tem Storybook configurado para `packages/ui`, com stories para vários componentes. Não há menção de Storybook no levantamento do Nave atual. Se ausente, é uma ferramenta de documentação viva de componentes que ajudaria a formalizar o design system já bem versionado do atual (que hoje depende de `Design.md` como documento textual).

---

## 3. Onde o Nave atual já superou claramente o legado

Vale documentar isso tanto quanto os gaps — para não subestimar o trabalho já feito e evitar retrabalho.

1. **Guards de segurança mais robustos e corrigidos ativamente.** O Nave atual identificou e corrigiu uma vulnerabilidade real de escalação de privilégio (S12: `RolesGuard` lendo `user_metadata.role` em vez de `app_metadata.role`, que um usuário comum pode editar via API pública do Supabase) em 2026-07-31. Não há evidência de que o legado tivesse esse mesmo cuidado formalizado como regra de segurança versionada.

2. **Middleware SSR / proteção de rotas web.** O legado teve uma contradição não resolvida entre `RULES.md` (alertando que o middleware estava ausente) e `CHANGELOG.md` (afirmando que estava resolvido) — um sinal real de fonte de verdade quebrada. Não há indício equivalente de contradição não resolvida no Nave atual (a dessincronia documentada lá é outra: `matrices/permissoes.md` desatualizado quanto a Server Actions vs REST em vehicle-groups, mas isso é uma imprecisão de documentação, não uma falha de segurança ativa).

3. **Gate de cobertura de teste obrigatório em CI (88%).** O legado não tinha gate automático — a cobertura fraca do frontend era um problema conhecido mas não bloqueante. O atual torna isso inegociável via pipeline.

4. **`test-pairing-gate` e `hardcoded-colors-gate`.** Nenhum equivalente identificado no legado. São gates automatizados que previnem exatamente os dois tipos de dívida mais visíveis no legado: código sem teste pareado e cor fora do design system.

5. **Higiene de repositório.** A ausência de arquivos de debug/log soltos na raiz do Nave atual (contra a dezena de arquivos `*.txt`, `tmp*`, mockups HTML soltos, e um nome de arquivo literalmente corrompido no legado) é diferença de disciplina operacional relevante.

6. **Versionamento formal de regras de negócio** (`RULES.md` com histórico `vN → vN+1` por regra). O legado tinha regras citáveis, mas sem o mesmo rigor de histórico de versão por regra individual — o atual formaliza isso desde o início.

7. **Ledger financeiro unificado desde a concepção.** O legado migrou para um "ledger unificado" (despesas geradas por manutenção/multa/custo recorrente ficam readonly) via ADR-006 como uma refatoração posterior (EPIC-FIN-001). O Nave atual já nasceu com R-LED-01..05 como regra de primeira classe — não precisou de uma migração estrutural para chegar lá.

8. **Auditoria de banco mais madura.** O `RULES.md` do atual documenta achados reais de auditoria de segurança de banco (funções `SECURITY DEFINER` executáveis por `anon`, policies RLS não otimizadas usando `auth.uid()` direto em vez de `(SELECT auth.uid())`) como regras P4/S7/S9 rastreadas — nível de profundidade de revisão de banco que não apareceu no levantamento do legado.

---

## 4. Trade-offs identificados

| Trade-off | Legado | Atual |
|---|---|---|
| Velocidade de iteração inicial vs. rigor de processo | Mais rápido para prototipar (specs criadas e implementadas quase em paralelo), mas acumulou dívida e contradição documental | Mais lento por feature (gates de CI, rastreabilidade obrigatória, matriz de sincronia), mas quase sem contradição documental encontrada |
| Cobertura de features vs. cobertura de testes | Mais features "de ponta a ponta" tentadas (analytics fases 2-3, ainda que incompletas) | Menos features exploratórias tentadas até agora, mas o que existe é testado de forma mais completa |
| Amplitude de componentes de UI vs. consistência de tokens | Mais componentes catalogados (Storybook, 39 itens) | Menos itens aparentes, mas tokens mais rigorosamente enforced (gate de cor hardcoded, contraste testado) |
| Débito técnico "visível e admitido" vs. "não repetido" | Muito débito técnico, mas quase todo documentado explicitamente (CLEANUP-REPORT.md, matrizes com achados de segurança abertos) | Pouco débito técnico visível, mas o projeto é mais novo e ainda não passou pelo mesmo volume de features para saber se vai repetir os mesmos padrões de acúmulo |
| Deploy real vs. deploy planejado | Não há confirmação de deploy de produção ativo, mas há workflows de deploy configurados | Nunca foi para produção (0.0.0), infraestrutura de CD pronta em código mas contas de provedor (Vercel/Railway/Sentry) ainda não criadas — mesma situação de "pronto mas não ligado" |

---

## 5. Exemplos práticos (explicados para leigo)

**Exemplo 1 — Ledger financeiro unificado.**
Imagine que você registra uma manutenção do carro (troca de óleo, R$ 250). Sem um "ledger unificado", esse gasto ficaria só na tela de manutenções, e você precisaria lançar de novo manualmente na tela de despesas para ver o total gasto no mês. Com o ledger unificado, o sistema cria automaticamente uma "despesa-espelho" vinculada à manutenção — ela aparece nos relatórios financeiros, mas fica travada para edição direta (só pode ser editada via manutenção, evitando que o total fique inconsistente). O legado chegou a essa solução como uma correção no meio do caminho; o Nave atual já nasceu com essa regra pronta.

**Exemplo 2 — Health Score do veículo.**
É uma nota (score) calculada automaticamente que resume "quão bem cuidado" está um veículo — considerando manutenções em dia, gastos recentes, etc. — parecido com o "score de crédito", mas para o carro. O Nave atual lançou isso em 31/07/2026 (a poucos dias desta análise) como recurso novo, algo que **não existia no legado** — é um exemplo de feature nova e original do atual, não herdada.

**Exemplo 3 — Gate de cobertura de teste em CI.**
No legado, era possível um desenvolvedor (ou agente de IA) escrever uma tela nova sem escrever teste nenhum, e isso passava despercebido até alguém notar meses depois (como aconteceu — só 6 arquivos de teste em todo o frontend). No Nave atual, o processo de build automaticamente **recusa** aceitar código novo se a cobertura de teste cair abaixo de 88% — é como um porteiro que não deixa passar quem não está na lista, em vez de confiar que todo mundo vai lembrar de se cadastrar sozinho.

**Exemplo 4 — Contradição de documentação no legado.**
No legado, um documento dizia "essa proteção de segurança ainda está faltando" e outro documento (escrito depois) dizia "essa mesma proteção já foi resolvida" — e ninguém atualizou o primeiro documento para refletir isso. É como dois membros de uma equipe dizendo coisas diferentes sobre se a porta de trás está trancada, sem checarem um com o outro. O Nave atual tem uma dessincronia parecida (mas menos grave, sobre documentação de arquitetura, não sobre uma falha de segurança real em aberto) entre `matrices/permissoes.md` e o código de `vehicle-groups`.

---

## 6. Nível técnico — observações para quem vai mexer no código

- **Padrão de camadas backend:** o legado documenta explicitamente Controller→Service→RepositoryPort→RepositoryImpl (Port/Adapter) em `vehicles`. Não ficou confirmado se o Nave atual segue exatamente o mesmo padrão de repositório com Port/Adapter, ou se acessa o Supabase client mais diretamente nos services — vale um `impact-analyzer` dedicado se for decidir formalizar isso como ADR no atual.
- **Guard de autenticação sem validação local de assinatura JWT:** ambos os projetos usam `supabaseAdmin.auth.getUser(token)` (chamada de rede) em vez de validar a assinatura JWT localmente — decisão documentada no Nave atual como contorno de incompatibilidade ES256/JWKS vs `SUPABASE_JWT_SECRET` legado HS256. Isso é uma decisão de trade-off latência-vs-simplicidade que vale revisitar quando o Supabase estabilizar o suporte a JWKS assimétrico.
- **RLS com `auth.uid()` não otimizado:** achado real (P4 no atual) de 35 policies em 15 tabelas usando `auth.uid()` direto em vez de `(SELECT auth.uid())` — isso é uma pegadinha conhecida de performance em RLS do Postgres (o padrão `SELECT` permite ao planejador de query cachear o valor por statement em vez de reavaliar por linha). Vale aplicar a correção proativamente antes que o volume de dados torne isso perceptível.
- **Migration de schema não versionada:** o levantamento identificou que a última alteração de função SQL do Nave atual (`get_category_spending_highlights` estendida) não tem migration correspondente commitada — aparentemente aplicada direto no banco remoto de desenvolvimento. Isso quebra a garantia de "banco reproduzível a partir do histórico de migrations" e deveria ser corrigido gerando a migration retroativa antes que mais mudanças se acumulem sem registro.

---

## 7. Gaps e falhas — consolidado

### No legado (para não repetir)
1. Higiene de repositório — arquivos de debug/log/mockup soltos na raiz, nome de arquivo corrompido.
2. Contradição entre documentos sobre status de segurança (middleware SSR).
3. Hooks/stores stub vazios em produção potencial (`use-auth.ts`, `use-vehicles.ts`) com risco de erro em runtime.
4. Cobertura de teste de frontend quase inexistente (6 arquivos).
5. E2E muito raso (2 specs).
6. Componentes mortos identificados e nunca removidos.
7. Documentação-scaffold vazia (20+ arquivos de 0 bytes em `docs/guides/`).
8. Feature crítica (alertas de manutenção por e-mail) ficou pendente por múltiplos ciclos sem decisão explícita de adiamento.

### No atual (a resolver)
1. `matrices/permissoes.md` desatualizado em pelo menos 2 pontos: descrição de vehicle-groups como Server Actions (é REST real) e definição de role admin ainda citando `user_metadata` em uma seção.
2. Migration SQL faltante para a última alteração de função de dashboard (`get_category_spending_highlights`).
3. Suíte E2E nunca rodou de fato em CI por falta de secrets — 5 de 17 testes falharam na única execução local, sem investigação registrada como concluída.
4. R-TZ-04 aprovada mas não implementada, bloqueada por uma migração maior de schema (`date`→`occurred_at`, `DATE`→`timestamptz`) ainda não feita.
5. Achados de auditoria de banco (S7/S9/P4) registrados mas não confirmados como corrigidos no levantamento.
6. Nenhuma conta de provedor externo (Vercel, Railway, Sentry) criada — deploy real ainda não é possível apesar do CD pronto em código.

---

## 8. Impacto para o Nave atual

- **Curto prazo (baixo esforço, alto valor):** corrigir as duas dessincronias identificadas em `matrices/permissoes.md` (vehicle-groups e role admin) — é edição de documentação, não de código, e evita que alguém tome decisão de segurança baseada em informação errada.
- **Curto prazo:** gerar a migration SQL retroativa para `get_category_spending_highlights`, fechando o gap de schema-as-code antes que se acumule mais.
- **Médio prazo:** revisar as 35 policies RLS não otimizadas (P4) — ganho de performance real conforme a base de usuários crescer, baixo risco de regressão se testado com os testes de integração já existentes.
- **Médio prazo:** avaliar formalmente (via spec nova) se vale portar o desenho de Analytics Fases 2-3 do legado — não como código, mas como inspiração de escopo e de arquitetura de RPC.
- **Baixa prioridade, mas vale considerar:** adicionar Storybook para o design system do atual, dado que já existe uma disciplina forte de tokens/gates — Storybook tornaria essa disciplina visível e navegável para humanos, não só enforced por CI.
- **Processo:** o padrão de "decisão explícita de adiamento documentada" (como foi feito com alertas de e-mail → Fase 9) deveria virar prática explícita sempre que uma feature do legado for conscientemente descartada ou adiada, em vez de simplesmente não aparecer no backlog atual — isso evita reabrir a mesma discussão sem contexto no futuro.

---

## 9. Compatibilidade

Não há compatibilidade técnica direta entre os dois sistemas (bancos de dados diferentes, sem migração de dados real entre eles previstos nos documentos revisados) — a "compatibilidade" relevante aqui é **conceitual/de domínio**: os dois modelam as mesmas entidades centrais (veículos, despesas, manutenções, multas, custos recorrentes, grupos de veículos, dashboard de KPIs), então regras de negócio (R1-R7 e variantes) migraram quase 1:1 em significado, mesmo com nomes de regra e implementação técnica diferentes. Isso é positivo: confirma que o domínio de produto está estável e validado, independente da reescrita de código.

---

## 10. Layout e UI/UX comparados

- **Legado:** design system "Calm UI" v3.1, foco documentado em "performance visual e anti-ansiedade", glassmorphism com blur semântico em 3 camadas, tokens de frota customizados (`--fleet-cerulean`, `--fleet-emerald`, `--fleet-tangerine`), mobile-first com dado de mercado citado (67% de acesso via mobile).
- **Atual:** também mobile-first (drawer de sidebar <768px), mas com identidade de marca em iteração ativa e rápida — 3 direções de paleta em menos de um mês (Prata → Prata Fase 2 → Azul-Índigo, esta última com pesquisa de mercado citando concorrentes reais como Nubank, Monzo, Mercury, Samsara, Motive). Isso sugere um processo de design mais analítico e menos "definido de uma vez", mas também menos estável até agora — vale monitorar se a paleta Azul-Índigo se sustenta ou sofre uma quarta revisão em breve.
- **Ambos** usam OKLCH como espaço de cor em vez de hex/RGB — escolha tecnicamente correta e compartilhada, reforça que essa decisão de fundação sobreviveu à reescrita.
- **Diferencial do atual:** escala tipográfica formal obrigatória (R-DS-12) e gate automático de CI contra cor hardcoded — nenhum equivalente confirmado no legado. O legado tinha a intenção documentada ("proibido hex/RGB hardcoded"), mas sem enforcement automatizado confirmado.

---

## 11. Insights

1. O padrão mais forte que emerge desta comparação não é "o atual é melhor" ou "o legado tem mais features" isoladamente — é que **o atual investiu pesado em anti-regressão de processo** (gates de CI, matrizes, versionamento de regra) e isso já pagou dividendos concretos (a correção de S12 antes de virar incidente real, por exemplo). O próximo investimento de maior retorno não é mais processo, é **fechar os gaps de sincronia documental já identificados** — porque o valor de um gate de CI cai se a documentação que ele deveria proteger já estiver desatualizada em pontos críticos.
2. O legado, apesar da bagunça de repositório, tem valor real como **catálogo de features exploradas e descartadas ou adiadas** — a spec de Analytics Fases 2-3, por exemplo, é trabalho de design já pensado que não precisa ser refeito do zero, só revalidado.
3. A decisão de reescrever do zero (clean-room) parece ter valido a pena especificamente para **código morto e débito técnico** (nenhum equivalente a hooks vazios, componentes órfãos ou arquivos de 0 bytes foi encontrado no atual), mas **não eliminou completamente dessincronia documental** — ela só mudou de lugar (de "changelog vs. RULES.md" no legado para "matriz de permissões vs. código" no atual). Isso sugere que o problema raiz não é o código herdado, é a falta de um mecanismo automatizado que valide toda a documentação contra o código (o `test-pairing-gate` faz isso para testes, mas não existe equivalente para as matrizes).
4. Vale considerar um gate de CI adicional inspirado no `test-pairing-gate` existente: um "doc-sync-gate" leve que, no mínimo, sinalize quando uma spec é alterada mas a matriz de permissões correspondente não é tocada no mesmo PR — fechando exatamente o tipo de gap encontrado nesta análise antes que se acumule mais.

---

## 12. Recomendações finais

1. **Curto prazo:** corrigir as 2 dessincronias de `matrices/permissoes.md` e gerar a migration SQL retroativa faltante (baixo esforço, resolve achados concretos desta análise).
2. **Curto/médio prazo:** revisar e aplicar a otimização de `auth.uid()` nas 35 policies RLS identificadas (P4) — ganho de performance de baixo risco.
3. **Médio prazo:** decidir formalmente (spec nova, `draft`) se as Fases 2-3 de Analytics do legado entram no roadmap, usando o desenho de RPC já validado como ponto de partida, sem herdar código.
4. **Médio prazo:** avaliar Storybook para `packages/ui` do atual, dado que a disciplina de tokens já existe — tornaria a documentação de componentes navegável, não só enforced.
5. **Baixa prioridade:** confirmar manualmente se `table`, `tabs`, `steps`, `chart-wrapper`, `date-picker` avulso (presentes no legado) fazem falta real no design system do atual, antes de portá-los.
6. **Processo:** considerar um gate leve de sincronia documentação↔código (matrizes) complementar ao `test-pairing-gate` já existente.
7. **Processo:** manter a prática já demonstrada de registrar adiamentos de feature como decisão explícita (como foi feito com alertas por e-mail → Fase 9), em vez de deixá-los como pendência implícita — é a diferença mais clara de maturidade de processo observada entre os dois repositórios.

---

## 13. Padrão de mercado e boas práticas (referência externa)

Para contextualizar as práticas observadas frente ao que é considerado padrão de mercado atual (2026) em produtos SaaS B2C/B2B de porte pequeno-médio:

- **Spec-driven development com rastreabilidade formal** (specs → matriz de rastreabilidade → código → teste) é uma prática crescente em times que usam IA generativa como parte do fluxo de desenvolvimento — reduz alucinação de contexto entre sessões de IA e humano. O nível de formalização do Nave atual (IDs de regra versionados, matriz de sincronia obrigatória) está acima da média de mercado para esse porte de projeto, mais próximo do que se vê em domínios regulados (fintech, saúde) do que em SaaS B2C típico.
- **Gates automatizados de qualidade em CI** (cobertura mínima, pareamento de teste, ausência de cor/valor hardcoded, secret scanning, dependency scanning) são considerados boa prática estabelecida (ThoughtWorks Tech Radar cita "shift-left quality gates" como "Adopt" há vários ciclos). O conjunto de 9 jobs do Nave atual está alinhado com esse padrão.
- **RLS com `(SELECT auth.uid())` em vez de `auth.uid()` direto** é uma recomendação oficial e documentada do próprio Supabase para otimização de performance — o achado P4 do Nave atual está alinhado com um problema conhecido e já catalogado pela comunidade, não é peculiaridade do projeto.
- **Design tokens em OKLCH** é tendência recente (2024-2026) em substituição a HSL/RGB para melhor uniformidade perceptual de cor, adotada por design systems modernos (ex. Radix Colors, alguns temas do shadcn/ui mais recentes) — ambos os repositórios já adotam essa prática, o que é positivo e alinhado com o estado da arte.
- **Ledger financeiro append-only com registros derivados somente-leitura** (o padrão `is_readonly` do Nave) é um padrão consolidado em sistemas financeiros (contabilidade de partida dupla simplificada, "source of truth" único por lançamento) — ambos os repositórios convergiram para esse padrão, o que reforça que é a modelagem correta para o domínio, não uma escolha arbitrária.
- **Health/readiness score composto** (o Vehicle Health Score do atual) segue um padrão comum em produtos de monitoramento de ativos (frotas, equipamentos industriais, até "credit score" em fintech) — a prática de mercado recomenda documentar claramente a fórmula/pesos do score (o que o atual já faz via R-HS-01..10) para evitar que o score vire uma "caixa-preta" não confiável para o usuário.
- **Deploy com Environments aprovados manualmente** (GitHub Environments com approver obrigatório para produção) é boa prática padrão de mercado para reduzir deploys acidentais — já planejado no Nave atual, só falta a execução operacional (criação das contas/environments).

---

## Changelog deste documento

- 2026-07-31 — criação, a partir de levantamento paralelo via agentes de pesquisa sobre `C:\Dev\Antigravity\Nave-SaaS-main` e `C:\Dev\Nave`.
