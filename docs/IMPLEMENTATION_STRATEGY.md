# Estratégia de Implementação — Nave

**Status:** Aprovado como plano de trabalho | **Data:** 2026-07-13 | **Autor:** douglps (com apoio de agentes Claude)

## Como usar este documento

Este documento **não substitui** as ~38 specs já aprovadas em `specs/`, os 8 ADRs em `docs/architecture/decisions/`, nem `specs/RULES.md`. Ele é a camada acima: define **em que ordem construir**, **com quais padrões de engenharia/DevOps/DevSecOps/QA**, e **como quebrar o trabalho em tarefas pequenas** que cabem no contexto de uma sessão de implementação (uma tarefa = um PR pequeno e revisável).

Fato de partida, confirmado por auditoria completa do repositório: **não existe nenhum código-fonte ainda** (nenhum `package.json`, `src/`, `apps/`, `packages/`, `supabase/migrations/`). O projeto está 100% especificado no papel e 0% implementado. Isso é bom — significa que não há dívida técnica herdada, só a de organizar a ordem de construção.

---

## 1. Decisões de arquitetura fechadas nesta rodada

| Decisão | Resolução | Registro formal |
|---|---|---|
| Banco Supabase legado `NaveSaaS` (produção, com achados de segurança críticos não corrigidos) | **Ignorado.** Não migrar dados. Reconstruir do zero sobre o projeto Supabase `Nave`. | Este documento + `matrices/impacto.md` deve ganhar entrada nova encerrando IMPACTO-021/026 como "não aplicável ao novo projeto" |
| Projeto Supabase `Nave` (novo) já existe, mas pode estar divergente do schema desejado | **Auditar e resetar se necessário** — ver Tarefa T0.2 | — |
| Estado de servidor vs. estado de UI no frontend | **TanStack Query** (dados de servidor) + **Zustand** (UI client-side), fronteira explícita. Apollo/RTK Query/SWR descartados. | `docs/architecture/decisions/ADR-008-frontend-state-management.md` (criado) |
| Versão do Next.js | **16.x** fixada como padrão do monorepo | README.md e `.agents/rules/stack.md` atualizados |
| Meta de cobertura de teste unitário | **88%**, conforme `specs/TESTS_SPEC.md` | `.agents/rules/stack.md` atualizado — **pendente:** reconciliar `.agents/rules/testing.md`, que ainda tem breakdown por tipo (UI 80%/Hooks 90%/Utils 95%) e uma auditoria datada 13/03/2026 que parece resíduo de outro ciclo. Tratado como Tarefa T0.6 abaixo. |

---

## 2. ⚠️ Lacunas identificadas que a estratégia precisa fechar antes ou durante a Fase 0

Estes achados vieram da auditoria completa do repositório e **não são cobertos por nenhuma spec existente**. Ficam marcados em destaque porque, se não forem tratados cedo, a implementação vai se apoiar em documentação que parece completa mas está vazia ou desatualizada:

- ⚠️ **7 arquivos de documentação central estão vazios (0 bytes):** `docs/legal/lgpd-compliance.md`, `docs/legal/data-processing-agreement.md`, `docs/operations/disaster-recovery.md`, `docs/reference/database-schema.md`, `docs/reference/environment-variables.md`, `docs/reference/error-codes.md`, `docs/reference/api-reference.md`.
- ⚠️ **Nenhum pipeline de CI/CD existe** (`.github/workflows/` não existe), apesar do README referenciar um badge de CI e a estrutura-alvo do projeto listar essa pasta.
- ⚠️ **Links cruzados na documentação apontam para arquivos inexistentes**: `docs/guides/developer.md`, `docs/guides/getting-started.md`, `docs/operations/runbooks.md`, `docs/architecture/diagrams/*`, `docs/architecture/security/`.
- ⚠️ **`.agents/rules/testing.md` contém uma "auditoria" datada 13/03/2026** com métricas de 0% de cobertura — parece resíduo de um ciclo de projeto anterior/diferente, não deste greenfield. Precisa validação e provavelmente reescrita.
- ⚠️ **Roadmap de 35 dias em `docs/PRD/PRD-v1.0.md`** foi escrito antes das ~38 specs existirem — está desatualizado frente ao escopo real. Este documento propõe um roadmap novo (Seção 5).
- ⚠️ **Não há ADR sobre a estratégia de dois ambientes Supabase** (o antigo `NaveSaaS` vs. o novo `Nave`) — resolvido nesta rodada (Seção 1), mas ainda precisa de uma entrada formal em `matrices/impacto.md` fechando o assunto.

Nenhuma dessas lacunas bloqueia o início do código, mas cada uma vira uma tarefa pequena e explícita no roadmap abaixo (não fica "para lembrar depois").

---

## 3. Padrões de engenharia aplicados ao longo de toda a implementação

Estes padrões **já estão definidos** em documentos existentes — esta seção só aponta onde estão e resume o que rege cada área, para não duplicar conteúdo.

### 3.1 Padrões de desenvolvimento
- Convenções de commit, branch, `.gitignore`: `~/.claude/CLAUDE.md` (global) + `.claude/CLAUDE.md` (projeto).
- Regra "não reinventar o que já existe" (preferir lib madura, evitar abstração prematura): `~/.claude/CLAUDE.md`.
- TypeScript strict, proibição de `any`, validação de lib nova via Context7: `.agents/rules/stack.md`.
- Toda spec cita regras (`rules:`/`security:`) de `specs/RULES.md`; todo arquivo que implementa requisito rastreável carrega `// @spec SPEC-ID RF-XX`.

