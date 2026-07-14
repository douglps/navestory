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
| T3.1 | SPEC-20260521-003 | Export CSV — Dashboard |
| T3.2 | SPEC-20260601-001 | Validação de sequência de odômetro |
| T3.3 | SPEC-20260601-002 | Detecção de duplicata de despesa |
| T3.4 | SPEC-20260601-003 | Modelos rápidos de despesas |
| T3.5 | SPEC-20260606-001, 002 | Fuel enrichment + fornecedor de combustível |
| T3.6 | SPEC-20260607-001 | FinesModule (multas) |
| T3.7 | SPEC-20260608-001, 002, 003 | Upcoming costs, KPIs, alertas de custos recorrentes |
| T3.8 | SPEC-20260609-001, 002, 003 | CRUD de custos recorrentes, tab por veículo, export CSV consolidada |
| T3.9 | SPEC-20260612-001, 002 | Melhorias de UX do form/hub financeiro |
| T3.10 | SPEC-20260619-001 | Padrão de comportamento de formulários (aplicar retroativamente às telas acima) |

### Fase 4 — Manutenção

| # | Spec | Tarefa |
|---|---|---|
| T4.1 | SPEC-20260521-002 | Alertas de manutenção por email |
| T4.2 | SPEC-20260603-002 | Transições de status de manutenção |

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

- **2026-07-13**: criação do documento. Decisões de ADR-008 (state management), versão Next.js 16, cobertura 88% e descarte do legado `NaveSaaS` incorporadas.
- **2026-07-13**: T2.2 (Grupos de veículos) concluída — core via REST API, itens dependentes do dashboard rastreados como pendentes.
- **2026-07-13**: T2.3 (Categorias personalizadas) concluída — `CategoriesModule` REST completo; migration faltante `UNIQUE(user_id, value)` corrigida e aplicada no banco remoto (junto com 2 migrations de auth que já estavam commitadas mas nunca haviam sido aplicadas).
- **2026-07-13**: T2.4 (Ciclos de odômetro) concluída parcialmente — `OdometerCyclesModule` REST + tela de configurações; requisitos que dependem dos módulos de despesas/manutenções (ainda não construídos) ficam explicitamente pendentes.
- **2026-07-14**: T2.5 (Migration `user_preferences`) e T2.6 RF-01/RF-02 (Preferência de rascunho automático) concluídas — `PreferencesModule` REST (`apps/api/src/modules/preferences`) + tela `/settings/preferences`. Decisão confirmada com o usuário: preferências seguem o padrão NestJS REST + React Query já estabelecido em T2.1–T2.4, não o padrão de server actions Next.js descrito originalmente em SPEC-20260603-004/SPEC-20260612-003 (ver changelog dessas specs). T2.6 RF-03 (integração com `ExpenseForm`) permanece ⏳ até a Fase 3.
- **2026-07-14**: T2.7 (Preferências de exibição do veículo) concluída parcialmente — SPEC-20260603-003 promovida de `draft` para `approved` (nickname corrigido de max 30 para max 50, refletindo o que já estava implementado desde T2.1). Implementados: `chipFieldsSchema`/`DEFAULT_CHIP_FIELDS` em `packages/validators`, `PreferencesModule` estendido com `vehicle_chip_fields` (mesmo padrão REST de T2.6), UI "Exibição do veículo" em `/settings/preferences` com seleção/reordenação/prévia em tempo real, e helper puro `apps/web/src/lib/vehicle-chip.ts` (`resolveChipValue`/`formatChipPreview`) já preparado para ser reutilizado pelo `VehicleContextChip` real. RF-01/RF-04/RF-05 (o chip em si, no subheader) permanecem ⏳ porque dependem de `SPEC-20260603-001` (Fase 5, ainda `draft`) — o componente `VehicleContextChip` não existe no código ainda.
- **2026-07-14**: Início da Fase 3. Lacuna identificada: nenhuma das 14 specs de `specs/expenses/` cobria o CRUD base de despesas — todas assumiam o `ExpensesModule` como pré-existente. Spec nova `SPEC-20260714-001` criada, aprovada e implementada como T3.0 (pré-requisito de T3.1+): `ExpensesModule` REST completo (create/list paginado/get/update/soft-delete, proteção `is_readonly` do ledger ADR-006, isolamento por usuário, audit log), `packages/validators/src/expense.schemas.ts`, e frontend mínimo (`/expenses`, `/expenses/new`, `/expenses/[id]`). Deliberadamente fora de escopo desta tarefa (evitando contradizer decisões já tomadas em specs futuras aprovadas): checagem de sequência de odômetro R1 (soft warning via exceção + `confirmed`, fica com SPEC-20260601-001/T3.2) e campo `computed` de consumo (fica com SPEC-20260606-001/T3.5).