### 3.2 Padrões de arquitetura
- Camadas backend (Controller → Service → RepositoryPort → SupabaseRepository) e padrões ativos (Soft Delete, Soft Warning, Value Objects, Guards+Decorators): `docs/architecture/overview.md`.
- Toda mudança de padrão arquitetural estabelecido exige ADR novo (`docs/architecture/decisions/TEMPLATE.md`) — regra de `.claude/CLAUDE.md` do projeto.
- Modelo de dados (14 entidades) e decisões específicas de domínio: os 8 ADRs existentes + specs de cada feature.

### 3.3 Padrões de DevOps (a construir — não existe hoje)
Como não há pipeline de CI/CD no repositório, a Fase 0 inclui criar do zero, cobrindo no mínimo:
- Lint + type-check em todo PR (bloqueante).
- Testes unitários + integração em todo PR (bloqueante, com gate de cobertura 88%).
- Build de `apps/api` e `apps/web` em todo PR.
- Deploy automático de preview (Vercel para `web`, ambiente de staging para `api`) em PR.
- Deploy de produção apenas via merge em `main`/`master` com aprovação manual (gate humano), nunca automático sem revisão.
- Migrations do Supabase aplicadas via pipeline dedicado, nunca manualmente em produção sem registro.

### 3.4 Padrões de DevSecOps (a construir — não existe hoje)
- Secret scanning no CI (ex: gitleaks ou equivalente) bloqueando commit/PR com segredo exposto.
- Dependency scanning (ex: `pnpm audit` ou Dependabot/Snyk) rodando no CI, não só ad-hoc.
- SAST leve para TypeScript (ex: ESLint com regras de segurança, `eslint-plugin-security`) integrado ao lint do CI.
- Checklist de review de segurança por PR que toca RLS, autenticação ou funções `SECURITY DEFINER`, referenciando as regras S1–S9 de `specs/RULES.md` (nenhuma função `SECURITY DEFINER` nova entra sem validar `search_path` fixo e ownership — regras que o próprio legado `NaveSaaS` violava).
- `docs/security.md` já define processo de disclosure — falta a auditoria trimestral OWASP citada lá (pasta `docs/architecture/security/` não existe, precisa ser criada).

### 3.5 Padrões de QA
- Pirâmide de testes e o que **não** testar: `specs/TESTS_SPEC.md`.
- Regra inviolável: testes de repositório nunca mocam banco (rodam contra Supabase local via `.devcontainer`).
- Cobertura: 88% unitário (fixado nesta rodada). Breakdown por tipo de `.agents/rules/testing.md` deve ser revisado na Tarefa T0.6.
- Casos críticos nomeados CT-001 a CT-007 em `specs/TESTS_SPEC.md` — cada um deve virar teste automatizado antes do respectivo módulo ser considerado "pronto".
- Acessibilidade: WCAG 2.2 AA conforme `.agents/rules/accessibility.md`.

---

## 4. Definição de "pronto" (Definition of Done) por tarefa

Toda tarefa do roadmap abaixo só é considerada concluída quando:
1. Código implementado com `// @spec SPEC-ID RF-XX` apontando para a spec correspondente.
2. Testes automatizados cobrindo os casos críticos da spec (CT-XX quando existir).
3. Lint + type-check + build passando no CI.
4. `matrices/rastreabilidade.md` atualizada com caminho real de código/teste (não fica pendente "para depois" — é parte da própria tarefa, conforme `.claude/CLAUDE.md`).
5. Se a tarefa alterou padrão arquitetural: ADR novo criado.
6. Se a tarefa alterou regra de negócio: `specs/RULES.md` atualizado antes da implementação, não depois.

---

## 5. Roadmap em fases e tarefas pequenas

Cada tarefa é dimensionada para ser um PR pequeno (uma sessão de implementação). Specs já aprovadas são referenciadas por ID; specs em `draft` (marcadas 📝) precisam ser promovidas a `approved` antes de virar código, conforme o gate de sincronia do `.claude/CLAUDE.md`.

### Fase 0 — Fundação técnica (pré-requisito de tudo)

| # | Tarefa | Saída |
|---|---|---|
| T0.1 | Criar monorepo Turborepo + pnpm workspaces (`apps/api`, `apps/web`, `packages/ui`, `packages/validators`, `packages/config`) | Estrutura de pastas conforme README, sem código de domínio ainda |
| T0.2 ✅ | Auditar projeto Supabase `Nave` existente; resetar schema se divergente do modelo dos ADRs; criar `supabase/migrations/` com schema base (tabelas + RLS mínimo) — **concluído em 2026-07-13**: 15 migrations já aplicadas remotamente foram recuperadas via `supabase_migrations.schema_migrations` e trazidas para o repo; `drivers`/`vehicle_drivers`/`documents` (sem spec aprovada) foram removidas via migration `0016`; `docs/reference/database-schema.md` corrigido para bater com o schema real (`plate` não `license_plate`, `description` não `notes` em várias tabelas, colunas faltantes/inexistentes corrigidas) | Banco limpo e sob controle de migration versionada — **16 migrations em `supabase/migrations/`, 13 tabelas, 0 vulnerabilidades de segurança (`get_advisors`)** |
| T0.3 | Setup NestJS 11 base (`apps/api`) com módulo de saúde (`/health`) e Guard de auth stub | API rodando localmente |
| T0.4 | Setup Next.js 16 base (`apps/web`) com TanStack Query + Zustand configurados conforme ADR-008 | Web rodando localmente, hidratação de dados de exemplo via TanStack Query |
| T0.5 | Pipeline de CI (`.github/workflows/ci.yml`): lint, type-check, testes, build, gate de cobertura 88% | CI verde bloqueando merge sem os checks |
| T0.6 | Reconciliar `.agents/rules/testing.md` com a meta de 88% fixada — decidir se o breakdown por tipo (UI/Hooks/Utils/Pages/E2E) é mantido como refinamento por camada ou removido; remover a "auditoria 13/03/2026" residual | Documento de testing consistente com TESTS_SPEC.md |
| T0.7 | Preencher os 4 arquivos vazios de `docs/reference/` (schema, env vars, error codes, api reference) com o conteúdo já disperso em ADRs/specs | Documentação de referência centralizada e não-vazia |
| T0.8 | Preencher `docs/operations/disaster-recovery.md` (estratégia de backup Supabase, RTO/RPO, rollback de migration) | Runbook mínimo de DR existente |
| T0.9 | Preencher `docs/legal/lgpd-compliance.md` e `docs/legal/data-processing-agreement.md` consolidando o que já existe em `docs/legal/privacy-policy.md` e nas regras C1/C2/R-BIZ de `specs/RULES.md` | Documentos legais não-vazios |
| T0.10 | Secret scanning + dependency scanning no CI (DevSecOps) | Job de segurança no pipeline |
| ~~T0.11~~ | ~~Habilitar proteção HaveIBeenPwned no Supabase Auth~~ — **removida em 2026-07-13**: opção não existe no Dashboard do plano/projeto do usuário (confirmado por douglps). Não reavaliar sem verificar antes se o Supabase mudou a disponibilidade do recurso. | N/A |

### Fase 1 — Autenticação e segurança base
*(bloqueia todo o resto — sem auth não há RLS testável)*

| # | Spec | Tarefa |
|---|---|---|
| T1.1 | SPEC-20260524-001, SPEC-20260524-002 (auth) | Módulo de autenticação (registro, login, refresh) + páginas web |
| T1.2 | SPEC-20260521-001 (security hardening) | Aplicar os gaps críticos de segurança do MVP identificados na spec |
| T1.3 | RULES.md S1–S9 | Middleware SSR de proteção de rota (`apps/web/middleware.ts` — hoje inexistente, sinalizado em `matrices/permissoes.md`) |
| T1.4 | SPEC-20260521-004 (admin) | Admin role + operações LGPD |
| T1.5 | SPEC-20260521-005 (admin) | OpenAPI/Swagger da API |

### Fase 2 — Domínio core: Veículos e Categorias

| # | Spec | Tarefa |
|---|---|---|
| T2.1 ✅ | SPEC-20260602-002 | CRUD de veículos — **concluído em 2026-07-13** (core apenas); itens de prioridade Baixa/Média pendentes rastreados em `matrices/rastreabilidade.md` |
| T2.2 ✅ | SPEC-20260602-003 | Grupos de veículos — **concluído em 2026-07-13** (core: `VehicleGroupsModule` REST + frontend mínimo); itens que dependem do dashboard/Em Foco (Fase 5) ficam ⏳, rastreados em `matrices/rastreabilidade.md` |
| T2.3 ✅ | SPEC-20260602-004 | Categorias personalizadas de despesa — **concluído em 2026-07-13** (`CategoriesModule` REST completo); integração com `ExpenseForm` (RF-07/RF-08) fica ⏳ até o módulo de despesas existir (Fase 3) |
| T2.4 ✅ | SPEC-20260711-001 (ADR-007) | Ciclos de odômetro — **concluído em 2026-07-13** (`OdometerCyclesModule` REST + tela de configurações mínima); RF-01–04, RF-12–17, RF-23, RF-24 ficam ⏳ até os módulos de despesas (Fase 3) e manutenções (Fase 4) existirem |
| T2.5 ✅ | SPEC-20260603-004 | Migration `user_preferences` — banco já aplicado em 2026-07-13 (`20260712171846_grouping_templates_preferences.sql`, schema divergente do texto original da spec: `vehicle_chip_fields text[]` em vez de `jsonb`, sem colunas `theme`/`notifications_config`); camada de serviço formalizada em 2026-07-14 via `PreferencesModule` (GET/PATCH `/preferences`) |
| T2.6 🟡 | SPEC-20260612-003 | Preferência de rascunho automático — **concluída parcialmente em 2026-07-14**: RF-01 (`PreferencesModule` REST) e RF-02 (toggle em `/settings/preferences`) prontos; RF-03 (integração com `ExpenseForm`) fica ⏳ até o módulo de despesas existir (Fase 3) |
| T2.7 🟡 | SPEC-20260603-003 | Preferências de exibição do veículo no chip — **concluída parcialmente em 2026-07-14**: schema Zod, `PreferencesModule` REST (`vehicle_chip_fields`) e UI em `/settings/preferences` prontos; renderização do `VehicleContextChip` real (RF-01/04/05) fica ⏳ até a Fase 5 (`SPEC-20260603-001`) |

### Fase 3 — Épico Ledger Financeiro Unificado (ADR-006)

| # | Spec | Tarefa |
|---|---|---|
| T3.0 ✅ | SPEC-20260714-001 | CRUD Base de Despesas (`ExpensesModule`) — **concluído em 2026-07-14**: nenhuma spec cobria o CRUD base; spec criada, aprovada e implementada (backend REST + validators + frontend mínimo) como pré-requisito de T3.1+ |
| T3.1 ✅ | SPEC-20260521-003 | Export CSV — Dashboard — **concluído em 2026-07-14**: `DashboardModule` criado do zero (não existia nenhum módulo de dashboard ainda); escopo restrito ao endpoint de export desta spec |
| T3.2 ✅ | SPEC-20260601-001 | Validação de sequência de odômetro — **concluída em 2026-07-14**: padrão response-field (correção de contradição interna na spec, D6); exibição no frontend fica ⏳ (NG-05, fora de escopo) |
| T3.3 ✅ | SPEC-20260601-002 | Detecção de duplicata de despesa — **concluída em 2026-07-14**: padrão response-field (consistente com T3.2); busca de duplicata exclui o próprio registro recém-criado (ajuste não coberto explicitamente pelos RFs, ver matriz); frontend fica ⏳ (mesma justificativa de T3.2) |
| T3.4 ✅ | SPEC-20260601-003 | Modelos rápidos de despesas — **concluída em 2026-07-14**: `ExpenseTemplatesModule` REST (CRUD + limite 20 + touch de `last_used_at`) + tray de aplicação em `/expenses/new` + "Salvar como modelo" em `/expenses/[id]`; itens de UI secundários (renomear, ícone de veículo excluído, feature flag) ficam ⏳, rastreados em `matrices/rastreabilidade.md` |
| T3.5 🟡 | SPEC-20260606-001, 002 | Fuel enrichment + fornecedor de combustível — **concluída parcialmente em 2026-07-14**: RF-01–03 de SPEC-20260606-001 (persistência de `fuel_type`/`full_tank`, `computed.km_per_liter`/`price_per_liter`) e RF-01–04 de SPEC-20260606-002 (persistência de `supplier`, endpoint `GET /expenses/suppliers`) prontos, com campos correspondentes nos formulários `/expenses/new` e `/expenses/[id]`; pré-preenchimento de `fuel_type`, hint de odômetro e cálculo em tempo real de km/l e preço/litro no formulário ficam ⏳ até a reescrita do `ExpenseForm` (T3.9/T3.10) |
| T3.6 ✅ | SPEC-20260607-001 | FinesModule (multas) — **concluído em 2026-07-14** (Sprint 0: CRUD completo + transições de status; vinculação ao ledger fechada em T3.8) |
| T3.7 ✅ | SPEC-20260608-001, 002, 003 | Upcoming costs, KPIs, alertas de custos recorrentes — **concluído em 2026-07-14**; badge de sidebar (RF-02 SPEC-608-003) e navegação "Ver" para `/maintenance`/`/fines`/`/settings` (RF-06 SPEC-608-001) ficam ⏳, rastreados em `matrices/rastreabilidade.md` |
| T3.8 ✅ | SPEC-20260609-001, 002, 003 | CRUD de custos recorrentes, tab por veículo, export CSV consolidada — **concluído em 2026-07-14**; tela dedicada de custos recorrentes fica ⏳ (sem G-08/Módulo de Documentos ainda), rastreada em `matrices/rastreabilidade.md` |
| T3.9 ✅ | SPEC-20260612-001, 002 | Melhorias de UX do form/hub financeiro — **concluída em 2026-07-14**: adaptada à stack real do projeto (sem react-hook-form/Server Actions); RF-02 de SPEC-20260612-001 (reatividade do veículo ao contexto global) fica ⏳ até a Fase 5 |
| T3.10 🟡 | SPEC-20260619-001 | Padrão de comportamento de formulários — **concluída parcialmente em 2026-07-14**: R-FORM-05 (dirty check + confirmação ao cancelar) e R-FORM-07 (empty state com CTA) aplicados ao Expense Form, única tela transacional existente no frontend; R-FORM-01/02/06 ficam ⏳ até a stack react-hook-form/`@nave/ui` (Fase 8) |

### Fase 4 — Manutenção

| # | Spec | Tarefa |
|---|---|---|
| T4.1 ⏸️ | SPEC-20260521-002 | Alertas de manutenção por email — **adiado em 2026-07-15**: depende de domínio próprio registrado (Resend exige domínio verificado para envio em produção) e a decisão do usuário é vincular esse recurso ao lançamento da monetização (Fase 9), não à Fase 4. Retomar junto com T9.1. |
| T4.2 ✅ | SPEC-20260603-002 | Transições de status de manutenção — **concluída em 2026-07-15** junto com `SPEC-20260715-001` (CRUD base de manutenções, criada nesta rodada pois o módulo não existia): `MaintenancesModule` REST completo (CRUD + grafo de transições R7 + integração com o ledger R-LED-02/03, R-HUB-01) + frontend mínimo (`/maintenance`, `/maintenance/new`, `/maintenance/[id]`) |

### Fase 5 — Dashboard e Contexto Global

| # | Spec | Tarefa |
|---|---|---|
| T5.1 📝 | SPEC-20260531-001 (rascunho) | Redesign do dashboard (Fleet Command + Vehicle Spotlight) — **promover a approved antes de codar** |
| T5.2 | SPEC-20260602-005 | Monitor do sistema — audit log dashboard |
| T5.3 | SPEC-20260602-001 (ADR de contexto) | "Em Foco" — contexto de veículo global |
| T5.4 📝 | SPEC-20260603-001 (rascunho) | Chip de contexto no subheader — **promover a approved antes de codar** |

### Fase 6 — Analytics

| # | Spec | Tarefa |
|---|---|---|
| T6.1 | SPEC-20260622-001 | Analytics engine (TCO, fuel, anomalias, benchmark, forecast, seasonal, insights NL) — recomenda-se dividir esta spec em sub-tarefas por sub-recurso ao implementar, dado o escopo amplo |

### Fase 7 — PWA Offline

| # | Spec | Tarefa |
|---|---|---|
| T7.1 📝 | SPEC-20260712-001 (rascunho) | PWA offline (instalação, cache, somente-leitura) — **promover a approved antes de codar**; valida diretamente a decisão do ADR-008 sobre pausa de mutation offline |

### Fase 8 — Design System

| # | Spec | Tarefa |
|---|---|---|
| T8.1 📝 | SPEC-20260525-001 (rascunho) | Novos componentes UI — **promover a approved antes de codar** |

### Fase 9 — Estratégia de negócio / monetização
*(fora do MVP original do PRD — avaliar se entra nesta fase ou pós-lançamento)*

| # | Spec | Tarefa |
|---|---|---|
| T9.1 📝 | SPEC-20260620-001 (draft, ~R-BIZ-01 a 15) | Planos, monetização, roles, consolidação — **spec mais extensa e menos madura do backlog; recomenda-se sessão dedicada de spec-writer antes de aprovar** |

---

## 6. Ordem recomendada de execução

Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7 → Fase 8. Fase 9 (monetização) pode rodar em paralelo à Fase 6+ já que é independente do core operacional, mas não deve bloquear o lançamento do MVP (consistente com o PRD, que trata monetização como pós-MVP).

## 7. Próximos passos imediatos

1. Validar este documento (feito — você está lendo a versão aprovada).
2. Rodar `doc-keeper` para registrar em `matrices/impacto.md` o encerramento da questão `NaveSaaS` (Seção 1).
3. Iniciar Fase 0, Tarefa T0.1 (scaffold do monorepo).

---

## Changelog

- **2026-07-15**: Início da Fase 4. Lacuna identificada (mesmo padrão de T3.0): nenhuma spec cobria o CRUD base de manutenções — `SPEC-20260521-002` e `SPEC-20260603-002` assumiam `MaintenancesService` pré-existente. Spec nova `SPEC-20260715-001` criada, aprovada e implementada como T4.2, absorvendo o enforcement de transição de status (T4.2 original) e a integração com o ledger (R-LED-02/03, R-HUB-01) no mesmo módulo — replicando o padrão já validado em `FinesModule` (T3.6/T3.8). Corrigida também uma contradição spec-vs-schema-real em `SPEC-20260603-002`: a v0.1 assumia `pending` como estado inicial citando uma migration que nunca existiu no repo; o schema real (`enum maintenance_status`, recuperado em T0.2) usa `scheduled`. `RULES.md` R7 corrigida na mesma rodada. T4.1 (alertas por email) avaliado e adiado — decisão do usuário: depende de domínio próprio registrado (Resend exige domínio verificado) e o recurso deve entrar em uso junto com o lançamento da monetização (Fase 9), não antes. Retomar T4.1 junto com T9.1.
- **2026-07-13**: criação do documento. Decisões de ADR-008 (state management), versão Next.js 16, cobertura 88% e descarte do legado `NaveSaaS` incorporadas.
- **2026-07-13**: T2.2 (Grupos de veículos) concluída — core via REST API, itens dependentes do dashboard rastreados como pendentes.
- **2026-07-13**: T2.3 (Categorias personalizadas) concluída — `CategoriesModule` REST completo; migration faltante `UNIQUE(user_id, value)` corrigida e aplicada no banco remoto (junto com 2 migrations de auth que já estavam commitadas mas nunca haviam sido aplicadas).
- **2026-07-13**: T2.4 (Ciclos de odômetro) concluída parcialmente — `OdometerCyclesModule` REST + tela de configurações; requisitos que dependem dos módulos de despesas/manutenções (ainda não construídos) ficam explicitamente pendentes.
- **2026-07-14**: T2.5 (Migration `user_preferences`) e T2.6 RF-01/RF-02 (Preferência de rascunho automático) concluídas — `PreferencesModule` REST (`apps/api/src/modules/preferences`) + tela `/settings/preferences`. Decisão confirmada com o usuário: preferências seguem o padrão NestJS REST + React Query já estabelecido em T2.1–T2.4, não o padrão de server actions Next.js descrito originalmente em SPEC-20260603-004/SPEC-20260612-003 (ver changelog dessas specs). T2.6 RF-03 (integração com `ExpenseForm`) permanece ⏳ até a Fase 3.
- **2026-07-14**: T2.7 (Preferências de exibição do veículo) concluída parcialmente — SPEC-20260603-003 promovida de `draft` para `approved` (nickname corrigido de max 30 para max 50, refletindo o que já estava implementado desde T2.1). Implementados: `chipFieldsSchema`/`DEFAULT_CHIP_FIELDS` em `packages/validators`, `PreferencesModule` estendido com `vehicle_chip_fields` (mesmo padrão REST de T2.6), UI "Exibição do veículo" em `/settings/preferences` com seleção/reordenação/prévia em tempo real, e helper puro `apps/web/src/lib/vehicle-chip.ts` (`resolveChipValue`/`formatChipPreview`) já preparado para ser reutilizado pelo `VehicleContextChip` real. RF-01/RF-04/RF-05 (o chip em si, no subheader) permanecem ⏳ porque dependem de `SPEC-20260603-001` (Fase 5, ainda `draft`) — o componente `VehicleContextChip` não existe no código ainda.
- **2026-07-14**: Início da Fase 3. Lacuna identificada: nenhuma das 14 specs de `specs/expenses/` cobria o CRUD base de despesas — todas assumiam o `ExpensesModule` como pré-existente. Spec nova `SPEC-20260714-001` criada, aprovada e implementada como T3.0 (pré-requisito de T3.1+): `ExpensesModule` REST completo (create/list paginado/get/update/soft-delete, proteção `is_readonly` do ledger ADR-006, isolamento por usuário, audit log), `packages/validators/src/expense.schemas.ts`, e frontend mínimo (`/expenses`, `/expenses/new`, `/expenses/[id]`). Deliberadamente fora de escopo desta tarefa (evitando contradizer decisões já tomadas em specs futuras aprovadas): checagem de sequência de odômetro R1 (soft warning via exceção + `confirmed`, fica com SPEC-20260601-001/T3.2) e campo `computed` de consumo (fica com SPEC-20260606-001/T3.5).
- **2026-07-14**: T3.1 (Export CSV — Dashboard) concluída — `DashboardModule` REST (`GET /dashboard/export`) criado do zero: a spec assumia um `DashboardController` pré-existente que nunca foi implementado (o dashboard real é objeto da Fase 5, ainda `draft`). Escopo mantido estritamente ao endpoint de export descrito em `SPEC-20260521-003` (query `period`/`vehicle_id` validada via Zod, CSV com BOM UTF-8, `Content-Disposition` com nome do arquivo, throttle 10 req/5min, isolamento por `user_id`). Frontend mínimo em `/dashboard` com seletor de mês/veículo e link de download — sem estatísticas ou redesign, que permanecem da Fase 5.
- **2026-07-14**: T3.2 (Validação de sequência de odômetro, R1) concluída — antes de implementar, identificada e corrigida uma contradição interna na `SPEC-20260601-001`: o Decision Log (D6) e a seção "Contexto para Agentes de IA" pediam padrão exception-based (`ExpenseWarningException` + `confirmed`), citando incorretamente a spec de duplicata como precedente — mas a spec de duplicata (`SPEC-20260601-002`, ainda não implementada) sempre especificou response-field, e os próprios RF-03/RF-04/seção 8 desta spec também. Antes de decidir, acionados os agentes `design-system` (pesquisa de UX: diálogo de confirmação é fricção desproporcional para validação soft; HTTP 409 é semanticamente incorreto para condição não-bloqueante) e `impact-analyzer` (exception-based exigiria alterar o `HttpExceptionFilter` global do projeto e criar máquina de estados de confirmação no frontend). D6 corrigida para response-field, registrado em changelog da spec. Implementado: `ExpensesService.create()`/`update()` enriquecem a resposta com `odometer_warning`/`odometer_previous_max_km` (método privado `findMaxOdometerByVehicle`, sem Repository/Port — mesmo padrão inline já usado no módulo). Exibição no frontend deliberadamente fora de escopo (NG-05 da spec) — exigiria rever `R-FORM-04` (redirect imediato pós-criação), objeto de spec de UX futura.
- **2026-07-14**: T3.3 (Detecção de duplicata de despesa, R2) concluída — mesma decisão de padrão de T3.2 (response-field) aplicada por consistência, já registrada em `IMPACTO-030`. Corrigida a descrição de `R2` em `specs/RULES.md`, que citava incorretamente um requisito de flag `confirmed: true` nunca especificado pela spec (RF-01 a RF-06 sempre foram soft warning puro). Implementado: `ExpensesService.create()` invoca `findPotentialDuplicate()` (método privado, sem Repository/Port) após o insert e enriquece a resposta com `duplicate_warning`/`duplicate_id` quando encontra registro ativo com mesmos `vehicle_id`/`date`/`amount`/`category`. Ajuste de design necessário e não coberto explicitamente pelos RFs: a busca exclui o próprio registro recém-criado (`excludeExpenseId`) — sem essa exclusão, todo lançamento bateria nos próprios critérios e geraria falso positivo sistemático, já que a spec manda buscar duplicata *depois* do insert. `update()` não invoca a verificação (RF-06). Frontend fora de escopo, mesma justificativa de T3.2 (NG-05).
- **2026-07-14**: T3.4 (Sistema de Modelos Rápidos de Despesas, R3/R6) concluída — diferente de T3.2/T3.3, esta feature é centrada em frontend (a tray de aplicação com um clique é o próprio objetivo do produto), então o frontend não pôde ficar fora de escopo. Descoberto que a tabela `expense_templates`, índices, trigger de limite (`enforce_expense_templates_limit`) e RLS já existiam desde T0.2 (schema recuperado do banco remoto) — nenhuma migration nova necessária, só a camada de aplicação. Implementado: `ExpenseTemplatesModule` REST (`GET/POST /expense-templates`, `PATCH /:id`, `PATCH /:id/touch`, `DELETE /:id`) sem Repository/Port (mesmo padrão inline de `CategoriesModule`), `packages/validators/src/expense-template.schemas.ts` (sem `date`/`odometer_km`/`full_tank`, conforme R6/R-FUEL-05); frontend: tray de cartões em `/expenses/new` (aplica campos, dispara touch fire-and-forget, cria/exclui modelo) e botão "Salvar como modelo" em `/expenses/[id]`. Desvios de escopo deliberados frente à spec original (documentados em `matrices/rastreabilidade.md` e no changelog da spec): modal de criação → formulário inline (sem componente de modal no projeto); rota dedicada `/touch` em vez de sobrecarregar `PATCH /:id` com `last_used_at` (campo de sistema fora do DTO validado); feature flag por env var não implementada (nenhuma outra feature do projeto usa esse padrão); renomear via menu de contexto, contagem responsiva exata de cartões e ícone de alerta âmbar (RF-13) ficam ⏳.
- **2026-07-14**: T3.5 (Fuel enrichment + fornecedor de combustível, SPEC-20260606-001/002) concluída parcialmente — as colunas `fuel_type`, `full_tank`, `liters` e `supplier` já existiam na tabela `expenses` (e `fuel_type`/`supplier` em `expense_templates`) desde a migration consolidada de T3.0/T3.4, e o schema Zod (`expenseBaseSchema`) já as validava; faltava apenas a camada de cálculo derivado e o endpoint de sugestões. Implementado: `ExpensesService.computeFuelMetrics()` (privado, reaproveita `findMaxOdometerByVehicle` já usado pela validação de odômetro — sem query adicional) retorna `computed.km_per_liter`/`computed.price_per_liter` em `create`/`update` quando `category = 'fuel'` (R-FUEL-02/03); `ExpensesService.listSuppliers()` + `GET /expenses/suppliers` retornam até 10 fornecedores deduplicados case-insensitive, mais recentes primeiro (R-FUEL-04), com dedup em memória (histórico do usuário é pequeno, evita `DISTINCT`/`GROUP BY` no banco). Frontend: campos "Tipo de combustível" (select), "Litros", "Abastecimento parcial?" (checkbox, default desmarcado = `full_tank=true`, conforme decisão original de RF-05 da spec) e "Posto / Fornecedor" (input + `<datalist>` alimentado pelo novo endpoint) adicionados a `/expenses/new` e `/expenses/[id]`, condicionados a `category === 'fuel'`; tray de templates e "Salvar como modelo" passam a carregar/persistir `fuel_type`/`supplier` (nunca `full_tank`, R-FUEL-05). Deliberadamente fora de escopo (RULES.md já registra R-FUEL-06/07/08 apontando para SPEC-20260612-002/SPEC-20260619-001, que descrevem um `ExpenseForm` reescrito com react-hook-form ainda não implementado — T3.9/T3.10): pré-preenchimento de `fuel_type` por veículo (RF-04), toggle tri-state de `full_tank` (R-FUEL-06), hint de odômetro com delta (RF-06) e cálculo em tempo real de km/l e preço/litro no formulário (RF-07/RF-08) — implementar essas peças agora exigiria retrabalho quando o form for reescrito, e a UI atual (`useState` simples) não é a arquitetura-alvo descrita por R-FORM-01/02.
- **2026-07-14**: T3.6 (FinesModule — CRUD de Multas de Trânsito, SPEC-20260607-001) concluída — tabela `fines`, enum `fine_status` e colunas já existiam desde T0.2 (schema recuperado do banco remoto), nenhuma migration nova necessária. Antes de implementar, identificada e corrigida uma contradição interna na spec (mesmo padrão de T3.2/T3.3): a seção "Escopo" listava a vinculação ao ledger (Sprint 2, `US-FIN-A02`) como parte do escopo desta spec, mas "Fora do Escopo" já descrevia essa vinculação como pertencente a uma "spec separada" — e `ExpensesService.createFromSource()`/`softDeleteBySource()`, citados por R-LED-02/R-LED-03, não existem em nenhum lugar do código ainda. "Escopo" corrigido para refletir só Sprint 0, changelog registrado na spec (v1.2). Implementado: `FinesModule` REST (`POST/GET /fines`, `GET /fines?status=`, `GET /fines/vehicle/:vehicleId`, `GET/PATCH/DELETE /fines/:id`) sem Repository/Port (mesmo padrão inline de `ExpensesModule`/`ExpenseTemplatesModule`); validação de ownership de veículo; `amount_with_discount ≤ amount` (Regras de Negócio); grafo de transições de status (RF-05) via `FINE_STATUS_TRANSITIONS` em `packages/validators/src/fine.schemas.ts`, retornando 409 (`ConflictException` direto, mesmo padrão de `CategoriesService`/`AuthService` — a `InvalidStatusTransitionException` nomeada na spec não virou classe dedicada, já que nenhum módulo do projeto usa exceções customizadas); `paid_at` preenchido automaticamente quando a transição para `paid` não informa a data (RF-04); soft-delete (RF-06, R5); `countPending()` como método interno sem rota própria (RF-07). Vinculação ao ledger (Sprint 2) e tela `/fines` no frontend ficam ⏳ — a vinculação será implementada junto com T3.7/T3.8, já que `createFromSource()` é compartilhado entre multa, manutenção (R-LED-02) e custo recorrente (R-LED-05), fazendo mais sentido construí-lo uma única vez quando as três origens existirem.
- **2026-07-14**: T3.7 (Upcoming Costs + Expenses KPIs + Alertas de Custos Recorrentes, SPEC-20260608-001/002/003) concluída — as três specs implementadas juntas por compartilharem o mesmo endpoint e tela. RPC `get_upcoming_costs(p_vehicle_id, p_horizon_days)` já existia desde T0.2 com `EXECUTE` concedido a `authenticated`; `ExpensesService.getUpcomingCosts()` apenas delega para o RPC (primeiro uso de `.rpc()` fora de `OdometerCyclesService`). `GET /expenses/kpis` não tinha RPC equivalente — implementado com 3 somas em memória sobre `expenses` (mês corrente, mês anterior, histórico) mais uma chamada interna a `getUpcomingCosts(horizon=30)`, sem view/RPC nova (volume por usuário não justifica). Frontend: KPI cards com badge de delta (verde/vermelho) e tab "Lista"/"Próximas" com `?tab=proximas` na URL, badges de urgência por faixa de dias até o vencimento. **Desvios deliberados de escopo:** RF-06 de SPEC-608-001 (botão "Ver" com navegação para a origem) — desabilitado com tooltip "Em breve" para as três origens (`maintenance`, `fine`, `recurring_cost`), não só para `recurring_cost` como a spec original previa, porque `/maintenance` (Fase 4) e `/fines` (frontend, T3.6 deferiu a UI) também não existem ainda; RF-02 de SPEC-608-003 (badge numérico na sidebar) fica ⏳ — não existe componente de sidebar no projeto (Fase 5, ainda `draft`), e a chamada client-side direta ao RPC que a spec descreve introduziria um padrão arquitetural novo (nenhuma tela do projeto chama Supabase diretamente do browser hoje); ambas decisões ficam registradas em `matrices/rastreabilidade.md` para retomada na Fase 5.
- **2026-07-14**: T3.8 (CRUD de Custos Recorrentes + Tab "Por Veículo" + Export CSV Consolidada, SPEC-20260609-001/002/003) concluída — as três specs implementadas juntas por serem incrementos pequenos e interdependentes da mesma tela. `RecurringCostsModule` foi o gatilho para implementar `ExpensesService.createFromSource()`/`softDeleteBySource()` (adiado desde T3.6/T3.7, conforme já registrado nos changelogs anteriores); uma vez implementados, `FinesModule` (T3.6) foi retrofitado na mesma tarefa para fechar o item pendente de vinculação ao ledger (changelog v1.3 de `SPEC-20260607-001`): `create()` agora chama `createFromSource` incondicionalmente (`source_type='fine'`, usa `amount_with_discount` quando disponível, R-LED-02); `update()` para `status=cancelled` e `remove()` chamam `softDeleteBySource` (R-LED-03, R-HUB-01). O módulo de manutenção (Fase 4) ainda não existe, então essa terceira origem do ledger continua pendente até lá. Implementado: `RecurringCostsModule` REST completo (SPEC-609-001, CT-REC-01 a 08) — checagem de duplicata `(vehicle_id, cost_type, year)` deliberadamente **não filtra `deleted_at`**, porque a constraint `uq_vehicle_recurring_cost` no banco (criada em T0.2) é full-table, não parcial; `GET /expenses/export` consolidado (SPEC-609-003) devolvendo CSV pronto com coluna "Origem" humanizada (Despesa Manual/Manutenção/Multa/Documento) — mesmo padrão de `DashboardService.exportExpensesCsv` (T3.1) em vez do array JSON + fetch-Supabase-client-side que a spec original descrevia; `escapeCsvField` extraída para `shared/csv/csv.util.ts` e reaproveitada por `DashboardService` (evita duplicar a função). Frontend: tab "Por veículo" (SPEC-609-002) como client component com accordion nativo (`<details>/<summary>`) agrupando `GET /expenses?limit=100` por veículo, subtotal e total geral — reescrita a partir do "Server Component" que a spec original descrevia, já que este projeto usa exclusivamente client components + TanStack Query; "Em atraso" do mockup da spec não existe no projeto, então "Por veículo" entrou como 3ª tab, não 4ª; botão "Exportar CSV Completo" adicionado ao cabeçalho de `/expenses`.
- **2026-07-14**: T3.9 (Melhorias de UX do Formulário/Hub de Despesas, SPEC-20260612-001/002) concluída — antes de implementar, identificada uma divergência de arquitetura maior que as anteriores: as duas specs (e SPEC-20260619-001, "Padrão de Comportamento de Formulários") pressupõem Next.js Server Actions + react-hook-form + um kit de componentes `@nave/ui` estilo shadcn (`FormField`, `DatePicker`, etc.), nada disso construído neste projeto — `apps/web` usa exclusivamente client components com `useState` + TanStack Query chamando `apps/api` (NestJS) via `apiClient`. Como a decisão afetava o resto do roadmap (Fase 4, 5 e 8 também mexem em formulários), a escolha foi levada ao usuário em vez de decidida sozinho: optou-se por adaptar as regras de negócio à stack atual (opção recomendada), documentar o desvio, e adiar a stack-alvo de SPEC-20260619-001 para quando a Fase 8 (Design System) evoluir os componentes — registrado no changelog de ambas as specs e em `matrices/rastreabilidade.md`. Implementado: `packages/ui/src/components/masked-input.tsx` (`CurrencyInput`/`OdometerInput`, acumulador de dígitos estilo caixa eletrônico, sem dependência de react-hook-form — cobertura de teste 100%); migration `20260714220000` adicionando despesas manuais futuras como 4ª fonte de `get_upcoming_costs` (RF-01.2); hard-block de odômetro (R-ODO-01) implementado em `ExpensesService` como opt-in via query param `?strict=true` — como não existe uma "rota web" separada da API neste projeto (diferente do que a spec original presumia), o supersede de R1 (soft-warning, SPEC-20260601-001) virou uma flag explícita enviada só pelo `apps/web`, preservando o comportamento default para outros consumidores da API; `superRefine` compartilhado em `expenseBaseSchema` exigindo `odometer_km` quando `category = fuel` (RF-06.1); hook `apps/web/src/lib/hooks/use-fuel-cross-calc.ts` implementando a pilha `fuelEditOrder` (R-FUEL-08) para o cálculo cruzado entre `amount`/`liters`/`price_per_liter`, sem framework de formulário; campo "Ano" (`apps/web/src/lib/date-year.ts`), "Tanque cheio?" tri-state e reordenação de layout em `/expenses/new` e `/expenses/[id]`. RF-01.1 (KPI "Próximos 30 dias" em todas as abas) já estava correto nesta implementação, sem o bug que a spec original descrevia. **Deferido:** RF-02 de SPEC-20260612-001 (campo veículo reativo ao contexto global) — depende do `useDashboardStore`/"Em Foco" da Fase 5 (SPEC-20260602-001), que ainda não existe.
- **2026-07-14**: T3.10 (Padrão de Comportamento de Formulários, SPEC-20260619-001) concluída parcialmente — aplicação retroativa restrita ao Expense Form (`apps/web/src/app/expenses/new/page.tsx`, `apps/web/src/app/expenses/[id]/page.tsx`), única tela transacional com frontend próprio neste momento (Vehicle Form já segue R-FORM-03/04 desde T2.1; Fine/Maintenance/RecurringCost Forms não têm tela própria ainda). Implementado, adaptado à stack real (mesma decisão de T3.9, sem `AlertDialog`/`FormField`): R-FORM-05 (dirty check comparando estado atual contra os valores iniciais/carregados; `window.confirm("Descartar alterações?")` ao clicar em "Cancelar", mesmo padrão já usado nas exclusões dessas telas) e R-FORM-07 (empty state com card + CTA "Cadastrar veículo →" substituindo o formulário inteiro em `/expenses/new` quando `vehicles.length === 0`, em vez do aviso inline anterior). R-FORM-04 já estava conforme (create redireciona, update apenas invalida a query). R-FORM-01/02 permanecem ⏳ (dependem de react-hook-form/`FormField`, Fase 8); R-FORM-06 não é aplicável sem Server Actions — o contrato uniforme já existe via `ApiError`/`apiClient`.
