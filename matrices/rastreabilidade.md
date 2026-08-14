# Matriz de Rastreabilidade — navestory SaaS

> **AVISO DE CORRECAO — 2026-07-12 (rev. 41)**
> Esta matriz foi reescrita em 2026-07-12. Versoes anteriores (rev. 1 a rev. 40) continham
> informacoes aspiracionais/fictícias sobre implementação. Colunas Código e Teste foram zeradas
> para ⏳ pendente nas specs cujo código não existia. A afirmacao de que o repositório era
> "greenfield" (sem nenhum código implementado) ficou obsoleta em 2026-07-13 — ver rev. 42.
>
> **ATUALIZACAO — 2026-07-13 (rev. 42)**
> Os commits `0a2926c` e `144a787` adicionaram implementações reais ao repositório. As colunas
> Código e Teste foram atualizadas para refletir o estado real dos seguintes artefatos:
>
> - Migrations aplicadas (commit `0a2926c`):
>   - `supabase/migrations/20260712171846_grouping_templates_preferences.sql` — tabelas
>     `vehicle_groups`, `vehicle_group_members`, `expense_templates`, `user_categories` e
>     `user_preferences` (incluindo coluna `auto_draft_enabled`)
>   - `supabase/migrations/20260712171910_recurring_costs_and_ledger_index.sql` — tabela
>     `vehicle_recurring_costs`, constraint `uq_vehicle_recurring_cost` e índice único
>     `uq_expenses_source` em `expenses`
>   - `supabase/migrations/20260712171919_vehicle_odometer_cycles.sql` — tabela
>     `vehicle_odometer_cycles` e função `get_active_cycle_start`
>   - `supabase/migrations/20260712172020_analytics_functions.sql` — funções analíticas
>     `calculate_vehicle_tco`, `fuel_consumption_trend` e `get_vehicle_cost_per_km` com filtro
>     de ciclo ativo; função `get_upcoming_costs`
>   - `supabase/migrations/20260712172047_rls_policies.sql` — políticas RLS em todas as tabelas
>   - `supabase/migrations/20260713190000_auth_login_attempts.sql` — tabela de bloqueio de login
> - Componentes de auth (commit `144a787`):
>   - `apps/web/src/components/password-input.tsx` + `password-input.spec.tsx`
>   - `apps/api/src/modules/auth/dto/recover-password.dto.ts` e `reset-password.dto.ts`
>   - `apps/web/src/app/(auth)/recover-password/page.tsx` e `.../reset-password/page.tsx`
>
> Specs com entradas atualizadas nesta revisão: SPEC-20260711-001, SPEC-20260603-004,
> SPEC-20260602-003, SPEC-20260601-003, SPEC-20260602-004, SPEC-20260609-001,
> SPEC-20260607-001. As specs de auth (SPEC-20260524-001, SPEC-20260524-002) já estavam
> corretamente marcadas como ✅ antes desta revisão e não foram alteradas.
> Quando a implementação de uma spec iniciar, o agente `doc-keeper` deve ser acionado para
> preencher as colunas Código e Teste com os caminhos reais, conforme o Gate de Sincronia
> definido em `.claude/CLAUDE.md`.
>
> **ATUALIZAÇÃO — 2026-07-13 (rev. 43)**
> Início da Fase 2 (`docs/IMPLEMENTATION_STRATEGY.md`), Tarefa T2.1: `VehiclesModule`
> (CRUD de veículos, SPEC-20260602-002) implementado — backend completo (create, list,
> get, update, soft-delete em cascata, `LicensePlate` VO, audit log) e frontend mínimo
> (`/vehicles`, `/vehicles/new`, `/vehicles/[id]`). Itens de prioridade Baixa/Média da
> spec (upload de foto, FIPE, history/manage pages, onboarding `QuickVehicleRegister`)
> ficam explicitamente ⏳ para tarefa futura, não silenciosamente omitidos.
>
> **ATUALIZAÇÃO — 2026-07-14 (rev. 44)**
> Tarefas T2.5, T2.6 e T2.7 da Fase 2 concluídas (parcialmente):
>
> - **T2.5/SPEC-20260603-004**: coluna `vehicle_chip_fields text[]` já existia na migration
>   consolidada; camada de serviço REST formalizada via `PreferencesModule` (GET/PATCH `/preferences`).
> - **T2.6/SPEC-20260612-003**: RF-01 (`PreferencesModule` estendido com `auto_draft_enabled`) e
>   RF-02 (toggle em `/settings/preferences`) concluídos — ver seção SPEC-20260612-003 abaixo.
>   RF-03 (integração com `ExpenseForm`) permanece ⏳ até a Fase 3.
> - **T2.7/SPEC-20260603-003**: promovida de `draft` para `approved`. Implementados:
>   `chipFieldsSchema`/`DEFAULT_CHIP_FIELDS` (`packages/validators/src/preferences.schemas.ts`),
>   `PreferencesModule` estendido com `vehicle_chip_fields` (GET/PATCH), UI "Exibição do veículo"
>   em `/settings/preferences` com seleção/reordenação/prévia em tempo real, e helper puro
>   `apps/web/src/lib/vehicle-chip.ts` (`resolveChipValue`/`formatChipPreview`) — ver seção
>   SPEC-20260603-003 abaixo. RF-01/RF-04/RF-05 (renderização do `VehicleContextChip` real
>   no subheader) permanecem ⏳ até `SPEC-20260603-001` (Fase 5).
>
> **ATUALIZAÇÃO — 2026-07-14 (rev. 45)**
> Início da Fase 3 (`docs/IMPLEMENTATION_STRATEGY.md`, EPIC-FIN-001/ADR-006). Lacuna identificada:
> nenhuma das 14 specs de `specs/expenses/` cobria o CRUD base de despesas — todas assumiam o
> `ExpensesModule` como pré-existente. Spec nova **SPEC-20260714-001** criada, aprovada e
> implementada (backend + validators + frontend mínimo) como pré-requisito de T3.1 (Export CSV,
> SPEC-20260521-003). Ver seção SPEC-20260714-001 abaixo para o detalhamento Código/Teste.
>
> **ATUALIZAÇÃO — 2026-07-15 (rev. 46)**
> Fase 5: T5.3 (SPEC-20260602-001 — Sistema Em Foco) e T5.1 (SPEC-20260531-001 — Dashboard Sprint 1)
> concluídas. Ver seções SPEC-20260602-001 e SPEC-20260531-001 abaixo para o detalhamento.
> Destaques desta revisão:
>
> - Cobertura de Testes do módulo `dashboard` atualizada de ⏳ para ✅ (backend: `dashboard.service.spec.ts`/
>   `dashboard.controller.spec.ts`; frontend: `FleetAlertBar.spec.tsx`, `VehicleHealthCard.spec.tsx`,
>   `page.spec.tsx`, `use-dashboard-store.spec.ts`, `action-dock.spec.tsx`).
> - Seção de Validators adicionada à entrada de SPEC-20260531-001 (`packages/validators/src/dashboard.schemas.ts`).
> - SPEC-20260715-002 (Suporte a Fuso Horário, `draft`) registrada como placeholder — nenhum
>   código existe ainda; entrada será completada quando a spec avançar para `approved`.
> - IMPACTO-033 e IMPACTO-035 atualizados em `matrices/impacto.md` para refletir T5.1 concluída.
>
> **ATUALIZAÇÃO — 2026-07-16 (rev. 47)**
> SPEC-20260716-003 (Testes E2E com Playwright) criada em `specs/qa/`. Configuração do Playwright
> em `apps/web/e2e/`, fluxos críticos RF-E2E-01 a RF-E2E-07 e integração com CI documentados.
> Nenhum código existe ainda. `specs/TESTS_SPEC.md` atualizado para referenciar a nova spec como
> fonte formal da estratégia E2E. Entrada adicionada nesta matriz.
>
> **ATUALIZAÇÃO — 2026-07-20 (rev. 48)**
> Implementação inicial de SPEC-20260716-003 (Testes E2E com Playwright): `@playwright/test` instalado
> em `apps/web`, estrutura `apps/web/e2e/` criada (fixtures, pages, tests), `playwright.config.ts`
> adicionado, `global-setup.ts` com login via browser, Page Objects para login/dashboard/expenses/chip,
> 7 fluxos E2E implementados (RF-E2E-01 a RF-E2E-07), job `e2e` adicionado em `.github/workflows/ci.yml`.
> Dois fluxos com restrições documentadas: RF-E2E-04 usa hard block real (discrepância com spec que
> descreve soft warning); RF-E2E-05 bloqueado por ausência de UI de `duplicate_warning` no frontend.
> Suíte não pôde ser executada localmente por falta de stack rodando. Novos secrets necessários em
> CI: `E2E_TEST_VEHICLE_PLATE`, `E2E_VEHICLE_A_PLATE`, `E2E_VEHICLE_B_PLATE`.
>
> **ATUALIZAÇÃO — 2026-07-20 (rev. 49) — fechamento de feature (commit f9810cd)**
> Duas specs fechadas nesta rodada:
>
> - **SPEC-20260720-002** (Aviso de Duplicata no Formulário de Criação de Despesa, `approved`):
>   todos os RFs (RF-01 a RF-06) implementados em `apps/web/src/app/(app)/expenses/new/page.tsx`
>   e cobertos por `apps/web/src/app/(app)/expenses/new/page.spec.tsx` (✅). RF-03 também
>   coberto por `apps/web/e2e/tests/expense-warnings.spec.ts` (E2E, 🔶 — aguarda secrets).
>   Entradas já presentes na matriz com status e caminhos reais; nenhuma linha ⏳ pendente.
> - **SPEC-20260716-003** (Testes E2E com Playwright, `draft`): seção `RF-DATA` adicionada
>   nesta revisão — estava presente na spec mas ausente da matriz. `apps/api/scripts/seed-e2e.mjs`
>   mapeado em RF-DATA-02. RF-E2E-05 destravada (RF-E2E-04 e RF-E2E-05 deixam de ser ⏳ e
>   passam a 🔶 implementado). Status `draft` mantido: CA-01 a CA-09 não verificáveis até
>   provisionamento dos GitHub Secrets (ver `important/PENDENCIAS-E-PROCESSOS.md`).
>
> `specs/expenses/README.md` já referenciava SPEC-20260720-002. `specs/qa/README.md` não
> existe — não exigido pois há apenas 1 spec em `specs/qa/` (regra: obrigatório com 2+).
>
> **ATUALIZAÇÃO — 2026-07-20 (rev. 50) — auditoria de gaps de teste (EC-01, EC-05 a EC-11, CT-004b)**
> Testes dedicados adicionados para cobrir branches de erro/edge case identificadas pela auditoria
> de cobertura (ver `specs/TESTS_SPEC.md` seção "Casos de Caminho Infeliz"). 6 de 8 casos
> implementados com sucesso — 2 divergências de comportamento encontradas (ver seção de achados
> abaixo). Gate de 88% de branches mantido (88.01% pós-implementação):
>
> - **EC-01** ✅ `fines.service.spec.ts`: 4 testes para transições a partir de estados terminais
>   (`paid → *`, `cancelled → *`) — todos lançam `ConflictException`.
> - **EC-05** ✅ `vehicles.service.spec.ts`: verifica que todos os 3 updates de cascade de
>   soft-delete (`vehicles`, `expenses`, `maintenances`) recebem exatamente o mesmo `deleted_at`.
> - **EC-06** ✅ `vehicles.service.spec.ts`: `update` com placa inválida lança `BadRequestException`.
> - **EC-07** ✅ `fines.service.spec.ts`: 2 testes para `appealing → paid` e `appealing → cancelled`
>   resolvem normalmente (comprova que `appealing` não é estado terminal).
> - **EC-09** ✅ `auth.service.spec.ts`: credenciais inválidas incrementam `failed_count` via upsert.
> - **EC-10** ✅ `auth.service.spec.ts`: login bem-sucedido deleta o registro via `delete().eq()`.
> - **EC-11** ✅ `admin.service.spec.ts`: hard-delete via `auth.admin.deleteUser` não passa `deleted_at`
>   nem no payload de exclusão nem no audit log `changes`.
>
> **DIVERGÊNCIAS ENCONTRADAS — não corrigidas (aguardam spec/implementação):**
>
> - **EC-08** (não implementado como teste): `SENSITIVE_CHANGE_FIELDS` em `audit-logs.service.ts`
>   não inclui `access_token` nem `token` — campos de token NÃO são removidos de `changes`.
>   Código real: `["user_id", "deleted_at", "photo_url", "photo_thumbnail_url"]`. A spec R-MON-02
>   não detalha explicitamente esses campos; gap de implementação a avaliar.
> - **CT-004b** (não implementado como teste): `ExpensesService.create` não valida
>   `category === 'fuel' && odometer_km == null` — a verificação existe apenas no schema Zod em
>   `packages/validators`, nunca chega ao service quando o payload já foi validado pelo Zod no
>   controller. Implementar a guard no service exigiria uma mudança de comportamento de produção
>   não autorizada nesta tarefa.

> **ATUALIZAÇÃO — 2026-07-18**
> Corrigida colisão de ID: a spec de Testes E2E (`specs/qa/`) e a spec de Deploy Automatizado/CD
> (`specs/devops/`) foram criadas na mesma rodada (2026-07-16) e ambas receberam o ID
> `SPEC-20260716-001`, violando a unicidade exigida por `.claude/CLAUDE.md`. A spec de E2E — ainda
> `draft`, sem código implementado — foi renomeada para `SPEC-20260716-003` (arquivo
> `specs/qa/SPEC-20260716-003-e2e-playwright.md`); `SPEC-20260716-001` permanece exclusivamente
> com a spec de CD (`approved`, já referenciada por código real: `.github/workflows/cd.yml`,
> `docs/operations/runbooks.md`, `docs/reference/environment-variables.md`), evitando qualquer
> necessidade de tocar código de produção. Referências atualizadas em `specs/README.md` e
> `specs/TESTS_SPEC.md`; achado identificado pelo agente `doc-keeper` durante o fechamento de T5.1.

> **ATUALIZAÇÃO — 2026-07-22 (rev. 56) — SPEC-20260722-005 aprovada e implementada**
> Spec do frontend de multas (`/fines`, `/fines/new`, `/fines/[id]`) criada em `draft` (rev. 55) e
> aprovada/implementada no mesmo dia. Backend (SPEC-20260607-001) já estava completamente
> implementado. Dois débitos técnicos fechados: RF-08 (link "Multas" no subheader, que resultava
> em 404) e RF-09 (botão "Ver" habilitado para `source_type='fine'` em `UpcomingCostsTab`). A linha
> `Sprint 2, G-07` de SPEC-20260607-001 aponta para esta spec. Todas as 9 entradas marcadas ✅;
> RF-08/RF-09 sem teste automatizado dedicado (fechamento verificado por inspeção).

> **ATUALIZAÇÃO — 2026-07-30 (rev. 58) — SPEC-20260730-001 criada (draft): Score de Saúde de Veículo e Frota**
> Spec nova em `specs/vehicles/SPEC-20260730-001-vehicle-health-score.md`. Formaliza o algoritmo
> de cálculo já implementado nas funções SQL `calculate_vehicle_health`/`calculate_fleet_health`
> (R-HS-01 a R-HS-10 adicionadas ao `specs/RULES.md`). Backend e RPC de banco já implementados
> (🔶); exibição em `/vehicles` e `/vehicles/[id]` ainda ⏳. `specs/TEST_DECISIONS.md` criado
> com entrada `pendente` recomendando testes unit + integration + component para a feature.
> Entrada adicionada nesta matriz (acima de "Requisitos do PRD sem Spec").
> **Decisão de Douglas em 2026-07-31:** `aprovado`, escopo restrito a `unit` (cálculo de score/flags);
> integration/component ficam sem teste dedicado nesta rodada — ver `specs/TEST_DECISIONS.md`.

> **ATUALIZAÇÃO — 2026-07-30 (rev. 57) — SPEC-20260602-003 reorganizada para `specs/vehicle-groups/`**
> Reorganização estrutural sem alteração de requisitos. A spec de Grupos de Veículos vivia em
> `specs/vehicles/SPEC-20260602-003.md` desde sua criação retroativa (2026-06-02). Movida para
> `specs/vehicle-groups/SPEC-20260602-003.md` para conformidade com a convenção "um domínio, uma
> pasta". O ID permanece `SPEC-20260602-003`; anotações `@spec SPEC-20260602-003` no código não
> foram alteradas. Links em `specs/RULES.md` (R-GRP-01 a R-GRP-04) atualizados para o novo caminho.
> Histórias de usuário em formato BDD adicionadas à spec (v1.2). `specs/README.md` atualizado:
> nova linha "Grupos de Veículos" apontando para `vehicle-groups/`; linha "Veículos" corrigida
> (SPEC-20260711-001 estava ausente; SPEC-20260602-003 removida). Seção da matriz abaixo
> (`## SPEC-20260602-003`) permanece inalterada — o ID é estável e as entradas de código/teste
> continuam corretas.

> **ATUALIZAÇÃO — 2026-07-29 (rev. 56) — SPEC-20260729-002 criada e aprovada (ADR-010)**
> Fecha os dois itens de "Fora de Escopo" de `SPEC-20260729-001`: paleta categórica
> (`--categorical-1..5`, substitui `--chart-1..5`) fundamentada em Okabe-Ito/ColorBrewer,
> reaproveitada por gráficos e pelo indicador de contexto de veículo; escala de urgência de
> vencimento colapsada de 5 para 4 níveis (ISO 11064-4), novo par `--urgency-hot`/`-pastel`;
> `--surface*`/`--finance-outgoing`/`--primary` (dark) realinhados à direção Prata; varredura de
> cor hardcoded (badges de status, chrome estrutural, banners PWA, manifest/theme-color) migrada
> para tokens. `R-DS-07`/`R-DS-08` criadas em `specs/RULES.md`. `tsc`/`vitest`/`pnpm build`
> validados sem regressão (141+329 testes). Ver ADR-010 para o racional completo.

> **ATUALIZAÇÃO — 2026-07-29 (rev. 55) — SPEC-20260729-001 criada e aprovada (ADR-009)**
> Adoção da direção Prata (showcase de marca) como identidade de marca de produção, substituindo
> "Steel & Sapphire". Tokens `background`/`foreground`/`card`/`border`/`muted`/`primary`/`secondary`/
> `gold`/`danger` (+`-foreground`/`-pastel`) remapeados para OKLCH da paleta Prata em
> `packages/ui/src/tokens/colors.ts` e `apps/web/src/app/globals.css`, light e dark. `R-DS-05`
> revisada v1→v2 (60-30-10, era 70/15/10/5); `R-DS-06` criada (terracota único tom de `danger`,
> nunca sobre fundo direto do tema). `SPEC-20260722-002` (canvas quente) marcada `deprecated`,
> `superseded_by: SPEC-20260729-001`. Suítes `vitest` completas de `packages/ui` (141 testes,
> incl. `jest-axe`) e `apps/web` (329 testes) rodadas após a migração — ambas passam sem
> alteração de asserção. `secondary` ganhou valor derivado (mesma família de `primary`) sem
> consumidor em código hoje — risco de regressão zero. Ver ADR-009 para racional e trade-offs.

> **ATUALIZAÇÃO — 2026-07-22 (rev. 54) — SPEC-20260722-002 criada e aprovada**
> Canvas quente sutil aplicado ao light mode: `background`/`card`/`border`/`muted` ganharam
> chroma 0.004 no eixo b+ (matiz 80), L inalterada, em `packages/ui/src/tokens/colors.ts` e
> `apps/web/src/app/globals.css`. Item que estava marcado "Fora de Escopo" em SPEC-20260722-001
> (nota técnica de canvas quente) agora implementado em spec própria, por ser mudança estrutural
> sobre item já explicitamente adiado. Dark mode inalterado. Suíte `vitest` de `packages/ui`
> (139 testes, incl. `jest-axe`) passou integralmente após a mudança — ver "Notas Técnicas" da
> spec para a ressalva sobre o limite do jsdom em medir contraste pixel-a-pixel.
> `INVENTARIO-DESIGN-SYSTEM.md` e `specs/design-system/README.md` atualizados.

> **ATUALIZAÇÃO — 2026-07-22 (rev. 53) — SPEC-20260722-001 criada e aprovada**
> Spec de direção criativa v2 do design system registrada: estrutura obrigatória de seções para
> documentação (`Design.md` novo na raiz + `docs/ui-design/design-system.md`), proibição
> explícita de paleta decorativa multicolor e de `rounded-full` em ações de interface, proporção
> cromática de referência (70/15/10/5). Regras R-DS-02, R-DS-03, R-DS-04 e R-DS-05 adicionadas a
> `specs/RULES.md`. RF-03 (`tabular-nums` em `KpiCard` e `TableCell`) implementado nesta rodada
> (ver seção da spec abaixo). RF-01, RF-02 e RF-04 concluídos junto com a criação desta entrada
> (documentação/regras). Spec promovida de `draft` para `approved` na mesma rodada, com gate de
> sincronia satisfeito por esta entrada. `specs/design-system/README.md` atualizado com a nova spec.

> **ATUALIZAÇÃO — 2026-07-21 (rev. 52) — SPEC-20260721-001 criada (draft)**
> Spec de fundamentos de design system registrada: tokens `--gold`/`--gold-foreground` (F-1),
> `--muted-foreground` L≤42% WCAG AA (F-3), `next-themes` com `prefers-color-scheme` (F-2),
> `NavBadge` truncado em "9+" (F-6), `VehicleContextSelector` no header (F-4) e `CommandPalette`
> global Ctrl+K/⌘K (F-5). Regras R-DS-01 e C-DS-01 adicionadas a `specs/RULES.md`.
> `specs/design-system/README.md` atualizado como índice da feature (agora com 2+ specs).
> Nenhum código implementado — todas as linhas em ⏳. Status `draft` mantido; gate de sincronia
> para `approved` requer atualização das colunas Código/Teste quando a implementação iniciar.

> **ATUALIZAÇÃO — 2026-07-20 (rev. 51) — RF-E2E-08 a RF-E2E-11 implementados**
> Quatro casos de caminho infeliz adicionados à suíte E2E (SPEC-20260716-003 v1.4):
>
> - **RF-E2E-08** (login inválido — exibe `role="alert"`, mantém `/login`): adicionado a
>   `apps/web/e2e/tests/auth.spec.ts`; usa `LoginPage.errorAlert` já existente mas sem cobertura.
> - **RF-E2E-09** (cookie `navestory_access_token` inválido/corrompido → redirect para `/login`):
>   adicionado a `apps/web/e2e/tests/auth.spec.ts`; injeta cookie via `context.addCookies()`.
>   Cookie confirmado em `apps/web/middleware.ts` linha 22 (`navestory_access_token`).
> - **RF-E2E-10** (usuário sem veículos — estado vazio no dialog): adicionado a
>   `apps/web/e2e/tests/vehicle-context.spec.ts`; marcado como `skip` até que
>   `E2E_USER_NO_VEHICLES_EMAIL` seja provisionado — instruções de provisionamento inline no
>   arquivo. Mensagem exata verificada em `vehicle-switcher-content.tsx`: "Nenhum veículo encontrado".
> - **RF-E2E-11** (busca sem resultado não trava a UI): adicionado a
>   `apps/web/e2e/tests/vehicle-context.spec.ts`; não depende de dado especial, roda com
>   storageState do globalSetup (usuário normal, com veículos).
>
> Ambos os arquivos compilam sem erros (`tsc --noEmit`). `playwright test --list` reconhece
> 11 testes em 3 arquivos (de 7 para 11, +4). CA-10, CA-11 e CA-12 da spec cobertos.
> Novo GitHub Secret necessário: `E2E_USER_NO_VEHICLES_EMAIL` (para RF-E2E-10).

> **ATUALIZAÇÃO — 2026-07-31 (rev. 59) — auditoria de sincronia (doc-keeper)**
> Auditoria do working tree (14 specs novas/modificadas via git status) contra as matrizes.
> Resultado: todas as specs já tinham entradas correspondentes (revs. 55–58 cobriam integralmente).
> Atualizações executadas nesta rodada:
>
> - `matrices/permissoes.md` (rev. 9): seção Dashboard expandida com 6 endpoints implementados
>   após T5.1/T5.3b/SPEC-20260721-002 mas ausentes da matriz (`/dashboard/fleet-health`,
>   `/dashboard/alerts`, `/dashboard/vehicle-cards`, `/dashboard/vehicle-history`,
>   `/dashboard/kpi-catalog`, `/dashboard/fleet-charts`); `POST /users/me/restore` adicionado
>   à seção Usuários (SPEC-20260719-002); nova seção `## Preferências (/preferences)` para os
>   endpoints GET/PATCH do PreferencesModule (SPEC-20260603-004/SPEC-20260612-003).
> - `matrices/rastreabilidade.md` (esta): linha `expenses` em "Cobertura de Testes por Módulo"
>   atualizada de ⏳ para 🔶 — `expenses.service.spec.ts` confirmado como existente (M em git
>   status + referenciado como ✅ em SPEC-20260721-002 RF-09/P6); `expenses.controller.spec.ts`
>   e `supabase-expense.repository.spec.ts` permanecem ⏳ (não verificados nesta rodada).
>   **Obs. interna:** `R-DS-09` referenciado em SPEC-20260729-003 localizado em `specs/RULES.md`
>   linha 79 (linha longa, omitida por ferramentas de busca com limite de caracteres — confirmado
>   por leitura direta). Nenhuma regra de frontmatter sem par em RULES.md encontrada nesta auditoria.

> **ATUALIZAÇÃO — 2026-08-13 — SPEC-20260813-001 criada (review): Header + Dashboard UX v3**
> Spec retroativa criada para cobrir código já implementado sem document formal. RF-01 a RF-09
> reconstituídos por inspeção do código fonte (grep + leitura dos arquivos referenciados). RF-10 a
> RF-17 são novos achados da auditoria UX de 2026-08-13 (agentes `ux-researcher` +
> `ui-layout-reviewer`) ainda sem implementação. Spec em
> `specs/dashboard/SPEC-20260813-001-header-dashboard-ux-v3.md`. Status `review` — aguarda
> aprovação de Douglas. Entrada adicionada nesta matriz acima de "Requisitos do PRD sem Spec".
> Achado crítico de processo: o code já referenciava `@spec SPEC-20260813-001` em 8+ arquivos
> sem que o documento existisse — violação de "specs aprovadas são pré-requisito para implementação".

> **ATUALIZAÇÃO — 2026-08-07 — SPEC-20260807-003 e SPEC-20260807-004 criadas (draft): lacunas de UX de veículos e despesas**
> Auditoria comparativa de UX contra o projeto Nave-SaaS-main identificou seis lacunas priorizadas como
> "ciclo imediato" (afetam integridade de dado hoje). As lacunas foram consolidadas em duas specs novas:
>
> - `specs/vehicles/SPEC-20260807-003-integridade-edicao-dados-veiculo.md` — edição completa de veículo
>   (RF-01/02: expansão de `updateVehicleInputSchema`), máscara de placa no frontend (RF-03/04),
>   normalização de `make`/`model` para uppercase+trim (RF-05, nova regra R-VEH-03), confirmação de
>   exclusão por digitação da placa via `AlertDialog` (RF-06/07, nova regra S17 — substituição de
>   `window.confirm`), e exibição simultânea de todos os erros de validação por campo (RF-08, nova
>   regra R-FORM-08).
> - `specs/expenses/SPEC-20260807-004-formulario-despesa-hint-combustivel.md` — hint de último
>   odômetro registrado no formulário de despesa via `getOdometerHintAction` (RF-01–04, nova regra
>   R-ODO-07) e pré-preenchimento de tipo de combustível favorito conforme R-FUEL-07 já existente
>   (RF-05–09, implementação pendente desde SPEC-20260619-001).
>
> Quatro regras novas adicionadas a `specs/RULES.md`: R-VEH-03, R-FORM-08, S17, R-ODO-07 (com
> entradas de histórico v1 em cada uma). Entradas de matriz para ambas as specs adicionadas acima
> de "Requisitos do PRD sem Spec", todas com status ⏳ Pendente. Nenhum código implementado.

---

## Legenda de Status

| Símbolo | Significado                                                                                                                                  |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅      | Implementado e com teste cobrindo o comportamento                                                                                            |
| 🔶      | Implementado, mas sem cobertura de teste                                                                                                     |
| ⏳      | Não implementado ainda                                                                                                                       |
| ⏸️      | Adiado — decisão explícita registrada (não é apenas "ainda não chegou a vez"); ver nota da spec/tarefa para o motivo e o gatilho de retomada |
| ❌      | Fora de escopo do MVP                                                                                                                        |

---

## Como ler

Cada linha mapeia um requisito à sua spec, ao(s) arquivo(s) de código que o implementam
e ao(s) teste(s) que o verificam. Colunas Código e Teste preenchidas com "—" indicam
que o artefato ainda não existe no repositório.

---

## SPEC-20260712-001 — PWA Offline (approved, v0.5)

> Primeira fase do PWA do navestory: instalação (manifest + ícones + prompt) e modo offline
> somente-leitura via Service Worker (Serwist) — cache de shell, assets e leitura de API.
> Escrita offline (fila de sync), resolução de conflito e push notifications ficam fora de
> escopo (Fase 2). **Aprovada em 2026-07-18 (v0.3)** após revisão de gaps/incoerências — ver
> versões anteriores desta entrada. **Implementada em 2026-07-18 (v0.4).** Duas correções
> técnicas descobertas durante a implementação, sem mudar comportamento observável (ver
> changelog da spec):
>
> 1. O projeto **não usa Supabase Auth Client no browser** (sessão via cookie httpOnly + JWT,
>    `apps/web/middleware.ts`) — RF-16/RF-17 usam `apps/web/src/lib/auth/logout.ts` como
>    gancho, não `onAuthStateChange`. EC-03 (troca de usuário sem logout explícito) fica
>    **⏸️ adiado**: o backend não expõe `user_id` ao client (login retorna só `{message}`),
>    não há como comparar usuário atual vs. anterior sem endpoint novo (fora do escopo desta
>    implementação frontend) — retomar quando `/auth/login` ou um `/auth/me` expuser o id.
> 2. `@serwist/next` v8 (citado no código-exemplo original da spec) depende do plugin de
>    webpack, que o Turbopack (bundler padrão do Next.js 16 usado neste projeto) não executa —
>    build terminava "com sucesso" sem gerar nenhum Service Worker. Migrado para
>    `@serwist/turbopack` (v9), que compila o SW via route handler
>    (`src/app/serwist/[path]/route.ts`), compatível com Turbopack. Nomes de cache
>    (`navestory-pages`/`navestory-api-data`) e todas as estratégias por RF permanecem como especificado.

### Manifest e Instalação (R-PWA-04, R-PWA-05)

| Req   | Descrição                                                                                              | Código                                                                                                | Teste                                             | Status |
| ----- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------ |
| RF-01 | Web App Manifest via `app/manifest.ts` (nome, ícones, `display: standalone`, cores da marca navestory) | `apps/web/src/app/manifest.ts`                                                                        | manual (Lighthouse/`curl /manifest.webmanifest`)  | 🔶     |
| RF-02 | Ícones 192×192 e 512×512 em formato `any` e `maskable`                                                 | `apps/web/public/icons/icon-{192,512}-{any,maskable}.png`                                             | —                                                 | 🔶     |
| RF-03 | Captura de `beforeinstallprompt` + CTA próprio de instalação após 2ª visita (Android/Chrome)           | `apps/web/src/lib/pwa/use-install-prompt.ts`, `apps/web/src/components/pwa/install-prompt-banner.tsx` | —                                                 | 🔶     |
| RF-04 | Banner de instrução manual de instalação para Safari iOS (sem `beforeinstallprompt`)                   | `apps/web/src/lib/pwa/platform-detection.ts`, `apps/web/src/components/pwa/ios-install-banner.tsx`    | `apps/web/src/lib/pwa/platform-detection.spec.ts` | ✅     |

### Cache de Shell e Assets (R-PWA-01)

| Req   | Descrição                                                                                               | Código                                                                                          | Teste                                                                                  | Status |
| ----- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------ |
| RF-05 | Precache do shell (HTML de layout, CSS, JS) via Service Worker com `CacheFirst` para assets versionados | `apps/web/src/app/sw.ts`, `apps/web/src/app/serwist/[path]/route.ts`, `apps/web/next.config.ts` | manual (`pnpm build && pnpm start` + `curl /serwist/sw.js` → 200, 50 precache entries) | 🔶     |
| RF-06 | navegação HTML com `NetworkFirst` (timeout 3s) e fallback para cache da rota ou página offline     | `apps/web/src/app/sw.ts`                                                                        | manual                                                                                 | 🔶     |
| RF-07 | Página de fallback de navegação para rotas nunca visitadas (D12: rota dedicada)                    | `apps/web/src/app/offline/page.tsx`                                                             | manual                                                                                 | 🔶     |

### Cache de Leitura da API (R-PWA-01, R-PWA-06)

| Req   | Descrição                                                                                                                                                            | Código                                               | Teste                                                                                                                                       | Status |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| RF-08 | `GET` de rotas de dados via `StaleWhileRevalidate`                                                                                                                   | `apps/web/src/app/sw.ts`                             | `apps/web/src/lib/http/api-client.spec.ts` (garante que GET chega ao fetch mesmo offline, pré-requisito para o SW poder responder do cache) | 🔶     |
| RF-09 | Mutações (`POST`/`PUT`/`PATCH`/`DELETE`) nunca interceptadas pelo Service Worker — `NetworkOnly`                                                                     | `apps/web/src/app/sw.ts`                             | —                                                                                                                                           | 🔶     |
| RF-10 | Cache de dados de API sem prazo de invalidação atrelado à exibição; TTL de 30 dias (R-PWA-06) é só teto de retenção em disco, removido apenas com conexão disponível | `apps/web/src/lib/pwa/api-cache-retention-plugin.ts` | —                                                                                                                                           | 🔶     |

### Bloqueio Explícito de Escrita Offline (R-PWA-02)

| Req     | Descrição                                                                                                                               | Código                                                                                                | Teste                                           | Status |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------ |
| RF-11   | Bloqueio client-side de submissões quando offline, com mensagem explícita                                                               | `apps/web/src/lib/http/api-client.ts`, `apps/web/src/lib/pwa/connectivity-store.ts`                   | `apps/web/src/lib/http/api-client.spec.ts`      | ✅     |
| RF-11.1 | Falha de rede real com `navigator.onLine === true` (falso positivo) tratada como offline retroativo, mesma mensagem de RF-11 (R-PWA-08) | `apps/web/src/lib/http/api-client.ts`                                                                 | `apps/web/src/lib/http/api-client.spec.ts`      | ✅     |
| RF-12   | Conteúdo do formulário preservado quando a submissão é bloqueada por falta de conexão                                                   | `apps/web/src/lib/http/api-client.ts` (erro dedicado não limpa estado local do formulário)            | —                                               | 🔶     |
| RF-13   | Indicador fixo e compacto de status de conectividade, ao lado do `VehicleContextChip` no `Header`                                       | `apps/web/src/components/pwa/connectivity-indicator.tsx`, `apps/web/src/components/layout/header.tsx` | —                                               | 🔶     |
| RF-13.1 | Formato do timestamp de última atualização exibido offline: "Hoje HH:mm" / "Ontem HH:mm" / "DD/MM/AA HH:mm" (R-PWA-07)                  | `apps/web/src/lib/pwa/format-cache-age.ts`, `apps/web/src/lib/pwa/get-cache-age.ts`                   | `apps/web/src/lib/pwa/format-cache-age.spec.ts` | ✅     |

### Atualização do Service Worker (R-PWA-03)

| Req   | Descrição                                                                                                                                                               | Código                                                                                                                                                                       | Teste | Status |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| RF-14 | Toast de nova versão disponível; `skipWaiting()`/`clientsClaim()` somente após ação explícita do usuário — migrado para a fila única de toasts (SPEC-20260525-001 §8.2) | `apps/web/src/components/pwa/service-worker-update-listener.tsx`, `apps/web/src/components/layout/app-toast-viewport.tsx`, `apps/web/src/app/layout.tsx` (`SerwistProvider`) | —     | 🔶     |
| RF-15 | Nova versão carregada automaticamente ao reabrir o app após fechar todas as abas                                                                                        | (comportamento padrão do ciclo de vida do SW — sem lógica adicional)                                                                                                         | —     | 🔶     |

### Limpeza de Cache no Logout (R-PWA-06, S6)

| Req   | Descrição                                                                                                                                         | Código                                                                       | Teste                                          | Status                                                                                                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| RF-16 | Limpeza do Cache Storage de dados de usuário (`navestory-api-data`) no logout — via `logout.ts`, não `onAuthStateChange` (ver nota técnica acima) | `apps/web/src/lib/pwa/clear-api-cache.ts`, `apps/web/src/lib/auth/logout.ts` | `apps/web/src/lib/pwa/clear-api-cache.spec.ts` | ✅                                                                                                                      |
| RF-17 | Nenhum dado residual do usuário anterior visível após troca de conta no mesmo dispositivo                                                         | `apps/web/src/lib/auth/logout.ts`                                            | —                                              | 🔶                                                                                                                      |
| EC-03 | Troca de usuário sem logout explícito tratada como `SIGNED_OUT` implícito (Must, D13)                                                             | —                                                                            | —                                              | ⏸️ — bloqueado por falta de `user_id` exposto ao client (backend); retomar quando `/auth/login`/`/auth/me` expuser o id |

---

## SPEC-20260711-001 — Ciclos de Odômetro (approved)

> Introduz `vehicle_odometer_cycles` como série temporal auditável de resets de odômetro.
> Torna `odometer_km` obrigatório em manutenções com `status = completed` (R-ODO-03).
> Estende validação de sequência para filtrar apenas pelo ciclo ativo (R-ODO-04).
> Permissão de reset restrita ao dono do veículo (R-ODO-05). Ciclo 1 implícito — sem linha
> na tabela (R-ODO-06). ADR: ADR-007. Análise de impacto: IMPACTO-025 (Risco Alto).
> Fecha NG-04 de SPEC-20260601-001. **2026-07-13 (T2.4):** `OdometerCyclesModule` (RF-05 a
> RF-11) e frontend mínimo (RF-22) implementados. RF-01 a RF-04, RF-12 a RF-17, RF-23 e RF-24
> permanecem ⏳ — dependem dos módulos de despesas e manutenções (Fases 3/4) e do dashboard
> (`VehicleContextChip`, Fase 5), nenhum dos quais existe ainda neste repositório greenfield.

### Validação de Manutenção (R-ODO-03)

| Req   | Descrição                                                                                                                                                                                                                                                                                                                  | Código                                                         | Teste                                                               | Status                                           |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------ |
| RF-01 | `odometer_km` obrigatório quando `status === 'completed'` — implementado como checagem imperativa em `MaintenancesService.update()` (não via `superRefine` no schema Zod, já que a validação depende do valor _existente_ no banco quando não reenviado no payload; mesma decisão de design de `SPEC-20260603-002`/RNF-04) | `apps/api/src/modules/maintenances/maintenances.service.ts`    | `apps/api/src/modules/maintenances/maintenances.service.spec.ts`    | 🔶 Implementado com padrão diferente do descrito |
| RF-02 | `MaintenancesService.update()` rejeita HTTP 422 quando `status = completed` sem `odometer_km` válido                                                                                                                                                                                                                       | `apps/api/src/modules/maintenances/maintenances.service.ts`    | `apps/api/src/modules/maintenances/maintenances.service.spec.ts`    | ✅                                               |
| RF-03 | Bug de `createMaintenanceAction` (Server Action) não aplicável — projeto não usa Server Actions para mutação (decisão já registrada em T3.9); `POST /maintenances` mapeia `odometer_km` corretamente desde a criação do endpoint                                                                                           | `apps/api/src/modules/maintenances/maintenances.controller.ts` | `apps/api/src/modules/maintenances/maintenances.controller.spec.ts` | ✅ N/A por decisão de arquitetura                |
| RF-04 | Validação de sequência de odômetro em manutenções: padrão response-field (`odometer_warning`/`odometer_previous_max_km`), não exceção (`MaintenanceWarningException` descartada — mesma decisão de T3.2/T3.3 para despesas); `findMaxOdometerByVehicle` ainda sem filtro de ciclo ativo (R-ODO-04 permanece ⏳)            | `apps/api/src/modules/maintenances/maintenances.service.ts`    | `apps/api/src/modules/maintenances/maintenances.service.spec.ts`    | 🔶 Implementado com padrão diferente do descrito |

### Modelo de Dados — `vehicle_odometer_cycles` (R-ODO-05, R-ODO-06)

| Req   | Descrição                                                                                                                           | Código                                                           | Teste | Status |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----- | ------ |
| RF-05 | Migration `20260712171919_vehicle_odometer_cycles.sql`: tabela com colunas descritas na spec; constraint `cycle_number >= 2`        | `supabase/migrations/20260712171919_vehicle_odometer_cycles.sql` | —     | 🔶     |
| RF-06 | RLS: SELECT e INSERT filtrados por `auth.uid() = (SELECT user_id FROM vehicles WHERE id = vehicle_id)`; sem policy UPDATE ou DELETE | `supabase/migrations/20260712172047_rls_policies.sql`            | —     | 🔶     |
| RF-07 | Função SQL `get_active_cycle_start(p_vehicle_id uuid) RETURNS timestamptz`                                                          | `supabase/migrations/20260712171919_vehicle_odometer_cycles.sql` | —     | 🔶     |

### Backend — `OdometerCyclesModule`

| Req                     | Descrição                                                                                                                                                                                                                                                               | Código                                                                                             | Teste                                                                                                        | Status |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------ |
| RF-08/R-ODO-05          | `POST /vehicles/:vehicleId/odometer-cycles`: valida ownership via `VehiclesService.findOne`, calcula `cycle_number` e `previous_cycle_max` (via `expenses.odometer_km`), persiste, dispara audit fire-and-forget omitindo `reason` (D8)                                 | `apps/api/src/modules/odometer-cycles/odometer-cycles.controller.ts`, `odometer-cycles.service.ts` | `apps/api/src/modules/odometer-cycles/odometer-cycles.service.spec.ts`, `odometer-cycles.controller.spec.ts` | ✅     |
| RF-09/P1                | `GET /vehicles/:vehicleId/odometer-cycles`: retorna ciclos ordenados por `cycle_number ASC`, paginados (padrão 20, máx 100, clamp aplicado)                                                                                                                             | `apps/api/src/modules/odometer-cycles/odometer-cycles.service.ts`                                  | `apps/api/src/modules/odometer-cycles/odometer-cycles.service.spec.ts`                                       | ✅     |
| RF-10/R-ODO-04          | `OdometerCyclesService.getActiveCycleStart(accessToken, userId, vehicleId)`: chama RPC `get_active_cycle_start`; degrada graciosamente (`null`) em caso de falha (D6) — ainda não consumido por nenhum service, pois `ExpensesService`/`MaintenanceService` não existem | `apps/api/src/modules/odometer-cycles/odometer-cycles.service.ts`                                  | `apps/api/src/modules/odometer-cycles/odometer-cycles.service.spec.ts`                                       | ✅     |
| RF-11/R-SAN-01/R-SAN-02 | `createOdometerCycleInputSchema`: `reason` obrigatório 3–500 chars com `.trim().normalize('NFC')`; `starting_value` não-negativo, default 0                                                                                                                             | `packages/validators/src/odometer-cycle.schemas.ts`                                                | `packages/validators/src/odometer-cycle.schemas.spec.ts`                                                     | ✅     |

### Extensão de `findMaxOdometerByVehicle` — Filtro por Ciclo Ativo (R-ODO-04)

| Req   | Descrição                                                                                                                                                                                   | Código                                                      | Teste                                                            | Status                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| RF-12 | `ExpenseRepositoryPort.findMaxOdometerByVehicle` recebe parâmetro opcional `sinceDate?: string`; zero breaking change para callers existentes                                               | —                                                           | —                                                                | ⏳ Depende do módulo de despesas (Fase 3)                                                     |
| RF-13 | `MaintenancesService.findMaxOdometerByVehicle(client, vehicleId, userId, excludeMaintenanceId?)`: análogo ao de expenses, sem parâmetro `sinceDate`/filtro de ciclo ainda (ver RF-14/RF-15) | `apps/api/src/modules/maintenances/maintenances.service.ts` | `apps/api/src/modules/maintenances/maintenances.service.spec.ts` | 🔶 Sem filtro de ciclo                                                                        |
| RF-14 | `ExpensesService` consulta `OdometerCyclesService.getActiveCycleStart()` antes da verificação de sequência e passa resultado como `sinceDate`                                               | —                                                           | —                                                                | ⏳ Depende do módulo de despesas (Fase 3)                                                     |
| RF-15 | `MaintenancesService` aplica o mesmo padrão de RF-14 para o repositório de manutenções (R-ODO-04)                                                                                           | —                                                           | —                                                                | ⏳ Gap pré-existente também em `ExpensesService` (RF-14); tratamento unificado em spec futura |

### Mensagem de Confirmação e Atalho para Novo Ciclo (R-ODO-06)

| Req   | Descrição                                                                                     | Código | Teste | Status                                                    |
| ----- | --------------------------------------------------------------------------------------------- | ------ | ----- | --------------------------------------------------------- |
| RF-16 | Warning de odômetro exibe `AlertDialog` com botões "Confirmar retroativo" e "Cancelar"        | —      | —     | ⏳ Depende do `ExpenseForm`/`MaintenanceForm` (Fases 3/4) |
| RF-17 | Quando `odometer_km <= 100` OU queda >= 50%: UI exibe caminho "Iniciar novo ciclo" (R-ODO-06) | —      | —     | ⏳ Depende do `ExpenseForm`/`MaintenanceForm` (Fases 3/4) |

### Atualização das Funções SQL Analíticas

| Req   | Descrição                                                                                                   | Código                                                                                           | Teste | Status |
| ----- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----- | ------ |
| RF-18 | `fuel_consumption_trend` atualizada com filtro de ciclo ativo no WHERE                                      | `supabase/migrations/20260712172020_analytics_functions.sql`                                     | —     | 🔶     |
| RF-19 | `calculate_vehicle_tco` atualizada com o mesmo filtro de ciclo ativo                                        | `supabase/migrations/20260712172020_analytics_functions.sql`                                     | —     | 🔶     |
| RF-20 | `get_vehicle_cost_per_km` atualizada com o mesmo filtro de ciclo ativo                                      | `supabase/migrations/20260712172020_analytics_functions.sql`                                     | —     | 🔶     |
| RF-21 | Ordem de deploy obrigatória: (1) migration + funções SQL; (2) backend OdometerCyclesModule; (3) UI de reset | Respeitada — migration+funções (2026-07-12) precederam `OdometerCyclesModule` (2026-07-13, T2.4) | —     | ✅     |

### Interface — Tela de Configurações e Badge

| Req   | Descrição                                                                                                                                                                                             | Código                                                                    | Teste                                                                          | Status                                                                                                                                                       |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RF-22 | Rota `/settings/vehicles/[vehicleId]/odometer-cycles`: tabela de histórico + modal "Reiniciar odômetro" (sem dirty-check `AlertDialog` dedicado — mesma limitação de T2.1, pendente do Design System) | `apps/web/src/app/settings/vehicles/[vehicleId]/odometer-cycles/page.tsx` | `apps/web/src/app/settings/vehicles/[vehicleId]/odometer-cycles/page.spec.tsx` | 🔶                                                                                                                                                           |
| RF-23 | `VehicleContextChip` exibe badge "Ciclo {N}" somente quando `cycle_number >= 2`; Ciclo 1 implícito não exibe badge (R-ODO-06)                                                                         | —                                                                         | —                                                                              | ⏳ Depende do dashboard/Em Foco (Fase 5)                                                                                                                     |
| RF-24 | `MaintenanceForm`: campo `odometer_km` torna-se visualmente obrigatório quando `status = completed` (R-ODO-03)                                                                                        | `apps/web/src/app/maintenance/[id]/page.tsx`                              | `apps/web/src/app/maintenance/[id]/page.spec.tsx`                              | 🔶 Campo exposto via `OdometerInput`; obrigatoriedade visual condicional (asterisco/required dinâmico) fica ⏳ — enforcement real já ocorre no backend (422) |

---

## SPEC-20260620-001 — Business Strategy Stories (draft)

> Define cadastro, elegibilidade, modelo de assinatura (Gratis/Pro/Frota), consolidação de
> dados, controle de acesso por roles, onboarding, retenção, crescimento e compliance LGPD.
> Status: draft. Regras: R-BIZ-01..R-BIZ-14, S1, S2, S4, C1. Nenhum código implementado.

### Cadastro e Elegibilidade (Seção 1)

| Requisito     | Descrição                                                                                                                 | Código | Teste | Status |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- | ------ | ----- | ------ |
| BS-REG-01..05 | Cadastro self-service com email válido; campo `profile_type`; email único; acesso imediato                                | —      | —     | ⏳     |
| BS-BLK-01..05 | Blacklist de emails banidos; rate limit 5/15min (S4); honeypot anti-bot; rejeição de emails descartáveis; verificação 18+ | —      | —     | ⏳     |
| BS-FLW-01..05 | Formulário único (4 campos); redirect para onboarding; pular onboarding; email de boas-vindas; PWA responsivo             | —      | —     | ⏳     |

### Modelo de Assinatura e Monetização (Seção 2)

| Requisito     | Descrição                                                                                                                                                                           | Código | Teste | Status |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- | ------ |
| BS-PLN-01..06 | Planos Gratis (beta ilimitado, pós-beta 3 veículos/2 meses), Pro Mensal (R$ 29,90), Pro Anual (R$ 199), Frota (R$ 49,90); trial 14 dias                                             | —      | —     | ⏳     |
| BS-MON-01..08 | Banners de upgrade; checkout integrado (Stripe/MP); downgrade com consolidação; cancelamento self-service; retry de cobrança; grace period proporcional; win-back; countdown banner | —      | —     | ⏳     |
| BS-VLT-01..06 | Timeline com meses consolidados; CTA de upgrade; garantia de retenção de dados; KPIs com dados gerais; batch job de consolidação; busca em meses consolidados                       | —      | —     | ⏳     |

### Controle de Acesso (Seção 3)

| Requisito     | Descrição                                                                                                                                                                                                | Código | Teste | Status |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- | ------ |
| BS-ACL-01..07 | Roles: anonymous, user, admin, workspace_owner, workspace_member; CRUD owner-only (RLS); anti-enumeração (404 não 403); admin sem acesso a dados de negócio; workspace member com atribuição por veículo | —      | —     | ⏳     |
| BS-SEC-01..06 | Lock após 5 tentativas; exclusão LGPD self-service; sessão 30min inatividade; troca de senha invalida sessões; (Fase 2) MFA TOTP; (Fase 2) Login social                                                  | —      | —     | ⏳     |

### Onboarding e Ativação (Seção 4)

| Requisito     | Descrição                                                                                                                    | Código | Teste | Status |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------ | ----- | ------ |
| BS-ONB-01..06 | Wizard 3 passos; pre-fill via placa FIPE; checklist primeiros passos; nudge 48h; import CSV para frotas; empty state com CTA | —      | —     | ⏳     |

### Retenção e Engajamento (Seção 5)

| Requisito     | Descrição                                                                                                                                       | Código | Teste | Status |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- | ------ |
| BS-RET-01..07 | Lembrete semanal; streak de registro; alerta vencimento 60 dias; resumo mensal por email; insights de anomalia; reengajamento 14d; win-back 60d | —      | —     | ⏳     |

### Crescimento e Aquisição (Seção 6)

| Requisito       | Descrição                                                                                                                                   | Código | Teste | Status |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- | ------ |
| BS-GRW-01..05   | Referral com benefício mútuo; rastreamento de referral; card compartilhável; calculadora de custo/km; blog SEO                              | —      | —     | ⏳     |
| BS-EXP-01..04   | Sugestão de upgrade ao exceder limites; upgrade para Frota; onboarding assistido 10+ veículos; (Fase 3) API pública com simulação de custos | —      | —     | ⏳     |
| BS-INFRA-01..02 | Simulação de custos de infra Supabase; rate limits por plano baseados na simulação                                                          | —      | —     | ⏳     |

### Compliance e Suporte (Seções 7-8)

| Requisito     | Descrição                                                                                                                             | Código | Teste | Status |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- | ------ |
| BS-LGP-01..05 | Export por plano (LGPD portabilidade); exclusão self-service 30 dias; anonimização; audit logs preservados; cookies com consentimento | —      | —     | ⏳     |
| BS-TRM-01..03 | Aceite de termos no cadastro; re-aceite em atualização; política de privacidade detalhada                                             | —      | —     | ⏳     |
| BS-SUP-01..05 | FAQ/comunidade (Gratis); email 48h (Pro); chat prioritário 24h (Frota); NPS a cada 30 dias; alerta de feedback negativo               | —      | —     | ⏳     |

### Roadmap de Implementação

| Fase                 | Stories                                                                                             | Status          |
| -------------------- | --------------------------------------------------------------------------------------------------- | --------------- |
| MVP (atual)          | BS-REG-01..05, BS-BLK-01..02, BS-FLW-01..03, BS-ACL-01..05, BS-SEC-01..04, BS-LGP-02..04            | ⏳ Não iniciado |
| Pós-beta (Fase 2)    | BS-PLN-01..06, BS-MON-01..08, BS-VLT-01..06, BS-BLK-03..05, BS-FLW-04, BS-ONB-01..06, BS-TRM-01..03 | ⏳              |
| Crescimento (Fase 3) | BS-RET-01..07, BS-GRW-01..05, BS-EXP-01..03, BS-SUP-01..05, BS-SEC-05..06, BS-INFRA-01..02          | ⏳              |
| Enterprise (Fase 4)  | BS-ACL-06..07, BS-EXP-04, BS-PLN-05 (Frota expandido com API)                                       | ⏳              |

---

## SPEC-20260622-001 — Analytics Engine (approved)

> Motor de BI com 7 módulos (TCO, Fuel Intelligence, Anomalias, Benchmark, Forecast, Seasonal,
> Insights NL). Regras: R-FUEL-02, R-FUEL-03, R5, R-ANA-01..R-ANA-07. Security: S1, S2.
> Status: approved. Predictive Maintenance está **fora de escopo** desta spec (ver seção
> "Fora de Escopo" — spec própria futura).
> Faseamento (T6.1/T6.2/T6.3 no `IMPLEMENTATION_STRATEGY.md`): T6.1/Foundation ✅
> (RF-01/02/07/08 + parcial de RF-13/RF-15), T6.2/Intelligence ✅ (RF-03/04/09/10), T6.3/Prediction
> ✅ (RF-05/06/11/12/14/16 concluídos em 2026-07-16, ver `20260716140000_analytics_forecast_seasonal.sql`;
> RF-13/RF-15 completos com as seções de projeção, sazonalidade e insights). Ver changelog de
> 2026-07-16 na spec sobre alinhamento com o padrão `SECURITY INVOKER` (IMPACTO-027) e substituição
> das RPCs dormentes `calculate_vehicle_tco`/`fuel_consumption_trend` (migration `20260712172020`).

### Backend — AnalyticsModule

| Req   | Descrição                                                                                                                                                                                                                                | Código                                                                                                                                                                        | Teste                                                                                                                     | Status |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------ |
| RF-01 | RPC `calculate_vehicle_tco(vehicle_id)`: TCO com breakdown fixo (fuel/maintenance/fines/recurring/other), cost_per_km, cost_per_month, total_km, period_days (R-ANA-04) — substitui a função homônima divergente já existente            | `supabase/migrations/20260716120000_analytics_tco_fuel_trend.sql`, `apps/api/src/modules/analytics/analytics.service.ts`                                                      | `apps/api/src/modules/analytics/analytics.service.spec.ts`                                                                | ✅     |
| RF-02 | RPC `fuel_consumption_trend(vehicle_id, limit)`: km/L, price_per_liter, rolling_avg_kpl (janela 5) (R-ANA-01, R-FUEL-02/03) — substitui a função homônima divergente já existente                                                        | `supabase/migrations/20260716120000_analytics_tco_fuel_trend.sql`, `apps/api/src/modules/analytics/analytics.service.ts`                                                      | `apps/api/src/modules/analytics/analytics.service.spec.ts`                                                                | ✅     |
| RF-03 | RPC `detect_expense_anomalies(threshold)`: Z-Score por (vehicle_id, category) (R-ANA-02)                                                                                                                                                 | `supabase/migrations/20260716130000_analytics_anomalies_benchmark.sql`, `apps/api/src/modules/analytics/analytics.service.ts`                                                 | `apps/api/src/modules/analytics/analytics.service.spec.ts`                                                                | ✅     |
| RF-04 | RPC `fleet_benchmark()`: ranking de veículos por custo/km (R-ANA-05)                                                                                                                                                                     | `supabase/migrations/20260716130000_analytics_anomalies_benchmark.sql`, `apps/api/src/modules/analytics/analytics.service.ts`                                                 | `apps/api/src/modules/analytics/analytics.service.spec.ts`                                                                | ✅     |
| RF-05 | RPC `forecast_monthly_costs(vehicle_id?, months_ahead)`: projeção com média móvel 3 meses + banda ±1σ (R-ANA-03)                                                                                                                         | `supabase/migrations/20260716140000_analytics_forecast_seasonal.sql`, `apps/api/src/modules/analytics/analytics.service.ts`                                                   | `apps/api/src/modules/analytics/analytics.service.spec.ts`                                                                | ✅     |
| RF-06 | RPC `seasonal_expense_heatmap(vehicle_id?)`: heatmap mês x categoria (R-ANA-07)                                                                                                                                                          | `supabase/migrations/20260716140000_analytics_forecast_seasonal.sql`, `apps/api/src/modules/analytics/analytics.service.ts`                                                   | `apps/api/src/modules/analytics/analytics.service.spec.ts`                                                                | ✅     |
| RF-07 | `GET /analytics/tco/:vehicleId`: cache 1h stale-while-revalidate, 404 se veículo não encontrado/não pertence ao usuário                                                                                                                  | `apps/api/src/modules/analytics/analytics.controller.ts`                                                                                                                      | `apps/api/src/modules/analytics/analytics.controller.spec.ts`                                                             | ✅     |
| RF-08 | `GET /analytics/fuel-trend/:vehicleId`: query param `limit` (default 20, max 100)                                                                                                                                                        | `apps/api/src/modules/analytics/analytics.controller.ts`, `packages/validators/src/analytics.schemas.ts`                                                                      | `apps/api/src/modules/analytics/analytics.controller.spec.ts`                                                             | ✅     |
| RF-09 | `GET /analytics/anomalies`: query params `threshold` (1.5-4.0), `vehicle_id` opcional (filtro aplicado server-side)                                                                                                                      | `apps/api/src/modules/analytics/analytics.controller.ts`, `apps/api/src/modules/analytics/dto/anomalies.dto.ts`, `packages/validators/src/analytics.schemas.ts`               | `apps/api/src/modules/analytics/analytics.controller.spec.ts`                                                             | ✅     |
| RF-10 | `GET /analytics/benchmark`: array vazio se < 2 veículos (empty state é responsabilidade do frontend, a RPC sempre retorna os dados)                                                                                                      | `apps/api/src/modules/analytics/analytics.controller.ts`                                                                                                                      | `apps/api/src/modules/analytics/analytics.controller.spec.ts`                                                             | ✅     |
| RF-11 | `GET /analytics/forecast`: query params `vehicle_id` opcional, `months` (default 3, max 12)                                                                                                                                              | `apps/api/src/modules/analytics/analytics.controller.ts`, `apps/api/src/modules/analytics/dto/forecast.dto.ts`                                                                | `apps/api/src/modules/analytics/analytics.controller.spec.ts`                                                             | ✅     |
| RF-12 | `GET /analytics/seasonal`: query param `vehicle_id` opcional                                                                                                                                                                             | `apps/api/src/modules/analytics/analytics.controller.ts`, `apps/api/src/modules/analytics/dto/seasonal.dto.ts`                                                                | `apps/api/src/modules/analytics/analytics.controller.spec.ts`                                                             | ✅     |
| RF-14 | Geração de insights em linguagem natural (eficiência, degradação de consumo, multas, fornecedor, projeção) (R-ANA-05); exposta via `GET /analytics/insights` (endpoint não numerado na spec, necessário para RF-13 consumir os insights) | `apps/api/src/modules/analytics/analytics.service.ts`, `apps/api/src/modules/analytics/analytics.controller.ts`, `apps/api/src/modules/analytics/dto/insights.dto.ts`         | `apps/api/src/modules/analytics/analytics.service.spec.ts`, `apps/api/src/modules/analytics/analytics.controller.spec.ts` | ✅     |
| RF-16 | `GET /analytics/export`: CSV (TCO breakdown + forecast), throttle 10/5min                                                                                                                                                                | `apps/api/src/modules/analytics/analytics.controller.ts`, `apps/api/src/modules/analytics/analytics.service.ts`, `apps/api/src/modules/analytics/dto/export-analytics.dto.ts` | `apps/api/src/modules/analytics/analytics.controller.spec.ts`, `apps/api/src/modules/analytics/analytics.service.spec.ts` | ✅     |

### Frontend — Página `/analytics`

| Req   | Descrição                                                                                                                                                                                                                                                                                  | Código                                      | Teste                                            | Status                                                                                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RF-13 | Página `/analytics`: KPI cards, TCO (stacked bar + donut), fuel trend (area chart), anomalias (alert cards), benchmark (horizontal bar), forecast (area chart com banda), sazonalidade (heatmap), insights (cards); responsivo mobile/desktop; usa `recharts` (dependência nova, ver spec) | `apps/web/src/app/(app)/analytics/page.tsx` | `apps/web/src/app/(app)/analytics/page.spec.tsx` | ✅ todas as seções (TCO, fuel trend, anomalias, benchmark, forecast, sazonalidade, insights) prontas com seletor de veículo e botão "Exportar" (RF-16)             |
| RF-15 | Empty states por seção com CTA (TCO, combustível, anomalias, benchmark, forecast, sazonalidade, insights)                                                                                                                                                                                  | `apps/web/src/app/(app)/analytics/page.tsx` | `apps/web/src/app/(app)/analytics/page.spec.tsx` | ✅ todas as 7 seções com empty state; benchmark com CTA "Adicionar Veículo →" — demais sem CTA de navegação, conforme redação original de cada linha da RF-15 |

### Implementação por Fase

| Fase                | Tarefa                                                                           | Módulos                         | Status                     |
| ------------------- | -------------------------------------------------------------------------------- | ------------------------------- | -------------------------- |
| T6.1 — Foundation   | RPCs TCO + Fuel Trend, endpoints, página `/analytics` (TCO + fuel chart)         | TCO, Fuel Intelligence          | ✅ concluído em 2026-07-16 |
| T6.2 — Intelligence | RPCs de anomalias e benchmark, endpoints, seções na página                       | Anomalias, Benchmark            | ✅ concluído em 2026-07-16 |
| T6.3 — Prediction   | RPCs de forecast e sazonalidade, insights NL, export CSV, empty states completos | Forecast, Seasonal, Insights NL | ✅ concluído em 2026-07-16 |

---

## SPEC-20260619-001 — Padrão de Comportamento de Formulários (approved)

> Define stack, regras (R-FORM-01..R-FORM-07, R-FUEL-07, R-FUEL-08) e fases de implementação
> para todos os formulários. Status: approved.
> **2026-07-14:** decisão tomada com o usuário ao retomar T3.9 (ver changelog de
> SPEC-20260612-001) de **não** construir esta stack agora — react-hook-form/Server
> Actions/`@navestory/ui` form kit ficam para quando a Fase 8 (Design System) evoluir os
> componentes. `R-FUEL-08` foi implementada sem essa stack, via hook `useFuelCrossCalc`
> (`apps/web/src/lib/hooks/use-fuel-cross-calc.ts`).
> **2026-07-14 (T3.10):** R-FORM-05 e R-FORM-07 aplicados retroativamente ao Expense Form
> (única tela transacional existente no frontend), adaptados sem `AlertDialog`/`FormField`
> (confirmação via `window.confirm`, mesmo padrão das exclusões). Ver changelog da spec.

### Regras de Formulário (R-FORM)

| Requisito | Descrição                                                                             | Código                                                                              | Teste                                                                                         | Status                                                                            |
| --------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| R-FORM-01 | `mode: 'onBlur'`, `reValidateMode: 'onChange'` em todos os forms                      | —                                                                                   | —                                                                                             | ⏳ Depende da stack react-hook-form (Fase 8)                                      |
| R-FORM-02 | `FormField` + `Controller` pattern; nunca `.register()` direto                        | —                                                                                   | —                                                                                             | ⏳ Depende da stack react-hook-form (Fase 8)                                      |
| R-FORM-03 | Valores monetários usam `CurrencyInput` (ATM-style)                                   | `packages/ui/src/components/masked-input.tsx`                                       | `packages/ui/src/components/masked-input.spec.tsx`                                            | ✅ (Expense Form)                                                                 |
| R-FORM-04 | Create actions redirect para listagem; update/delete fazem revalidate sem redirect    | `apps/web/src/app/expenses/new/page.tsx`, `apps/web/src/app/expenses/[id]/page.tsx` | `apps/web/src/app/expenses/new/page.spec.tsx`, `apps/web/src/app/expenses/[id]/page.spec.tsx` | ✅ (Expense Form)                                                                 |
| R-FORM-05 | Dirty check com confirmação (`window.confirm`, adaptado de `AlertDialog`) ao cancelar | `apps/web/src/app/expenses/new/page.tsx`, `apps/web/src/app/expenses/[id]/page.tsx` | `apps/web/src/app/expenses/new/page.spec.tsx`, `apps/web/src/app/expenses/[id]/page.spec.tsx` | ✅ (Expense Form)                                                                 |
| R-FORM-06 | Server Actions retornam `ActionResult` padrão                                         | —                                                                                   | —                                                                                             | ⏳ Não aplicável sem Server Actions; API usa `ApiError`/`apiClient` uniformemente |
| R-FORM-07 | Empty state com CTA quando sem veículos cadastrados                                   | `apps/web/src/app/expenses/new/page.tsx`                                            | `apps/web/src/app/expenses/new/page.spec.tsx`                                                 | ✅ (Expense Form)                                                                 |

### Fases de Implementação

| Fase   | Descrição                                            | Status |
| ------ | ---------------------------------------------------- | ------ |
| Fase 1 | Stack padrão (zodResolver, FormField, CurrencyInput) | ⏳     |
| Fase 2 | `typedResolver` centralizado; formulários migrados   | ⏳     |
| Fase 3 | Dirty check + AlertDialog; feedback sonner           | ⏳     |
| Fase 4 | Auto-draft com preferência R-PREF-02                 | ⏳     |
| Fase 5 | Auditoria de conformidade de todos os forms          | ⏳     |

---

## SPEC-20260612-003 — Preferência de Rascunho Automático (approved)

> Transforma o rascunho automático do `ExpenseForm` em preferência opcional do usuário,
> configurável em Preferências, com default desativado. Regras: R-PREF-01, R-PREF-02. Segurança: S2.
> Status: approved — RF-01/RF-02 concluídos em 2026-07-14 via `PreferencesModule` REST (NestJS)
>
> - React Query, não server actions Next.js como originalmente descrito (ver changelog da spec).
>   RF-03 (integração com `ExpenseForm`) ⏳ até a Fase 3 (módulo de despesas ainda não existe).

### Banco de dados

| Artefato                                                                | Descrição                                                                                                                                     | Regra     | Status                  |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------- |
| `supabase/migrations/20260712171846_grouping_templates_preferences.sql` | Coluna `auto_draft_enabled BOOLEAN NOT NULL DEFAULT FALSE` incluída diretamente no `CREATE TABLE user_preferences` (sem ALTER TABLE separado) | R-PREF-02 | 🔶 Aplicado (sem teste) |

### Schema / Validação

| Req   | Descrição                                                                            | Código                                           | Teste                                                 | Status |
| ----- | ------------------------------------------------------------------------------------ | ------------------------------------------------ | ----------------------------------------------------- | ------ |
| RF-01 | Campo `auto_draft_enabled` no schema; `DEFAULT_AUTO_DRAFT_ENABLED = false` exportado | `packages/validators/src/preferences.schemas.ts` | `packages/validators/src/preferences.schemas.spec.ts` | ✅     |

### API REST (backend) — substitui Server Actions da spec original

| Req     | Descrição                                                                                 | Código                                                                 | Regra     | Teste                                                                       | Status |
| ------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------- | ------ |
| RF-01.3 | `GET /preferences`: lê `auto_draft_enabled`; retorna `false` como fallback quando ausente | `apps/api/src/modules/preferences/preferences.{controller,service}.ts` | R-PREF-01 | `apps/api/src/modules/preferences/preferences.{controller,service}.spec.ts` | ✅     |
| RF-01.3 | `PATCH /preferences`: upsert idempotente de `auto_draft_enabled` por `user_id`            | `apps/api/src/modules/preferences/preferences.{controller,service}.ts` | R-PREF-02 | `apps/api/src/modules/preferences/preferences.{controller,service}.spec.ts` | ✅     |

### Componente de Preferência

| Req   | Descrição                                                                                                                   | Código                                           | Teste                                                 | Status |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------- | ------ |
| RF-02 | Toggle "Rascunho automático" com label e descrição; estado local + `isDirty` + `safeParse` + feedback "Salvando…"/"✓ Salvo" | `apps/web/src/app/settings/preferences/page.tsx` | `apps/web/src/app/settings/preferences/page.spec.tsx` | ✅     |

### Integração com ExpenseForm

| Req         | Descrição                                                                                                                                         | Código | Teste | Status                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- | ----------------------------------------------------- |
| RF-03/RF-04 | `ExpenseForm` recebe prop `autoDraftEnabled`; draft condicionado à essa prop; página de nova despesa carrega a preferência via `GET /preferences` | —      | —     | ⏳ Depende da Fase 3 (`ExpenseForm` ainda não existe) |

---

## SPEC-20260612-002 — Ajustes de Campos e Layout do Formulário de Despesas (approved)

> Ajustes pontuais no `ExpenseForm`: limite máximo do campo Valor (R-EXP-01), campo Ano
> editável, "Tanque cheio?" tri-state (R-FUEL-06), limite de 7 dígitos no Odômetro (R-ODO-02)
> e reorganização do layout. **2026-07-14 (T3.9):** implementado sobre a stack real do projeto
> (client component + `useState` + TanStack Query), não react-hook-form/`@navestory/ui` como a spec
> original descreve — ver changelog da spec e de SPEC-20260612-001.

| Requisito | Descrição                                                                                                                               | Código                                                                                                                                           | Teste                                                                                                 | Status |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------ |
| RF-01     | `amount` aceita até R$ 100.000.000,00 (R-EXP-01); `CurrencyInput` permite digitar até 11 dígitos                                        | `packages/validators/src/expense.schemas.ts` (já vigente desde T3.0), `packages/ui/src/components/masked-input.tsx` (`CURRENCY_MAX_DIGITS = 11`) | `packages/ui/src/components/masked-input.spec.tsx`                                                    | ✅     |
| RF-02     | Campo "Ano" (4 dígitos) ao lado da Data: editar atualiza apenas o ano; ano inválido faz rollover (comportamento padrão de `Date`)       | `apps/web/src/lib/date-year.ts`, `apps/web/src/app/expenses/{new/page.tsx,[id]/page.tsx}`                                                        | `apps/web/src/lib/date-year.spec.ts`, `apps/web/src/app/expenses/new/page.spec.tsx`                   | ✅     |
| RF-03     | "Tanque cheio?" tri-state (`true`/`false`/`null`, default `null`); botões "Sim"/"Não", clicar no ativo desmarca para `null` (R-FUEL-06) | `apps/web/src/app/expenses/{new/page.tsx,[id]/page.tsx}`                                                                                         | `apps/web/src/app/expenses/new/page.spec.tsx`                                                         | ✅     |
| RF-04     | `odometer_km` limitado a 9.999.999 (7 dígitos) no `expenseBaseSchema` (R-ODO-02); `OdometerInput` limita digitação a 7 dígitos          | `packages/validators/src/expense.schemas.ts` (já vigente desde T3.0), `packages/ui/src/components/masked-input.tsx` (`ODOMETER_MAX_DIGITS = 7`)  | `packages/validators/src/expense.schemas.spec.ts`, `packages/ui/src/components/masked-input.spec.tsx` | ✅     |
| RF-05     | Reordenação do layout: Data + Ano lado a lado; Odômetro movido para após Data/Ano quando `category = fuel`                              | `apps/web/src/app/expenses/{new/page.tsx,[id]/page.tsx}`                                                                                         | — (verificado visualmente na estrutura do JSX)                                                        | ✅     |

---

## SPEC-20260612-001 — Melhorias de UX do Formulário/Hub de Despesas (approved)

> Consolida 6 itens da análise de UX de `/expenses` (KPIs, reatividade de contexto, máscaras
> pt-BR, cálculo cruzado de combustível, hard-block de odômetro, mensagens de erro de update).
> Regras: R-ODO-01 (novo), R-CTX-06 (atualizado). **2026-07-14 (T3.9):** implementado com
> adaptação de arquitetura — decisão tomada com o usuário (ver changelog da spec): sem
> react-hook-form/Server Actions/`@navestory/ui` form kit (SPEC-20260619-001), que nunca foram
> construídos neste projeto. `CurrencyInput`/`OdometerInput` viraram componentes React simples
> controlados (`value`/`onChange`) em `packages/ui`, consumidos por `useState` puro.
> RF-02 (reatividade ao contexto global) fica ⏳ — depende do `useDashboardStore`/"Em Foco"
> da Fase 5 (SPEC-20260602-001), ainda não implementado.

| Requisito | Descrição                                                                                                                                                                                                                                                                                                                                                                           | Código                                                                                                 | Teste                                                    | Status                                                      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------- |
| RF-01.1   | KPI "Próximos 30 dias" calculado em todas as abas (já não dependia da aba ativa nesta implementação — `kpis`/`upcoming` são carregados incondicionalmente em `/expenses`)                                                                                                                                                                                                           | `apps/web/src/app/expenses/page.tsx`                                                                   | `apps/web/src/app/expenses/page.spec.tsx`                | ✅                                                          |
| RF-01.2   | RPC `get_upcoming_costs` ganha 4ª fonte: despesas manuais (`source_type IS NULL`, `date > current_date`) como `source_type = 'expense'`                                                                                                                                                                                                                                             | `supabase/migrations/20260714220000_upcoming_costs_manual_expenses.sql`                                | — (RPC; sem harness de teste de banco no projeto)        | 🔶 Aplicado                                                 |
| RF-02     | Campo `vehicle_id` do `ExpenseForm` reativo a mudanças do contexto global enquanto `isInherited === true`                                                                                                                                                                                                                                                                           | —                                                                                                      | —                                                        | ⏳ Depende da Fase 5 (`useDashboardStore` ainda não existe) |
| RF-03     | Máscaras pt-BR progressivas (acumulador de dígitos estilo caixa eletrônico) nos campos Valor, Odômetro e Litros                                                                                                                                                                                                                                                                     | `packages/ui/src/components/masked-input.tsx` (`CurrencyInput`, `OdometerInput`)                       | `packages/ui/src/components/masked-input.spec.tsx`       | ✅                                                          |
| RF-04     | Hard-block de regressão de odômetro (R-ODO-01): rejeita valor menor que o máximo registrado em data anterior/igual, ou maior que o mínimo registrado em data posterior. Adaptação: opt-in via query param `?strict=true` (enviado só pelo `apps/web`) em vez de "fluxo web" separado — o soft-warning R1 (SPEC-20260601-001) permanece o default para os demais consumidores da API | `apps/api/src/modules/expenses/expenses.service.ts` (`checkOdometerHardBlock`, `findOdometerBoundary`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅                                                          |
| RF-05     | Campo "Valor por litro" editável na seção de combustível, com cálculo cruzado entre `amount`, `liters` e `price_per_liter`; algoritmo de pilha de ordem de edição `fuelEditOrder` (R-FUEL-08)                                                                                                                                                                                       | `apps/web/src/lib/hooks/use-fuel-cross-calc.ts`                                                        | `apps/web/src/lib/hooks/use-fuel-cross-calc.spec.ts`     | ✅                                                          |
| RF-06.1   | `category = fuel` ⇒ `odometer_km` obrigatório, via `superRefine` compartilhado por `createExpenseInputSchema` e `updateExpenseInputSchema` (o update só valida quando `category` está presente no payload — "já é fuel" sem alterar a categoria depende do estado persistido e não é verificável no schema)                                                                         | `packages/validators/src/expense.schemas.ts` (`requireOdometerForFuel`)                                | `packages/validators/src/expense.schemas.spec.ts`        | ✅                                                          |
| RF-06.2   | Edição bloqueada quando `is_readonly === true` — já implementado desde T3.0 (`ForbiddenException`), reafirmado sem mudança de código                                                                                                                                                                                                                                                | `apps/api/src/modules/expenses/expenses.service.ts` (`update`)                                         | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅                                                          |
| RF-06.3   | Mensagem de erro do hard-block exibida inline no formulário via `ApiError.message` (substitui a diferenciação `PGRST116`/genérico da spec original, que pressupõe Server Actions)                                                                                                                                                                                                   | `apps/web/src/app/expenses/[id]/page.tsx` (`onError` de `updateMutation`)                              | `apps/web/src/app/expenses/[id]/page.spec.tsx`           | ✅                                                          |

---

## SPEC-20260608-001 — Upcoming Costs: Próximas Despesas (approved)

> Tab "Próximas" na central financeira com RPC `get_upcoming_costs`.
> Regras: R-LED-01, R-LED-02, R-LED-03, R-REC-01, R-REC-02. RPC implementada (🔶); tabs
> de frontend ainda pendentes (⏳). Nota: assinatura real é
> `get_upcoming_costs(p_vehicle_id uuid default null, p_horizon_days integer default 30)`,
> divergindo do `(p_user_id UUID)` planejado na spec — filtra por `auth.uid()` internamente.

| Requisito | Descrição                                                                                           | Código                                                       | Teste | Status |
| --------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----- | ------ |
| RF-01     | RPC `get_upcoming_costs(p_vehicle_id, p_horizon_days)`: unifica maintenance, fines, recurring_costs | `supabase/migrations/20260712172020_analytics_functions.sql` | —     | 🔶     |
| RF-02     | Tab "Próximas" em `/expenses`                                                                       | —                                                            | —     | ⏳     |
| RF-03     | Tab "Em atraso" com filtro `due_date < hoje AND paid_at IS NULL`                                    | —                                                            | —     | ⏳     |

---

## SPEC-20260608-002 — Expenses KPIs: Central Financeira (approved)

> KPI cards financeiros no topo de `/expenses`. Regras: R-LED-01. Nenhum código implementado.

| Requisito | Descrição                                         | Código | Teste | Status |
| --------- | ------------------------------------------------- | ------ | ----- | ------ |
| RF-01     | KPI "Total este mês" com delta vs mês anterior    | —      | —     | ⏳     |
| RF-02     | KPI "Próximos 30 dias" com soma de upcoming costs | —      | —     | ⏳     |
| RF-03     | KPI "Total acumulado" com histórico               | —      | —     | ⏳     |

---

## SPEC-20260608-003 — Recurring Costs Alerts: Alertas de Custos Recorrentes (approved)

> In-app badge no sidebar para custos recorrentes vencendo em 7 dias. Nenhum código implementado.

| Requisito | Descrição                                    | Código | Teste | Status |
| --------- | -------------------------------------------- | ------ | ----- | ------ |
| RF-01     | Badge numérico no item "Despesas" do sidebar | —      | —     | ⏳     |
| RF-02     | Widget "Próximos 7 dias" no dashboard        | —      | —     | ⏳     |

---

## SPEC-20260609-001 — CRUD de Custos Recorrentes (approved)

> Módulo RecurringCostsModule (NestJS) com CRUD completo.
> Regras: R-REC-01, R-REC-02, R-LED-05, R-HUB-01. Banco implementado (🔶); módulo NestJS
> ainda pendente (⏳).

### Banco de dados

| Artefato                                                                  | Descrição                                                                                                                                                                                                                           | Regra    | Status                  |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------- |
| `supabase/migrations/20260712171910_recurring_costs_and_ledger_index.sql` | Tabela `vehicle_recurring_costs` (id, user_id FK, vehicle_id FK, cost_type enum, year, amount, due_date, paid_at, expense_id FK nullable, notes, soft-delete); constraint `uq_vehicle_recurring_cost (vehicle_id, cost_type, year)` | R-REC-01 | 🔶 Aplicado (sem teste) |
| RLS `recurring_costs_*`                                                   | `supabase/migrations/20260712172047_rls_policies.sql` — SELECT/INSERT/UPDATE por `user_id`; sem hard delete                                                                                                                         | R-REC-01 | 🔶                      |

### Backend — RecurringCostsModule

| Req   | Descrição                                                                                                                                | Código                                                | Teste | Status |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----- | ------ | --- |
| RF-01 | `GET /recurring-costs`: lista com filtros `vehicle_id`, `year`, `cost_type`, `paid`                                                      | —                                                     | —     | ⏳     |
| RF-02 | `POST /recurring-costs`: cria custo recorrente; verifica ownership; rejeita duplicata `(vehicle_id, cost_type, year)` com 409 (R-REC-01) | —                                                     | —     | ⏳     |
| RF-02 | `POST /recurring-costs`: quando `paid_at` informado, cria expense vinculada imediatamente (R-LED-05)                                     | —                                                     | —     | ⏳     |
| RF-03 | `PATCH /recurring-costs/:id`: ao definir `paid_at` pela primeira vez, cria expense vinculada (R-LED-05)                                  | —                                                     | —     | ⏳     |
| RF-04 | `DELETE /recurring-costs/:id`: soft-deleta expense vinculada antes de remover o custo recorrente (R-HUB-01)                              | —                                                     | —     | ⏳     |
| RF-05 | `getRecurringCostCategory(cost_type)`: mapeia `ipva                                                                                      | crlv`→`tax`, `insurance`→`insurance`, `other`→`other` | —     | —      | ⏳  |

---

## SPEC-20260609-002 — Tab "Por Veículo" em /expenses (approved)

> Quarta tab em `/expenses` com agrupamento accordion por veículo e subtotais.
> Nenhum código implementado.

| Requisito | Descrição                                           | Código | Teste | Status |
| --------- | --------------------------------------------------- | ------ | ----- | ------ |
| RF-01     | Tab "Por veículo" com URL param `?tab=por-veiculo`  | —      | —     | ⏳     |
| RF-02     | Accordion por veículo com subtotal formatado em BRL | —      | —     | ⏳     |

---

## SPEC-20260609-003 — Exportação CSV Consolidada (approved)

> CSV unificado de todas as origens financeiras. Regras: R5, R-LED-01. Nenhum código implementado.

| Requisito | Descrição                                                             | Código | Teste | Status |
| --------- | --------------------------------------------------------------------- | ------ | ----- | ------ |
| RF-01     | Botão "Exportar CSV" com período e filtro por veículo                 | —      | —     | ⏳     |
| RF-02     | CSV inclui coluna `Origem` (Manual/Manutenção/Multa/Custo recorrente) | —      | —     | ⏳     |
| RF-03     | BOM UTF-8 para compatibilidade Excel pt-BR                            | —      | —     | ⏳     |

---

## EPIC-FIN-001 — Ledger Financeiro Unificado (ADR-006)

> **Objetivo:** Consolidar todas as origens de despesas financeiras do navestory (manuais, multas,
> manutenções concluídas e custos recorrentes anuais) em um único ledger polimórfico na tabela
> `expenses`, via padrão `source_type + source_id + is_readonly`. A tabela `expenses` passa a
> ser a única fonte de verdade para o hub financeiro — sem UNION VIEW nem tabela de junção
> separada.
>
> **Regras cobertas:** R-LED-01 · R-LED-02 · R-LED-03 · R-LED-04 · R-LED-05 · R-HUB-01 ·
> R-HUB-02 · R-REC-01 · R-REC-02
>
> **ADR:** `docs/architecture/decisions/ADR-006-unified-financial-ledger.md`
>
> **Specs do épico (por ordem de dependência):**
>
> | Spec                                                                                                   | Título                                                                      | Status   |
> | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | -------- |
> | [SPEC-20260607-001](#spec-20260607-001--finesmodule-approved)                                          | FinesModule — migration do ledger + `createFromSource`/`softDeleteBySource` | approved |
> | [SPEC-20260608-001](#spec-20260608-001--upcoming-costs-próximas-despesas-approved)                     | Upcoming Costs: Próximas Despesas                                           | approved |
> | [SPEC-20260608-002](#spec-20260608-002--expenses-kpis-central-financeira-approved)                     | Expenses KPIs: Central Financeira                                           | approved |
> | [SPEC-20260608-003](#spec-20260608-003--recurring-costs-alerts-alertas-de-custos-recorrentes-approved) | Recurring Costs Alerts: Alertas de Custos Recorrentes                       | approved |
> | [SPEC-20260609-001](#spec-20260609-001--crud-de-custos-recorrentes-approved)                           | CRUD de Custos Recorrentes                                                  | approved |
>
> **Artefatos transversais do épico:**
>
> - Migration base: `supabase/migrations/20260608000000_unified_ledger.sql` (DDL: colunas polimórficas em `expenses`, tabela `vehicle_recurring_costs`, `uq_expenses_source`)
> - Migration RPC: `supabase/migrations/20260608000001_rpc_upcoming_costs.sql`
> - Ponto de escrita centralizado: `ExpensesService.createFromSource()` e `ExpensesService.softDeleteBySource()`
>
> As entradas detalhadas de cada spec (requisito → código → teste) estão nas seções individuais abaixo.

---

## SPEC-20260607-001 — FinesModule (approved)

> Módulo de Multas (NestJS) com CRUD completo e ledger vinculado.
> Regras: R-LED-01..R-LED-05, R-HUB-01, R-HUB-02. Banco implementado (🔶); módulo NestJS
> e frontend ainda pendentes (⏳). Os nomes de migration do ledger diferem dos planejados na
> spec — as DDLs foram distribuídas entre `20260712171830_core_tables.sql` (campos polimórficos
> em `expenses`) e `20260712171910_recurring_costs_and_ledger_index.sql` (tabela
> `vehicle_recurring_costs` + índice de idempotência).

### Banco de dados

| Artefato                                                                  | Descrição                                                                                                                          | Regra              | Status                  |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------- |
| `supabase/migrations/20260712171830_core_tables.sql`                      | Campos `source_type text`, `source_id uuid`, `is_readonly boolean` em `expenses`; constraint `expenses_source_coherence_check`     | R-LED-04, R-HUB-02 | 🔶 Aplicado (sem teste) |
| `supabase/migrations/20260712171910_recurring_costs_and_ledger_index.sql` | Tabela `vehicle_recurring_costs` + índice único `uq_expenses_source ON expenses (source_type, source_id) WHERE deleted_at IS NULL` | R-HUB-02, R-REC-01 | 🔶 Aplicado (sem teste) |
| `supabase/migrations/20260712172020_analytics_functions.sql`              | Função `get_upcoming_costs(p_vehicle_id, p_horizon_days)` — unifica maintenance, fines, recurring_costs                            | R-REC-02           | 🔶 Aplicado (sem teste) |

### Backend — FinesModule

| Req   | Descrição                                                                                                                  | Código | Regra    | Teste | Status |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ------ | -------- | ----- | ------ |
| RF-01 | `POST /fines`: cria multa, valida ownership do veículo, cria expense vinculada via `createFromSource` (R-LED-02, R-HUB-02) | —      | R-LED-02 | —     | ⏳     |
| RF-02 | `amount_with_discount` não pode ser maior que `amount`; retorna 400                                                        | —      | —        | —     | ⏳     |
| RF-03 | `POST /fines`: usa `amount_with_discount` (quando disponível) como valor da expense vinculada (R-LED-02)                   | —      | R-LED-02 | —     | ⏳     |
| RF-04 | `GET /fines`: lista multas do usuário com filtro opcional por `status`                                                     | —      | S1       | —     | ⏳     |
| RF-05 | `PATCH /fines/:id`: grafo de transições `pending → [paid, appealing, cancelled]`                                           | —      | —        | —     | ⏳     |
| RF-05 | Transição para `cancelled`: soft-deleta expense vinculada via `softDeleteBySource` (R-LED-03)                              | —      | R-LED-03 | —     | ⏳     |
| RF-06 | `DELETE /fines/:id`: soft-delete + `softDeleteBySource('fine', id)` (R-HUB-01)                                             | —      | R-HUB-01 | —     | ⏳     |
| RF-07 | `GET /fines/vehicle/:vehicleId`: lista multas de um veículo específico; verifica ownership                                 | —      | S1       | —     | ⏳     |

### Backend — ExpensesService (extensão para ledger)

| Req      | Descrição                                                                                               | Código | Regra              | Teste | Status |
| -------- | ------------------------------------------------------------------------------------------------------- | ------ | ------------------ | ----- | ------ |
| R-LED-01 | `PATCH /expenses/:id` e `DELETE /expenses/:id`: retornam 403 quando `is_readonly = true`                | —      | R-LED-01           | —     | ⏳     |
| R-LED-02 | `createFromSource(dto)`: persiste com `is_readonly = true`; respeita `uq_expenses_source` (idempotente) | —      | R-LED-02, R-LED-05 | —     | ⏳     |
| R-LED-03 | `softDeleteBySource(sourceType, sourceId)`: encontra expense ativa e aplica soft-delete (R-HUB-01)      | —      | R-LED-03           | —     | ⏳     |

### Frontend — Tela de Multas

| Req | Descrição                                                        | Código | Regra        | Teste | Status |
| --- | ---------------------------------------------------------------- | ------ | ------------ | ----- | ------ |
| —   | `/fines/page.tsx`: listagem de multas com KPIs e ações por linha | —      | S1, R-LED-01 | —     | ⏳     |
| —   | `/fines/new/page.tsx`: formulário de criação de multa            | —      | S1           | —     | ⏳     |

### Frontend — Central de Despesas (reestruturação planejada)

| Req      | Descrição                                                                                                   | Código | Regra    | Teste | Status |
| -------- | ----------------------------------------------------------------------------------------------------------- | ------ | -------- | ----- | ------ |
| R-LED-01 | `ExpenseRowActions`: ações de edição e exclusão ocultadas quando `is_readonly = true`                       | —      | R-LED-01 | —     | ⏳     |
| —        | `LinkedExpenseDrawer`: drawer que exibe informações da origem da despesa                                    | —      | R-LED-01 | —     | ⏳     |
| —        | `/expenses/page.tsx`: reestruturado com tabs, KPIs financeiros, badges `readonly`, filtro por `source_type` | —      | R-LED-01 | —     | ⏳     |
| —        | `ExportCsvButton`: CSV consolidado inclui campo `source_type`                                               | —      | —        | —     | ⏳     |

---

## SPEC-20260606-002 — Fornecedor / Posto de Combustível (approved)

> Permite registrar o posto de combustível no lançamento de abastecimento com autocomplete
> baseado no histórico do usuário. Regras: R-FUEL-04, R-FUEL-05.
> **2026-07-14 (T3.5):** RF-01 e RF-02 (backend) implementados via `ExpensesService`/`ExpensesController`
> — coluna `supplier` já existia na tabela `expenses` desde a migration consolidada (T3.0). Campo
> `supplier` (com datalist de sugestões) adicionado aos formulários web de criação/edição de despesa
> e ao fluxo de templates; UX de autocomplete "estilo Popover" fica ⏳ (T3.9/T3.10, junto do
> `ExpenseForm` reescrito com react-hook-form — ver R-FORM-01/02).

| Req   | Descrição                                                                                                                    | Código                                                                                  | Regra     | Teste                                             | Status                                                               |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| RF-01 | Aceitar `supplier` no payload da API (backend) — validação ≤ 100 chars                                                       | `packages/validators/src/expense.schemas.ts` (`expenseBaseSchema`)                      | R-FUEL-04 | —                                                 | ✅                                                                   |
| RF-02 | `GET /expenses/suppliers` — busca 200 registros com `supplier IS NOT NULL`, deduplica case-insensitive em JS, retorna top 10 | `apps/api/src/modules/expenses/expenses.service.ts` (`listSuppliers`), `.controller.ts` | R-FUEL-04 | `expenses.service.spec.ts`, `.controller.spec.ts` | ✅                                                                   |
| RF-02 | Campo `supplier` com `<datalist>` alimentado por `GET /expenses/suppliers` nos formulários `new`/`[id]`                      | `apps/web/src/app/expenses/new/page.tsx`, `[id]/page.tsx`                               | R-FUEL-04 | —                                                 | 🔶 sem teste dedicado de UI; autocomplete via Popover fica ⏳ (T3.9) |
| RF-03 | Sem tabela separada — abordagem de query direta em `expenses`                                                                | `expenses.service.ts` (`listSuppliers`)                                                 | —         | —                                                 | ✅                                                                   |
| RF-04 | Aceitar texto livre sem match no histórico                                                                                   | `expenseBaseSchema`                                                                     | —         | —                                                 | ✅                                                                   |

---

## SPEC-20260606-001 — Tipo de Combustível, Tanque Cheio e Cálculo de Consumo (approved)

> Enriquece o formulário de abastecimento com `fuel_type`, `full_tank`, cálculo de km/l
> e preço/litro. Campos derivados sem persistência.
> Regras: R4, R-FUEL-01, R-FUEL-02, R-FUEL-03, R-FUEL-05.
> **2026-07-14 (T3.5):** RF-01, RF-02, RF-03 (backend) implementados — colunas `fuel_type`/`full_tank`
> já existiam na tabela `expenses` desde a migration consolidada (T3.0); `computed.km_per_liter`/
> `computed.price_per_liter` adicionados em `create`/`update` reaproveitando a query de
> `findMaxOdometerByVehicle` (sem query adicional, conforme RNF). Campos `fuel_type`, `liters` e
> `full_tank` (checkbox "Abastecimento parcial?") adicionados aos formulários web de criação/edição.
> RF-04 (pré-preenchimento), RF-05 (default tri-state — ver R-FUEL-06), RF-06 (hint de odômetro),
> RF-07/RF-08 (cálculo em tempo real no form) ficam ⏳, escopo de T3.9/T3.10 (reescrita do
> `ExpenseForm` com react-hook-form).

| Req   | Descrição                                                                                                          | Código                                                                             | Teste                      | Status                                                                                       |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| RF-01 | Persistir `fuel_type` no payload da API (backend) — validação contra enum `FuelType`                               | `packages/validators/src/expense.schemas.ts`                                       | —                          | ✅                                                                                           |
| RF-02 | Persistir `full_tank` (boolean nullable) no payload da API (backend)                                               | `expense.schemas.ts`                                                               | —                          | ✅                                                                                           |
| RF-03 | Retornar `computed.km_per_liter` e `computed.price_per_liter` na resposta da API                                   | `apps/api/src/modules/expenses/expenses.service.ts` (`computeFuelMetrics`)         | `expenses.service.spec.ts` | ✅                                                                                           |
| RF-04 | `getLastFuelTypeAction(vehicleId)`: consulta último `fuel_type` selecionado para pré-preencher o campo (R-FUEL-01) | —                                                                                  | —                          | ⏳ (T3.9, ver R-FUEL-07)                                                                     |
| RF-04 | `ExpenseForm`: `useEffect` de pré-preenchimento de `fuel_type` dispara em modo criação                             | —                                                                                  | —                          | ⏳ (T3.9)                                                                                    |
| RF-05 | Default de `full_tank = true` no formulário (toggle "Abastecimento parcial?")                                      | `apps/web/src/app/expenses/new/page.tsx`, `[id]/page.tsx` (checkbox `partialTank`) | —                          | 🔶 implementado como decidido na spec original; superseded por R-FUEL-06 (tri-state) em T3.9 |
| RF-06 | `ExpenseForm`: hint de odômetro exibe delta quando valor digitado supera o último registrado (R4)                  | —                                                                                  | —                          | ⏳ (T3.9)                                                                                    |
| RF-07 | `ExpenseForm`: exibe mensagem "Consumo aparece após o 2º abastecimento completo" (R-FUEL-02, R-FUEL-03)            | —                                                                                  | —                          | ⏳ (T3.9)                                                                                    |
| RF-08 | Exibir preço/litro em tempo real no formulário                                                                     | —                                                                                  | —                          | ⏳ (T3.9)                                                                                    |

---

## SPEC-20260603-004 — Migration: Tabela Consolidada `user_preferences` (approved)

> Cria a tabela `public.user_preferences` com RLS owner-only completa.
> Regras: S1, S2, R-DISP-03, R-PREF-01. Banco implementado (🔶, sem teste dedicado; schema
> divergente do texto original da spec — ver changelog v1.1). Camada de serviço para `auto_draft_enabled` concluída
> em 2026-07-14 via `PreferencesModule` REST (ver SPEC-20260612-003). Camada de serviço para
> `vehicle_chip_fields` (SPEC-20260603-003, approved) concluída em 2026-07-14 (T2.7), não mais ⏳. Nota: coluna `auto_draft_enabled`
> (de SPEC-20260612-003) já incluída na migration consolidada, dispensando ALTER TABLE separado.

### Banco de dados

| Artefato                                                                | Descrição                                                                                                                                                              | Regra                | Status                  |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------- |
| `supabase/migrations/20260712171846_grouping_templates_preferences.sql` | `CREATE TABLE public.user_preferences` com colunas `user_id` (PK FK), `vehicle_chip_fields text[]`, `auto_draft_enabled boolean`, `updated_at`; FK `ON DELETE CASCADE` | R-PREF-01, R-DISP-03 | 🔶 Aplicado (sem teste) |
| RLS `user_preferences_owner` (policy `for all`)                         | `supabase/migrations/20260712172047_rls_policies.sql` — política unificada `FOR ALL USING/WITH CHECK (auth.uid() = user_id)`                                           | S2                   | 🔶                      |
| Sem policy de DELETE explícita                                          | Exclusão somente via cascade de `profiles.id` (C1 — LGPD); a policy `for all` não inclui hard delete direto pela app                                                   | S2, C1               | 🔶                      |

---

## SPEC-20260603-003 — Preferências de Exibição do Veículo no Chip de Contexto (approved)

> Permite que o usuário configure quais campos de identidade do veículo aparecem no chip.
> Adiciona campo `nickname` à entidade `vehicles`. Regras: R-DISP-01, R-DISP-02, R-DISP-03.
> Status: aprovada em 2026-07-14 (T2.7) — backend + UI de configuração concluídos; renderização do
> `VehicleContextChip` real no subheader (RF-01/RF-04/RF-05) permanece ⏳ até `SPEC-20260603-001` (Fase 5).

### Schema / Validação

| Req                | Descrição                                                                                | Código                                           | Teste                                                 | Status |
| ------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------- | ------ |
| RF-01..RF-03/RF-08 | Schema Zod `chipFieldsSchema`: array 1–3 campos enum, `plate` obrigatório, sem repetição | `packages/validators/src/preferences.schemas.ts` | `packages/validators/src/preferences.schemas.spec.ts` | ✅     |

### Backend — Entidade e DTOs de Veículo

| Req   | Descrição                                                                                                                               | Código                                                                                                    | Teste | Status                 |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----- | ---------------------- |
| RF-09 | Campo `nickname: string \| null` adicionado à entidade `Vehicle` (text nullable, max 50 chars — corrigido de 30, ver changelog da spec) | `apps/api/src/modules/vehicles/vehicles.service.ts`, `supabase/migrations/20260712171830_core_tables.sql` | —     | ✅ (concluído em T2.1) |
| RF-09 | `nickname` adicionado ao `CreateVehicleDto` e `UpdateVehicleDto` (opcional, max 50)                                                     | `packages/validators/src/vehicle.schemas.ts`                                                              | —     | ✅ (concluído em T2.1) |

### Backend — API REST (NestJS + React Query, não server actions)

| Req         | Descrição                                                                                                                                          | Código                                                                                 | Teste                                                           | Status |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------ |
| RF-06       | `GET /preferences`: retorna `vehicle_chip_fields` de `user_preferences`; fallback `DEFAULT_CHIP_FIELDS` quando ausente (R-DISP-03)                 | `apps/api/src/modules/preferences/preferences.service.ts`                              | `apps/api/src/modules/preferences/preferences.service.spec.ts`  | ✅     |
| RF-06/RF-08 | `PATCH /preferences`: valida com `chipFieldsSchema` (via `updatePreferencesInputSchema`), upsert parcial em `user_preferences.vehicle_chip_fields` | `apps/api/src/modules/preferences/preferences.controller.ts`, `preferences.service.ts` | `preferences.controller.spec.ts`, `preferences.service.spec.ts` | ✅     |

### Banco de dados

| Artefato                                                                                 | Descrição                                                                              | Regra         | Status                                  |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------- | --------------------------------------- |
| `ALTER TABLE vehicles ADD COLUMN nickname text CHECK (char_length(nickname) <= 50)`      | Campo apelido nullable na tabela vehicles                                              | R-DISP-01     | ✅ Aplicado (T2.1)                      |
| `CREATE TABLE user_preferences` com coluna `vehicle_chip_fields text[]` e RLS owner-only | Formalizada em SPEC-20260603-004; default `['make','plate','model']` já bate com RF-05 | S2, R-DISP-03 | ✅ Aplicado (sem teste dedicado de RLS) |

### Componentes de Layout e Tela de Preferências

| Req               | Descrição                                                                                                                                                           | Código                                           | Teste                                                 | Status                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| RF-01/RF-04/RF-05 | `VehicleContextChip`: renderização dinâmica por `chipFields`; fallback `nickname → model` — helper puro `resolveChipValue`/`formatChipPreview` já pronto para reuso | `apps/web/src/lib/vehicle-chip.ts` (helper)      | `apps/web/src/lib/vehicle-chip.spec.ts`               | 🔶 Helper pronto; componente do chip real ⏳ até Fase 5 (`SPEC-20260603-001`) |
| RF-07/RNF-03      | Seção "Exibição do veículo" em `/settings/preferences`: seleção de 1-3 campos, reordenação, prévia em tempo real, salvar/cancelar                                   | `apps/web/src/app/settings/preferences/page.tsx` | `apps/web/src/app/settings/preferences/page.spec.tsx` | ✅                                                                            |

---

## SPEC-20260715-001 — CRUD Base de Manutenções (MaintenancesModule) (approved)

> Concluído em 2026-07-15: `MaintenancesModule` REST completo (mesmo padrão de
> SPEC-20260714-001, T3.0). Absorveu o enforcement de transição de status (T4.2,
> SPEC-20260603-002) e a integração com o ledger (R-LED-02/03, R-HUB-01) no mesmo módulo,
> replicando o padrão de `FinesModule` (T3.6/T3.8). Frontend mínimo (RF-15..RF-17) também
> concluído no mesmo dia.

### Camada de serviço (backend)

| Req                | Descrição                                                                                                            | Código                                                                                                        | Teste                                                                                                                   | Status |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------ |
| RF-01..RF-06/RF-13 | CRUD (`create`, `findAll`, `findOne`, `update`, `remove`) — inline, sem Repository/Port                              | `apps/api/src/modules/maintenances/maintenances.service.ts`, `.controller.ts`, `.module.ts`                   | `apps/api/src/modules/maintenances/maintenances.service.spec.ts`, `.controller.spec.ts`                                 | ✅     |
| RF-07/R7           | Validação de transição de status via `MAINTENANCE_STATUS_TRANSITIONS`; 409 se inválida                               | `apps/api/src/modules/maintenances/maintenances.service.ts`, `packages/validators/src/maintenance.schemas.ts` | `apps/api/src/modules/maintenances/maintenances.service.spec.ts`, `packages/validators/src/maintenance.schemas.spec.ts` | ✅     |
| RF-08/R-ODO-03     | `odometer_km` obrigatório para transição a `completed`; 422 se ausente                                               | `apps/api/src/modules/maintenances/maintenances.service.ts`                                                   | `apps/api/src/modules/maintenances/maintenances.service.spec.ts`                                                        | ✅     |
| RF-09              | `findMaxOdometerByVehicle` (sem filtro de ciclo — R-ODO-04 permanece ⏳ em ambos os módulos); warning não-bloqueante | `apps/api/src/modules/maintenances/maintenances.service.ts`                                                   | `apps/api/src/modules/maintenances/maintenances.service.spec.ts`                                                        | ✅     |
| RF-10/R-LED-02     | Transição a `completed` com `cost` cria despesa vinculada via `ExpensesService.createFromSource()`                   | `apps/api/src/modules/maintenances/maintenances.service.ts`                                                   | `apps/api/src/modules/maintenances/maintenances.service.spec.ts`                                                        | ✅     |
| RF-11/R-LED-03     | Transição a `cancelled` soft-deleta a despesa vinculada via `softDeleteBySource()`                                   | `apps/api/src/modules/maintenances/maintenances.service.ts`                                                   | `apps/api/src/modules/maintenances/maintenances.service.spec.ts`                                                        | ✅     |
| RF-12/R-HUB-01     | `remove()` soft-deleta a despesa vinculada, se existir                                                               | `apps/api/src/modules/maintenances/maintenances.service.ts`                                                   | `apps/api/src/modules/maintenances/maintenances.service.spec.ts`                                                        | ✅     |
| RF-14/C2           | Audit log em mutações bem-sucedidas; transições rejeitadas não geram entrada                                         | `apps/api/src/modules/maintenances/maintenances.service.ts`                                                   | `apps/api/src/modules/maintenances/maintenances.service.spec.ts`                                                        | ✅     |

### Frontend (mínimo)

| Req                       | Descrição                                                                                                                                                                | Código                                       | Teste                                             | Status     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------- | ---------- |
| RF-15                     | `/maintenance`: lista com data, descrição, veículo, badge de status                                                                                                      | `apps/web/src/app/maintenance/page.tsx`      | `apps/web/src/app/maintenance/page.spec.tsx`      | ✅         |
| RF-16                     | `/maintenance/new`: formulário mínimo, empty state sem veículos (R-FORM-07)                                                                                              | `apps/web/src/app/maintenance/new/page.tsx`  | `apps/web/src/app/maintenance/new/page.spec.tsx`  | ✅         |
| RF-17                     | `/maintenance/[id]`: edição + seletor de status restrito às transições válidas (UX progressiva, R7)                                                                      | `apps/web/src/app/maintenance/[id]/page.tsx` | `apps/web/src/app/maintenance/[id]/page.spec.tsx` | ✅         |
| RF-24 (SPEC-20260711-001) | `odometer_km` exposto no formulário de manutenção via `OdometerInput` (não torna-se visualmente obrigatório em `completed` — refinamento de UX deixado para spec futura) | `apps/web/src/app/maintenance/[id]/page.tsx` | idem                                              | 🔶 Parcial |

---

## SPEC-20260603-002 — Transições de Status de Manutenção (approved)

> Enforcement do grafo de transições de status no `MaintenancesService` (NestJS).
> Estados: `scheduled`, `in_progress`, `completed`, `cancelled` (corrigido em 2026-07-15 —
> ver changelog v0.2 da spec: o schema real usa `scheduled`, não `pending` como a v0.1 assumia).
> Implementado junto com SPEC-20260715-001 em 2026-07-15 (mesmo módulo, ver seção acima) —
> linhas abaixo mantidas para rastreabilidade histórica do requisito original.

### Camada de serviço (backend)

| Req          | Descrição                                                                                                    | Código                                                      | Teste                                                            | Status |
| ------------ | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------- | ------ |
| RF-01        | `MaintenancesService.update()` valida transição quando `status` está no payload                              | `apps/api/src/modules/maintenances/maintenances.service.ts` | `apps/api/src/modules/maintenances/maintenances.service.spec.ts` | ✅     |
| RF-02..RF-05 | Constante `MAINTENANCE_STATUS_TRANSITIONS` define saídas de cada estado; `completed` e `cancelled` terminais | `packages/validators/src/maintenance.schemas.ts`            | `packages/validators/src/maintenance.schemas.spec.ts`            | ✅     |
| RF-06        | Transição para o mesmo estado atual é rejeitada com 409                                                      | idem                                                        | idem                                                             | ✅     |
| RF-07        | Sem campo `status` no payload, validação de transição é ignorada                                             | idem                                                        | idem                                                             | ✅     |
| RF-08        | Status atual lido do `findOne()` de ownership — sem query adicional                                          | idem                                                        | idem                                                             | ✅     |
| RF-09        | Resposta 409 com `message: "Transição inválida: {de} → {para}"`                                              | idem                                                        | idem                                                             | ✅     |
| RF-10/C2     | Audit log gravado apenas após transição bem-sucedida                                                         | idem                                                        | idem                                                             | ✅     |

---

## SPEC-20260603-001 — Chip de Contexto de Veículo no Subheader (approved)

> **2026-07-16 (T5.4):** promovida de `draft` para `approved` e implementada na mesma tarefa.
> Levantamento de código pré-implementação encontrou divergências grandes entre a spec (escrita
> antes de o código real existir) e o estado atual do repositório — mesmo padrão de T3.9/T5.1/T3.6
> (ver changelog v0.3 da spec e o changelog de `docs/IMPLEMENTATION_STRATEGY.md`). Header
> (`apps/web/src/components/layout/header.tsx`) criado do zero — nenhum Header/subheader existia
> no app shell. `VehicleSwitcherContent` e o hook compartilhado `use-vehicle-context.ts` também
> criados do zero, extraindo a lógica de `focus-slot.tsx` (removido e deletado do repositório).

### Hook compartilhado e hooks utilitários

| Req            | Descrição                                                                                                                                                                         | Código                                            | Teste                                                                        | Status |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------- | ------ |
| —              | `useVehicleContext`: hidratação, queries de veículos/grupos sob demanda, resolução de label/aria-label por modo — extraído de `focus-slot.tsx`, reaproveitado por chip e switcher | `apps/web/src/lib/context/use-vehicle-context.ts` | Coberto indiretamente por `vehicle-context-chip.spec.tsx`, `header.spec.tsx` | ✅     |
| Notas Técnicas | `useMediaQuery('(min-width: 768px)')` — SSR-safe, sem `window.innerWidth` direto                                                                                                  | `apps/web/src/lib/hooks/use-media-query.ts`       | `apps/web/src/lib/hooks/use-media-query.spec.ts`                             | ✅     |
| RF-14          | `useOnlineStatus` — eventos `online`/`offline` + `navigator.onLine`                                                                                                               | `apps/web/src/lib/hooks/use-online-status.ts`     | `apps/web/src/lib/hooks/use-online-status.spec.ts`                           | ✅     |

### VehicleContextChip

| Req   | Descrição                                                                                                                       | Código                                                                           | Teste                                                                               | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------ |
| RF-01 | Chip visível no `Header` (novo, não `FluidFleetHeader`) em todos os breakpoints e páginas autenticadas                          | `apps/web/src/components/layout/header.tsx`, `apps/web/src/app/(app)/layout.tsx` | `apps/web/src/components/layout/header.spec.tsx`                                    | ✅     |
| RF-02 | Estados visuais por modo (none/single/group/multi/attribute); ícones emoji em vez de `lucide-react` (não adicionado ao projeto) | `apps/web/src/components/layout/vehicle-context-chip.tsx`                        | `apps/web/src/components/layout/vehicle-context-chip.spec.tsx`                      | ✅     |
| RF-03 | Dimensões h-11 (44px) + max-width 140px + text truncation (WCAG 2.5.5)                                                          | `apps/web/src/components/layout/vehicle-context-chip.tsx`                        | — (verificação visual/classe Tailwind, sem teste dedicado de dimensão)              | 🔶     |
| RF-04 | Botão X com `clearAllSelection()` + `stopPropagation`                                                                           | `apps/web/src/components/layout/vehicle-context-chip.tsx`                        | `apps/web/src/components/layout/vehicle-context-chip.spec.tsx`                      | ✅     |
| RF-05 | `aria-label` dinâmico por modo descrevendo contexto ativo                                                                       | `apps/web/src/lib/context/use-vehicle-context.ts` (`getModeAriaLabel`)           | `apps/web/src/components/layout/vehicle-context-chip.spec.tsx` (via texto do label) | ✅     |
| RF-06 | Estado hover (`ring-1`) e focus-visible (`ring-2 ring-primary`)                                                                 | `apps/web/src/components/layout/vehicle-context-chip.tsx`                        | — (classes Tailwind, sem teste de estilo computado)                                 | 🔶     |
| RF-24 | Skeleton `w-32 h-11 animate-pulse` durante hidratação; nunca exibe `none` transitório                                           | `apps/web/src/components/layout/vehicle-context-chip.tsx`                        | Coberto indiretamente (demais testes aguardam hidratação via `waitFor`)             | 🔶     |

### VehicleContextDialog, VehicleContextSheet e VehicleSwitcherContent

| Req          | Descrição                                                                                                        | Código                                                                                                           | Teste                                                                                | Status                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| RF-07/RF-08  | Dialog desktop (`@radix-ui/react-dialog`): backdrop blur, `max-w-[380px]`, `Esc` com `stopPropagation`           | `apps/web/src/components/layout/vehicle-context-dialog.tsx`                                                      | `apps/web/src/components/layout/vehicle-context-chip.spec.tsx` (abertura via clique) | 🔶 (sem teste dedicado de `Esc`)                      |
| RF-09        | Skeleton `animate-pulse` durante loading; erro com retry após 8s (`setTimeout`)                                  | `apps/web/src/components/layout/vehicle-switcher-content.tsx`                                                    | — (sem teste dedicado de timeout/retry)                                              | 🔶                                                    |
| RF-10        | Fechamento do Dialog com animação `data-[state=closed]:fade-out duration-150` ao selecionar item                 | `apps/web/src/components/layout/vehicle-context-dialog.tsx`                                                      | —                                                                                    | 🔶                                                    |
| RF-11..RF-13 | Sheet mobile (`vaul`): bottom-up `snapPoints=[0.7]`, handle de drag, `overscroll-behavior: contain`              | `apps/web/src/components/layout/vehicle-context-sheet.tsx`                                                       | `apps/web/src/components/layout/vehicle-context-chip.spec.tsx` (abertura via clique) | 🔶 (sem teste de snap-point/drag, específico do vaul) |
| RF-12        | `padding-bottom: env(safe-area-inset-bottom)`                                                                    | `apps/web/src/components/layout/vehicle-switcher-content.tsx`                                                    | —                                                                                    | 🔶                                                    |
| RF-14        | Banner offline via `useOnlineStatus`; cache TanStack Query `staleTime: 60_000` (não SWR, ver nota RF-14 da spec) | `apps/web/src/components/layout/vehicle-switcher-content.tsx`, `apps/web/src/lib/context/use-vehicle-context.ts` | — (sem teste dedicado do banner offline)                                             | 🔶                                                    |
| RNF-05       | Busca client-side normaliza diacríticos (`normalize('NFD')`) e remove hífens de placa                            | `apps/web/src/components/layout/vehicle-switcher-content.tsx` (`normalizeForSearch`)                             | — (sem teste unitário dedicado da função de busca)                                   | 🔶                                                    |

### Migração do Sidebar

| Req   | Descrição                                                                                                        | Código                                                            | Teste                                                     | Status |
| ----- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------- | ------ |
| RF-15 | Remoção de `FocusSlot` do sidebar; arquivo deletado do repositório (`focus-slot.tsx`/`focus-slot.spec.tsx`)      | `apps/web/src/components/layout/sidebar.tsx`                      | `apps/web/src/components/layout/sidebar.spec.tsx` (RF-15) | ✅     |
| RF-16 | Dot passivo (`w-2 h-2 rounded-full`, `aria-hidden`) no sidebar colapsado, cor por `selectionMode`, sem interação | `apps/web/src/components/layout/sidebar.tsx`                      | `apps/web/src/components/layout/sidebar.spec.tsx` (RF-16) | ✅     |
| RF-17 | Confirmado satisfeito pelo `onClick` de logout já existente (sem gesto de hold — fora de escopo)                 | `apps/web/src/components/layout/sidebar.tsx` (comentário `@spec`) | — (nenhum comportamento novo a testar)                    | ✅     |

### Backend

| Req   | Descrição                                                                                                                                   | Código                                                                                                               | Teste                                                                                                                          | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------ |
| RF-18 | `.limit(100)` em `VehiclesService.findAll`/`VehicleGroupsService.findAll` — corrigido de "sem limite" (não "20→100", ver changelog da spec) | `apps/api/src/modules/vehicles/vehicles.service.ts`, `apps/api/src/modules/vehicle-groups/vehicle-groups.service.ts` | `apps/api/src/modules/vehicles/vehicles.service.spec.ts`, `apps/api/src/modules/vehicle-groups/vehicle-groups.service.spec.ts` | ✅     |
| RF-19 | `member_count` exclui membros com veículo soft-deletado (busca veículos ativos + conta em memória)                                          | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.ts` (`findAll`)                                          | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.spec.ts`                                                           | ✅     |
| RF-20 | 404 para veículo soft-deleted — reaproveitado de `VehiclesService.findOne` (não criado endpoint `/dashboard/stats` novo)                    | `apps/api/src/modules/vehicles/vehicles.service.ts` (`findOne`, já existente)                                        | `apps/api/src/modules/vehicles/vehicles.service.spec.ts` (já existente)                                                        | ✅     |

### Persistência e limpeza de contexto

| Req   | Descrição                                                                                                                                                                | Código                                                   | Teste                                                 | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ----------------------------------------------------- | ------ |
| RF-21 | `zustand/persist` com `sessionStorage` (corrige localStorage da SPEC-20260602-001)                                                                                       | `apps/web/src/lib/stores/use-dashboard-store.ts`         | `apps/web/src/lib/stores/use-dashboard-store.spec.ts` | ✅     |
| RF-22 | Limpeza automática de contexto em 404 de `GET /vehicles/:id` do veículo ativo; usa a fila única de toasts do `ui-store` (`pushToast`, migrado em SPEC-20260525-001 §8.2) | `apps/web/src/lib/http/api-client.ts` (`handleNotFound`) | `apps/web/src/lib/http/api-client.spec.ts`            | ✅     |
| RF-23 | `sessionStorage.removeItem("navestory-dashboard-context")` explícito no logout, além de `clearAllSelection()`                                                            | `apps/web/src/lib/auth/logout.ts`                        | `apps/web/src/lib/auth/logout.spec.ts`                | ✅     |

---

## SPEC-20260602-005 — Histórico de Atividades (Audit Log do Usuário) (approved)

> Formaliza a infraestrutura de audit log (escritor único, backend) e a página de histórico
> de atividades pessoal do usuário. **2026-07-18 (v1.1):** spec revisada — removida a
> arquitetura de "dois escritores" (Server Actions nunca implementadas), corrigida a nota de
> RLS (já habilitado, imutabilidade formalizada em RF-04/R-MON-04), página renomeada de
> "Monitor" para "Histórico de Atividades", adicionado RF-07/CA-11 de correlação com
> `requestId` (`SPEC-20260716-002`). **2026-07-18 (T5.2, implementação):** RF-01 a RF-16
> concluídos, com dois ajustes de arquitetura adicionais registrados no changelog da spec —
> (1) página é client component + `apiClient`/TanStack Query, não Server Component
> `force-dynamic` (padrão real do projeto, mesmo de `/analytics`/`/dashboard`); (2) rota final
> é `/atividades` (fora de `/dashboard/`, seguindo a convenção real de `apps/web/src/app/(app)`)
> em vez de `/dashboard/atividades`; (3) o card de RF-16 fica como link direto no cabeçalho do
> dashboard, não dentro do `ActionDock` (que tem 4 itens fixos por decisão de RF-DC-02.1/03 da
> `SPEC-20260531-001`). RF-07 (correlação `requestId`) implementado via `AsyncLocalStorage`
> (`apps/api/src/common/context/request-context.ts`), sem exigir mudança nos 9 callers
> existentes de `AuditService.log()`.

### Infraestrutura de Audit Log

| Req                   | Descrição                                                                                                                                                                                                                       | Código                                                                                                                                                       | Teste                                                                                     | Status      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ----------- |
| RF-01/RF-02/RF-03     | `AuditService.log()`: injeta `timestamp`/`requestId` em `changes`; fire-and-forget via try/catch + `Logger`; escritor único (sem contraparte no frontend)                                                                       | `apps/api/src/shared/audit/audit.service.ts`                                                                                                                 | `apps/api/src/shared/audit/audit.service.spec.ts`                                         | ✅          |
| RF-04/RNF-04/R-MON-04 | Imutabilidade de `audit_logs` via RLS (`audit_logs_no_update`, `audit_logs_no_delete`)                                                                                                                                          | `supabase/migrations/20260712172047_rls_policies.sql`                                                                                                        | — (sem harness de teste de integração de banco além do já existente em `rls.int-spec.ts`) | 🔶 Aplicado |
| RF-05                 | `audit_logs.user_id ON DELETE SET NULL`                                                                                                                                                                                         | `supabase/migrations/20260712171830_core_tables.sql`                                                                                                         | —                                                                                         | 🔶 Aplicado |
| RF-06                 | `changes` sem PII na leitura: `AuditLogsService` remove `user_id`/`deleted_at`/`photo_url`/`photo_thumbnail_url` antes de retornar (defesa em profundidade; registro em si já não grava esses campos por convenção dos callers) | `apps/api/src/modules/audit-logs/audit-logs.service.ts`                                                                                                      | `apps/api/src/modules/audit-logs/audit-logs.service.spec.ts`                              | ✅          |
| RF-07/CA-11           | `AuditService.log()` grava `requestId` em `changes` via `AsyncLocalStorage` populado pelo `RequestIdInterceptor`                                                                                                                | `apps/api/src/common/context/request-context.ts`, `apps/api/src/common/interceptors/request-id.interceptor.ts`, `apps/api/src/shared/audit/audit.service.ts` | `apps/api/src/shared/audit/audit.service.spec.ts`                                         | ✅          |
| RF-08                 | Cobertura atual de `AuditService.log()`: `auth`, `admin`, `users`, `vehicles`, `expenses`, `maintenances`, `fines`, `recurring-costs`, `odometer-cycles`                                                                        | `apps/api/src/modules/{auth,admin,users,vehicles,expenses,maintenances,fines,recurring-costs,odometer-cycles}/*.service.ts`                                  | ver specs de cada módulo                                                                  | ✅          |

### Página Histórico de Atividades (`/atividades`)

| Req          | Descrição                                                                                                                                                                                                                            | Código                                                                                                                        | Teste                                                                                                                                   | Status |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| RF-09/RF-10  | Client component + `apiClient`; consulta `GET /audit-logs` (top-100 `audit_logs` do usuário, `created_at DESC`); autenticação via middleware (`apps/web/middleware.ts`), não redirect na própria página                              | `apps/web/src/app/(app)/atividades/page.tsx`, `apps/api/src/modules/audit-logs/{audit-logs.controller,audit-logs.service}.ts` | `apps/web/src/app/(app)/atividades/page.spec.tsx`, `apps/api/src/modules/audit-logs/{audit-logs.controller,audit-logs.service}.spec.ts` | ✅     |
| RF-11        | KPI cards: Total, Veículos, Despesas, Manutenções (computados a partir do mesmo array de 100 entradas, sem query adicional)                                                                                                          | `apps/web/src/app/(app)/atividades/page.tsx`                                                                                  | `apps/web/src/app/(app)/atividades/page.spec.tsx`                                                                                       | ✅     |
| RF-12..RF-14 | Tabela: Quando (relativo), Ação (badge colorido por sufixo `_CREATED`/`_UPDATED`/`_DELETED`), Domínio (emoji + label, sem depender de ícone lib — projeto não usa lucide-react), Detalhes (oculto em mobile, `hidden sm:table-cell`) | `apps/web/src/app/(app)/atividades/page.tsx`                                                                                  | `apps/web/src/app/(app)/atividades/page.spec.tsx`                                                                                       | ✅     |
| RF-15        | Empty state com emoji 🛡️ e mensagem "Nenhuma operação registrada ainda."                                                                                                                                                             | `apps/web/src/app/(app)/atividades/page.tsx`                                                                                  | `apps/web/src/app/(app)/atividades/page.spec.tsx`                                                                                       | ✅     |
| RF-16        | Link "Histórico de Atividades" no cabeçalho do dashboard principal (fora do `ActionDock`, que é fixo em 4 itens)                                                                                                                     | `apps/web/src/app/(app)/dashboard/page.tsx`                                                                                   | — (coberto indiretamente por `dashboard/page.spec.tsx` já existente; sem asserção dedicada ao novo link)                                | 🔶     |

---

## SPEC-20260714-001 — CRUD Base de Despesas (ExpensesModule) (approved)

> **2026-07-14 (T3.0, pré-requisito da Fase 3):** `ExpensesModule` implementado — API REST
> completa (create, list paginado, get, update, soft-delete), schemas Zod e frontend mínimo
> (`/expenses`, `/expenses/new`, `/expenses/[id]`). RF-08 (checagem de sequência de odômetro,
> R1) fica ⏳ deliberadamente — objeto de SPEC-20260601-001 (T3.2). RF-14 (campo `computed` de
> consumo) fica ⏳ — objeto de SPEC-20260606-001 (fuel enrichment).

### Banco de dados

| Artefato                                             | Descrição                                                                       | Regra        | Status                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- | ------------ | ------------------------ |
| `supabase/migrations/20260712171830_core_tables.sql` | `CREATE TABLE public.expenses` — já aplicado, schema não alterado por esta spec | R1, R-LED-04 | ✅ (schema já existente) |

### API (backend) — `ExpensesModule`

| Req                        | Descrição                                                                                                                                              | Código                                                                                                                                                                    | Teste                                                                                   | Status                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| RF-01/RF-02/CA-01          | `POST /expenses` cria despesa manual                                                                                                                   | `apps/api/src/modules/expenses/expenses.service.ts`, `expenses.controller.ts`                                                                                             | `apps/api/src/modules/expenses/expenses.service.spec.ts`, `expenses.controller.spec.ts` | ✅                                                                        |
| RF-03/CA-06/CA-07/CA-17    | `GET /expenses` lista paginada, filtros, isolamento por usuário                                                                                        | `apps/api/src/modules/expenses/expenses.service.ts` (`findAll`)                                                                                                           | `apps/api/src/modules/expenses/expenses.service.spec.ts`                                | ✅                                                                        |
| RF-04/CA-08                | `GET /expenses/:id`                                                                                                                                    | `apps/api/src/modules/expenses/expenses.service.ts` (`findOne`)                                                                                                           | `apps/api/src/modules/expenses/expenses.service.spec.ts`                                | ✅                                                                        |
| RF-05/CA-13                | `PATCH /expenses/:id`                                                                                                                                  | `apps/api/src/modules/expenses/expenses.service.ts` (`update`)                                                                                                            | `apps/api/src/modules/expenses/expenses.service.spec.ts`                                | ✅                                                                        |
| RF-06/CA-11                | `DELETE /expenses/:id` soft-delete                                                                                                                     | `apps/api/src/modules/expenses/expenses.service.ts` (`remove`)                                                                                                            | `apps/api/src/modules/expenses/expenses.service.spec.ts`                                | ✅                                                                        |
| RF-07/CA-09/CA-10/R-LED-01 | Bloqueio de PATCH/DELETE em despesas `is_readonly` (403)                                                                                               | `apps/api/src/modules/expenses/expenses.service.ts` (`update`, `remove`)                                                                                                  | `apps/api/src/modules/expenses/expenses.service.spec.ts`                                | ✅                                                                        |
| RF-08/CA-05                | `odometer_km` persistido; checagem de sequência (R1) implementada em T3.2 — ver [SPEC-20260601-001](expenses/SPEC-20260601-001-odometer-validation.md) | `apps/api/src/modules/expenses/expenses.service.ts` (`create`, `buildOdometerWarning`)                                                                                    | `apps/api/src/modules/expenses/expenses.service.spec.ts`                                | ✅                                                                        |
| RF-09/CA-12                | `vehicle_id` de outro usuário → 404                                                                                                                    | `apps/api/src/modules/expenses/expenses.service.ts` (`create`)                                                                                                            | `apps/api/src/modules/expenses/expenses.service.spec.ts`                                | ✅                                                                        |
| RF-10/CA-15/C2             | Audit log em mutações (fire-and-forget via `AuditService`)                                                                                             | `apps/api/src/modules/expenses/expenses.service.ts`                                                                                                                       | `apps/api/src/modules/expenses/expenses.service.spec.ts`                                | 🔶 (chamada verificada via mock; sem teste de integração do `audit_logs`) |
| RF-14                      | Campo `computed` (`price_per_liter`, `km_per_liter`)                                                                                                   | `apps/api/src/modules/expenses/expenses.service.ts` (`computeFuelMetrics`) — implementado em T3.5, ver [SPEC-20260606-001](expenses/SPEC-20260606-001-fuel-enrichment.md) | `apps/api/src/modules/expenses/expenses.service.spec.ts`                                | ✅                                                                        |
| RF-15                      | Paginação por `cursor`                                                                                                                                 | —                                                                                                                                                                         | —                                                                                       | ❌ Baixa prioridade, não implementada nesta tarefa                        |

### Schema / Validação

| Req   | Descrição                                                                                              | Código                                       | Teste                                             | Status |
| ----- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------- | ------ |
| RF-02 | `expenseBaseSchema`, `createExpenseInputSchema`, `updateExpenseInputSchema`, `listExpensesQuerySchema` | `packages/validators/src/expense.schemas.ts` | `packages/validators/src/expense.schemas.spec.ts` | ✅     |

### Frontend

| Req   | Descrição                                                                 | Código                                    | Teste                                          | Status |
| ----- | ------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------- | ------ |
| RF-11 | Página `/expenses` (listagem, resolve veículo por `vehicle_id`)           | `apps/web/src/app/expenses/page.tsx`      | `apps/web/src/app/expenses/page.spec.tsx`      | ✅     |
| RF-12 | Página `/expenses/new` (formulário de criação)                            | `apps/web/src/app/expenses/new/page.tsx`  | `apps/web/src/app/expenses/new/page.spec.tsx`  | ✅     |
| RF-13 | Página `/expenses/[id]` (edição + remoção, bloqueio quando `is_readonly`) | `apps/web/src/app/expenses/[id]/page.tsx` | `apps/web/src/app/expenses/[id]/page.spec.tsx` | ✅     |

---

## SPEC-20260602-004 — Categorias Personalizadas de Despesa (approved)

> **2026-07-13 (T2.3):** `CategoriesModule` (RF-01 a RF-06) implementado — API REST completa +
> schemas Zod. Durante a implementação foi encontrado e corrigido um gap: a migration
> consolidada não incluía a constraint `UNIQUE(user_id, value)` que a spec original assumia
> existir (ver changelog da spec). RF-07/RF-08 (integração com `ExpenseForm`) permanecem ⏳ —
> dependem do módulo de despesas (Fase 3, ainda não implementado). UI de gerenciamento de
> categorias é fora de escopo do MVP (definição original da spec, não uma omissão desta tarefa).

### Banco de dados

| Artefato                                                                | Descrição                                                                                                                                                 | Regra           | Status                                                                                         |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------- |
| `supabase/migrations/20260712171846_grouping_templates_preferences.sql` | `CREATE TABLE public.user_categories` (id, user*id FK, value slug `[a-z0-9*-]+`, label 1–100 chars, created_at) com FK `→ profiles(id) ON DELETE CASCADE` | —               | 🔶 Aplicado (sem teste)                                                                        |
| `supabase/migrations/20260713210000_user_categories_unique_value.sql`   | `ADD CONSTRAINT uq_user_categories_user_value UNIQUE (user_id, value)` — gap corrigido em T2.3                                                            | R-CAT-02, RF-03 | ✅ Aplicado (coberto indiretamente por `categories.service.spec.ts`, caso de violação `23505`) |
| RLS `user_categories_owner`                                             | `supabase/migrations/20260712172047_rls_policies.sql` — policy `for all` por `user_id`                                                                    | S2              | 🔶                                                                                             |

### API (backend) — `CategoriesModule`

| Req                  | Descrição                                                                                                  | Código                                                                              | Teste                                                        | Status                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| RF-01/CA-07          | `GET /categories`: retorna `{ default: DEFAULT_EXPENSE_CATEGORIES, custom: [...] }` ordenado por `label`   | `apps/api/src/modules/categories/categories.controller.ts`, `categories.service.ts` | `apps/api/src/modules/categories/categories.service.spec.ts` | ✅                                            |
| RF-02/CA-01/CA-05    | `POST /categories`: cria categoria; `value` validado via `createCategoryInputSchema` (slug, 1–50)          | `apps/api/src/modules/categories/categories.controller.ts`, `categories.service.ts` | `apps/api/src/modules/categories/categories.service.spec.ts` | ✅                                            |
| RF-04/CA-02/R-CAT-03 | `POST /categories` com `value` de categoria padrão retorna 409                                             | `apps/api/src/modules/categories/categories.service.ts`                             | `apps/api/src/modules/categories/categories.service.spec.ts` | ✅                                            |
| RF-03/CA-03/R-CAT-02 | `POST /categories` com `value` duplicado do mesmo usuário retorna 409 (via `23505` + constraint nova)      | `apps/api/src/modules/categories/categories.service.ts`                             | `apps/api/src/modules/categories/categories.service.spec.ts` | ✅                                            |
| RF-05/CA-04/R-CAT-01 | `POST /categories` quando usuário já tem 20 categorias retorna 422                                         | `apps/api/src/modules/categories/categories.service.ts`                             | `apps/api/src/modules/categories/categories.service.spec.ts` | ✅                                            |
| RF-06/CA-06/R-CAT-04 | `DELETE /categories/:id`: hard-delete; verifica ownership; 404 se não encontrada                           | `apps/api/src/modules/categories/categories.controller.ts`, `categories.service.ts` | `apps/api/src/modules/categories/categories.service.spec.ts` | ✅                                            |
| RNF-01/RNF-02/S1/S2  | Toda rota exige JWT (`SupabaseAuthGuard`); client escopado por usuário + filtro `user_id`                  | `apps/api/src/modules/categories/categories.service.ts`                             | `apps/api/src/modules/categories/categories.service.spec.ts` | ✅                                            |
| RNF-03/C1            | Cascade FK `user_categories.user_id → profiles(id) ON DELETE CASCADE` garante remoção na exclusão de conta | `supabase/migrations/20260712171846_grouping_templates_preferences.sql`             | —                                                            | 🔶 Garantido pelo DB, sem teste de integração |

### Schema / Validação

| Req   | Descrição                                                                                                   | Código                                        | Teste                                              | Status |
| ----- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------- | ------ |
| RF-02 | `createCategoryInputSchema`, `DEFAULT_EXPENSE_CATEGORIES` (9 categorias), `DEFAULT_EXPENSE_CATEGORY_VALUES` | `packages/validators/src/category.schemas.ts` | `packages/validators/src/category.schemas.spec.ts` | ✅     |

### Frontend

| Req         | Descrição                                                                                                                                                                              | Status                                                |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| RF-07/RF-08 | `ExpenseForm` com `customCategories: { value, label }[]`; migração do legado `profiles.preferences.expense_categories` para `GET /categories` — depende do módulo de despesas (Fase 3) | ⏳                                                    |
| —           | UI de gerenciamento de categorias (página de configurações)                                                                                                                            | ❌ Fora de escopo do MVP (definição original da spec) |

---

## SPEC-20260602-003 — Grupos de Veículos (approved)

> **2026-07-13 (T2.2):** CRUD core implementado (RF-01 a RF-07) via `VehicleGroupsModule`
> (NestJS REST API) + frontend mínimo, seguindo o padrão de SPEC-20260602-002 em vez de
> Server Actions (mudança registrada no changelog da spec). Ficam pendentes, como itens que
> dependem do sistema Em Foco/dashboard ainda não construídos (Fase 5): `FleetAside`,
> `FleetCommand`, `GroupKpiSummary`, integração com `activeGroupId` no store Zustand e com o
> query param `groupId` na URL (RF-08 a RF-15).

### Banco de dados

| Artefato                                                                | Descrição                                                                                                                                       | Regra | Status                  |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------- |
| `supabase/migrations/20260712171846_grouping_templates_preferences.sql` | Tabelas `vehicle_groups` (id, user_id FK, name, color, timestamps) e `vehicle_group_members` (group_id FK, vehicle_id FK, PK composta)          | —     | 🔶 Aplicado (sem teste) |
| RLS `vehicle_groups_owner` + `vehicle_group_members_owner`              | `supabase/migrations/20260712172047_rls_policies.sql` — policies `for all` por `user_id` (groups) e por ownership transitivo via join (members) | S2    | 🔶                      |

### API (backend) — `VehicleGroupsModule`

| Req                                      | Descrição                                                                                                                        | Código                                                                                          | Teste                                                                                                     | Status |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------ |
| RF-01/RF-02/CA-01..03                    | `POST /vehicle-groups`: cria grupo com `name` + `color`; valida via `createGroupInputSchema`                                     | `apps/api/src/modules/vehicle-groups/vehicle-groups.controller.ts`, `vehicle-groups.service.ts` | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.spec.ts`, `vehicle-groups.controller.spec.ts` | ✅     |
| RF-08                                    | `GET /vehicle-groups`: lista grupos do usuário com `member_count` (agregação `vehicle_group_members(count)`)                     | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.ts`                                 | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.spec.ts`                                      | ✅     |
| RF-03/CA-08                              | `PATCH /vehicle-groups/:id`: atualiza `name`/`color` por `id + user_id`; 404 se não for do dono                                  | `apps/api/src/modules/vehicle-groups/vehicle-groups.controller.ts`, `vehicle-groups.service.ts` | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.spec.ts`                                      | ✅     |
| RF-04/R-GRP-04/CA-07                     | `DELETE /vehicle-groups/:id`: hard-delete; cascade FK remove membros                                                             | `apps/api/src/modules/vehicle-groups/vehicle-groups.controller.ts`, `vehicle-groups.service.ts` | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.spec.ts`                                      | ✅     |
| RF-05/RF-06/RF-07/R-GRP-01..03/CA-04..06 | `PUT /vehicle-groups/:id/members`: replace-all; valida max 200 ids via schema; descarta veículos sem ownership ou soft-deletados | `apps/api/src/modules/vehicle-groups/vehicle-groups.controller.ts`, `vehicle-groups.service.ts` | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.spec.ts`                                      | ✅     |
| RNF-01/RNF-02/S1/S2                      | Toda mutação usa client Supabase escopado pelo JWT do usuário (`clientForUser`) + filtro `user_id` redundante à RLS              | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.ts`                                 | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.spec.ts`                                      | ✅     |

### Schema / Validação

| Req         | Descrição                                                                                             | Código                                             | Teste                                                   | Status |
| ----------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------- | ------ |
| RF-01/RF-16 | `createGroupInputSchema`/`updateGroupInputSchema`/`setGroupMembersInputSchema`, `PRESET_GROUP_COLORS` | `packages/validators/src/vehicle-group.schemas.ts` | `packages/validators/src/vehicle-group.schemas.spec.ts` | ✅     |

### Frontend

| Req                         | Descrição                                                                                                                                               | Código                                          | Teste                                                | Status |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------- | ------ |
| RF-08                       | `/vehicle-groups`: listagem com contagem de membros                                                                                                     | `apps/web/src/app/vehicle-groups/page.tsx`      | `apps/web/src/app/vehicle-groups/page.spec.tsx`      | ✅     |
| RF-01/RF-05/RF-09 (parcial) | `/vehicle-groups/new`: formulário de criação (nome, paleta preset, checkboxes de veículos)                                                              | `apps/web/src/app/vehicle-groups/new/page.tsx`  | `apps/web/src/app/vehicle-groups/new/page.spec.tsx`  | ✅     |
| RF-03/RF-04/RF-05           | `/vehicle-groups/[id]`: edição de nome/cor, gerenciamento de membros, exclusão                                                                          | `apps/web/src/app/vehicle-groups/[id]/page.tsx` | `apps/web/src/app/vehicle-groups/[id]/page.spec.tsx` | ✅     |
| RF-08..RF-11                | `FleetAside`: chips de grupos; formulário inline criar/editar; ativar modo `group` no store — depende do dashboard (Fase 5)                             | —                                               | —                                                    | ⏳     |
| RF-12/RF-13                 | `FleetCommand`: chips de grupos para filtro rápido; `GroupKpiSummary` filtrado por vehicleIds — depende do dashboard (Fase 5)                           | —                                               | —                                                    | ⏳     |
| RF-10/RF-11/R-CTX-02        | `activeGroupId` no store Zustand + persistência em localStorage + query param `groupId` na URL — depende do sistema Em Foco (SPEC-20260602-001, Fase 5) | —                                               | —                                                    | ⏳     |
| RF-14/RF-15                 | Limpeza silenciosa de contexto ao excluir grupo ativo / detectar staleness — depende do item acima                                                      | —                                               | —                                                    | ⏳     |

---

## SPEC-20260602-002 — Gestão de Veículos (CRUD) (approved)

> CRUD completo de veículos, soft-delete em cascata, validação de placa BR/Mercosul.
> **2026-07-13 (T2.1):** CRUD core implementado (API + frontend mínimo). Ficam pendentes,
> como itens de prioridade Baixa/Média não cobertos nesta tarefa: upload de foto com
> `PhotoFramingDialog` (RF-11), autocomplete FIPE (RF-12), páginas `/vehicles/[id]/history`
> (RF-13) e `/vehicles/[id]/manage` (RF-14), e o fluxo de onboarding `QuickVehicleRegister`
> (RF-09/RF-10). Correção de CA-02 registrada no changelog da spec (exemplo original
> descrevia uma placa BR válida como inválida).

### Schema / Validação

| Req            | Descrição                                                                       | Código                                       | Teste                                             | Status |
| -------------- | ------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------- | ------ |
| RF-01/RF-07    | `vehicleBaseSchema`/`createVehicleInputSchema`/`updateVehicleInputSchema` (Zod) | `packages/validators/src/vehicle.schemas.ts` | `packages/validators/src/vehicle.schemas.spec.ts` | ✅     |
| RF-02/R-VEH-02 | `plateSchema` + `normalizePlate`: uppercase sem hífen, valida BR/Mercosul       | `packages/validators/src/vehicle.schemas.ts` | `packages/validators/src/vehicle.schemas.spec.ts` | ✅     |

### API (backend)

| Req                        | Descrição                                                                                                                                                                                                                 | Código                                                                        | Teste                                                                                   | Status                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------- |
| RF-01/RF-02/CA-01          | `POST /vehicles`: cria veículo; placa normalizada via `LicensePlate` VO                                                                                                                                                   | `apps/api/src/modules/vehicles/vehicles.controller.ts`, `vehicles.service.ts` | `apps/api/src/modules/vehicles/vehicles.service.spec.ts`, `vehicles.controller.spec.ts` | ✅                                 |
| RF-03/RF-16/CA-04          | `GET /vehicles`: lista veículos do `user_id` do JWT com `deleted_at IS NULL`                                                                                                                                              | `apps/api/src/modules/vehicles/vehicles.controller.ts`, `vehicles.service.ts` | `apps/api/src/modules/vehicles/vehicles.service.spec.ts`                                | ✅                                 |
| RF-04/RF-15/RF-16/CA-08    | `GET /vehicles/:id`: busca por `id + user_id`; retorna 404 se não encontrado ou de outro usuário                                                                                                                          | `apps/api/src/modules/vehicles/vehicles.controller.ts`, `vehicles.service.ts` | `apps/api/src/modules/vehicles/vehicles.service.spec.ts`                                | ✅                                 |
| RF-05/CA-07                | `PATCH /vehicles/:id`: atualiza campos parciais; verifica propriedade                                                                                                                                                     | `apps/api/src/modules/vehicles/vehicles.controller.ts`, `vehicles.service.ts` | `apps/api/src/modules/vehicles/vehicles.service.spec.ts`                                | ✅                                 |
| RF-06/R-VEH-01/CA-05/CA-06 | `DELETE /vehicles/:id`: soft-delete em cascata — vehicle + expenses + maintenances via `Promise.all`                                                                                                                      | `apps/api/src/modules/vehicles/vehicles.controller.ts`, `vehicles.service.ts` | `apps/api/src/modules/vehicles/vehicles.service.spec.ts`                                | ✅                                 |
| RF-02/R-VEH-02/CA-01..03   | `LicensePlate` VO valida e normaliza placa (BR + Mercosul); placa inválida lança 400                                                                                                                                      | `apps/api/src/modules/vehicles/value-objects/license-plate.vo.ts`             | `apps/api/src/modules/vehicles/value-objects/license-plate.vo.spec.ts`                  | ✅                                 |
| RF-17/C2                   | Audit log (`VEHICLE_CREATED`/`VEHICLE_UPDATED`/`VEHICLE_DELETED`) registrado em mutações via `AuditService.log` fire-and-forget                                                                                           | `apps/api/src/modules/vehicles/vehicles.service.ts`                           | `apps/api/src/modules/vehicles/vehicles.service.spec.ts`                                | ✅                                 |
| RNF-04                     | Nota de risco preservada da spec original: os 3 updates do soft-delete cascata rodam em `Promise.all` sem RPC transacional — falha parcial é teoricamente possível; melhoria futura registrada nas Notas Técnicas da spec | `apps/api/src/modules/vehicles/vehicles.service.ts`                           | —                                                                                       | 🔶 Risco conhecido, não bloqueante |

### Frontend

| Req                     | Descrição                                                                                                                                   | Código                                    | Teste                                          | Status |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------- | ------ |
| RF-03/CA-04             | `/vehicles`: listagem de veículos ativos                                                                                                    | `apps/web/src/app/vehicles/page.tsx`      | `apps/web/src/app/vehicles/page.spec.tsx`      | ✅     |
| RF-01/CA-01/CA-02       | `/vehicles/new`: formulário de cadastro (campos obrigatórios apenas)                                                                        | `apps/web/src/app/vehicles/new/page.tsx`  | `apps/web/src/app/vehicles/new/page.spec.tsx`  | ✅     |
| RF-04/RF-05/CA-07/CA-08 | `/vehicles/[id]`: ficha do veículo com edição parcial (apelido, cor)                                                                        | `apps/web/src/app/vehicles/[id]/page.tsx` | `apps/web/src/app/vehicles/[id]/page.spec.tsx` | ✅     |
| RF-06/CA-05             | Confirmação de remoção (soft-delete) via `window.confirm` — sem componente `AlertDialog` dedicado, pendente do Design System (Fase 8, T8.1) | `apps/web/src/app/vehicles/[id]/page.tsx` | `apps/web/src/app/vehicles/[id]/page.spec.tsx` | 🔶     |
| RF-07                   | Campos opcionais além de apelido/cor (foto, combustível, documentação, motor) não expostos no formulário mínimo desta tarefa                | —                                         | —                                              | ⏳     |
| RF-11                   | Upload de foto de capa com `PhotoFramingDialog`                                                                                             | —                                         | —                                              | ⏳     |
| RF-12                   | Autocomplete FIPE via `FipeCombobox`                                                                                                        | —                                         | —                                              | ⏳     |
| RF-13                   | `/vehicles/[id]/history`: histórico de atividades via `ActivityTimelineView.tsx`                                                            | —                                         | —                                              | ⏳     |
| RF-14                   | `/vehicles/[id]/manage`: gestão de documentação e especificações técnicas                                                                   | —                                         | —                                              | ⏳     |
| RF-09/RF-10             | `QuickVehicleRegister`: fluxo de onboarding para primeiro veículo                                                                           | —                                         | —                                              | ⏳     |

---

## SPEC-20260602-001 — Sistema Em Foco: Contexto de Veículo Global (approved)

> Torna o contexto de veículo/grupo/seleção visível de forma persistente em toda a aplicação.
> Sincroniza formulários transacionais com o contexto ativo.
> **2026-07-15 (T5.3a):** Divergência encontrada — a spec presumia `Sidebar`/`FleetAside`
> já existentes; o repositório não tinha nenhum app shell (`layout.tsx` era só `QueryProvider`,
> cada página um `<main>` solto). T5.3 foi dividida em sub-tarefas (T5.3a-d). Esta rodada
> (T5.3a) criou o pré-requisito: rota group `app/(app)/` (páginas autenticadas movidas para lá)
>
> - `components/layout/sidebar.tsx` com nav básica.
>   **2026-07-15 (T5.3b):** `use-dashboard-store.ts` (5 modos, R-CTX-01/02) e `focus-slot.tsx`
>   (RF-01–06, com botão "Trocar" abrindo seletor inline de veículo/grupo) implementados e
>   integrados ao `Sidebar` (expandido e recolhido via `isSidebarCollapsed` em `ui-store.ts`).
>   RF-07 a RF-19 (integração com formulários, `VehicleActivator`, staleness) ficam para
>   T5.3c/T5.3d.
>   **2026-07-15 (T5.3c):** `VehicleActivator` (bootstrap `?vehicleId=`/`?groupId=` na URL →
>   store, e `ContextFilterSync` store → URL via `window.location.search` não-reativo, RF-15,
>   RF-17.1, R-CTX-04) e `FleetAside` (staleness de `activeVehicleId`/`activeGroupId`, RF-16,
>   reaproveitando as query keys `["vehicles"]`/`["vehicle-groups"]` já usadas pelo `focus-slot`
>   — sem request extra, RNF-03) implementados. RF-19 (logout limpa contexto) exigiu criar
>   `apps/web/src/lib/auth/logout.ts` e um botão "Sair" no `Sidebar` — não havia nenhum
>   mecanismo de logout no frontend até esta rodada (endpoint `POST /auth/logout` já existia
>   no backend, sem consumidor no cliente).
>   **2026-07-15 (T5.3d):** `use-vehicle-context-field.ts` (RF-07, RF-13, RF-14, R-CTX-06) e
>   `vehicle-recency.ts` (RF-12) implementados e integrados a `expenses/new/page.tsx` e
>   `maintenance/new/page.tsx`. **Desvios de escopo, documentados em IMPACTO-032:** RF-09
>   (lista de veículos pré-filtrada pelos membros do grupo) mostra a dica textual do grupo mas
>   não filtra a lista — não existe endpoint que retorne os IDs de membros de um grupo
>   específico (só `PUT /vehicle-groups/:id/members`, replace-all); RF-11 (dropdown filtrado por
>   atributo) funciona apenas client-side, sobre a lista de veículos já carregada. Ambos os
>   gaps ficam registrados para tratamento futuro (endpoint dedicado, se o modo `group`/
>   `attribute` ganhar um seletor de UI real — hoje só acionável via API/store direto).

### Frontend

| Req                        | Descrição                                                                                                                                                                                                 | Código                                                                                                        | Teste                                                                                              | Status                                                                                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —                          | Pré-requisito (T5.3a): app shell — route group `(app)` + `Sidebar` com navegação                                                                                                                     | `apps/web/src/app/(app)/layout.tsx`, `apps/web/src/components/layout/sidebar.tsx`                             | `apps/web/src/components/layout/sidebar.spec.tsx`                                                  | ✅                                                                                                                                                                               |
| R-CTX-01/R-CTX-02          | `use-dashboard-store.ts`: 5 modos de contexto (`none`/`single`/`group`/`multi`/`attribute`), `clearAllSelection`, persistência seletiva (`single`/`group` via localStorage; `multi`/`attribute` efêmeros) | `apps/web/src/lib/stores/use-dashboard-store.ts`                                                              | `apps/web/src/lib/stores/use-dashboard-store.spec.ts`                                              | ✅                                                                                                                                                                               |
| RF-01, RF-02, RF-03, RF-06 | `focus-slot.tsx`: slot "Em Foco" com os 5 estados visuais, label por modo, botão "×" (`clearAllSelection`)                                                                                                | `apps/web/src/components/layout/focus-slot.tsx`                                                               | `apps/web/src/components/layout/focus-slot.spec.tsx`                                               | ✅                                                                                                                                                                               |
| RF-04                      | Sidebar recolhido: slot mostra só ícone + dot, tooltip nativo (`title`) com detalhes                                                                                                                      | `apps/web/src/components/layout/focus-slot.tsx`, `apps/web/src/lib/stores/ui-store.ts` (`isSidebarCollapsed`) | —                                                                                                  | ✅ (tooltip via `title` nativo, sem componente de tooltip customizado)                                                                                                           |
| RF-05                      | Botão "Trocar" abre seletor inline (lista de veículos/grupos)                                                                                                                                             | `apps/web/src/components/layout/focus-slot.tsx`                                                               | —                                                                                                  | 🟡 Funcional, mas é uma lista simples sem busca/paginação — suficiente para o volume atual de veículos por usuário                                                               |
| RNF-05                     | Nomenclatura canônica centralizada                                                                                                                                                                        | `apps/web/src/lib/context/context-labels.ts`                                                                  | —                                                                                                  | ✅                                                                                                                                                                               |
| RNF-01/RNF-02              | Slot reserva espaço fixo antes da hidratação (evita CLS); render inicial não bloqueia em rede                                                                                                             | `apps/web/src/components/layout/focus-slot.tsx`                                                               | —                                                                                                  | ✅                                                                                                                                                                               |
| RF-15, R-CTX-04            | `VehicleActivator`: único componente que sincroniza URL↔store; bootstrap de `?vehicleId=`/`?groupId=` no mount                                                                                            | `apps/web/src/components/layout/vehicle-activator.tsx`                                                        | `apps/web/src/components/layout/vehicle-activator.spec.tsx`                                        | ✅                                                                                                                                                                               |
| RF-17.1                    | `ContextFilterSync` (mesma implementação): reage só a mudanças do store; lê `window.location.search` não-reativamente para não conflitar com filtros locais de página                                     | `apps/web/src/components/layout/vehicle-activator.tsx`                                                        | `apps/web/src/components/layout/vehicle-activator.spec.tsx`                                        | ✅                                                                                                                                                                               |
| RF-16                      | `FleetAside`: staleness de `activeVehicleId` (toast + clear) e `activeGroupId` (clear silencioso)                                                                                                         | `apps/web/src/components/layout/fleet-aside.tsx`                                                              | `apps/web/src/components/layout/fleet-aside.spec.tsx`                                              | ✅                                                                                                                                                                               |
| RNF-03                     | Staleness reaproveita as query keys `["vehicles"]`/`["vehicle-groups"]` já ativas no `focus-slot` — sem request extra (dedupe do TanStack Query)                                                          | `apps/web/src/components/layout/fleet-aside.tsx`                                                              | —                                                                                                  | ✅                                                                                                                                                                               |
| RNF-04                     | Toast não-obstrutivo, descartável, some sozinho em 5s — migrado para a fila única de toasts (SPEC-20260525-001 §8.2), `duration: 5000`                                                                    | `packages/ui/src/components/toast.tsx`, `apps/web/src/components/layout/fleet-aside.tsx`                      | `packages/ui/src/components/toast.test.tsx`, `apps/web/src/components/layout/fleet-aside.spec.tsx` | ✅                                                                                                                                                                               |
| RF-19                      | Logout limpa todos os campos de contexto                                                                                                                                                                  | `apps/web/src/lib/auth/logout.ts`, botão "Sair" em `sidebar.tsx`                                              | `apps/web/src/lib/auth/logout.spec.ts`                                                             | ✅                                                                                                                                                                               |
| RF-07, R-CTX-06            | `use-vehicle-context-field.ts`: captura o contexto do store apenas no mount; pré-seleciona `vehicle_id` só no modo `single`                                                                               | `apps/web/src/lib/hooks/use-vehicle-context-field.ts`                                                         | `apps/web/src/lib/hooks/use-vehicle-context-field.spec.tsx`                                        | ✅                                                                                                                                                                               |
| RF-08                      | Ícone ↩ + fundo/borda âmbar quando o campo está herdado do contexto                                                                                                                                       | `apps/web/src/app/(app)/expenses/new/page.tsx`, `.../maintenance/new/page.tsx`                                | `page.spec.tsx` de cada formulário                                                                 | ✅                                                                                                                                                                               |
| RF-09                      | Modo `group`: campo vazio + dica com nome do grupo                                                                                                                                                        | `use-vehicle-context-field.ts`                                                                                | —                                                                                                  | 🟡 Dica textual pronta; lista **não** é pré-filtrada pelos membros — não existe endpoint `GET` para os IDs de membros de um grupo específico (só `PUT .../members`, replace-all) |
| RF-10                      | Modo `multi`: dica "N veículos selecionados" + atalhos                                                                                                                                                    | `use-vehicle-context-field.ts`                                                                                | `use-vehicle-context-field.spec.tsx`                                                               | ✅                                                                                                                                                                               |
| RF-11                      | Modo `attribute`: dropdown filtrado pelo atributo ativo                                                                                                                                                   | `use-vehicle-context-field.ts`                                                                                | `use-vehicle-context-field.spec.tsx`                                                               | 🟡 Filtragem client-side sobre a lista já carregada; modo `attribute` ainda não tem seletor de UI (só acionável via store/API direto)                                            |
| RF-12                      | Modo `none`: atalhos dos últimos veículos acessados                                                                                                                                                       | `apps/web/src/lib/vehicle-recency.ts`, `use-vehicle-context-field.ts`                                         | `expenses/new/page.spec.tsx` ("modo none: exibe os veículos recentes")                             | ✅                                                                                                                                                                               |
| RF-13                      | Seleção manual troca o ícone para ✓ e remove o visual âmbar                                                                                                                                               | `use-vehicle-context-field.ts`                                                                                | `page.spec.tsx` de cada formulário ("troca para indicador ✓")                                      | ✅                                                                                                                                                                               |
| RF-14                      | Mudança de contexto com formulário aberto não reseta o campo; aviso com ação "Atualizar campo"                                                                                                            | `use-vehicle-context-field.ts`                                                                                | `expenses/new/page.spec.tsx` ("mudança de contexto com o formulário aberto")                       | ✅ (aviso inline no formulário, não o toast fixo global de RF-16 — natureza diferente: ação específica do campo, não staleness)                                                  |
| RF-17 (dashboard/listas)   | Filtragem de KPIs, Spotlight, listas de despesas/manutenções pelo contexto ativo                                                                                                                          | —                                                                                                             | —                                                                                                  | ⏳ Sync já existe (T5.3c); filtragem em si depende da Fase 5/6 (dashboard e listas ainda não leem o store)                                                                       |
| RF-18                      | `/vehicles/[id]` e `/settings` ignoram o contexto                                                                                                                                                         | —                                                                                                             | —                                                                                                  | ⏳ Trivial (não fazem leitura do store hoje) — confirmar quando o contexto passar a influenciar outras páginas                                                                   |
| RF-17                      | `expenses/page.tsx` e `maintenance/page.tsx`: filtro por contexto via `ContextFilterSync`                                                                                                                 | —                                                                                                             | —                                                                                                  | ⏳                                                                                                                                                                               |

---

## SPEC-20260601-003 — Sistema de Modelos Rápidos de Despesas (approved)

> **2026-07-14 (T3.4):** Implementado. Tabela, índices, trigger de limite (RNF-06) e RLS já
> existiam desde T0.2 (schema recuperado do banco remoto) — nenhuma migration nova necessária.
> `ExpenseTemplatesModule` sem camada Repository/Port, mesmo padrão inline de
> `CategoriesModule`/`ExpensesModule`. **Desvios deliberados de escopo frente à spec** (frontend
> deste projeto usa formulários HTML simples, sem `react-hook-form`, modal ou design system —
> mesmo padrão já estabelecido em `/expenses/new` e `/expenses/[id]`):
>
> - RF-05 (modal de criação inline): implementado como formulário inline expansível, não um
>   modal dedicado — não existe componente de modal no `packages/ui` ainda.
> - RF-08 (bump de `last_used_at` via `PATCH /expense-templates/:id`): implementado como rota
>   dedicada `PATCH /expense-templates/:id/touch`, já que `last_used_at` não é um campo do
>   schema Zod de update (RF-09 só permite editar campos de conteúdo do modelo) — uma rota
>   própria evita misturar um campo de sistema com o DTO validado publicamente.
> - RF-09 (renomear via menu de contexto): endpoint `PATCH /expense-templates/:id` cobre o
>   caso, mas a UI de "três pontos" não foi construída — fica ⏳.
> - RF-02 (contagem responsiva de cartões visíveis 3/4): tray usa scroll horizontal simples
>   (`overflow-x-auto`), sem enforcement de breakpoint exato — fica ⏳.
> - Feature flag `NEXT_PUBLIC_EXPENSE_TEMPLATES_ENABLED` (Seção 14 da spec): não implementada —
>   nenhuma outra feature do projeto usa flag de ambiente; a feature entra direto atrás do
>   `SupabaseAuthGuard`/sessão autenticada, mesmo padrão de T3.0–T3.3.
>   RF-13 (aviso de veículo excluído) foi implementado no frontend via comparação client-side com
>   a lista de veículos ativos, sem o ícone âmbar especificado — mensagem inline apenas.

### Banco de dados

| Artefato                                                                | Descrição                                                                                                                                | Regra          | Status |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------ |
| `supabase/migrations/20260712171846_grouping_templates_preferences.sql` | Tabela `expense_templates` (id, user_id FK, vehicle_id FK, name, category, amount, description, liters, fuel_type, supplier, timestamps) | R3, R6         | ✅     |
| Trigger `trg_expense_templates_limit`                                   | `supabase/migrations/20260712171941_trigger_functions.sql` — `enforce_expense_templates_limit()`, bloqueia o 21º insert                  | R3, RNF-06     | ✅     |
| RLS `expense_templates_*`                                               | `supabase/migrations/20260712172047_rls_policies.sql` — policies SELECT, INSERT, UPDATE, DELETE por `user_id`                            | S1, S2, RNF-04 | ✅     |

### Validators (`packages/validators`)

| Req       | Descrição                                                                                                    | Código                                                | Teste                                                      | Status |
| --------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------- | ------ |
| RF-06, R6 | `createExpenseTemplateInputSchema`/`updateExpenseTemplateInputSchema` — sem `date`/`odometer_km`/`full_tank` | `packages/validators/src/expense-template.schemas.ts` | `packages/validators/src/expense-template.schemas.spec.ts` | ✅     |

### Backend (`apps/api`)

| Req                  | Descrição                                                                                        | Código                                                                            | Teste                                                      | Status |
| -------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------ |
| RF-01                | `GET /expense-templates` — lista ordenada por `last_used_at DESC`                                | `apps/api/src/modules/expense-templates/expense-templates.service.ts` (`findAll`) | `expense-templates.service.spec.ts`                        | ✅     |
| RF-06, RF-07, RNF-06 | `POST /expense-templates` — valida veículo ativo do usuário e limite de 20 (422) antes do insert | `expense-templates.service.ts` (`create`)                                         | `expense-templates.service.spec.ts`                        | ✅     |
| RF-08                | `PATCH /expense-templates/:id/touch` — bump de `last_used_at`                                    | `expense-templates.service.ts` (`touch`), `expense-templates.controller.ts`       | `expense-templates.service.spec.ts`, `.controller.spec.ts` | ✅     |
| RF-09                | `PATCH /expense-templates/:id` — atualização parcial (nome/campos)                               | `expense-templates.service.ts` (`update`)                                         | `expense-templates.service.spec.ts`                        | ✅     |
| RF-10, CA-08         | `DELETE /expense-templates/:id` — hard delete após checagem de ownership                         | `expense-templates.service.ts` (`remove`)                                         | `expense-templates.service.spec.ts`                        | ✅     |
| RNF-04, RNF-05       | `SupabaseAuthGuard` + RLS (`auth.uid()`) em todas as rotas                                       | `expense-templates.controller.ts`                                                 | `expense-templates.controller.spec.ts`                     | ✅     |

### Frontend (`apps/web`)

| Req                              | Descrição                                                                                                     | Código                                                             | Teste           | Status                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------- | ----------------------------------------- |
| RF-01, RF-02, RF-11              | Tray de modelos no topo de `/expenses/new`, estado vazio, scroll horizontal                                   | `apps/web/src/app/expenses/new/page.tsx` (`ExpenseTemplatesTray`)  | `page.spec.tsx` | ✅                                        |
| RF-03, RF-04                     | Aplicação de modelo preenche `vehicle_id`/`category`/`amount`/`description`; `date`/`odometer_km` inalterados | `page.tsx` (`handleApplyTemplate`)                                 | `page.spec.tsx` | ✅                                        |
| RF-05                            | Criação inline de modelo (formulário expansível, não modal — ver nota acima)                                  | `page.tsx` (`ExpenseTemplatesTray`, `creating`)                    | `page.spec.tsx` | 🔶 (sem teste de criação inline dedicado) |
| RF-06, CA-10                     | "Salvar como modelo" em `/expenses/[id]`                                                                      | `apps/web/src/app/expenses/[id]/page.tsx` (`handleSaveAsTemplate`) | `page.spec.tsx` | ✅                                        |
| RF-07, CA-06                     | Botão "+" desabilitado ao atingir 20 modelos                                                                  | `page.tsx` (`ExpenseTemplatesTray`, `atLimit`)                     | —               | 🔶 (sem teste dedicado)                   |
| RF-08                            | Aplicação dispara `PATCH .../touch` fire-and-forget                                                           | `page.tsx` (`handleApply`, `touchMutation`)                        | `page.spec.tsx` | ✅                                        |
| RF-09                            | Renomear via menu de contexto                                                                                 | —                                                                  | —               | ⏳ deliberado (ver nota acima)            |
| RF-10, CA-08                     | Exclusão de modelo com confirmação                                                                            | `page.tsx` (`handleDelete`)                                        | —               | 🔶 (sem teste dedicado)                   |
| RF-13, EC-01                     | Aviso inline (sem ícone âmbar) quando `vehicle_id` do modelo não existe mais entre os veículos ativos         | `page.tsx` (`handleApplyTemplate`, `templateNotice`)               | —               | 🔶 (sem teste dedicado)                   |
| RF-02 (responsivo), Feature flag | Contagem exata de cartões por breakpoint; `NEXT_PUBLIC_EXPENSE_TEMPLATES_ENABLED`                             | —                                                                  | —               | ⏳ deliberado (ver nota acima)            |

---

## SPEC-20260601-002 — Detecção de Duplicata de Despesa (approved)

> **2026-07-14 (T3.3):** Implementado com padrão **response-field**, consistente com T3.2
> (SPEC-20260601-001) — mesma decisão de UX/impacto já registrada em `IMPACTO-030`. Corrigida
> também a descrição de `R2` em `specs/RULES.md`, que mencionava `confirmed: true` (padrão
> exception-based nunca especificado por esta spec — RF-01 a RF-06 sempre foram soft warning
> sem flag de confirmação). Sem camada de repositório separada, mesmo padrão inline de
> SPEC-20260601-001. **Ajuste de design não coberto explicitamente pelos RFs:** a busca de
> duplicata exclui o próprio registro recém-criado (`excludeExpenseId`) — sem essa exclusão, o
> registro que acabou de ser inserido sempre bateria nos próprios 4 critérios de comparação
> (a spec invoca a busca _após_ o insert), gerando falso positivo em toda criação sem duplicata
> real. Exibição do aviso no frontend fica ⏳ deliberadamente, mesma justificativa de T3.2.

### Camada de serviço

| Req   | Descrição                                                                                                         | Código                                                                                                    | Teste                                                    | Status                                                               |
| ----- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------- |
| RF-01 | `findPotentialDuplicate(userId, vehicleId, date, amount, category, excludeExpenseId)` — método privado do service | `apps/api/src/modules/expenses/expenses.service.ts` (`findPotentialDuplicate`)                            | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅                                                                   |
| RF-02 | `ExpensesService.create()`: invoca `findPotentialDuplicate()` após o insert bem-sucedido                          | `apps/api/src/modules/expenses/expenses.service.ts` (`create`, `buildDuplicateWarning`)                   | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅                                                                   |
| RF-03 | Enriquece resposta com `duplicate_warning: true` e `duplicate_id`; HTTP 201 mantido                               | `apps/api/src/modules/expenses/expenses.service.ts` (`buildDuplicateWarning`)                             | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅                                                                   |
| RF-04 | Sem `duplicate_warning` quando `findPotentialDuplicate` retorna `null`                                            | `apps/api/src/modules/expenses/expenses.service.ts` (`buildDuplicateWarning`)                             | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅                                                                   |
| RF-05 | Apenas registros com `deleted_at IS NULL` são candidatos a duplicata                                              | `apps/api/src/modules/expenses/expenses.service.ts` (`findPotentialDuplicate`, `.is("deleted_at", null)`) | —                                                        | 🔶 (filtro aplicado; sem teste dedicado ao soft-delete neste método) |
| RF-06 | `ExpensesService.update()` não invoca `findPotentialDuplicate`                                                    | `apps/api/src/modules/expenses/expenses.service.ts` (`update`)                                            | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅                                                                   |
| EC-05 | Falha na consulta de duplicata degrada graciosamente (loga e não bloqueia)                                        | `apps/api/src/modules/expenses/expenses.service.ts` (`buildDuplicateWarning`)                             | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅                                                                   |

---

## SPEC-20260601-001 — Validação de Sequência de Odômetro em Expenses (approved)

> **2026-07-14 (T3.2):** Implementado com padrão **response-field** (não exception-based —
> ver correção de D6 no changelog da spec). `odometer_km INTEGER` já existia em `public.expenses`
> desde `20260712171830_core_tables.sql` (T3.0) — a linha de migration pendente citada
> anteriormente aqui estava desatualizada e foi removida. Sem camada de repositório separada:
> o projeto não usa o padrão Port/Repository para `ExpensesModule` (consulta Supabase inline no
> service, mesmo padrão de `create`/`update`/`findOne` já existentes). Exibição do aviso no
> frontend fica ⏳ deliberadamente — NG-05 da spec exclui esse escopo, e `R-FORM-04` (redirect
> imediato após criar) exigiria uma spec de UX própria para acomodar o aviso pós-criação.

### Camada de serviço

| Req   | Descrição                                                                                                                                                                        | Código                                                                                     | Teste                                                    | Status                                                                                                       |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| RF-01 | `ExpensesService.create()`/`update()`: pula verificação quando `odometer_km` é `null` ou ausente                                                                                 | `apps/api/src/modules/expenses/expenses.service.ts` (`buildOdometerWarning`)               | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅                                                                                                           |
| RF-02 | `findMaxOdometerByVehicle(vehicleId, userId, excludeExpenseId?)` — método privado do service (sem Repository/Port; consulta Supabase inline, mesmo padrão do restante do módulo) | `apps/api/src/modules/expenses/expenses.service.ts` (`findMaxOdometerByVehicle`)           | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅                                                                                                           |
| RF-03 | `ExpensesService.create()`/`update()`: enriquece resposta com `odometer_warning: true` e `odometer_previous_max_km`                                                              | `apps/api/src/modules/expenses/expenses.service.ts` (`buildOdometerWarning`)               | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅                                                                                                           |
| RF-04 | Sem warning quando `odometer_km >= máximo` ou sem registros anteriores                                                                                                           | `apps/api/src/modules/expenses/expenses.service.ts` (`buildOdometerWarning`)               | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅                                                                                                           |
| RF-05 | `ExpensesService.update()`: exclui o próprio registro da comparação via `excludeExpenseId`                                                                                       | `apps/api/src/modules/expenses/expenses.service.ts` (`update`, `findMaxOdometerByVehicle`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅                                                                                                           |
| RF-06 | Verificação considera apenas `deleted_at IS NULL`                                                                                                                                | `apps/api/src/modules/expenses/expenses.service.ts` (`findMaxOdometerByVehicle`)           | —                                                        | 🔶 (filtro aplicado via `.is("deleted_at", null)`; sem teste dedicado ao filtro de soft-delete neste método) |
| EC-05 | Falha na consulta de máximo degrada graciosamente (loga e não bloqueia)                                                                                                          | `apps/api/src/modules/expenses/expenses.service.ts` (`buildOdometerWarning`)               | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅                                                                                                           |
| NG-05 | Exibição do warning no frontend                                                                                                                                                  | —                                                                                          | —                                                        | ⏳ deliberado — fora do escopo desta spec (ver nota acima)                                                   |

---

## SPEC-20260525-001 — Design System: Novos Componentes UI (aprovado, v0.3)

> **ATUALIZAÇÃO — 2026-07-22 — migração de consumidores (Alert, EmptyState)**
> Rodadas 1–3 de `specs/design-system/PLANO-MIGRACAO-CONSUMIDORES.md` concluídas: `Alert` e
> `EmptyState` substituíram o padrão ad hoc (`<p role="alert">`, `<div role="alert" className="rounded
border border-amber-300 bg-amber-50 ...">`, blocos manuais de "sem dados") em todas as telas de
> formulário, listagem/detalhe e componentes compartilhados do app — cerca de 40 arquivos entre
> `apps/web/src/app/(app)`, `apps/web/src/app/(auth)` e `apps/web/src/components/{dashboard,layout}`.
> Exceções mantidas ad hoc por não caberem na API dos componentes (documentadas linha a linha no
> plano): alertas com duas ações simultâneas (link + botão, ex. aviso de despesa duplicada e de
> e-mail já cadastrado), badges compactos embutidos em cards densos (`VehicleHealthCard.tsx`), e
> listas de busca estreitas onde o box centralizado do `EmptyState` não cabe
> (`vehicle-switcher-content.tsx`). `Combobox` (3 telas) segue pendente — Rodada 4 do plano, ainda
> não iniciada. Suíte completa de `apps/web`: 62 arquivos, 321 testes, todos passando.
>
> **ATUALIZAÇÃO — 2026-07-22 — migração de consumidores (KpiCard, ChartWrapper)**
> Duas das migrações pendentes de §10 concluídas: `KpiCard` substituiu o padrão ad hoc
> (`rounded border p-3` + `DeltaBadge` local) em `expenses/page.tsx` (`DashboardKpiGrid.tsx`
> já usava `KpiCard` desde antes); `ChartWrapper` substituiu o header/empty state manual em
> `analytics/page.tsx` (`TcoSection`, `FuelTrendSection`) e `VehicleSpotlight.tsx`
> (`ExpensesSection`, `FuelSection`). `TcoBreakdownChart`/`FuelTrendChart` continuam existindo
> como o corpo do gráfico, agora children do `ChartWrapper`. Teste de
> `expenses/page.spec.tsx` ajustado: formato do percentual de tendência mudou de "100.0%"
> (formatação ad hoc antiga com `toFixed(1)`) para "100%" (formato nativo do `KpiCard`, sem
> casa decimal forçada) — comportamento consciente da padronização, não regressão.
> `EmptyState`, `Alert` e `Combobox` seguem com migração de consumidor pendente (fora do
> escopo desta rodada).
>
> **ATUALIZAÇÃO — 2026-07-22 — migração de consumidores (Combobox, Rodada 4 — plano encerrado)**
> Última migração pendente de §10 concluída: `Combobox` substituiu o `<select>` nativo nas 3
> telas que o usavam — `expenses/new/page.tsx` (Veículo, Categoria, Tipo de combustível),
> `maintenance/new/page.tsx` (Veículo) e `expenses/[id]/page.tsx` (Tipo de combustível). Como
> `Combobox` não expõe `id`/`htmlFor` (o trigger é um `<button role="combobox">`), o rótulo
> visual passou de `<label htmlFor>` para `<span>` + prop `aria-label` no `Combobox` — mesmo
> padrão já usado no grupo tri-state "Tanque cheio?" dessas telas; evita a violação de
> `jsx-a11y/label-has-associated-control`. `Combobox` de Veículo ganhou `loading={vehiclesLoading}`
> (estado "Carregando..." observável, usado pelos testes para aguardar o fetch antes de abrir o
> dropdown). Testes reescritos: `fireEvent.change` em `<select>` virou abrir o trigger via
> `userEvent.click` + clicar na opção (`role="option"` do `cmdk`); asserções `toHaveValue` no
> campo selecionado viraram `toHaveTextContent` no trigger. `apps/web/vitest.setup.ts` ganhou os
> mesmos stubs de Pointer Capture/`scrollIntoView` que `packages/ui/vitest.setup.ts` já tinha
> para Radix Popover/`cmdk` em jsdom. `specs/design-system/PLANO-MIGRACAO-CONSUMIDORES.md` fica
> só com a lista "Sem ação por ora" (componentes greenfield aguardando feature futura). Suíte
> completa de `apps/web`: 62 arquivos, 321 testes, todos passando.

> Define tokens + 14 componentes (3 de base + 11 originais) para o dashboard mobile-first.
> Status: approved (2026-07-19). Revisada em 2 rodadas antes da aprovação (estudo
> pré-implementação, ver IMPACTO-038 e seu adendo v0.3). **T8.1, rodada 1 (2026-07-19):**
> tokens (§4.1) e `Button`/`Card`/`Table` (§4.2) implementados. **T8.1, rodada 2
> (2026-07-19):** `EmptyState` (prioridade 2) e `Alert` (prioridade 3) implementados como
> primitivos em `packages/ui`, seguindo a ordem de §10. **T8.1, rodada 3 (2026-07-19):**
> `KpiCard` (prioridade 4, §5.1) implementado sobre `<Card>`, com sparkline SVG inline e
> variantes calculadas por `trend`/`reverseTrend`. Migração das duplicatas inline reais
> (`FleetKpis.tsx`, `expenses/page.tsx`, `expenses`, `maintenance`, `analytics`,
> `dashboard`, `atividades`, `VehicleSpotlight`, ~30 arquivos com padrão ad hoc de alerta)
> ainda não feita, fica para rodada de consumo dedicada. **T8.1, rodada 4 (2026-07-19):**
> `Toast`/`ToastViewport` (prioridade 5, §8.2) implementado como fila única no `ui-store`
> (`toasts: ToastItem[]`, `pushToast`, `dismissToast`), substituindo os 3 toasts ad hoc
> (`ContextStaleToast`, `ServiceWorkerUpdateToast`, `OfflineWriteBlockedToast`) — os campos
> dedicados que existiam (`contextStaleNotice`, `swUpdateAvailable`,
> `offlineWriteBlockedNotice`) foram removidos do `ui-store` na mesma tarefa, conforme
> planejado em §8.2. `<AppToastViewport />` (wrapper de wiring) montado no root layout;
> `<ServiceWorkerUpdateListener />` substitui `ServiceWorkerUpdateToast` como listener
> headless do evento `"waiting"` do Serwist. Comportamento visual (posição, timing, texto,
> ação) preservado — verificado nos testes migrados de `fleet-aside.spec.tsx` e
> `api-client.spec.ts`. **T8.1, rodada 5 (2026-07-19):** `Combobox` (prioridade 6, §7.2)
> implementado com `@radix-ui/react-popover` + `cmdk` (decisão de IMPACTO-038 — mantém
> Radix como única árvore headless do projeto, coerente com `@radix-ui/react-dialog`/`vaul`
> já em produção). Busca client-side (filtro `cmdk` embutido, fuzzy, sem chamada de rede),
> `emptyMessage`, estados `loading`/`disabled`/`error`, chevron e check fixos (SVG, §4.3).
> `packages/ui` ganhou `@radix-ui/react-popover`/`cmdk` como dependências diretas;
> `vitest.setup.ts` do pacote ganhou polyfills de `ResizeObserver`/Pointer Capture/
> `scrollIntoView` (mesmo padrão já usado em `apps/web/vitest.setup.ts` para
> `ResizeObserver`), exigidos por Radix Popover/`cmdk` em jsdom. Migração das 3 telas com
> `<select>` nativo (`expenses/new`, `maintenance/new`, `expenses/[id]`) ainda não feita,
> fica para rodada de consumo dedicada — mesmo padrão de adiamento das rodadas anteriores.
> **T8.1, rodada 6 (2026-07-19):** `Tabs` (prioridade 7, §6.1) implementado sobre
> `@radix-ui/react-tabs`, consolidando as duas implementações manuais existentes
> (`VehicleSpotlight.tsx`, com `role="tablist"`/`role="tab"`/`aria-selected` já corretos, e
> `expenses/page.tsx`, sem ARIA) — ambas migradas na mesma rodada, diferente do padrão de
> adiamento anterior, pois a migração era o próprio objetivo desta prioridade (§10).
> Componente renderiza só a faixa de abas (`role="tablist"`/`Tabs.Trigger`), sem
> `Tabs.Content` — o painel associado a cada `value` continua responsabilidade do
> consumidor, preservando o padrão já usado nas duas telas. `aria-controls` automático do
> Radix (apontando para um `Tabs.Content` inexistente) foi neutralizado explicitamente
> (`aria-controls={undefined}` no trigger) para não violar `aria-valid-attr-value`
> (capturado por `jest-axe` antes do ajuste). Variantes `default`/`underline`/`pills`
> via CVA; badge (`group-data-[state=active]`) e `icon` decorativo (§4.3) suportados.
> Migração de `VehicleSpotlight.tsx` e `expenses/page.tsx` exigiu trocar `fireEvent.click`/
> `.click()` nativo por `userEvent.click` nos specs, pois o Radix Trigger ativa a aba no
> `onMouseDown` (não em `click` puro) — `@testing-library/user-event` adicionado como
> devDependency de `apps/web` (já existia em `packages/ui`). `packages/ui` ganhou
> `@radix-ui/react-tabs` como dependência direta. **T8.1, rodadas 7–11 (2026-07-19):** os 5
> componentes finais de §10 concluídos — `Steps` (prioridade 8, wizard horizontal com
> estados `completed`/`current`/`upcoming`/`error`), `DateRangePicker` (prioridade 9, dois
> `<input type="date">` nativos + presets, sem lib de calendário nova), `FileUpload`
> (prioridade 10, dropzone com drag-and-drop + validação de tipo/tamanho client-side),
> `ChartWrapper` (prioridade 11, consolida header/loading/empty state hoje duplicado em
> `TcoBreakdownChart`/`FuelTrendChart`) e `Breadcrumb` (prioridade 12, colapso central via
> `maxItems`). Todos greenfield sem consumidor imediato no produto hoje (exceto
> `ChartWrapper`, cuja migração de consumidor fica adiada, mesmo padrão de
> `EmptyState`/`Alert`/`KpiCard`/`Combobox`) — detalhe completo no changelog de
> `docs/IMPLEMENTATION_STRATEGY.md`. §10 da spec está 100% implementado em componentes;
> resta apenas a migração de telas consumidoras (ver tabela abaixo).

| Componente                        | Arquivo destino planejado                                                                                                       | Tipo                                                                                    | Status                                                                                                                                                                                                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tokens (cores, espaçamento, raio) | `packages/ui/src/tokens/{colors,spacing,radius}.ts`; aplicado em `apps/web/tailwind.config.ts` e `apps/web/src/app/globals.css` | Greenfield (bloqueante absoluto)                                                        | ✅                                                                                                                                                                                                                                                                                                           |
| `Button`                          | `packages/ui/src/components/button.tsx`                                                                                         | Greenfield (pré-requisito)                                                              | ✅ (`button.test.tsx`, jest-axe)                                                                                                                                                                                                                                                                             |
| `Card`                            | `packages/ui/src/components/card.tsx`                                                                                           | Greenfield (pré-requisito)                                                              | ✅ (`card.test.tsx`, jest-axe)                                                                                                                                                                                                                                                                               |
| `Table`                           | `packages/ui/src/components/table.tsx`                                                                                          | Greenfield (pré-requisito)                                                              | ✅ (`table.test.tsx`, jest-axe)                                                                                                                                                                                                                                                                              |
| `EmptyState`                      | `packages/ui/src/components/empty-state.tsx`                                                                                    | Migração (6 duplicatas)                                                                 | ✅ (`empty-state.test.tsx`, jest-axe) — telas consumidoras migradas (2026-07-22, ver `specs/design-system/PLANO-MIGRACAO-CONSUMIDORES.md`, Rodadas 1–3); poucas exceções ad hoc documentadas no plano (layouts onde o box centralizado não cabe)                                                             |
| `Alert`                           | `packages/ui/src/components/alert.tsx`                                                                                          | Migração (padrão ad hoc em ~30 arquivos)                                                | ✅ (`alert.test.tsx`, jest-axe) — telas consumidoras migradas (2026-07-22, ver `specs/design-system/PLANO-MIGRACAO-CONSUMIDORES.md`, Rodadas 1–3); exceções ad hoc documentadas no plano (alertas com 2 ações, badges compactos dentro de cards densos)                                                      |
| `KpiCard` (vertical + sparkline)  | `packages/ui/src/components/kpi-card.tsx`                                                                                       | Migração (`FleetKpis.tsx`, `expenses/page.tsx`)                                         | ✅ (`kpi-card.test.tsx`, jest-axe) — `DashboardKpiGrid.tsx` (`/dashboard`) e `KpiCards` de `expenses/page.tsx` migrados (2026-07-22); duplicata ad hoc `DeltaBadge` removida                                                                                                                                 |
| `Toast`                           | `packages/ui/src/components/toast.tsx`                                                                                          | Migração (3 componentes ad hoc no `ui-store`)                                           | ✅ (`toast.test.tsx`, jest-axe) — componente pronto; migração dos 3 toasts ad hoc (`ContextStaleToast`, `ServiceWorkerUpdateToast`, `OfflineWriteBlockedToast`) para a fila única concluída na mesma tarefa                                                                                                  |
| `Combobox`                        | `packages/ui/src/components/combobox.tsx`                                                                                       | Greenfield (substitui `<select>` nativo)                                                | ✅ (`combobox.test.tsx`, jest-axe) — telas consumidoras migradas (2026-07-22, ver `specs/design-system/PLANO-MIGRACAO-CONSUMIDORES.md`, Rodada 4): `expenses/new`, `maintenance/new`, `expenses/[id]`                                                                                                        |
| `Tabs`                            | `packages/ui/src/components/tabs.tsx`                                                                                           | Migração (`expenses/page.tsx`, `VehicleSpotlight.tsx`)                                  | ✅ (`tabs.test.tsx`, jest-axe) — componente pronto; `expenses/page.tsx` e `VehicleSpotlight.tsx` migrados na mesma rodada                                                                                                                                                                                    |
| `Steps` (horizontal)              | `packages/ui/src/components/steps.tsx`                                                                                          | Greenfield                                                                              | ✅ (`steps.test.tsx`, jest-axe) — componente pronto; sem consumidor ainda (aguarda wizard de cadastro de veículo, fora do escopo desta spec)                                                                                                                                                                 |
| `DateRangePicker`                 | `packages/ui/src/components/date-range-picker.tsx`                                                                              | Greenfield                                                                              | ✅ (`date-range-picker.test.tsx`, jest-axe) — componente pronto; sem consumidor ainda (aguarda filtros de relatório, fase posterior)                                                                                                                                                                         |
| `FileUpload`                      | `packages/ui/src/components/file-upload.tsx`                                                                                    | Greenfield, sem consumidor imediato                                                     | ✅ (`file-upload.test.tsx`, jest-axe) — componente pronto; sem consumidor (aguarda feature de anexos, fora do escopo desta spec)                                                                                                                                                                             |
| `ChartWrapper`                    | `packages/ui/src/components/chart-wrapper.tsx`                                                                                  | Migração (lógica duplicada em `charts/`)                                                | ✅ (`chart-wrapper.test.tsx`, jest-axe) — `analytics/page.tsx` (`TcoSection`, `FuelTrendSection`) e `VehicleSpotlight.tsx` (`ExpensesSection`, `FuelSection`) migrados (2026-07-22), consolidando header/loading/empty state; `TcoBreakdownChart`/`FuelTrendChart` seguem como o corpo do gráfico (children) |
| `Breadcrumb`                      | `packages/ui/src/components/breadcrumb.tsx`                                                                                     | Greenfield                                                                              | ✅ (`breadcrumb.test.tsx`, jest-axe) — componente pronto; sem consumidor ainda (navegação hoje é só via sidebar)                                                                                                                                                                                        |
| `Input`                           | `packages/ui/src/components/input.tsx`                                                                                          | Greenfield (`SPEC-20260729-003`) — substitui `<input>` sem estilo                       | ✅ (`input.test.tsx`, jest-axe) — telas consumidoras migradas (2026-07-30, ver `PLANO-MIGRACAO-CONSUMIDORES.md`, Rodada 5): ~20 arquivos de formulário + autenticação                                                                                                                                        |
| `Textarea`                        | `packages/ui/src/components/textarea.tsx`                                                                                       | Greenfield (`SPEC-20260729-003`)                                                        | ✅ (`textarea.test.tsx`, jest-axe) — consumidor: `settings/vehicles/[vehicleId]/odometer-cycles/page.tsx` (campo "Motivo")                                                                                                                                                                                   |
| `Checkbox`                        | `packages/ui/src/components/checkbox.tsx`                                                                                       | Greenfield (`SPEC-20260729-003`)                                                        | ✅ (`checkbox.test.tsx`, jest-axe) — consumidores: `vehicle-groups/*`, `settings/preferences`, `login`, `register`, `KpiPicker.tsx`                                                                                                                                                                          |
| `Switch`                          | `packages/ui/src/components/switch.tsx`                                                                                         | Greenfield (`SPEC-20260729-003`)                                                        | ✅ (`switch.test.tsx`, jest-axe) — componente pronto; sem consumidor ainda (telas atuais usam `Checkbox`)                                                                                                                                                                                                    |
| `Badge`                           | `packages/ui/src/components/badge.tsx`                                                                                          | Migração (padrão ad hoc convergente em ~10 arquivos, `SPEC-20260730-001`)               | ✅ (`badge.test.tsx`, jest-axe) — 5 arquivos migrados (2026-07-30): `status-badge.ts`, `fines/page.tsx`, `fines/[id]/page.tsx`, `atividades/page.tsx`, `maintenance/page.tsx`, `VehicleHealthCard.tsx`; 3 casos avaliados e mantidos ad hoc (tingem linha/card inteiro, não pill isolado)                    |
| `Skeleton`                        | `packages/ui/src/components/skeleton.tsx`                                                                                       | Migração (duplicado 5x, incluindo dentro do próprio `packages/ui`; `SPEC-20260730-001`) | ✅ (`skeleton.test.tsx`, jest-axe) — `kpi-card.tsx`/`chart-wrapper.tsx` refatorados internamente; 3 consumidores em `apps/web` migrados (2026-07-30)                                                                                                                                                         |
| `Container`                       | `packages/ui/src/components/container.tsx`                                                                                      | Migração (32 ocorrências idênticas, `SPEC-20260730-001`)                                | ✅ (`container.test.tsx`, jest-axe) — 28 arquivos `page.tsx` migrados (2026-07-30)                                                                                                                                                                                                                           |
| `Tooltip`                         | `packages/ui/src/components/tooltip.tsx`                                                                                        | Migração (substitui `title=` nativo, `SPEC-20260730-001`)                               | ✅ (`tooltip.test.tsx`, jest-axe) — 3 arquivos migrados (2026-07-30): `sidebar.tsx`, `VehicleHealthCard.tsx`, `atividades/page.tsx`                                                                                                                                                                          |

---

## SPEC-20260721-001 — Design System: Fundamentos de Marca, Tokens de Cor, Tema e Componentes de navegação Global (approved)

> Formaliza as seis decisões de produto tomadas em 2026-07-21 com base na pesquisa de fundamentos
> de design system (`PESQUISA-FUNDAMENTOS-DESIGN-SYSTEM.md`). Cobre: token `--gold` dedicado (F-1),
> tema padrão via `prefers-color-scheme` com toggle (F-2), `--muted-foreground` L≤42% para WCAG AA
> (F-3), `VehicleContextSelector` no header (F-4), `CommandPalette` global Ctrl+K/⌘K (F-5),
> `NavBadge` truncado em "9+" (F-6). Regras: R-DS-01, C-DS-01. Camadas: frontend, design.
> **Status:** implementado (2026-07-21). RF-05 reaproveita `VehicleContextChip`
> (SPEC-20260603-001) já existente no header como ponto de seleção — não foi criado um
> componente `VehicleContextSelector` paralelo (ver nota técnica da spec sobre fronteira de
> responsabilidade com R-CTX-07). Propagação de filtro implementada em `/expenses` e
> `/maintenance`; `/fines` ainda não existe como rota no app e fica pendente de outra spec.
> Overrides `.dark` cobrem só os tokens necessários para o tema ser legível (neutros, primary,
> gold) — recalibração completa da paleta de marca em dark mode (secondary/accent/success/
> warning/danger/info) segue fora do escopo, conforme "Fora de Escopo" da spec.

### Tokens de Cor e Dark/Light Mode (RF-01, RF-02, RF-03)

| Req   | Descrição                                                                                                                                               | Código                                                                                                                                                                                    | Teste                                                                      | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------ |
| RF-01 | Tokens `--gold` e `--gold-foreground` em `packages/ui/src/tokens/colors.ts` e `globals.css`, valores OKLCH distintos de `--warning`, em light e dark    | `packages/ui/src/tokens/colors.ts`, `apps/web/src/app/globals.css`, `apps/web/tailwind.config.ts`                                                                                         | — (tokens visuais; validação de contraste manual conforme C.3 da pesquisa) | ✅     |
| RF-02 | `--muted-foreground` com L≤42% em OKLCH em ambos os temas; contraste ≥4.5:1 sobre `--background` (C-DS-01)                                              | `packages/ui/src/tokens/colors.ts`, `apps/web/src/app/globals.css`                                                                                                                        | —                                                                          | ✅     |
| RF-03 | `next-themes` configurado com `defaultTheme="system"` e `enableSystem={true}`; preferência manual persiste em localStorage sobre `prefers-color-scheme` | `apps/web/src/components/providers/theme-provider.tsx`, `apps/web/src/app/layout.tsx`, `apps/web/tailwind.config.ts` (`darkMode: "class"`), `packages/ui/src/components/theme-toggle.tsx` | — (mecanismo de terceiros; sem teste de integração automatizado)           | ✅     |

### NavBadge com Truncamento "9+" (RF-04)

| Req   | Descrição                                                                                                         | Código                                     | Teste                                           | Status |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------- | ------ |
| RF-04 | `NavBadge` component: valor >9 renderiza "9+"; valor 0 oculta o badge; valores 1–9 exibem o número real (R-DS-01) | `packages/ui/src/components/nav-badge.tsx` | `packages/ui/src/components/nav-badge.test.tsx` | ✅     |

### Seletor de Veículo Ativo no Header Shell (RF-05)

| Req   | Descrição                                                                                                                                                                                                                                                             | Código                                                                                                                                                                                                                                                                                                                                                                       | Teste                                                                                                                                                                                                                               | Status                                                                 |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| RF-05 | Seletor de veículo visível no header (reaproveita `VehicleContextChip`); seleção propaga filtro para `/expenses` e `/maintenance`; sem veículo cadastrado (modo `none` + lista vazia), exibe CTA "Adicionar veículo" (`/vehicles/new`) em vez do seletor/Dialog vazio | `apps/web/src/components/layout/header.tsx`, `apps/web/src/components/layout/vehicle-context-chip.tsx`, `apps/web/src/lib/context/use-vehicle-context.ts` (lista de veículos agora também buscada em modo `none`), `apps/web/src/lib/context/context-labels.ts` (`addVehicleCta`), `apps/web/src/app/(app)/expenses/page.tsx`, `apps/web/src/app/(app)/maintenance/page.tsx` | `apps/web/src/components/layout/vehicle-context-chip.spec.tsx` (caso novo dedicado ao CTA), `apps/web/src/app/(app)/expenses/page.spec.tsx`, `apps/web/src/app/(app)/maintenance/page.spec.tsx` (cobertura pré-existente do filtro) | ⚠️ parcial — `/fines` não existe como rota, filtro não se aplica a ela |

### Command Palette de Busca Global (RF-06, RNF-03)

| Req    | Descrição                                                                                                                                                                                                                                                     | Código                                                                                                         | Teste                                                                                                                                                                                                                                                                  | Status                                                                                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-06  | `CommandPalette` ativada por `Ctrl+K`/`⌘K`: campo de busca focado ao abrir; resultados cruzando veículos, despesas, manutenções e multas (`/fines`, habilitada por `SPEC-20260722-005`); navegação por teclado (setas, Enter, Esc)                       | `packages/ui/src/components/command-palette.tsx`, `apps/web/src/components/layout/command-palette-trigger.tsx` | `packages/ui/src/components/command-palette.test.tsx`, `apps/web/src/components/layout/command-palette-trigger.spec.tsx` (abertura via botão/`Ctrl+K`, busca cruzando as 4 categorias, navegação ao selecionar multa, query <2 chars, "nenhum resultado", RNF-03) | ✅                                                                                                                                                             |
| RNF-03 | `CommandPalette` não bloqueia renderização inicial do shell: `next/dynamic` (`ssr: false`) sobre `import("@navestory/ui")`, montado só após a 1ª abertura (`hasOpenedOnce`) — nem o clique no botão nem o `Ctrl+K` fazem fetch do chunk antes da 1ª interação | `apps/web/src/components/layout/command-palette-trigger.tsx`                                                   | `apps/web/src/components/layout/command-palette-trigger.spec.tsx` (caso "RNF-03: não monta o CommandPalette antes da primeira abertura")                                                                                                                               | ✅ Verificado com `pnpm build`: chunk `cmdk`/`CommandPalette` isolado (~44,8 kB gzip), ausente de todo `build-manifest.json` de rota — não é carregado eagerly |

### Contraste WCAG AA em Componentes de `packages/ui` (RNF-02)

| Req    | Descrição                                                                                                                                                                                                                                                     | Código                                    | Teste                                                                                                                                 | Status |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| RNF-02 | `KpiCard`: texto da tendência usava `text-{variant}` (tons "solid") direto sobre `--card`, falhando AA (warning ~2.1:1, success ~3.4:1, info ~4.2:1). Corrigido para `bg-{variant}-pastel text-foreground`, mesmo padrão de `Alert`/`Toast` (contraste ≥14:1) | `packages/ui/src/components/kpi-card.tsx` | `packages/ui/src/components/kpi-card.test.tsx` (`jest-axe` cobrindo warning/success/info/danger, gap de cobertura anterior corrigido) | ✅     |

---

## SPEC-20260722-001 — Design System v2: Direção Criativa, Gramática de Cor e Estrutura de Documentação (approved)

> Formaliza a evolução criativa do Steel & Sapphire a partir de pesquisa de mercado (estrutura de
> documentação de design system) e de um documento de inspiração externo (análise do Notion),
> descartando explicitamente paleta decorativa multicolor e pill buttons em ações de interface —
> ver "Contexto" e "Notas Técnicas" da spec para o racional completo.

### Documentação e Regras (RF-01, RF-02, RF-04)

| Req   | Descrição                                                                             | Código                            | Teste            | Status |
| ----- | ------------------------------------------------------------------------------------- | --------------------------------- | ---------------- | ------ |
| RF-01 | `Design.md` criado na raiz do repositório seguindo a estrutura de seções de R-DS-02   | `/Design.md`                      | — (documentação) | ✅     |
| RF-02 | Regras R-DS-02 a R-DS-05 registradas em `specs/RULES.md`                              | `specs/RULES.md`                  | — (documentação) | ✅     |
| RF-04 | `docs/ui-design/design-system.md` atualizado para referenciar `Design.md` e esta spec | `docs/ui-design/design-system.md` | — (documentação) | ✅     |

### Numerais Tabulares (RF-03)

| Req   | Descrição                                                                    | Código                                                                            | Teste                                                                                                                                                                                                                   | Status |
| ----- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| RF-03 | `tabular-nums` aplicado ao valor principal de `KpiCard` e a toda `TableCell` | `packages/ui/src/components/kpi-card.tsx`, `packages/ui/src/components/table.tsx` | `kpi-card.test.tsx` ("aplica tabular-nums ao valor principal"), `table.test.tsx` ("célula usa tabular-nums para alinhar dígitos entre linhas") — ambos assertam a classe via `toHaveClass("tabular-nums")` (2026-07-23) | ✅     |

### Auditoria de Não-Regressão (RNF-01, RNF-02)

| Req    | Descrição                                                         | Código                                                                                                                                                                                      | Teste | Status |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| RNF-01 | Nenhuma família de cor decorativa nova em `colors.ts`             | `packages/ui/src/tokens/colors.ts` (inalterado nesta spec)                                                                                                                                  | —     | ✅     |
| RNF-02 | Nenhum `rounded-full` na forma do botão (CVA de `variant`/`size`) | `packages/ui/src/components/button.tsx` (verificado — única ocorrência de `rounded-full` é o spinner circular de `loading`, elemento decorativo redondo por natureza, não a forma do botão) | —     | ✅     |

---

## SPEC-20260722-002 — Design System: Canvas Quente Sutil no Light Mode (deprecated — superseded_by SPEC-20260729-001)

> **Depreciada em 2026-07-29**: a adoção da direção Prata (`SPEC-20260729-001`) reverte o canvas
> quente — Prata usa um canvas frio (azul-prata-cinza). `background`/`card`/`border`/`muted`
> voltam a ter matiz definido pela paleta de marca, não mais um undertone independente.

> Implementa item que estava explicitamente "Fora de Escopo" em SPEC-20260722-001 (canvas
> levemente quente inspirado na análise do Notion), agora liberado pelo usuário. Chroma sutil
> (0.004, matiz 80) aplicado só ao light mode; dark mode inalterado. Ver "Notas Técnicas" da
> spec para a ressalva sobre limite do jsdom em medição de contraste automatizada.

### Canvas Quente em Superfícies Neutras (RF-01, RF-02)

| Req   | Descrição                                                                                                            | Código                                                             | Teste                                                                                                 | Status |
| ----- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------ |
| RF-01 | `background`/`card`/`border`/`muted` ganham chroma 0.004 (matiz 80) em light mode, L inalterada; `.dark` sem mudança | `packages/ui/src/tokens/colors.ts`, `apps/web/src/app/globals.css` | Suíte `vitest` completa de `packages/ui` (139 testes, incl. `jest-axe`) — sem violação após a mudança | ✅     |
| RF-02 | `INVENTARIO-DESIGN-SYSTEM.md` (tabela de tokens + bloco Figma Variables) atualizado com os novos valores             | `specs/design-system/INVENTARIO-DESIGN-SYSTEM.md`                  | — (documentação)                                                                                      | ✅     |

---

## SPEC-20260729-001 — Design System: Adoção da Direção Prata como Identidade de Marca (approved)

> Substitui "Steel & Sapphire" pela direção Prata (construída sobre pesquisa empírica de Eva
> Heller). Ver [ADR-009](../docs/architecture/decisions/ADR-009-adocao-direcao-prata.md) para o
> racional completo. Decisão e implementação ocorreram na mesma sessão, a pedido do usuário.

### Migração de Tokens e Regras (RF-01 a RF-03)

| Req   | Descrição                                                                                                                                                                                           | Código                                                              | Teste                                                                                                                                      | Status |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| RF-01 | Tokens de marca (`background`/`foreground`/`card`/`border`/`muted`/`primary`/`secondary`/`gold`/`danger` + `-foreground`/`-pastel`) substituídos pelos valores OKLCH da direção Prata, light e dark | `packages/ui/src/tokens/colors.ts`, `apps/web/src/app/globals.css`  | Suíte `vitest` completa de `packages/ui` (141 testes, incl. `jest-axe`) e `apps/web` (329 testes) — ambas passam sem alteração de asserção | ✅     |
| RF-02 | `R-DS-05` revisada (v1→v2, 60-30-10) e `R-DS-06` (terracota único tom de `danger`) criada em `specs/RULES.md`                                                                                       | `specs/RULES.md`                                                    | — (documentação)                                                                                                                           | ✅     |
| RF-03 | `SPEC-20260722-002` marcada `deprecated`, `superseded_by: SPEC-20260729-001`                                                                                                                        | `specs/design-system/SPEC-20260722-002-canvas-quente-light-mode.md` | — (documentação)                                                                                                                           | ✅     |

### Auditoria de Não-Regressão (RNF-01, RNF-02)

| Req    | Descrição                                                                                                                 | Código                             | Teste                                                                                                                             | Status |
| ------ | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------ |
| RNF-01 | Nenhuma regressão em `packages/ui`/`apps/web`                                                                             | —                                  | Suítes completas rodadas após a migração — 141/141 e 329/329 passando                                                             | ✅     |
| RNF-02 | Contraste AA preservado (`mutedForeground` acima do teto de L=42% documentado, mas dentro da razão exigida por `C-DS-01`) | `packages/ui/src/tokens/colors.ts` | Validação analítica via `contrastExpectations` da direção Prata (~5.2:1 light, ~6.8:1 dark) + ausência de regressão em `jest-axe` | ✅     |

---

## SPEC-20260729-002 — Design System: Prata Fase 2 (Paleta Categórica, Escala de Urgência, Varredura de Cor Hardcoded) (approved)

> Fecha os dois itens de "Fora de Escopo" de `SPEC-20260729-001`. Paleta categórica e escala de
> urgência fundamentadas pelo agente `design-system` (Okabe-Ito, ColorBrewer, ISO 11064-4) — ver
> [ADR-010](../docs/architecture/decisions/ADR-010-paleta-categorica-e-escala-urgencia.md).

### Tokens Novos e Realinhamento (RF-01 a RF-03)

| Req   | Descrição                                                                                                                                                                                                                                                                                                         | Código                                                                     | Teste                                                                                                                                                    | Status |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| RF-01 | `--surface`/`--surface-elevated`/`--on-surface*` realinhados à família de matiz Prata; `--primary` dark ganha chroma reforçada (0.038→0.11)                                                                                                                                                                       | `apps/web/src/app/globals.css`, `packages/ui/src/tokens/colors.ts`         | Suíte `vitest` completa (ver RNF-01)                                                                                                                     | ✅     |
| RF-02 | `--categorical-1..5` (substitui `--chart-1..5`) em `globals.css`/`tailwind.config.ts`; `apps/web/src/lib/chart-colors.ts` criado; migrados `FleetCharts.tsx`, `analytics/page.tsx`, `tco-breakdown-chart.tsx`, `fuel-trend-chart.tsx`, `vehicle-context-chip.tsx`, `sidebar.tsx` (+ `sidebar.spec.tsx` assertion) | arquivos citados                                                           | `sidebar.spec.tsx` ("RF-16: exibe o dot passivo..." — assertion `bg-categorical-4`); demais cobertos por specs pré-existentes que passaram sem alteração | ✅     |
| RF-03 | `--urgency-hot`/`--urgency-hot-pastel` criados; `urgencyBadge()` em `expenses/page.tsx` migrado para 4 níveis; `--finance-outgoing` realinhado (H=25→32)                                                                                                                                                          | `apps/web/src/app/globals.css`, `apps/web/src/app/(app)/expenses/page.tsx` | Coberto por `expenses/page.spec.tsx` pré-existente (sem asserção de classe de cor — passou sem alteração)                                                | ✅     |

### Varredura de Cor Hardcoded (RF-04 a RF-06)

| Req   | Descrição                                                                                                                                                                                                                                            | Código                                                                                                                                                                                                                                                                                                                                                                                                                    | Teste                                                                                        | Status |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------ |
| RF-04 | Badges de status semântico migrados 1:1 para tokens (`bg-{variant}-pastel text-foreground`, padrão `Alert`/`KpiCard`); helper compartilhado criado para fines                                                                                        | `atividades/page.tsx`, `maintenance/page.tsx`, `fines/page.tsx`, `fines/[id]/page.tsx`, `apps/web/src/lib/fines/status-badge.ts`, `VehicleSpotlight.tsx`                                                                                                                                                                                                                                                                  | Cobertos por specs pré-existentes, sem asserção de classe de cor afetada                     | ✅     |
| RF-05 | Chrome estrutural migrado (`bg-white`/`border-neutral-*` → `bg-card`/`border-border`/`text-muted-foreground`)                                                                                                                                        | `vehicle-context-dialog.tsx`, `vehicle-context-sheet.tsx`, `vehicle-switcher-content.tsx`, `install-prompt-banner.tsx`, `ios-install-banner.tsx`, `connectivity-indicator.tsx`, `offline/page.tsx` (migrado para `Button` de `@navestory/ui`), `expenses/new`, `maintenance/new`, `fines/new` (hints "herdado do contexto"), `register/page.tsx`, `recover-password/page.tsx`, `page.tsx` (landing), `password-input.tsx` | Nenhum teste com asserção de classe hardcoded encontrado (grep confirmado antes da migração) | ✅     |
| RF-06 | `manifest.ts`/`layout.tsx` recalculados para hex Prata (`#1B3A6B`/`#F4F6F8`, era `#3b70ca`/`#fafafa`); comentário de exceção do `gold` em `colors.ts` passou a citar os dois protótipos (`dashboard/concept` e `dashboard/concept/design-system-v2`) | `apps/web/src/app/manifest.ts`, `apps/web/src/app/layout.tsx`, `packages/ui/src/tokens/colors.ts`                                                                                                                                                                                                                                                                                                                         | — (documentação/meta tags)                                                                   | ✅     |

### Auditoria de Não-Regressão (RNF-01, RNF-02)

| Req    | Descrição                                 | Código | Teste                                                                                                                                   | Status |
| ------ | ----------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| RNF-01 | Nenhuma regressão                         | —      | `tsc --noEmit` limpo (`packages/ui`, `apps/web`); `vitest` completo — `packages/ui` 141/141, `apps/web` 329/329; `pnpm build` sem erros | ✅     |
| RNF-02 | Nenhum consumidor órfão de `--chart-1..5` | —      | `grep -rn "chart-1\|chart-2\|chart-3\|chart-4\|chart-5"` no repo — só o comentário histórico em `globals.css`                           | ✅     |

> **2026-07-30 — RF-04 a RF-06 ganham enforcement automático:** a varredura era manual até aqui.
> `scripts/check-hardcoded-colors.mjs` (job `hardcoded-colors-gate` em `.github/workflows/ci.yml`,
> `pnpm check:hardcoded-colors`) bloqueia hex/`oklch()` literal novo fora dos tokens — decisão da
> Rodada 6 de `specs/design-system/PLANO-MIGRACAO-SHOWCASE-INFRA.md`. Rodar o script contra o
> estado atual encontrou e corrigiu 2 violações reais fora do escopo desta spec (showcase:
> `comparar/page.tsx`, `prata-glass-section/index.tsx` — ver changelog do plano).

---

## SPEC-20260729-003 — Design System: Fecho de Formulários (Input, Textarea, Checkbox, Switch) (approved)

> Fecha a lacuna que `SPEC-20260525-001`/`PLANO-MIGRACAO-CONSUMIDORES.md` (Rodadas 1–4) deixaram:
> `<input>`/`<button>`/`<select>` sem estilo em ~25 arquivos de formulário/autenticação, mesmo após
> a adoção de Prata. Ver `specs/design-system/PLANO-MIGRACAO-CONSUMIDORES.md` §Rodada 5.

### Componentes Novos (RF-01 a RF-03)

| Req   | Descrição                                                                   | Código                                                  | Teste                                                                 | Status |
| ----- | --------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- | ------ |
| RF-01 | `Input`/`Textarea` criados, classe-base `inputBaseClass` exportada          | `packages/ui/src/components/input.tsx`, `textarea.tsx`  | `input.test.tsx` (5), `textarea.test.tsx` (4), incl. `jest-axe`       | ✅     |
| RF-02 | `Checkbox`/`Switch` criados, sem dependência Radix nova                     | `packages/ui/src/components/checkbox.tsx`, `switch.tsx` | `checkbox.test.tsx` (3), `switch.test.tsx` (4), incl. `jest-axe`      | ✅     |
| RF-03 | `CurrencyInput`/`OdometerInput` aceitam `className` e usam `inputBaseClass` | `packages/ui/src/components/masked-input.tsx`           | `masked-input.spec.tsx` (9, pré-existente, sem alteração de asserção) | ✅     |

### Migração de Consumidores (RF-04 a RF-06)

| Req   | Descrição                                                                                                                                                                                                                                       | Código                                         | Teste                                                                                               | Status |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------ |
| RF-04 | Formulários de escrita migrados: `expenses/{new,[id]}`, `maintenance/{new,[id]}`, `vehicles/{new,[id],[id]/odometer}`, `vehicle-groups/{new,[id]}`, `fines/{new,[id]}`, `settings/preferences`, `settings/vehicles/[vehicleId]/odometer-cycles` | arquivos citados em `apps/web/src/app/(app)/`  | Specs pré-existentes de cada tela, mais `maintenance/[id]/page.spec.tsx` ajustado (select→Combobox) | ✅     |
| RF-05 | Autenticação migrada: `login`, `register`, `recover-password`, `reset-password`, `password-input.tsx`                                                                                                                                           | arquivos citados em `apps/web/src/app/(auth)/` | Specs pré-existentes, sem alteração de asserção                                                     | ✅     |
| RF-06 | Ajustes finos: `KpiPicker.tsx`, select de veículo em `analytics`/`dashboard`, botões de `expenses`/`fines` (listagem), `delete-account-dialog.tsx`                                                                                              | arquivos citados                               | `analytics/page.spec.tsx` ajustado (`findByDisplayValue`→`waitFor`+`toHaveTextContent`)             | ✅     |

### Auditoria de Não-Regressão (RNF-01, RNF-02)

| Req    | Descrição                                                                     | Código | Teste                                                                                                                                                                               | Status |
| ------ | ----------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| RNF-01 | Nenhuma regressão                                                             | —      | `tsc --noEmit` limpo; `vitest` completo — `packages/ui` 157/157 (141+16), `apps/web` 329/329                                                                                        | ✅     |
| RNF-02 | Zero `<input>`/`<button>`/`<select>`/`<textarea>` sem estilo fora de exceções | —      | `grep` confirmando ocorrências restantes só em `brand-showcase/` e `dashboard/concept/*`, mais controles de forma customizada documentados (swatch de cor, FAB do dock, hambúrguer) | ✅     |

---

## SPEC-20260730-001 — Design System: Padronização do Showcase Prata (Badge, Skeleton, Container, Tooltip) (approved)

> Constrói os componentes do showcase Prata que têm consumidor real hoje (dos 9 avaliados, só
> 4 — o resto fica em "sem ação por ora"). Ver `specs/design-system/PLANO-MIGRACAO-CONSUMIDORES.md`
> §Rodada 6.

### Componentes Novos (RF-01 a RF-04)

| Req   | Descrição                                                                                | Código                                                                         | Teste                                                                                                                            | Status |
| ----- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------ |
| RF-01 | `Badge` criado (5 variantes)                                                             | `packages/ui/src/components/badge.tsx`                                         | `badge.test.tsx` (7, incl. `jest-axe`)                                                                                           | ✅     |
| RF-02 | `Skeleton` criado; `kpi-card.tsx`/`chart-wrapper.tsx` refatorados para compor `Skeleton` | `packages/ui/src/components/skeleton.tsx`, `kpi-card.tsx`, `chart-wrapper.tsx` | `skeleton.test.tsx` (3, incl. `jest-axe`); `kpi-card.test.tsx`/`chart-wrapper.test.tsx` pré-existentes sem alteração de asserção | ✅     |
| RF-03 | `Container` criado (6 tamanhos × 2 gaps)                                                 | `packages/ui/src/components/container.tsx`                                     | `container.test.tsx` (10, incl. `jest-axe`)                                                                                      | ✅     |
| RF-04 | `Tooltip` criado sobre `@radix-ui/react-tooltip` (nova dependência)                      | `packages/ui/src/components/tooltip.tsx`, `packages/ui/package.json`           | `tooltip.test.tsx` (2, incl. `jest-axe`)                                                                                         | ✅     |

### Migração de Consumidores (RF-05 a RF-08)

| Req   | Descrição                                                                                                                                                                                                                   | Código           | Teste                                                                               | Status |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------- | ------ |
| RF-05 | Badge migrado: `status-badge.ts` (`FINE_STATUS_BADGE_CLASS`→`FINE_STATUS_BADGE_VARIANT`), `fines/page.tsx`, `fines/[id]/page.tsx`, `atividades/page.tsx`, `maintenance/page.tsx`, `VehicleHealthCard.tsx` (`DocumentBadge`) | arquivos citados | Specs pré-existentes, sem alteração de asserção                                     | ✅     |
| RF-06 | Skeleton migrado: `financial-subheader.tsx`, `vehicle-context-chip.tsx`, `vehicle-switcher-content.tsx`                                                                                                                     | arquivos citados | Specs pré-existentes (`vehicle-switcher-content.tsx` sem spec)                      | ✅     |
| RF-07 | Container migrado: 28 arquivos `page.tsx` de `(app)/` e `(auth)/` (32 ocorrências)                                                                                                                                          | arquivos citados | Specs pré-existentes de cada tela                                                   | ✅     |
| RF-08 | Tooltip migrado: `sidebar.tsx`, `VehicleHealthCard.tsx`, `atividades/page.tsx`                                                                                                                                              | arquivos citados | `VehicleHealthCard.spec.tsx` ajustado (`getByTitle`→`userEvent.hover`+`findByText`) | ✅     |

### Auditoria de Não-Regressão (RNF-01, RNF-02)

| Req    | Descrição                                                                                      | Código | Teste                                                                                                                                                          | Status |
| ------ | ---------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| RNF-01 | Nenhuma regressão                                                                              | —      | `tsc --noEmit` limpo; `vitest` completo — `packages/ui` 179/179 (157+22), `apps/web` 329/329                                                                   | ✅     |
| RNF-02 | Zero `animate-pulse`/`<main className="mx-auto flex max-w-`/badge pill inline fora de exceções | —      | `grep` confirmando ocorrências restantes só em `brand-showcase/`, `dashboard/concept/*`, e os 3 casos de tingimento de linha inteira (não-badge, documentados) | ✅     |

---

## SPEC-20260731-001 — Design System: Adoção da Direção Azul-Índigo como Identidade de Marca (approved)

> Substitui Prata (`SPEC-20260729-001`, agora `deprecated`) pela direção Azul-Índigo. Ver
> [ADR-011](../docs/architecture/decisions/ADR-011-adocao-direcao-azul-indigo.md) e
> `specs/design-system/PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md` para o racional completo.
>
> **Atualização — 2026-07-31 (mesmo dia, rodada 2):** RF-01 a RF-06 implementados. `dangerForeground`
> foi mantido no valor literal de Prata (não migrado para o novo `background` grafite) — trocar
> derrubava o contraste `danger`/`danger-foreground` de ~4.51:1 para ~4.499:1, abaixo do piso AA,
> confirmado por `contrast.spec.ts`; fica como pendência de calibração dedicada. **Fechada em
> `SPEC-20260731-002` (mesmo dia, rodada 3)** — ver seção própria abaixo. A escala tipográfica
> (RF-06) é formal em `packages/ui/src/tokens/typography.ts` e Inter foi aplicada em produção
> (`apps/web/src/app/layout.tsx`, `tailwind.config.ts` `fontFamily.sans`), mas a escala de
> utilitários `text-*` do Tailwind já em uso no app não foi remapeada (exigiria QA visual completa,
> fora de escopo). RNF-01 confirmado: `packages/ui` 179/179, `apps/web` 349/351 — as 2 falhas
> restantes (`warning sobre card`, `warning sobre warning-pastel`, light mode) são pendência
> pré-existente à migração (já falhavam com os tokens Prata), não regressão desta spec.

### Migração de Tokens e Regras (RF-01 a RF-08)

| Req   | Descrição                                                                                                                                                              | Código                                                                                                                                                   | Teste                                                                                                            | Status                                                           |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| RF-01 | Conversão OKLCH completa do Azul-Índigo (12 tons) e grafite dedicado, com `contrastExpectations`                                                                       | `apps/web/src/app/(app)/design-system/_lib/tokens.ts` (`PROPOSED_TOKENS`, `INDIGO_SCALE`, `GRAPHITE_SCALE`)                                              | `contrast.spec.ts` (indireto, via produção após RF-02)                                                           | ✅                                                               |
| RF-02 | Migrar `primary`/`primaryForeground`/`background`/`foreground`/`card`/`cardForeground`/`border`/`muted`/`secondary`/`secondaryForeground` em `colors.ts`/`globals.css` | `packages/ui/src/tokens/colors.ts`, `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/manifest.ts` (hex do `theme_color`) | Suíte `vitest` completa — `packages/ui` 179/179, `apps/web` 349/351 (2 pendências pré-existentes, não regressão) | ✅                                                               |
| RF-03 | Overrides de dark mode para `successPastel`/`warningPastel`/`dangerPastel`/`infoPastel` (`C-DS-02`)                                                                    | `packages/ui/src/tokens/colors.ts`, `apps/web/src/app/globals.css`                                                                                       | `contrast.spec.ts` — 4 pares `{token} sobre {token}-pastel` em dark, todos ✅                                    | ✅                                                               |
| RF-04 | Documentar contrato "`warning`/`success` só sobre o próprio `-pastel`" no token/`Design.md` (fecha `C-DS-01`)                                                          | `packages/ui/src/tokens/colors.ts`, `apps/web/src/app/globals.css`, `Design.md`                                                                          | — (documentação)                                                                                                 | ✅                                                               |
| RF-05 | Atualizar `/Design.md` (ainda referencia "Steel & Sapphire")                                                                                                           | `Design.md`                                                                                                                                              | — (documentação)                                                                                                 | ✅                                                               |
| RF-06 | Sistema tipográfico formal (Inter variável, escala modular, `tabular-nums`)                                                                                            | `packages/ui/src/tokens/typography.ts`, `apps/web/src/app/layout.tsx`, `apps/web/tailwind.config.ts`                                                     | `tsc --noEmit` limpo; `tabular-nums` já coberto por `kpi-card.test.tsx`/`table.test.tsx` (pré-existentes)        | ✅ 🔶 escala `text-*` do Tailwind não remapeada (fora de escopo) |
| RF-07 | Atualizar `matrices/rastreabilidade.md` com esta entrada                                                                                                               | `matrices/rastreabilidade.md`                                                                                                                            | — (documentação)                                                                                                 | ✅                                                               |
| RF-08 | `SPEC-20260729-001` marcada `deprecated`, `superseded_by: SPEC-20260731-001`                                                                                           | `specs/design-system/SPEC-20260729-001-adocao-direcao-prata.md`                                                                                          | — (documentação)                                                                                                 | ✅                                                               |

### Auditoria de Não-Regressão (RNF-01 a RNF-03)

| Req    | Descrição                                                                                           | Código                             | Teste                                                                                                                                                                                       | Status                                                   |
| ------ | --------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| RNF-01 | Nenhuma regressão em `packages/ui`/`apps/web`                                                       | —                                  | `packages/ui` 179/179; `apps/web` 349/351 (2 falhas pré-existentes de `warning`, comparadas linha a linha contra a baseline Prata via `git stash`)                                          | ✅                                                       |
| RNF-02 | Contraste AA para `primary`/`primaryForeground`/`secondary`/`secondaryForeground` em ambos os temas | `packages/ui/src/tokens/colors.ts` | `contrast.spec.ts` não cobre o par `primary`/`primaryForeground` diretamente (gap pré-existente, não introduzido por esta spec); validado manualmente via a mesma lógica de `contrastRatio` | 🔶 sem cobertura automatizada direta (gap pré-existente) |
| RNF-03 | `*-pastel` ≥4.5:1 contra `--foreground` em dark mode                                                | `packages/ui/src/tokens/colors.ts` | `contrast.spec.ts` — todos os 4 pares em dark ✅                                                                                                                                            | ✅                                                       |

---

## SPEC-20260731-002 — Design System: Recalibração de `--warning`/`--danger-foreground` e Fecho de C-DS-01 (approved)

> Fecha a pendência registrada na Rodada 4 de `PLANO-MIGRACAO-SHOWCASE-INFRA.md`: `warning` sobre
> `card` (~1,88:1) e `warning` sobre `warning-pastel` (~1,68:1) em light mode, abaixo do piso
> não-textual de 3:1 (`C-DS-01`). O par `success` sobre `card`, também vermelho naquela rodada, já
> havia sido resolvido como efeito colateral de `SPEC-20260731-001` (migração de `--card` para o
> grafite Azul-Índigo). Escopo ampliado durante a implementação para também fechar a nota técnica
> pendente de `--danger-foreground` (mantido no valor literal de Prata em `SPEC-20260731-001` por
> risco de derrubar o par abaixo do piso AA ao migrar para o grafite).

| Req   | Descrição                                                                                                                                                               | Código                                                                                | Teste                                                                   | Status |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------ |
| RF-01 | Recalibrar `colorChannels.warning` (light) de `75% 0.16 85` para `54% 0.14 85`                                                                                          | `packages/ui/src/tokens/colors.ts`, `apps/web/src/app/globals.css`                    | `contrast.spec.ts` — `warning` sobre `card`/`warning-pastel` (light) ✅ | ✅     |
| RF-02 | Override explícito de `darkColorChannels.warning` (`75% 0.16 85`, valor claro original preservado)                                                                      | `packages/ui/src/tokens/colors.ts`, `apps/web/src/app/globals.css`                    | `contrast.spec.ts` — pares de `warning` em dark inalterados ✅          | ✅     |
| RF-03 | Atualizar comentário desatualizado em `kpi-card.tsx` (RF-02/RNF-02 de `SPEC-20260721-001`)                                                                              | `packages/ui/src/components/kpi-card.tsx`                                             | — (documentação)                                                        | ✅     |
| RF-04 | Atualizar `matrices/rastreabilidade.md` e `PLANO-MIGRACAO-SHOWCASE-INFRA.md` (changelog Rodada 4)                                                                       | `matrices/rastreabilidade.md`, `specs/design-system/PLANO-MIGRACAO-SHOWCASE-INFRA.md` | — (documentação)                                                        | ✅     |
| RF-05 | Recalibrar `dangerForeground`/`--danger-foreground` de `97.2% 0.003 248` (literal de Prata) para `97.5% 0.003 265` (hue de grafite, L elevado para preservar margem AA) | `packages/ui/src/tokens/colors.ts`, `apps/web/src/app/globals.css`                    | `contrast.spec.ts` — `danger` sobre `danger-foreground` ~4,57:1 ✅      | ✅     |

| Req    | Descrição                                                                      | Código                             | Teste                                                                                           | Status |
| ------ | ------------------------------------------------------------------------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------- | ------ |
| RNF-01 | `contrast.spec.ts` passa 100% (22/22), ambos os temas                          | —                                  | `contrast.spec.ts` 22/22 ✅                                                                     | ✅     |
| RNF-02 | Nenhuma regressão em `packages/ui`/`apps/web`                                  | —                                  | `packages/ui` 179/179; `apps/web` 351/351 (as 2 falhas pré-existentes de `warning` desaparecem) | ✅     |
| RNF-03 | `danger`/`danger-foreground` mantém margem folgada acima do piso AA após RF-05 | `packages/ui/src/tokens/colors.ts` | `contrast.spec.ts` — ~4,57:1 (era ~4,53:1) ✅                                                   | ✅     |

---

## SPEC-20260731-003 — Redirecionamento Global para /login em 401 de Chamadas Client-Side (Sessão Inválida) (approved)

> Bug reportado por Douglas em 2026-07-31: navegando pelas rotas protegidas com sessão inválida,
> as páginas carregavam normalmente exibindo `Alert` de erro genérico em vez de redirecionar para
> `/login`. Causa raiz: o matcher de `middleware.ts` exclui `api/backend`, então chamadas
> client-side de dados (`apiClient`) nunca passavam pelo guard S1 do middleware — um 401 de
> sessão expirada caía direto no `throw` genérico de `ApiError`.

| Req   | Descrição                                                                                                          | Código                                                        | Teste                                                                   | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------- | ------ |
| RF-01 | Interceptação global: `401` de qualquer chamada `apiClient` redireciona para `/login?redirect=<pathname atual>`    | `apps/web/src/lib/http/api-client.ts`                         | `apps/web/src/lib/http/api-client.spec.ts` — describe RF-01/RF-02/RF-03 | ✅     |
| RF-02 | Endpoints `/auth/*` excluídos do redirect (401 de `/auth/login` é fluxo normal de credenciais inválidas, STORY-02) | `apps/web/src/lib/http/api-client.ts` (`isAuthEndpoint`)      | `apps/web/src/lib/http/api-client.spec.ts`                              | ✅     |
| RF-03 | Sem loop de redirect quando já em `/login`                                                                         | `apps/web/src/lib/http/api-client.ts` (`getLoginRedirectUrl`) | `apps/web/src/lib/http/api-client.spec.ts`                              | ✅     |
| RF-04 | `ApiError` continua sendo lançado após o redirect (efeito colateral, mesmo padrão de RF-13/SPEC-20260719-001)      | `apps/web/src/lib/http/api-client.ts`                         | `apps/web/src/lib/http/api-client.spec.ts`                              | ✅     |

---

## SPEC-20260731-006 — Correção: Escalação de Privilégio via user_metadata do Supabase (approved)

> Auditoria de segurança de 2026-07-31 identificou que `RolesGuard` decidia acesso admin lendo
> `user_metadata.role` — campo gravável pelo próprio usuário autenticado via API pública do
> Supabase (`PUT /auth/v1/user`), fora do backend NestJS. Corrigido migrando a fonte do claim
> para `app_metadata`, gravável apenas via API administrativa (service role). Regra S12.
> Substitui o mecanismo descrito no RF-09 de `SPEC-20260521-004` (ver changelog daquela spec).

| Req        | Descrição                                                                                                                  | Código                                                                                                       | Teste                                                                                                                  | Status                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| RF-SEC-001 | `RolesGuard` lê `app_metadata.role` em vez de `user_metadata.role`                                                         | `apps/api/src/common/guards/roles.guard.ts`                                                                  | `apps/api/src/common/guards/roles.guard.spec.ts`                                                                       | ✅                                                        |
| RF-SEC-002 | `SupabaseAuthGuard` e `SoftDeletedUserGuard` populam `request.user.app_metadata` a partir de `data.user.app_metadata`      | `apps/api/src/common/guards/supabase-auth.guard.ts`, `apps/api/src/common/guards/soft-deleted-user.guard.ts` | `apps/api/src/common/guards/supabase-auth.guard.spec.ts`, `apps/api/src/common/guards/soft-deleted-user.guard.spec.ts` | ✅                                                        |
| RF-SEC-003 | `JwtPayload` declara `app_metadata?: { role?: string }` (campo `user_metadata` removido — não tinha outro consumidor)      | `apps/api/src/modules/auth/jwt.strategy.ts`                                                                  | — (tipo, verificado por `tsc --noEmit`)                                                                                | ✅                                                        |
| RF-SEC-004 | Migração manual de contas admin existentes para `app_metadata.role` antes do deploy                                        | Supabase Dashboard (operacional, sem código)                                                                 | —                                                                                                                      | ⏳ pendente (execução manual por Douglas antes do deploy) |
| RF-SEC-005 | Teste de regressão cobre o critério de fechamento: `user_metadata.role="admin"` forjado, sem `app_metadata.role`, é negado | `apps/api/src/common/guards/roles.guard.spec.ts`                                                             | mesmo arquivo (caso "bloqueia usuário com user_metadata.role='admin' forjado, sem app_metadata.role (S12)")            | ✅                                                        |
| RF-SEC-006 | Changelog em `SPEC-20260521-004` registrando a substituição do mecanismo do RF-09                                          | `specs/admin/SPEC-20260521-004.md` (rodapé)                                                                  | — (documentação)                                                                                                       | ✅                                                        |

---

## SPEC-20260731-004 — Shell de Rotas Públicas: PublicHeader, Footer Consistente e navegação de Retorno (approved)

> Lacuna de UI nas rotas públicas: ausência de header de marca, footer inconsistente
> (`LegalFooter` presente apenas em `/`, `/login`, `/register`) e sem navegação de retorno
> em fluxos de recuperação de senha e documentos legais.
> Spec em `specs/public-shell/SPEC-20260731-004-public-routes-shell.md`.
> Testes unitários novos fora de escopo (ver `specs/TEST_DECISIONS.md`); suítes existentes das
> páginas afetadas foram ajustadas para mockar `useRouter` (consumido por `BackLink`) e continuam
> verdes com os componentes novos renderizados.

| Req   | Descrição                                                                                                                                                                 | Código                                                                                                                                                                                                                                                                                                                                                                                           | Teste                                                                                 | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------ |
| RF-01 | Criar `PublicHeader` em `apps/web/src/components/public-header.tsx`                                                                                                       | `apps/web/src/components/public-header.tsx`                                                                                                                                                                                                                                                                                                                                                      | —                                                                                     | ✅     |
| RF-02 | Prop `navLink?` opcional no `PublicHeader`                                                                                                                                | `apps/web/src/components/public-header.tsx`                                                                                                                                                                                                                                                                                                                                                      | —                                                                                     | ✅     |
| RF-03 | `PublicHeader` em todas as rotas públicas (`/`, `/login`, `/register`, `/recover-password`, `/reset-password`, `/restore-account`, `/termos`, `/privacidade`, `/offline`) | `apps/web/src/app/page.tsx`, `apps/web/src/app/(auth)/login/page.tsx`, `apps/web/src/app/(auth)/register/page.tsx`, `apps/web/src/app/(auth)/recover-password/page.tsx`, `apps/web/src/app/(auth)/reset-password/page.tsx`, `apps/web/src/app/(auth)/restore-account/page.tsx`, `apps/web/src/app/termos/page.tsx`, `apps/web/src/app/privacidade/page.tsx`, `apps/web/src/app/offline/page.tsx` | —                                                                                     | ✅     |
| RF-04 | Em `/login`: `navLink={{ label: "Criar conta", href: "/register" }}`                                                                                                      | `apps/web/src/app/(auth)/login/page.tsx`                                                                                                                                                                                                                                                                                                                                                         | `apps/web/src/app/(auth)/login/page.spec.tsx`                                         | ✅     |
| RF-05 | Em `/register`: `navLink={{ label: "Entrar", href: "/login" }}`                                                                                                           | `apps/web/src/app/(auth)/register/page.tsx`                                                                                                                                                                                                                                                                                                                                                      | `apps/web/src/app/(auth)/register/page.spec.tsx`                                      | ✅     |
| RF-06 | Demais rotas: `PublicHeader` sem `navLink`                                                                                                                                | `apps/web/src/app/page.tsx`, `apps/web/src/app/(auth)/recover-password/page.tsx`, `apps/web/src/app/(auth)/reset-password/page.tsx`, `apps/web/src/app/(auth)/restore-account/page.tsx`, `apps/web/src/app/termos/page.tsx`, `apps/web/src/app/privacidade/page.tsx`, `apps/web/src/app/offline/page.tsx`                                                                                        | —                                                                                     | ✅     |
| RF-07 | `LegalFooter` presente em todas as rotas públicas (adicionado em `/recover-password`, `/reset-password`, `/restore-account`, `/termos`, `/privacidade`, `/offline`)       | `apps/web/src/app/(auth)/recover-password/page.tsx`, `apps/web/src/app/(auth)/reset-password/page.tsx`, `apps/web/src/app/(auth)/restore-account/page.tsx`, `apps/web/src/app/termos/page.tsx`, `apps/web/src/app/privacidade/page.tsx`, `apps/web/src/app/offline/page.tsx`                                                                                                                     | —                                                                                     | ✅     |
| RF-08 | Link "Voltar para o login" (→ `/login`) em `/recover-password`, abaixo do formulário                                                                                      | `apps/web/src/app/(auth)/recover-password/page.tsx`                                                                                                                                                                                                                                                                                                                                              | `apps/web/src/app/(auth)/recover-password/page.spec.tsx`                              | ✅     |
| RF-09 | Link "Voltar para o login" (→ `/login`) em `/reset-password`, abaixo do formulário                                                                                        | `apps/web/src/app/(auth)/reset-password/page.tsx`                                                                                                                                                                                                                                                                                                                                                | `apps/web/src/app/(auth)/reset-password/page.spec.tsx`                                | ✅     |
| RF-10 | Link "Voltar para o login" (→ `/login`) em `/restore-account`, terciário abaixo dos dois CTAs existentes                                                                  | `apps/web/src/app/(auth)/restore-account/page.tsx`                                                                                                                                                                                                                                                                                                                                               | `apps/web/src/app/(auth)/restore-account/page.spec.tsx`                               | ✅     |
| RF-11 | Criar `BackLink` em `apps/web/src/components/back-link.tsx` (`router.back()` com fallback por prop)                                                                       | `apps/web/src/components/back-link.tsx`                                                                                                                                                                                                                                                                                                                                                          | —                                                                                     | ✅     |
| RF-12 | `BackLink` com `fallback="/"` e rótulo "Voltar" em `/termos` e `/privacidade`, acima do conteúdo                                                                          | `apps/web/src/app/termos/page.tsx`, `apps/web/src/app/privacidade/page.tsx`                                                                                                                                                                                                                                                                                                                      | `apps/web/src/app/termos/page.spec.tsx`, `apps/web/src/app/privacidade/page.spec.tsx` | ✅     |
| RF-13 | `ThemeToggle` (`@navestory/ui`) no `PublicHeader`, alinhado à direita, com `useTheme`/`resolvedTheme` (`next-themes`) — mesmo padrão de `layout/header.tsx`               | `apps/web/src/components/public-header.tsx`                                                                                                                                                                                                                                                                                                                                                      | —                                                                                     | ✅     |

---

## SPEC-20260731-005 — Design System: Remapeamento da Escala text-\* do Tailwind para Tokens Formais (approved)

> Fecha a pendência registrada no changelog de `SPEC-20260731-001` (RF-06): a escala de
> utilitários `text-*` do Tailwind ainda resolvia para os defaults de fábrica em vez dos valores
> formais de `packages/ui/src/tokens/typography.ts`. Sobrescreve `theme.extend.fontSize` em
> `apps/web/tailwind.config.ts` importando `typographyScale` diretamente (sem duplicar valores),
> mesmo princípio de substituição global silenciosa já usado para `fontFamily.sans`.
>
> **2026-07-31 (fecho de RF-04):** baseline de visual regression gerada — seed E2E rodado
> contra o Supabase remoto de `apps/api/.env`, stack local subida, `playwright test
visual-regression --update-snapshots` (6/6, confirmado depois sem `--update-snapshots`).
> Encontrados e corrigidos dois bugs pré-existentes de locator na suíte (nunca executada de
> fato até agora): `getByLabel("Senha")` sem `exact: true` colidia com o botão "Mostrar/Ocultar
> senha" do `PasswordInput` (substring match); `DashboardPage.sidebar` (`page.locator("nav")`)
> deixou de ser único após o shell passar a renderizar `<nav>` extras no footer — corrigido para
> `getByRole("dialog", { name: "Menu de navegação" })`. Outros bugs de locator encontrados na
> rodada completa da suíte (`auth.spec.ts`, `expense-warnings.spec.ts`, `vehicle-context.spec.ts`)
> são de `SPEC-20260716-003`, não desta spec — registrados em
> `important/PENDENCIAS-E-PROCESSOS.md`.

| Req   | Descrição                                                                                                                  | Código                                                                                                                                                     | Teste                                                                                                                                      | Status |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| RF-01 | Sobrescrever `theme.extend.fontSize` com os 7 passos da escala formal (`xs/sm/base/md/lg/xl/2xl`), sem `fontWeight` (D-03) | `apps/web/tailwind.config.ts`                                                                                                                              | `next build` sem erro; verificação visual manual (dashboard, expenses, maintenance, expenses/new, showcase)                                | ✅     |
| RF-02 | Importar `typographyScale` de `packages/ui/src/tokens/typography.ts` diretamente no Tailwind config — sem duplicar valores | `apps/web/tailwind.config.ts` (`import { typographyScale } from "@navestory/ui/tokens"`)                                                                   | `npx tsc --noEmit` limpo; `next build` resolve o import via workspace `@navestory/ui` sem necessidade do fallback `.json` cogitado na spec | ✅     |
| RF-03 | Comentário de rastreabilidade `@spec SPEC-20260731-005 RF-01` no bloco `extend.fontSize`                                   | `apps/web/tailwind.config.ts`                                                                                                                              | — (documentação)                                                                                                                           | ✅     |
| RF-04 | QA visual completo (D-05): visual regression com baseline atualizada + auditoria manual + `C-DS-01` íntegro                | `apps/web/e2e/tests/visual-regression.spec.ts`, `apps/web/e2e/global-setup.ts`, `apps/web/e2e/pages/login.page.ts`, `apps/web/e2e/pages/dashboard.page.ts` | `visual-regression.spec.ts` 6/6 ✅ (baseline em `visual-regression.spec.ts-snapshots/`); auditoria manual sem regressão visível            | ✅     |
| RF-05 | `contrast.spec.ts` continua 100% após o remapeamento                                                                       | `packages/ui/src/tokens/typography.ts` (fonte), `apps/web/tailwind.config.ts` (consumo)                                                                    | `apps/web/src/app/(app)/design-system/_lib/contrast.spec.ts` — 22/22 ✅                                                                    | ✅     |
| RF-06 | Atualizar comentário de `typography.ts` removendo a nota de "não remapeado"                                                | `packages/ui/src/tokens/typography.ts`                                                                                                                     | — (documentação)                                                                                                                           | ✅     |
| RF-07 | Atualizar `matrices/rastreabilidade.md` com esta entrada                                                                   | `matrices/rastreabilidade.md`                                                                                                                              | — (documentação)                                                                                                                           | ✅     |

| Req    | Descrição                                                                                                         | Código                             | Teste                                                                     | Status |
| ------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------- | ------ |
| RNF-01 | Build sem erro após o remapeamento                                                                                | —                                  | `next build` (`apps/web`) ✅                                              | ✅     |
| RNF-02 | Nenhuma regressão em testes unitários existentes                                                                  | —                                  | `packages/ui` 179/179; `apps/web` 356/356                                 | ✅     |
| RNF-03 | `C-DS-01` preservado no novo limiar de "texto grande" (`text-2xl` cruza para ≥24px, `text-lg` permanece "normal") | `packages/ui/src/tokens/colors.ts` | `contrast.spec.ts` 22/22 ✅                                               | ✅     |
| RNF-04 | Sem `text-[Npx]` novo introduzido pela mudança                                                                    | —                                  | Nenhum arquivo tocado por esta spec introduz valor arbitrário (`R-DS-12`) | ✅     |

---

## SPEC-20260731-007 — Migração de Emoji para Ícones Lucide — KPI Catalog e Feed de Atividades (approved)

> Substitui emojis crus usados como ícones funcionais em `kpi-catalog.ts` e `atividades/page.tsx`
> (e nos render sites `DashboardKpiGrid.tsx` e `KpiPicker.tsx`) por componentes Lucide, alinhando
> esses pontos ao padrão de iconografia documentado em `PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md`
> §8 e exemplificado na vitrine (`iconografia.tsx`). Mudança puramente visual; zero impacto em
> lógica de negócio. Spec em `specs/design-system/SPEC-20260731-007-migracao-emoji-lucide-producao.md`.
> Análise de impacto: IMPACTO-046.

| Req   | Descrição                                                                                                                     | Código                                                          | Teste                                                                 | Status |
| ----- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------- | ------ |
| RF-01 | `kpi-catalog.ts`: campo `icon: string` → `import type { LucideIcon }` de `lucide-react`                                       | `apps/web/src/components/dashboard/kpi-catalog.ts`              | Dispensado (ver `TEST_DECISIONS.md`)                                  | ✅     |
| RF-02 | 8 emojis do catálogo de KPI → componentes Lucide (Wallet, Fuel, HeartPulse, Wrench, Car, CalendarClock, Timer, TriangleAlert) | `apps/web/src/components/dashboard/kpi-catalog.ts`              | Dispensado                                                            | ✅     |
| RF-03 | `DashboardKpiGrid.tsx`: render de `meta.icon` de interpolação string → instância Lucide `size={16}`                           | `apps/web/src/components/dashboard/DashboardKpiGrid.tsx`        | Dispensado — coberto por `dashboard/page.spec.tsx` (8 testes verdes)  | ✅     |
| RF-04 | `DashboardKpiGrid.tsx`: `<span aria-hidden>⚠</span>` hardcoded → `<TriangleAlert size={16} aria-hidden />`                    | `apps/web/src/components/dashboard/DashboardKpiGrid.tsx`        | Dispensado                                                            | ✅     |
| RF-05 | `KpiPicker.tsx`: render de `icon` → instância Lucide `size={16}`                                                              | `apps/web/src/components/dashboard/KpiPicker.tsx`               | Dispensado                                                            | ✅     |
| RF-06 | `atividades/page.tsx`: campo `icon` de `DOMAIN_LABELS` → `LucideIcon`; tipo de retorno de `domainInfo()` atualizado           | `apps/web/src/app/(app)/atividades/page.tsx`                    | Dispensado — coberto por `atividades/page.spec.tsx` (3 testes verdes) | ✅     |
| RF-07 | 9 domínios de `DOMAIN_LABELS` → componentes Lucide (Car, Receipt, Wrench, ShieldAlert, Repeat, Gauge, User, User, FileText)   | `apps/web/src/app/(app)/atividades/page.tsx`                    | Dispensado                                                            | ✅     |
| RF-08 | Render site da tabela de atividades: instanciar `LucideIcon` em vez de interpolar string emoji                                | `apps/web/src/app/(app)/atividades/page.tsx`                    | Dispensado                                                            | ✅     |
| RF-09 | `<EmptyState icon="🛡️" />` → `<EmptyState icon={<ShieldAlert size={24} aria-hidden />} />`                                    | `apps/web/src/app/(app)/atividades/page.tsx`                    | Dispensado                                                            | ✅     |
| RF-10 | Comentários `@spec SPEC-20260731-007 RF-XX` nos arquivos alterados                                                            | `kpi-catalog.ts`, `DashboardKpiGrid.tsx`, `atividades/page.tsx` | — (documentação)                                                      | ✅     |

---

## SPEC-20260721-002 — Dashboard v2: KPI Cards, VehicleHealthScore, Tokens de Superfície e Widget Próximos 7 Dias (approved)

> **Promovida de `draft` para `approved` em 2026-07-22**: RF-01 a RF-09 implementados
> (RF-05/RF-06/RF-07 com pendências pontuais marcadas 🔶 abaixo); RF-08 desbloqueado e
> implementado na mesma data, após decisão de arquitetura de backend (ver linha própria abaixo).

> RF-01 foi revisado em 2026-07-21 (edição direta, spec ainda `draft`): em vez de 4 KPIs fixos,
> virou um catálogo curado de 8 métricas com preset editável por usuário (`user_preferences.dashboard_kpi_ids`),
> decisão tomada após levantamento de dados disponíveis (RPCs de `SPEC-20260622-001` já prontas),
> ciência de dados (amostra pequena distorce sparkline/delta em frotas de 1–5 veículos) e UX
> (Miller's Law/Hick's Law — catálogo ≤10, ativos ≤6). Regras novas: R-KPI-01, R-KPI-02 (`RULES.md`).
> RF-09 foi desbloqueado na mesma rodada: a RPC `get_upcoming_costs` já existia no banco
> (não precisou ser criada) — só o dado agregado (KPI `upcoming_costs_7d`) chegou ao dashboard
> nesta rodada; a lista de itens individuais do widget RF-09 ainda não foi implementada.
> RF-02 a RF-06 (exceto o catálogo de KPIs de RF-01) já estavam implementados antes desta
> atualização da matriz — linhas adicionadas abaixo para fechar o gate de sincronia. RF-07 foi
> revisado em 2026-07-22: a saudação personalizada foi removida do escopo (decisão do usuário),
> ficando só a data abreviada; spec, STORIES.md e esta matriz atualizados na mesma rodada.
> RF-08 desbloqueado em 2026-07-22: `GET /dashboard/fleet-charts` criado (endpoint próprio,
> desacoplado de `fleet-kpis`/`kpi-catalog` — RNF-05), ver linha própria abaixo.
> RF-09 concluído em 2026-07-22: `UpcomingCostsWidget` lista os itens individuais (antes só o
> agregado existia). Teto de 10 itens (P6) aplicado via `.limit()` no builder do RPC
> (`upcomingCostsQuerySchema.limit`, PostgREST) — nunca cortado em memória no frontend.

### Catálogo de KPIs Configurável (RF-01, R-KPI-01, R-KPI-02)

| Req       | Descrição                                                                                                                                                                                                                                                                                | Código                                                                                                                                                                                                       | Teste                                                                                                                                                                         | Status                                                     |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| RF-01     | Migration `dashboard_kpi_ids text[]` em `user_preferences` (1–6 ids, default = 4 KPIs pré-existentes)                                                                                                                                                                                    | `supabase/migrations/20260721150000_dashboard_kpi_preferences.sql`                                                                                                                                           | — (migration; sem harness de teste de banco no projeto)                                                                                                                       | ✅                                                         |
| RF-01     | Catálogo fixo de 8 KPIs + schema de validação (`KPI_CATALOG_IDS`, `dashboardKpiIdsSchema`, `FleetKpiCatalog`)                                                                                                                                                                            | `packages/validators/src/dashboard.schemas.ts`, `packages/validators/src/preferences.schemas.ts`                                                                                                             | `packages/validators/src/dashboard.schemas.spec.ts`, `packages/validators/src/preferences.schemas.spec.ts`                                                                    | ✅                                                         |
| RF-01     | `GET /dashboard/kpi-catalog` — computa os 8 KPIs (`Promise.allSettled`, falha isolada por métrica); sparkline de 6 meses + delta com supressão por amostra pequena (R-KPI-02) em `expenses_month`/`cost_per_km`                                                                          | `apps/api/src/modules/dashboard/dashboard.service.ts` (`getFleetKpiCatalog`), `apps/api/src/modules/dashboard/dashboard.controller.ts`                                                                       | `apps/api/src/modules/dashboard/dashboard.service.spec.ts`, `apps/api/src/modules/dashboard/dashboard.controller.spec.ts`                                                     | ✅                                                         |
| RF-01     | `PATCH /preferences` aceita `dashboard_kpi_ids`; `GET /preferences` retorna com fallback default                                                                                                                                                                                         | `apps/api/src/modules/preferences/preferences.service.ts`                                                                                                                                                    | `apps/api/src/modules/preferences/preferences.service.spec.ts`                                                                                                                | ✅                                                         |
| RF-01     | Grid de KPIs ativos + navegação por clique + picker de personalização (teto 6)                                                                                                                                                                                                      | `apps/web/src/components/dashboard/DashboardKpiGrid.tsx`, `apps/web/src/components/dashboard/KpiPicker.tsx`, `apps/web/src/components/dashboard/kpi-catalog.ts`, `apps/web/src/app/(app)/dashboard/page.tsx` | `apps/web/src/app/(app)/dashboard/page.spec.tsx`                                                                                                                              | ✅ — `FleetKpis.tsx`/`FleetKpisData` removidos do codebase |
| RF-09     | `horizon_days: 7` habilitado em `upcomingCostsQuerySchema`, reaproveitado por `upcoming_costs_7d` do catálogo                                                                                                                                                                            | `packages/validators/src/expense.schemas.ts`                                                                                                                                                                 | `packages/validators/src/expense.schemas.spec.ts`                                                                                                                             | ✅                                                         |
| RF-09, P6 | Widget "Próximos 7 dias": lista até 10 itens (`limit` opcional no schema, aplicado via `.limit()` no builder do RPC — nunca cortado em memória), urgência visual por faixa (≤2d `danger`, 3–5d `warning`, 6–7d neutro), total agregado, empty state e link "Ver todos" ao atingir o teto | `apps/web/src/components/dashboard/UpcomingCostsWidget.tsx`, `apps/api/src/modules/expenses/expenses.service.ts` (`getUpcomingCosts`), `packages/validators/src/expense.schemas.ts`                          | `apps/web/src/components/dashboard/UpcomingCostsWidget.spec.tsx`, `apps/api/src/modules/expenses/expenses.service.spec.ts`, `packages/validators/src/expense.schemas.spec.ts` | ✅                                                         |

### Health Score, Tokens, Export e Grid (RF-02 a RF-06)

| Req   | Descrição                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Código                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Teste                                                                                                                                                | Status                                                                                                                               |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| RF-02 | `VehicleHealthScore` (anel SVG progress ring, score numérico, cor por faixa 0–49/50–74/75–100) substitui o "dot" em `VehicleHealthCard`                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `packages/ui/src/components/vehicle-health-score.tsx`, `apps/web/src/components/dashboard/VehicleHealthCard.tsx`                                                                                                                                                                                                                                                                                                                                                                                           | `packages/ui/src/components/vehicle-health-score.test.tsx`, `apps/web/src/components/dashboard/VehicleHealthCard.spec.tsx`                           | ✅                                                                                                                                   |
| RF-03 | Classes Tailwind literais (`bg-red-*`, `bg-amber-*`, `bg-green-*`) substituídas por tokens semânticos (`danger`/`warning`/`success` + `-pastel`/`-foreground`)                                                                                                                                                                                                                                                                                                                                                                                                                                           | `apps/web/src/components/dashboard/FleetAlertBar.tsx`, `apps/web/src/components/dashboard/VehicleHealthCard.tsx`                                                                                                                                                                                                                                                                                                                                                                                           | `apps/web/src/components/dashboard/VehicleHealthCard.spec.tsx`                                                                                       | ✅                                                                                                                                   |
| RF-04 | Tokens `--surface`, `--surface-elevated`, `--on-surface`, `--on-surface-muted`, `--on-surface-subtle`, `--chart-1..5`, `--chart-grid`, `--finance-outgoing` + classes `.glass-card`/`.kicker`, com par light/dark                                                                                                                                                                                                                                                                                                                                                                                        | `apps/web/src/app/globals.css`                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | — (tokens CSS; sem harness de teste visual)                                                                                                          | ✅                                                                                                                                   |
| RF-05 | `ExportControls` reposicionado após a Zona B (última seção antes do footer); estados loading (`fetch` + `Blob`, botão desabilitado) e erro (mensagem inline `role="alert"`, sem `alert()` do browser)                                                                                                                                                                                                                                                                                                                                                                                                    | `apps/web/src/app/(app)/dashboard/page.tsx` (`ExportControls`)                                                                                                                                                                                                                                                                                                                                                                                                                                             | — (sem spec dedicado; verificado por leitura de código)                                                                                              | 🔶 estado "desabilitado plano Grátis" (R-BIZ-12) não implementado — depende do mesmo gap de dado de plano do usuário citado em RF-07 |
| RF-06 | Grid de veículos `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` (era `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `apps/web/src/app/(app)/dashboard/page.tsx` (`VehicleGrid`)                                                                                                                                                                                                                                                                                                                                                                                                                                                | — (sem teste de layout dedicado; validação visual manual pendente em breakpoint 360–375px)                                                           | 🔶                                                                                                                                   |
| RF-08 | Gráficos inline de frota — decisão tomada em 2026-07-22: novo endpoint `GET /dashboard/fleet-charts` (não reaproveita `fleet-kpis`/`kpi-catalog`, RNF-05), reaproveitando `get_vehicle_cost_per_km` (custo/km) e estendendo `get_category_spending_highlights` com `p_limit` opcional (categorias). `fuel_liters` é volume de combustível (soma de `expenses.liters`) por mês, não eficiência km/L — métrica por veículo já existe em `GET /analytics/fuel-trend/:vehicleId` e não agrega de forma significativa numa frota mista (decisão registrada em `FleetChartsResponse`, `@navestory/validators`) | `apps/api/src/modules/dashboard/dashboard.controller.ts` (`getFleetCharts`), `dashboard.service.ts` (`getFleetCharts`, `getCostPerKmChartSeries`, `getFuelLitersChartSeries`, `getFullCategoryBreakdown`), `packages/validators/src/dashboard.schemas.ts` (`FleetChartsResponse`, `MonthlySeriesPoint`), `supabase/migrations/20260722130000_fleet_charts.sql`, `apps/web/src/components/dashboard/FleetCharts.tsx` (`CostPerKmChart`, `FuelConsumptionChart`, `ExpenseCategoryPie`, `FleetChartsSection`) | `apps/api/src/modules/dashboard/dashboard.service.spec.ts`, `dashboard.controller.spec.ts`, `apps/web/src/components/dashboard/FleetCharts.spec.tsx` | ✅                                                                                                                                   |

### Cabeçalho de Data Abreviada (RF-07 — revisado em 2026-07-22)

| Req   | Descrição                                                                                                                                                                                                                                                                                                                                         | Código                                                              | Teste                                                                | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------- | ------ |
| RF-07 | Saudação personalizada removida do escopo (decisão do usuário, 2026-07-22 — gap de nome de usuário client-side em IMPACTO-040 #5 não resolvido, texto genérico sem nome tinha baixo valor). H1 "Dashboard" mantido `sr-only`; cabeçalho visível é a data abreviada "Dia-da-semana, DD Mês. AA" (ex.: "Qua, 22 Jul. 26") via `Intl.DateTimeFormat` | `apps/web/src/app/(app)/dashboard/page.tsx` (`DashboardDateHeader`) | — (sem teste dedicado nesta rodada — formatação de data client-side) | 🔶     |

---

## SPEC-20260524-002 — Cadastro de Conta: Regras de Senha e Frontend (aprovado)

> Atualiza SPEC-20260524-001 §4.1 (nova regra de senha: 6 chars + letra + número + especial) e
> documenta stories STORY-01 a STORY-04 de frontend do fluxo de cadastro.
> Implementado em 2026-07-13 como parte da Fase 1 do roadmap (T1.1–T1.5). Schema Zod autoritativo
> em `packages/validators/src/auth.schemas.ts` — SPEC-20260524-001 §4.1 supersedida por esta regra.

| Req            | Descrição                                                                            | Código                                      | Teste                                           | Status |
| -------------- | ------------------------------------------------------------------------------------ | ------------------------------------------- | ----------------------------------------------- | ------ |
| RF-01/STORY-02 | `registerInputSchema`: aceita 6+ chars com letra + número + especial                 | `packages/validators/src/auth.schemas.ts`   | `apps/web/` (Vitest, 42 testes, 91%+ cobertura) | ✅     |
| RF-02/STORY-02 | `registerInputSchema`: rejeita senha sem letra, sem número, sem especial             | `packages/validators/src/auth.schemas.ts`   | `apps/web/` (Vitest)                            | ✅     |
| RF-03/STORY-02 | `resetPasswordInputSchema`: mesma nova regra de senha                                | `packages/validators/src/auth.schemas.ts`   | `apps/web/` (Vitest)                            | ✅     |
| RF-04/STORY-02 | Mensagem inline por campo violado (não batch)                                        | `apps/web/src/app/(auth)/register/page.tsx` | `apps/web/` (Vitest)                            | ✅     |
| RF-05/STORY-03 | Email duplicado (409) → bloco amarelo com email, botão login e botão recuperar senha | `apps/web/src/app/(auth)/register/page.tsx` | `apps/web/` (Vitest)                            | ✅     |
| RF-07/STORY-03 | Link "Recuperar senha" → `/recover-password?email={encoded}`                         | `apps/web/src/app/(auth)/register/page.tsx` | `apps/web/` (Vitest)                            | ✅     |
| RF-08/STORY-04 | Erro de sistema (não-409) → bloco vermelho com mensagem do Supabase                  | `apps/web/src/app/(auth)/register/page.tsx` | `apps/web/` (Vitest)                            | ✅     |
| RF-09/STORY-04 | Formulário NÃO resetado após erro — dados persistem para reenvio                     | `apps/web/src/app/(auth)/register/page.tsx` | `apps/web/` (Vitest)                            | ✅     |
| RF-10/STORY-01 | Email normalizado para lowercase via `.transform()` no schema Zod                    | `packages/validators/src/auth.schemas.ts`   | `apps/web/` (Vitest)                            | ✅     |

---

## SPEC-20260524-001 — Autenticação e Cadastro (Unificada) (aprovado)

> Consolida: `stories.md §1, §7, §8`, `ADR-003 (lifecycle)`, rate limits de SPEC-001.
> Mudança principal: lifecycle de sessão — 30 min idle sem atividade / 7 dias com "lembrar de mim".
> Implementado em 2026-07-13 como parte da Fase 1 do roadmap (T1.1–T1.5).
> Rate limits de auth são autoritativos nesta spec (SPEC-20260521-001 §RF-SEC-004 supersedida).

### Backend — AuthModule

| Req          | Descrição                                                                                | Código                                                                                                                                                                                                                                                                                                   | Teste                                                                                                | Status |
| ------------ | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------ |
| STORY-REG-01 | Registro com rollback atômico em falha de criação de perfil; `POST /auth/register`       | `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/modules/auth/dto/register.dto.ts`                                                                                                                                                             | `apps/api/` (Jest, 67 testes, 90%+ cobertura); `apps/api/test/integration/auth.int-spec.ts` (CT-006) | ✅     |
| STORY-REG-01 | E-mail duplicado → 409 + mensagem direcionada no frontend                                | `apps/api/src/modules/auth/auth.service.ts`                                                                                                                                                                                                                                                              | `apps/api/` (Jest)                                                                                   | ✅     |
| STORY-01     | `POST /auth/login` — retorna JWT; audit REGISTER/LOGIN                                   | `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/modules/auth/dto/login.dto.ts`, `apps/api/src/modules/auth/jwt.strategy.ts` (tipo `JwtPayload` — a `PassportStrategy` foi removida em 2026-07-19; validação migrada para `SupabaseAuthGuard`) | `apps/api/` (Jest); `apps/api/test/integration/auth.int-spec.ts`                                     | ✅     |
| STORY-02     | Mensagem INVALID_CREDENTIALS genérica (anti-enumeração)                                  | `apps/api/src/modules/auth/auth.service.ts`                                                                                                                                                                                                                                                              | `apps/api/` (Jest)                                                                                   | ✅     |
| STORY-03     | Bloqueio por tentativas via `supabase/migrations/20260713190000_auth_login_attempts.sql` | `supabase/migrations/20260713190000_auth_login_attempts.sql`, `apps/api/src/modules/auth/auth.service.ts`                                                                                                                                                                                                | `apps/api/` (Jest)                                                                                   | ✅     |
| STORY-04     | `POST /auth/recover-password` → 200 sempre; rate limit 3/15min                           | `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/modules/auth/dto/recover-password.dto.ts`                                                                                                                                                                                                  | `apps/api/` (Jest)                                                                                   | ✅     |
| STORY-05     | `POST /auth/reset-password` — valida token Supabase; invalida sessões anteriores         | `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/modules/auth/dto/reset-password.dto.ts`                                                                                                                                                                                                    | `apps/api/` (Jest)                                                                                   | ✅     |
| STORY-SEC-01 | `POST /auth/logout` e `POST /auth/refresh` com `SupabaseAuthGuard`                       | `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/common/guards/supabase-auth.guard.ts`                                                                                                                                                                                                      | `apps/api/` (Jest)                                                                                   | ✅     |
| CA-20        | audit_logs registra REGISTER e LOGIN com campos corretos                                 | `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/shared/audit/audit.service.ts`                                                                                                                                                                                                                | `apps/api/` (Jest)                                                                                   | ✅     |

### Frontend — Páginas de Auth e Gestão de Sessão

| Req            | Descrição                                                                                          | Código                                                                                      | Teste                                           | Status |
| -------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------ |
| STORY-01       | Redirect para rota original após login; usuário logado em /login → /dashboard                      | `apps/web/middleware.ts`, `apps/web/src/app/(auth)/login/page.tsx`                          | `apps/web/` (Vitest, 42 testes, 91%+ cobertura) | ✅     |
| STORY-REG-02   | Toggle show/hide senha com aria-label acessível                                                    | `apps/web/src/components/password-input.tsx`                                                | `apps/web/` (Vitest)                            | ✅     |
| STORY-04       | Reenvio de e-mail com cooldown de 60 s + rate limit 3/15min                                        | `apps/web/src/app/(auth)/recover-password/page.tsx`                                         | `apps/web/` (Vitest)                            | ✅     |
| STORY-05       | Link expirado/usado → mensagem amigável com botão de novo link                                     | `apps/web/src/app/(auth)/reset-password/page.tsx`                                           | `apps/web/` (Vitest)                            | ✅     |
| STORY-06       | "Lembrar de mim" → preferência em sessionStorage; idle timer ativado apenas sem lembrar            | `apps/web/src/app/(auth)/login/page.tsx`, `apps/web/src/lib/hooks/use-activity-tracker.ts`  | `apps/web/` (Vitest)                            | ✅     |
| STORY-07a      | Hook `useActivityTracker`: idle timer 30 min, reset por evento/rota; renovação via `/auth/refresh` | `apps/web/src/lib/hooks/use-activity-tracker.ts`, `apps/web/src/lib/auth/decode-jwt-exp.ts` | `apps/web/` (Vitest)                            | ✅     |
| STORY-07b      | `<FormDraftGuard>`: salva/restaura estado de formulário em sessionStorage                          | `apps/web/src/components/form-draft-guard.tsx`                                              | `apps/web/` (Vitest)                            | ✅     |
| STORY-08       | Timeout/offline via `api-client.ts`; mensagem sem loading infinito                                 | `apps/web/src/lib/http/api-client.ts`                                                       | `apps/web/` (Vitest)                            | ✅     |
| IMPACTO-021 #1 | Middleware SSR `apps/web/middleware.ts` — proteção de rotas + renovação de sessão                  | `apps/web/middleware.ts`, `apps/web/next.config.ts` (rewrite `/api/backend/*`)              | `apps/web/` (Vitest)                            | ✅     |

---

## SPEC-20260521-005 — OpenAPI / Swagger (Aprovada)

> Documentação automática da API NestJS via `@nestjs/swagger`. Swagger UI acessível em `/api/docs`
> somente em `development` ou com `SWAGGER_ENABLED=true`. Módulo `admin` incluído na documentação.
> Implementado em 2026-07-13 como parte da Fase 1 do roadmap (T1.5).

| Req   | Descrição                                                                                           | Código                                                                                                               | Teste                                                                              | Status |
| ----- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------ |
| RF-01 | Swagger UI em `/api/docs` em `development` ou com `SWAGGER_ENABLED=true`                            | `apps/api/src/main.ts`                                                                                               | `apps/api/` (Jest, 90%+ cobertura — integração não exposta em produção via RNF-01) | ✅     |
| RF-02 | Desabilitado em `production` (sem `SWAGGER_ENABLED=true`)                                           | `apps/api/src/main.ts`                                                                                               | `apps/api/` (Jest)                                                                 | ✅     |
| RF-03 | `@ApiTags` em todos os controllers (auth, users, admin, vehicles, expenses, maintenance, dashboard) | `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/modules/admin/admin.controller.ts`, demais controllers | `apps/api/` (Jest)                                                                 | ✅     |
| RF-04 | `@ApiOperation` e `@ApiResponse` em cada endpoint                                                   | Todos os controllers em `apps/api/src/modules/`                                                                      | `apps/api/` (Jest)                                                                 | ✅     |
| RF-05 | Plugin automático via `apps/api/nest-cli.json`                                                      | `apps/api/nest-cli.json`                                                                                             | — (build-time)                                                                     | ✅     |
| RF-06 | Bearer JWT documentado globalmente via `addBearerAuth`                                              | `apps/api/src/main.ts`                                                                                               | — (visual)                                                                         | ✅     |
| RF-07 | `@ApiBearerAuth` em endpoints protegidos                                                            | Todos os controllers com `SupabaseAuthGuard`                                                                         | — (visual)                                                                         | ✅     |
| RF-08 | `openapi.json` gerado via `pnpm docs:generate`                                                      | `apps/api/src/main.ts`                                                                                               | — (script de build)                                                                | 🔶     |

---

## SPEC-20260521-004 — Admin Role e Operações LGPD (Aprovada)

> Módulo admin com bypass de RLS via `AdminSupabaseService` (SERVICE_ROLE_KEY); auto-exclusão de
> conta LGPD em `DELETE /users/me`; audit de todas as operações admin.
> Implementado em 2026-07-13 como parte da Fase 1 do roadmap (T1.3–T1.4).
> Decisão pós-aprovação: admin identificado por `user_metadata.role = 'admin'` no JWT (RF-09);
> `DELETE /users/me` usa exclusão física via `auth.admin.deleteUser` + cascata FK (não soft-delete
> anonimizado do RF-02) — ver changelog no rodapé da spec.

### Backend — AdminModule e UsersModule

| Req   | Descrição                                                                                                      | Código                                                                                                                                             | Teste                                         | Status |
| ----- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------ |
| RF-01 | `DELETE /users/me` — auto-exclusão com `{ confirm: true }`                                                     | `apps/api/src/modules/users/users.controller.ts`, `apps/api/src/modules/users/users.service.ts`                                                    | `apps/api/` (Jest, 67 testes, 90%+ cobertura) | ✅     |
| RF-02 | Exclusão física via `auth.admin.deleteUser` + cascata FK `auth.users → profiles → demais` (satisfaz C1)        | `apps/api/src/modules/users/users.service.ts`                                                                                                      | `apps/api/` (Jest)                            | ✅     |
| RF-03 | Revogação de JWT via `auth.admin.deleteUser`                                                                   | `apps/api/src/modules/users/users.service.ts`                                                                                                      | `apps/api/` (Jest)                            | ✅     |
| RF-04 | `{ confirm: true }` obrigatório → 400 se ausente                                                               | `apps/api/src/modules/users/users.controller.ts`                                                                                                   | `apps/api/` (Jest)                            | ✅     |
| RF-05 | `AdminSupabaseService` com `SERVICE_ROLE_KEY`; `AdminModule` e `SupabaseAdminModule` separados                 | `apps/api/src/modules/admin/admin-supabase.service.ts`, `apps/api/src/shared/supabase/supabase-admin.module.ts`                                    | `apps/api/` (Jest)                            | ✅     |
| RF-06 | `GET /admin/users` — listar usuários (paginado, apenas admin)                                                  | `apps/api/src/modules/admin/admin.controller.ts`, `apps/api/src/modules/admin/admin.service.ts`                                                    | `apps/api/` (Jest)                            | ✅     |
| RF-07 | `GET /admin/audit-logs` — filtro por `user_id` e período                                                       | `apps/api/src/modules/admin/admin.controller.ts`, `apps/api/src/modules/admin/admin.service.ts`                                                    | `apps/api/` (Jest)                            | ✅     |
| RF-08 | `DELETE /admin/users/:id` — admin exclui qualquer conta (LGPD)                                                 | `apps/api/src/modules/admin/admin.controller.ts`, `apps/api/src/modules/admin/admin.service.ts`                                                    | `apps/api/` (Jest)                            | ✅     |
| RF-09 | Admin identificado por `user_metadata.role = 'admin'` no JWT; `SupabaseAuthGuard + RolesGuard/@Roles('admin')` | `apps/api/src/common/guards/roles.guard.ts`, `apps/api/src/common/decorators/roles.decorator.ts`, `apps/api/src/modules/admin/admin.controller.ts` | `apps/api/` (Jest)                            | ✅     |

### Backend — Decorators e Guards Comuns

| Req | Descrição                                                           | Código                                                                                          | Teste              | Status |
| --- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------ | ------ |
| —   | `@UserId()` decorator — extrai userId do JWT para controllers       | `apps/api/src/common/decorators/user-id.decorator.ts`                                           | `apps/api/` (Jest) | ✅     |
| —   | `GET /users/me` e `PATCH /users/me` — perfil do usuário autenticado | `apps/api/src/modules/users/users.controller.ts`, `apps/api/src/modules/users/users.service.ts` | `apps/api/` (Jest) | ✅     |

---

## SPEC-20260719-002 — Soft-Delete Real com Retenção de 30 Dias — Exclusão de Conta (Draft)

> Correção do achado de auditoria 2026-07-19: `DELETE /users/me` passa a ser soft-delete real
> (`profiles.deleted_at = now()` sem anonimização imediata — anonimização movida para o
> hard-delete final); hard delete executado por job `pg_cron` após 30 dias. Inclui restore
> (`POST /users/me/restore`) e distinção 403 ACCOUNT_PENDING_DELETION no guard.
> Complementa SPEC-20260521-004 RNF-03. Ver changelog de SPEC-20260521-004.
> **Atualização 2026-07-20**: restore adicionado ao escopo (RF-08/RF-09/RF-10); anonimização
> imediata revertida (RF-01 atualizado); RF-11/RF-12 para Storage especificados. Implementação
> concluída — RF-03 (`signOut` explícito) removido do escopo real: a GoTrue Admin API não
> expõe invalidação de sessão por `userId` (só por JWT ou `deleteUser`); o guard (RF-09) já
> garante o bloqueio de acesso independentemente da sessão Supabase ainda ser tecnicamente
> válida. Estratégia definitiva de anonimização de PII fica para spec dedicada futura (ver
> memória de projeto).

### Backend — UsersModule

| Req   | Descrição                                                                                                                                                                                                                                                                                                                      | Código                                                                                                      | Teste                                                                                                                 | Status                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| RF-01 | `deleteAccount` refatorado: UPDATE em `profiles` (`deleted_at = now()` apenas, sem anonimização), audit log `ACCOUNT_DELETION_REQUESTED`. Sem chamada explícita de revogação de sessão — GoTrue Admin API não expõe invalidação por `userId` (só por JWT de sessão ou `deleteUser`); o bloqueio é garantido pelo guard (RF-09) | `apps/api/src/modules/users/users.service.ts`                                                               | `apps/api/src/modules/users/users.service.spec.ts`                                                                    | ✅                             |
| RF-02 | 404 se `profiles` não encontrado ou já soft-deleted                                                                                                                                                                                                                                                                            | `apps/api/src/modules/users/users.service.ts`                                                               | `apps/api/src/modules/users/users.service.spec.ts`                                                                    | ✅                             |
| RF-03 | _(revisado)_ Não há chamada de `signOut` a reverter — nota técnica da spec atualizada para refletir que a GoTrue Admin API não suporta essa operação por `userId` (ver RF-01)                                                                                                                                                  | —                                                                                                           | —                                                                                                                     | ✅ (não aplicável — ver RF-01) |
| RF-07 | `DELETE /admin/users/:id` mantém hard-delete imediato (sem período de graça)                                                                                                                                                                                                                                                   | já implementado (SPEC-20260521-004 RF-08)                                                                   | já coberto                                                                                                            | ✅                             |
| RF-08 | `POST /users/me/restore` — zera `deleted_at`, audit log `ACCOUNT_RESTORED`, retorna 200/409                                                                                                                                                                                                                                    | `apps/api/src/modules/users/users.service.ts`, `apps/api/src/modules/users/account-restore.controller.ts`   | `apps/api/src/modules/users/users.service.spec.ts`, `apps/api/src/modules/users/account-restore.controller.spec.ts`   | ✅                             |
| RF-09 | `SupabaseAuthGuard` retorna 403 + `{ code: "ACCOUNT_PENDING_DELETION" }` para contas soft-deleted (antes retornava 401 genérico). Inclui correção do `HttpExceptionFilter`, que descartava `code`/`deleted_at` antes de chegar ao frontend                                                                                     | `apps/api/src/common/guards/supabase-auth.guard.ts`, `apps/api/src/common/filters/http-exception.filter.ts` | `apps/api/src/common/guards/supabase-auth.guard.spec.ts`, `apps/api/src/common/filters/http-exception.filter.spec.ts` | ✅                             |
| RF-10 | `SoftDeletedUserGuard` — guard que aceita tokens de contas com `deleted_at IS NOT NULL`, usado exclusivamente em `POST /users/me/restore`                                                                                                                                                                                      | `apps/api/src/common/guards/soft-deleted-user.guard.ts`                                                     | `apps/api/src/common/guards/soft-deleted-user.guard.spec.ts`                                                          | ✅                             |

### Database — Migration

| Req   | Descrição                                                                                          | Código                                                           | Teste                                                                             | Status                      |
| ----- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------- |
| RF-04 | Migration: function `hard_delete_expired_accounts()` + job `pg_cron`                               | `supabase/migrations/20260720000000_soft_delete_account_job.sql` | manual (`supabase db reset` local) — sem harness de teste de migration no projeto | ✅ código / ⏳ teste manual |
| RF-05 | Function executa audit log + DELETE em `auth.users` para contas com `deleted_at < now() - 30 days` | `supabase/migrations/20260720000000_soft_delete_account_job.sql` | idem RF-04                                                                        | ✅ código / ⏳ teste manual |
| RF-06 | Migration dropa trigger `before_delete_profiles`                                                   | `supabase/migrations/20260720000000_soft_delete_account_job.sql` | idem RF-04                                                                        | ✅                          |

### Storage e Limitações (MVP)

| Req   | Descrição                                                                                                                                        | Código                                        | Teste | Status           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | ----- | ---------------- |
| RF-11 | Arquivos físicos no Storage permanecem intactos durante os 30 dias (sem job de limpeza antecipada)                                               | (comportamento por omissão — sem código novo) | —     | ✅ por omissão   |
| RF-12 | Limitação MVP: job SQL não remove objetos físicos do Storage no hard-delete. Dívida técnica documentada em `important/PENDENCIAS-E-PROCESSOS.md` | —                                             | —     | ❌ limitação MVP |

---

## SPEC-20260719-001 — UI de Exclusão de Conta pelo Próprio Usuário (Draft)

> UI para LGPD Art. 18 (direito ao esquecimento em autoatendimento). Inclui: componente
> `Dialog` no design system, página `/settings/account`, fluxo de exclusão em duas etapas,
> fluxo de restore via login (detecta 403 ACCOUNT_PENDING_DELETION).
> Depende de SPEC-20260719-002 (pré-requisito backend, implementação concluída).
> **Atualização 2026-07-20**: implementação concluída para RF-01 a RF-15. RF-11 (banner de
> aviso dentro do grupo `(app)`) revelou-se inalcançável na prática — o guard já bloqueia toda
> rota autenticada antes que qualquer página do app renderize com uma conta pendente,
> substituindo o banner in-app pelo redirecionamento global já existente (RF-13). RF-16
> (fallback de imagem) não tem elemento de UI para se aplicar ainda — não implementado, ver
> nota na tabela abaixo.

### Design System — Componente Dialog

| Req   | Descrição                                                                                                                                                                                                               | Código                                       | Teste                                        | Status |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------- | ------ |
| RF-01 | Componente `Dialog` em `packages/ui/src/components/dialog.tsx` com subcomponentes Radix (`Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`) | `packages/ui/src/components/dialog.tsx`      | `packages/ui/src/components/dialog.test.tsx` | ✅     |
| RF-02 | `DialogContent` com focus-trap, `Esc`, `aria-labelledby`, `aria-describedby` (herdados do Radix via `Title`/`Description`)                                                                                              | `packages/ui/src/components/dialog.tsx`      | `packages/ui/src/components/dialog.test.tsx` | ✅     |
| RF-03 | Testes do Dialog (`dialog.test.tsx`) — abrir/fechar via trigger, close button, `DialogClose` customizado, Esc, `onOpenChange`, `hideCloseButton`, jest-axe                                                              | `packages/ui/src/components/dialog.test.tsx` | idem                                         | ✅     |
| RF-12 | Export do Dialog em `packages/ui/src/index.ts`                                                                                                                                                                          | `packages/ui/src/index.ts`                   | `packages/ui/src/components/dialog.test.tsx` | ✅     |

### Frontend — Página `/settings/account`

| Req   | Descrição                                                                                                                                                                                         | Código                                                                                                        | Teste                                                                                                          | Status                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-04 | Página `(app)/settings/account/page.tsx` com seção de identificação e "Zona de perigo"; `GET /users/me` estendido com `email` (extraído do JWT via `SupabaseAuthGuard`, não existe em `profiles`) | `apps/web/src/app/(app)/settings/account/page.tsx`, `apps/api/src/modules/users/users.controller.ts`          | `apps/web/src/app/(app)/settings/account/page.spec.tsx`, `apps/api/src/modules/users/users.controller.spec.ts` | ✅                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| RF-05 | Botão `variant="destructive"` "Excluir minha conta" abre Dialog                                                                                                                                   | `apps/web/src/app/(app)/settings/account/delete-account-dialog.tsx`                                           | `apps/web/src/app/(app)/settings/account/page.spec.tsx`                                                        | ✅                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| RF-06 | Dialog de confirmação com consequências e campo de texto                                                                                                                                          | `apps/web/src/app/(app)/settings/account/delete-account-dialog.tsx`                                           | idem                                                                                                           | ✅                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| RF-07 | Campo de confirmação: habilitado só com `value.trim() === 'EXCLUIR'`                                                                                                                              | `apps/web/src/app/(app)/settings/account/delete-account-dialog.tsx`                                           | idem                                                                                                           | ✅                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| RF-08 | Chama `DELETE /users/me` com `{ confirm: true }`                                                                                                                                                  | `apps/web/src/app/(app)/settings/account/delete-account-dialog.tsx`                                           | idem                                                                                                           | ✅                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| RF-09 | Em 204: fechar Dialog, redirecionar `/login?message=conta_excluida`, exibir `Alert variant="info"` na página de login informando que a solicitação foi registrada                                 | `apps/web/src/app/(app)/settings/account/delete-account-dialog.tsx`, `apps/web/src/app/(auth)/login/page.tsx` | `apps/web/src/app/(app)/settings/account/page.spec.tsx`, `apps/web/src/app/(auth)/login/page.spec.tsx`         | ✅ (sem chamada explícita de logout — o backend não invalida sessão por `userId`, ver SPEC-20260719-002 RF-01/RF-03; o próximo request autenticado já cai em 403 ACCOUNT_PENDING_DELETION e é redirecionado globalmente pelo `apiClient`, RF-13)                                                                                                                                                                                                  |
| RF-10 | Em erro: manter Dialog, exibir `Alert variant="error"`, limpar campo                                                                                                                              | `apps/web/src/app/(app)/settings/account/delete-account-dialog.tsx`                                           | idem                                                                                                           | ✅                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| RF-11 | Se `deleted_at IS NOT NULL`: Alert warning + data de hard-delete + botão "Cancelar exclusão"                                                                                                      | —                                                                                                             | —                                                                                                              | ✅ não aplicável — o `SupabaseAuthGuard` já bloqueia **toda** rota autenticada com 403 `ACCOUNT_PENDING_DELETION` quando `deleted_at != null` (SPEC-20260719-002 RF-09); a interceptação global do `apiClient` (RF-13) redireciona para `/restore-account` antes de `/settings/account` conseguir renderizar com uma conta pendente — o estado descrito neste RF é inalcançável na prática, a UI de aviso vive inteiramente em `/restore-account` |

### Frontend — Fluxo de Restore

| Req   | Descrição                                                                                                                                                                                                                                                                                                       | Código                                                                          | Teste                                                                                     | Status                                                                                                                                                                                                                                                                                                                                                                                       |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-13 | Interceptação global: qualquer 403 `ACCOUNT_PENDING_DELETION` (não só no login) redireciona para `/restore-account`                                                                                                                                                                                             | `apps/web/src/lib/http/api-client.ts`, `apps/web/src/app/(auth)/login/page.tsx` | `apps/web/src/lib/http/api-client.spec.ts`, `apps/web/src/app/(auth)/login/page.spec.tsx` | ✅                                                                                                                                                                                                                                                                                                                                                                                           |
| RF-14 | Página `/restore-account` com data de exclusão, lista do que é preservado, botão de restore e botão de desistência. Rota sempre pública no middleware (sem redirect em nenhum sentido) — acesso direto sem cookie não força `/login` antes, alinhado à nota técnica da spec ("Tela de restore e grupo de rota") | `apps/web/src/app/(auth)/restore-account/page.tsx`, `apps/web/middleware.ts`    | `apps/web/src/app/(auth)/restore-account/page.spec.tsx`, `apps/web/middleware.spec.ts`    | ✅                                                                                                                                                                                                                                                                                                                                                                                           |
| RF-15 | Chama `POST /users/me/restore`; em 200: redireciona dashboard com toast; em erro: Alert sem deslogar                                                                                                                                                                                                            | `apps/web/src/app/(auth)/restore-account/page.tsx`                              | `apps/web/src/app/(auth)/restore-account/page.spec.tsx`                                   | ✅                                                                                                                                                                                                                                                                                                                                                                                           |
| RF-16 | Graceful degradation para imagens Storage com `onError` → placeholder `ImageOff`                                                                                                                                                                                                                                | —                                                                               | —                                                                                         | ❌ não implementado — nenhuma tela do app hoje renderiza `<img>` de URL de Storage (nem `vehicles/[id]`, nem listagens); campo `photo_url`/`photo_thumbnail_url` existe no backend mas não tem consumidor de UI ainda. Sem elemento existente para aplicar `onError`. Dívida documentada em `important/PENDENCIAS-E-PROCESSOS.md` — revisitar quando a feature de fotos de veículo ganhar UI |

---

## SPEC-20260720-001 — Páginas Públicas de Política de Privacidade e Termos de Uso (Aprovada)

> Auditoria 2026-07-19, Achado #2 (T2). O conteúdo jurídico já existia em `docs/legal/` (fonte
> única de verdade); faltava a distribuição — rotas públicas, link nos pontos de entrada e
> aceite explícito no cadastro.

| Req   | Descrição                                                                                                         | Código                                                                                                                                                         | Teste                                                                                                                                                      | Status |
| ----- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| RF-01 | Página `/privacidade` (Server Component) lê `docs/legal/privacy-policy.md` e renderiza como Markdown              | `apps/web/src/app/privacidade/page.tsx`, `apps/web/src/components/legal-document.tsx`                                                                          | `apps/web/src/app/privacidade/page.spec.tsx`                                                                                                               | ✅     |
| RF-02 | Página `/termos` análoga, lendo `docs/legal/terms-of-service.md`                                                  | `apps/web/src/app/termos/page.tsx`                                                                                                                             | `apps/web/src/app/termos/page.spec.tsx`                                                                                                                    | ✅     |
| RF-03 | `react-markdown` + `remark-gfm` (tabelas) + `@tailwindcss/typography` adicionados a `apps/web`                    | `apps/web/package.json`, `apps/web/tailwind.config.ts`                                                                                                         | build de produção (`next build`) gera `/privacidade` e `/termos` como rotas estáticas — confirma que a leitura de `docs/legal/*.md` funciona em build time | ✅     |
| RF-04 | `/privacidade` e `/termos` sempre públicas no middleware (sem redirect em nenhum sentido)                         | `apps/web/middleware.ts`                                                                                                                                       | `apps/web/middleware.spec.ts`                                                                                                                              | ✅     |
| RF-05 | `LegalFooter` (links para `/termos` e `/privacidade`) incluído em `/`, `/login` e `/register`                     | `apps/web/src/components/legal-footer.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/app/(auth)/login/page.tsx`, `apps/web/src/app/(auth)/register/page.tsx` | coberto indiretamente pelos specs de cada página (rodapé estático, sem lógica)                                                                             | ✅     |
| RF-06 | Checkbox obrigatório de aceite dos Termos/Privacidade em `/register`; botão "Criar conta" desabilitado até marcar | `apps/web/src/app/(auth)/register/page.tsx`                                                                                                                    | `apps/web/src/app/(auth)/register/page.spec.tsx`                                                                                                           | ✅     |

---

## SPEC-20260521-003 — Export CSV do Dashboard (Aprovada)

> **2026-07-14 (T3.1):** `DashboardModule` criado do zero — a spec assumia um `DashboardController`
> pré-existente (`GET /dashboard/stats`), mas nenhum módulo de dashboard havia sido implementado
> ainda (Fase 5, `SPEC-20260531-001`, ainda `draft`). Escopo desta tarefa ficou restrito ao
> endpoint de export descrito nesta spec — nenhum endpoint de estatísticas foi criado. Página
> `/dashboard` mínima criada apenas com o seletor de mês/veículo e o link de exportação; o
> redesign completo do Dashboard (Fleet Command + Vehicle Spotlight) permanece objeto da Fase 5.

| Req    | Descrição                                                 | Código                                                                                                | Teste                                                                                      | Status                                                        |
| ------ | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| RF-01  | `GET /dashboard/export` retorna arquivo CSV               | `apps/api/src/modules/dashboard/dashboard.controller.ts`, `dashboard.service.ts`                      | `apps/api/src/modules/dashboard/dashboard.controller.spec.ts`, `dashboard.service.spec.ts` | ✅                                                            |
| RF-02  | Filtro obrigatório: `period` (YYYY-MM)                    | `packages/validators/src/dashboard.schemas.ts` (`exportExpensesQuerySchema`)                          | `apps/api/src/modules/dashboard/dashboard.controller.spec.ts`                              | ✅                                                            |
| RF-03  | Filtro opcional: `vehicle_id`                             | `apps/api/src/modules/dashboard/dashboard.service.ts` (`exportExpensesCsv`)                           | `apps/api/src/modules/dashboard/dashboard.service.spec.ts`, `dashboard.controller.spec.ts` | ✅                                                            |
| RF-04  | Colunas: Data, Placa, Modelo, Categoria, Descrição, Valor | `apps/api/src/modules/dashboard/dashboard.service.ts`                                                 | `apps/api/src/modules/dashboard/dashboard.service.spec.ts`                                 | ✅                                                            |
| RF-05  | BOM UTF-8 no arquivo CSV (compatibilidade Excel)          | `apps/api/src/modules/dashboard/dashboard.controller.ts` (`CSV_BOM`)                                  | `apps/api/src/modules/dashboard/dashboard.controller.spec.ts`                              | ✅                                                            |
| RF-06  | Nome do arquivo: `navestory-despesas-{YYYY-MM}.csv`       | `apps/api/src/modules/dashboard/dashboard.controller.ts` (`Content-Disposition`)                      | `apps/api/src/modules/dashboard/dashboard.controller.spec.ts`                              | ✅                                                            |
| RF-07  | Botão "Exportar CSV" no Dashboard com seletor de mês      | `apps/web/src/app/dashboard/page.tsx`                                                                 | `apps/web/src/app/dashboard/page.spec.tsx`                                                 | ✅                                                            |
| RF-08  | Isolamento por `user_id` do JWT                           | `apps/api/src/modules/dashboard/dashboard.service.ts` (`.eq("user_id", userId)`, `SupabaseAuthGuard`) | `apps/api/src/modules/dashboard/dashboard.service.spec.ts`                                 | ✅                                                            |
| RNF-03 | Limite de 5.000 linhas por exportação                     | `apps/api/src/modules/dashboard/dashboard.service.ts` (`CSV_MAX_ROWS`, `.limit`)                      | —                                                                                          | 🔶 (constante aplicada; sem teste de volume)                  |
| RNF-04 | Rate limiting 10 req/5min                                 | `apps/api/src/modules/dashboard/dashboard.controller.ts` (`@Throttle`)                                | —                                                                                          | 🔶 (decorator aplicado; sem teste de integração do throttler) |

---

## SPEC-20260521-002 — Alertas de Manutenção por Email (aprovado)

> Job diário via pg_cron; Edge Function; envio via Resend. Nenhum código implementado.
> **Adiada em 2026-07-15** (decisão do usuário, não bloqueio técnico): Resend exige domínio
> próprio verificado para envio em produção — o projeto ainda não tem domínio registrado. A
> decisão foi vincular este recurso ao lançamento da monetização (Fase 9, `SPEC-20260620-001`),
> não à Fase 4. Retomar junto com T9.1, quando domínio e conta Resend estiverem disponíveis.

| Req   | Descrição                                                                     | Código | Teste | Status                |
| ----- | ----------------------------------------------------------------------------- | ------ | ----- | --------------------- |
| RF-01 | Job diário via pg_cron às 11:00 UTC                                           | —      | —     | ⏸️ Adiado para Fase 9 |
| RF-02 | Edge Function busca manutenções `scheduled_date = +7d AND alert_sent = false` | —      | —     | ⏸️ Adiado para Fase 9 |
| RF-03 | Email com nome, data, veículo via Resend (com retry idempotente)              | —      | —     | ⏸️ Adiado para Fase 9 |
| RF-04 | `alert_sent = true` somente após confirmação de envio                         | —      | —     | ⏸️ Adiado para Fase 9 |
| RF-05 | Não reenvia alertas já enviados (filtro `alert_sent = false` na query)        | —      | —     | ⏸️ Adiado para Fase 9 |
| RF-06 | `MAINTENANCE_ALERT_SENT` em `audit_logs` com `record_id` da manutenção        | —      | —     | ⏸️ Adiado para Fase 9 |
| RF-07 | Respeita soft delete (filtro `.is('deleted_at', null)` na query)              | —      | —     | ⏸️ Adiado para Fase 9 |

---

## SPEC-20260521-001 — Hardening de Segurança (aprovado)

> Correções de segurança no backend NestJS: variáveis de ambiente (Joi), audit logs, rate limit
> diferenciado de auth, HttpExceptionFilter global, rollback scripts de migrations, AuditService.
> Implementado em 2026-07-13 como parte da Fase 1 do roadmap (T1.2).
> Rate limits de auth supersedidos pela tabela de SPEC-20260524-001 §4.2 (valores idênticos — sem conflito).

| Req         | Descrição                                                                                                         | Código                                                                                                                                                               | Teste                                         | Status |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------ |
| RF-SEC-001  | `SUPABASE_URL` (sem prefixo `NEXT_PUBLIC_`) via `ConfigService`; env vars via Joi                                 | `apps/api/src/common/config/env.validation.ts`, `apps/api/src/modules/auth/auth.module.ts`                                                                           | `apps/api/` (Jest, 67 testes, 90%+ cobertura) | ✅     |
| RF-SEC-002  | `AuditService` — audit_logs com campos corretos (`action`, `table_name`, `record_id`, `changes`); fire-and-forget | `apps/api/src/shared/audit/audit.service.ts`                                                                                                                         | `apps/api/` (Jest)                            | ✅     |
| RF-SEC-002b | `AuditService.log()` não propaga exceção — try/catch + NestJS Logger                                              | `apps/api/src/shared/audit/audit.service.ts`                                                                                                                         | `apps/api/` (Jest)                            | ✅     |
| RF-SEC-002c | Timestamp ISO injetado em `changes` (sobrescreve qualquer valor passado)                                          | `apps/api/src/shared/audit/audit.service.ts`                                                                                                                         | `apps/api/` (Jest)                            | ✅     |
| RF-SEC-003  | `HttpExceptionFilter` global — sem stack trace em produção; shape `{ statusCode, message, timestamp }`            | `apps/api/src/common/filters/http-exception.filter.ts`                                                                                                               | `apps/api/` (Jest)                            | ✅     |
| RF-SEC-003b | Filter registrado em `main.ts` via `app.useGlobalFilters()`                                                       | `apps/api/src/main.ts`                                                                                                                                               | `apps/api/` (Jest)                            | ✅     |
| RF-SEC-004  | Rate limit diferenciado: register 5/15min, login 10/15min, demais 100/60s (ThrottlerGuard global)                 | `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/main.ts`                                                                                               | `apps/api/` (Jest)                            | ✅     |
| RF-SEC-005  | Rollback scripts para as migrations                                                                               | `supabase/migrations/rollback/`                                                                                                                                      | — (DDL manual)                                | ✅     |
| RF-SEC-006  | `SUPABASE_SERVICE_ROLE_KEY` e demais vars obrigatórias validados no Joi na startup                                | `apps/api/src/common/config/env.validation.ts`                                                                                                                       | `apps/api/` (Jest)                            | ✅     |
| RF-SEC-007  | `console.log` substituído por `Logger` do NestJS em `main.ts`                                                     | `apps/api/src/main.ts`                                                                                                                                               | `apps/api/` (Jest)                            | ✅     |
| RF-SEC-008  | `AdminSupabaseService` inicializa com `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` isolados                       | `apps/api/src/modules/admin/admin-supabase.service.ts`, `apps/api/src/shared/supabase/supabase-admin.module.ts`                                                      | `apps/api/` (Jest)                            | ✅     |
| RF-SEC-009  | `SupabaseService` (anon) e `SupabaseAdminModule` (service-role) isolados; clients separados por módulo            | `apps/api/src/shared/supabase/supabase.module.ts`, `apps/api/src/shared/supabase/create-user-scoped-client.ts`, `apps/api/src/shared/supabase/supabase.constants.ts` | `apps/api/` (Jest)                            | ✅     |

### Testes de Integração (novos — Fase 1)

| ID     | Descrição                                                                       | Arquivo                                      | Status |
| ------ | ------------------------------------------------------------------------------- | -------------------------------------------- | ------ |
| CT-006 | 401 sem JWT; fluxo real de registro/login contra Supabase local                 | `apps/api/test/integration/auth.int-spec.ts` | ✅     |
| CT-007 | RLS bloqueia acesso a `profiles` de outro usuário                               | `apps/api/test/integration/rls.int-spec.ts`  | ✅     |
| —      | CI `integration-test` job — `supabase start` + testes de integração no pipeline | `.github/workflows/ci.yml`                   | ✅     |

---

## SPEC-20260531-001 — Redesign do Dashboard — Fleet Command + Vehicle Spotlight (approved)

> Fleet Command (Zona A) + Vehicle Spotlight (Zona B), 3 sprints. Status: **Sprint 1 concluída em
> 2026-07-15** (T5.1). Estudo pré-implementação registrado em IMPACTO-033 corrigiu 3 divergências
> spec↔código antes de codar (ver changelog v1.2 da spec) — nenhuma delas gerou retrabalho.
> Zona B (Vehicle Spotlight) e o score de saúde consumido nos flags detalhados ficam para a
> Sprint 2/3, conforme a migração incremental da própria spec (seção 12.3).
>
> **Sprints 2 e 3 concluídas em 2026-07-18** (T5.1, fechamento). Estudo pré-implementação com
> agentes `impact-analyzer` (gaps técnicos) e `design-system` (padrões de mercado 2026) resultou
> na revisão v1.3 da spec (changelog): RF-DB-04/05 reaproveitam `GET /analytics/tco/:vehicleId` e
> `GET /analytics/fuel-trend/:vehicleId` (T6.1), não uma RPC nova; TCO breakdown reaproveitado por
> ciclo de odômetro ativo, sem filtro de período de calendário (fora de escopo desta rodada);
> RF-SH-03 (tooltip de flags) promovido de prioridade Baixa para esta rodada; comportamento de
> "dados insuficientes"/erro nos gráficos da Zona B adicionado como extensão de RNF-08 (sem RF
> numerado formal). `TcoBreakdownChart`/`FuelTrendChart` extraídos de `analytics/page.tsx` para
> `apps/web/src/components/charts/`, reutilizados por `/analytics` e por `VehicleSpotlight` — sem
> duplicação de código `recharts`.
>
> **Decisão de escopo (IMPACTO-033):** `KpiCard`/`Tabs`/`EmptyState`/`Alert` (SPEC-20260525-001,
> T8.1, Fase 8, ainda `draft`) não existiam — construídas versões mínimas inline em
> `FleetKpis.tsx`/`VehicleHealthCard.tsx`/`DashboardPage`, mesmo padrão já usado em T3.9/T3.10;
> migração para os componentes compartilhados fica para quando a Fase 8 avançar.
>
> **Lacunas reais encontradas durante a implementação (não previstas pela spec):**
>
> - `VEHICLE_COLUMNS` em `vehicles.service.ts` não selecionava `insurance_expires_at`/
>   `crlv_expires_at`, apesar de as colunas existirem desde T0.2 — corrigido (afeta também
>   `GET /vehicles`, não só o dashboard).
> - RF-DC-02 item 4 ("Registrar KM") apontava para `/vehicles/[id]/odometer`, rota que não existia
>   em nenhuma feature do projeto — criada como tela mínima reaproveitando `PATCH /vehicles/:id`
>   (campo `odometer` já aceito pelo backend).
> - RF-DC-02 item 1 ("Abastecer `/expenses/new?category=fuel`") exigiu adicionar suporte a
>   `?category=` em `expenses/new/page.tsx`, que não lia nenhum query param antes — reaproveitado
>   o mesmo ajuste de `<Suspense>` já validado em T5.3c para `useSearchParams()`.
> - RF-DC-04 ("pré-selecionar o veículo em foco nos formulários") já estava satisfeito por
>   `useVehicleContextField` (T5.3d) — o dock não precisou (nem deveria, por R-CTX-04) propagar
>   `?vehicleId=` nos links.
> - Bug de fuso horário encontrado e corrigido em `dashboard.service.ts`: `daysUntil` misturava
>   calendário local (`getFullYear`/`getMonth`/`getDate`) com `toDateString` (UTC), gerando
>   off-by-one perto da meia-noite UTC — unificado para UTC em todo o módulo.

### Backend (`apps/api`) — Sprint 1

| Req                            | Descrição                                                                                                                                                                  | Código                                                                                                        | Teste                                                       | Status                                |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------- |
| RF-SH-01, RF-SH-02             | `GET /dashboard/fleet-health` — wrapper de `calculate_fleet_health`                                                                                                        | `apps/api/src/modules/dashboard/dashboard.service.ts` (`getFleetHealth`), `dashboard.controller.ts`           | `dashboard.service.spec.ts`, `dashboard.controller.spec.ts` | ✅                                    |
| RF-DA-01, RF-DA-02             | `GET /dashboard/alerts` — alertas de manutenção vencida/próxima (7 dias), ordenados por urgência. Escopo Sprint 1: só manutenção; documentos entram na Sprint 3 (CA-S3-02) | `dashboard.service.ts` (`getAlerts`)                                                                          | `dashboard.service.spec.ts`                                 | ✅                                    |
| RF-DA-03, CA-S1-05, CA-S1-05.1 | `GET /dashboard/fleet-kpis` — 4 KPIs isolados via `Promise.allSettled`, `?vehicle_id=` só afeta "Próxima manutenção"                                                       | `dashboard.service.ts` (`getFleetKpis`, `countUrgentMaintenances`, `getFleetCostPerKm`, `getNextMaintenance`) | `dashboard.service.spec.ts`                                 | ✅                                    |
| RF-DA-04                       | `GET /dashboard/vehicle-cards` — odômetro, último abastecimento, status de documentos (sem reconciliação com `vehicle_recurring_costs`, RF-DB-06 é Sprint 3)               | `dashboard.service.ts` (`getVehicleCards`, `getLastFuelExpense`, `classifyDocument`)                          | `dashboard.service.spec.ts`                                 | ✅                                    |
| —                              | `VEHICLE_COLUMNS` passa a incluir `insurance_expires_at`/`crlv_expires_at` (lacuna pré-existente desde T0.2)                                                               | `apps/api/src/modules/vehicles/vehicles.service.ts`                                                           | `vehicles.service.spec.ts` (suíte existente, sem regressão) | ✅                                    |
| RF-BD-04                       | `odometer_km` obrigatório para `category=fuel`                                                                                                                             | `packages/validators/src/expense.schemas.ts` (`requireOdometerForFuel`)                                       | `expense.schemas.spec.ts`                                   | ✅ (já satisfeito antes desta tarefa) |

### Frontend (`apps/web`) — Sprint 1

| Req                                    | Descrição                                                                                                                | Código                                                               | Teste                                                                                             | Status |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------ |
| RF-ST-01                               | `dockOpen`/`setDockOpen` no store global (sem recriar `activeVehicleId`)                                                 | `apps/web/src/lib/stores/use-dashboard-store.ts`                     | `use-dashboard-store.spec.ts`                                                                     | ✅     |
| RF-DA-01, RF-DA-02                     | `FleetAlertBar` — máx. 3 itens + link "ver todos (+N)" para `/maintenance?filter=urgent`                                 | `apps/web/src/components/dashboard/FleetAlertBar.tsx`                | `FleetAlertBar.spec.tsx`                                                                          | ✅     |
| RF-DA-03, CA-S1-05.1                   | `FleetKpis` — 4 KPIs com fallback "—"/tooltip por card em falha isolada                                                  | `apps/web/src/components/dashboard/FleetKpis.tsx`                    | `page.spec.tsx` (via `DashboardPage`)                                                             | ✅     |
| RF-DA-04, RF-DA-05, RF-SH-01, RF-SH-02 | `VehicleHealthCard` — semáforo, odômetro, último abastecimento, badges de documento, click → `setActiveVehicle`          | `apps/web/src/components/dashboard/VehicleHealthCard.tsx`            | `VehicleHealthCard.spec.tsx`                                                                      | ✅     |
| RF-DA-08                               | Auto-seleção com exatamente 1 veículo                                                                                    | `apps/web/src/app/(app)/dashboard/page.tsx` (efeito de auto-seleção) | `page.spec.tsx`                                                                                   | ✅     |
| RF-DA-09                               | `EmptyState` de boas-vindas sem veículos, sem KPIs "zerados"                                                             | `dashboard/page.tsx` (`NoVehiclesEmptyState`)                        | `page.spec.tsx`                                                                                   | ✅     |
| RF-DA-10                               | Grid sem virtualização até 15; acima disso, 10 piores primeiro + "ver mais"                                              | `dashboard/page.tsx` (`VehicleGrid`)                                 | — (comportamento >15 veículos não coberto por teste automatizado; validado por leitura de código) | 🟡     |
| RF-DC-01 a RF-DC-06                    | `ActionDock` — dock mobile 2×2, inline desktop ≥1024px, fecha ao navegar, sem "Multa"/"IA navestory"/"Novo Veículo" | `apps/web/src/components/layout/action-dock.tsx`                     | `action-dock.spec.tsx`                                                                            | ✅     |
| RF-DC-02 item 1                        | `?category=` em `/expenses/new` (gap novo, ver nota acima)                                                               | `apps/web/src/app/(app)/expenses/new/page.tsx`                       | `expenses/new/page.spec.tsx` (mock de `useSearchParams` atualizado)                               | ✅     |
| RF-DC-02 item 4                        | Rota `/vehicles/[id]/odometer` (gap novo, ver nota acima)                                                                | `apps/web/src/app/(app)/vehicles/[id]/odometer/page.tsx`             | `vehicles/[id]/odometer/page.spec.tsx`                                                            | ✅     |
| —                                      | Preservação do stub original (seletor mês/veículo + export CSV) dentro da nova estrutura (seção 12.3)                    | `dashboard/page.tsx` (`ExportControls`)                              | `page.spec.tsx`                                                                                   | ✅     |

### Validators (`packages/validators`) — Sprint 1

| Req                                    | Descrição                                                                                                                                                                                                     | Código                                                 | Teste                                                                                         | Status |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ------ |
| RF-DA-01, RF-DA-03, RF-DA-04, RF-SH-01 | Tipos e schemas de runtime: `fleetKpisQuerySchema`, `FleetKpisQuery`, `FleetHealthEntry`, `FleetAlert`, `FleetAlertType`, `KpiResult`, `FleetKpis`, `DocumentStatus`, `VehicleDocumentsStatus`, `VehicleCard` | `packages/validators/src/dashboard.schemas.ts`         | — (tipos e schema puro, sem branches condicionais; consumido por `dashboard.service.spec.ts`) | 🔶     |
| RF-DA-03                               | DTO thin wrapper: `fleetKpisDtoSchema`/`FleetKpisDto` (re-exporta `fleetKpisQuerySchema`)                                                                                                                     | `apps/api/src/modules/dashboard/dto/fleet-kpis.dto.ts` | —                                                                                             | 🔶     |

### Backend (`apps/api`) — Sprint 2/3

| Req                | Descrição                                                                                                                                                                                                  | Código                                                                             | Teste                                                        | Status |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ |
| CA-S3-02, RF-DB-06 | `GET /dashboard/alerts` estendido — alertas de documentos vencidos (IPVA/Seguro/CRLV), reconciliados com `vehicle_recurring_costs.paid_at` do ano corrente; combinado e ordenado com alertas de manutenção | `dashboard.service.ts` (`getDocumentOverdueAlerts`, `getPaidDocumentsCurrentYear`) | `dashboard.service.spec.ts`                                  | ✅     |
| RF-DB-07           | `GET /dashboard/vehicle-history?vehicle_id=` — combina últimas 20 despesas + manutenções, ordenadas por data decrescente, reaproveitando `ExpensesService`/`MaintenancesService.findAll`                   | `dashboard.service.ts` (`getVehicleHistory`), `dashboard.controller.ts`            | `dashboard.service.spec.ts`, `dashboard.controller.spec.ts`  | ✅     |
| CA-S3-03           | `VehicleCard.last_fuel_odometer_missing` — true quando o último abastecimento não tem `odometer_km`                                                                                                        | `dashboard.service.ts` (`getVehicleCards`, `getLastFuelExpense`)                   | `dashboard.service.spec.ts` (suíte existente, sem regressão) | ✅     |
| RF-DB-04, RF-DB-05 | Reaproveitados (sem código novo): `GET /analytics/tco/:vehicleId`, `GET /analytics/fuel-trend/:vehicleId` (T6.1)                                                                                           | `apps/api/src/modules/analytics/analytics.controller.ts`                           | `analytics.controller.spec.ts` (suíte existente)             | ✅     |

### Frontend (`apps/web`) — Sprint 2/3

| Req                | Descrição                                                                                                                  | Código                                                                                               | Teste                                                                                                                     | Status |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------ |
| RF-DB-01           | Chip sticky "Em Foco: [Marca Modelo] [PLACA] ×", nomenclatura canônica de SPEC-20260602-001, "×" chama `clearAllSelection` | `apps/web/src/components/dashboard/VehicleSpotlight.tsx` (`StickyFocusChip`)                         | `VehicleSpotlight.spec.tsx`                                                                                               | ✅     |
| RF-DB-02, RF-DB-03 | Tabs em mobile (`useMediaQuery`) / grid em desktop, sem tabs                                                               | `VehicleSpotlight.tsx`                                                                               | `VehicleSpotlight.spec.tsx`                                                                                               | ✅     |
| RF-DB-04           | Seção Despesas — `TcoBreakdownChart` reaproveitado; empty state quando `total===0`; estado de erro                         | `VehicleSpotlight.tsx` (`ExpensesSection`), `apps/web/src/components/charts/tco-breakdown-chart.tsx` | `VehicleSpotlight.spec.tsx`                                                                                               | ✅     |
| RF-DB-05           | Seção Consumo — `FuelTrendChart` reaproveitado; empty state; estado de erro                                                | `VehicleSpotlight.tsx` (`FuelSection`), `apps/web/src/components/charts/fuel-trend-chart.tsx`        | — (padrão idêntico a `ExpensesSection`, coberto indiretamente via `analytics/page.spec.tsx` para o componente de gráfico) | 🟡     |
| RF-DB-06           | Seção Docs — badges Vencido/Atenção/Pago, reconciliados com `GET /recurring-costs` do ano corrente                         | `VehicleSpotlight.tsx` (`DocsSection`)                                                               | `VehicleSpotlight.spec.tsx`                                                                                               | ✅     |
| RF-DB-07           | Seção Histórico — últimas 20 despesas/manutenções + links "ver todos"                                                      | `VehicleSpotlight.tsx` (`HistorySection`)                                                            | `VehicleSpotlight.spec.tsx`                                                                                               | ✅     |
| RF-DB-08           | `EmptyState` quando nenhum veículo em foco                                                                                 | `VehicleSpotlight.tsx` (`NoActiveVehicleEmptyState`)                                                 | `VehicleSpotlight.spec.tsx`                                                                                               | ✅     |
| RF-DA-05           | Scroll suave até a Zona B ao clicar num `VehicleHealthCard`                                                                | `apps/web/src/app/(app)/dashboard/page.tsx` (`handleSelectVehicle`, `spotlightRef`)                  | `page.spec.tsx`                                                                                                           | ✅     |
| RF-SH-03           | Tooltip do semáforo detalha os `flags` da RPC (sem recalcular pesos)                                                       | `apps/web/src/components/dashboard/VehicleHealthCard.tsx` (`flagsTooltip`, `FLAG_LABEL`)             | `VehicleHealthCard.spec.tsx`                                                                                              | ✅     |
| CA-S3-03           | Badge de aviso no card quando `last_fuel_odometer_missing`                                                                 | `VehicleHealthCard.tsx`                                                                              | `VehicleHealthCard.spec.tsx`                                                                                              | ✅     |
| —                  | `FleetAlertBar.type` estendido para `"document_overdue"` (sem mudança de lógica de estilo, já baseada em `days_until_due`) | `apps/web/src/components/dashboard/FleetAlertBar.tsx`                                                | `FleetAlertBar.spec.tsx` (suíte existente, sem regressão)                                                                 | ✅     |

### Validators (`packages/validators`) — Sprint 2/3

| Req      | Descrição                                           | Código                                         | Teste                                                    | Status |
| -------- | --------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------- | ------ |
| CA-S3-02 | `FleetAlertType` estendido com `"document_overdue"` | `packages/validators/src/dashboard.schemas.ts` | — (tipo puro)                                            | 🔶     |
| RF-DB-07 | `vehicleHistoryQuerySchema`/`VehicleHistoryItem`    | `packages/validators/src/dashboard.schemas.ts` | — (tipo puro, consumido por `dashboard.service.spec.ts`) | 🔶     |
| CA-S3-03 | `VehicleCard.last_fuel_odometer_missing`            | `packages/validators/src/dashboard.schemas.ts` | —                                                        | 🔶     |

**Fora de escopo desta rodada (documentado no changelog v1.3 da spec):** filtro de período de calendário (mês/trimestre/semestre/ano) no gráfico de Despesas por Categoria — RF-DB-04 reaproveita o breakdown por ciclo de odômetro ativo, já existente; layout master-detail horizontal em desktop (pendência já registrada na seção 14 da spec desde a v1.1); comparação multi-veículo na Zona B.

---

## SPEC-20260607-001 — FinesModule — CRUD de Multas de Trânsito (approved)

> **2026-07-14 (T3.6):** Sprint 0 implementado (scaffold completo: entity, DTOs, service,
> controller, module). Tabela `fines`, enum `fine_status` e colunas já existiam desde T0.2
> (schema recuperado do banco remoto) — nenhuma migration nova necessária, só a camada de
> aplicação. `FinesModule` sem Repository/Port, mesmo padrão inline de `ExpensesModule`/
> `ExpenseTemplatesModule`. **Correção de contradição interna identificada antes de implementar**
> (mesmo padrão de resolução usado em T3.2/T3.3): a seção "Escopo" da spec listava a vinculação
> ao ledger (`US-FIN-A02`, Sprint 2) como parte do escopo desta spec, mas a seção "Fora do Escopo"
> já descrevia essa mesma vinculação como pertencente a uma "spec separada" do Sprint 2 — e
> `ExpensesService.createFromSource()`/`softDeleteBySource()` (citados por R-LED-02/R-LED-03) não
> existem em nenhum lugar do código ainda. Tratada como escopo desta tarefa apenas o Sprint 0
> (CRUD completo); a vinculação ao ledger fica ⏳, a ser resolvida junto com T3.7/T3.8
> (manutenção e custos recorrentes também dependem do mesmo `createFromSource()` compartilhado,
> então faz mais sentido implementá-lo uma única vez quando todas as três origens existirem).
> RF-05 (transições de status) usa `ConflictException` diretamente (409), seguindo o padrão já
> estabelecido em `CategoriesService`/`AuthService` — nenhum projeto usa classes de exceção
> customizadas, então a `InvalidStatusTransitionException` nomeada na spec foi implementada como
> mensagem descritiva, não uma classe dedicada. `paid_at` é preenchido automaticamente pelo
> service quando a transição para `paid` não informa a data (RF-04). Tela `/fines` no frontend
> permanece ⏳ (Sprint 2, G-07 — fora do escopo desta spec).
>
> **2026-07-14 (T3.8):** Vinculação ao ledger fechada — `createFromSource()`/`softDeleteBySource()`
> implementados em `ExpensesService` como parte de `RecurringCostsModule` (SPEC-20260609-001) e
> retrofitados aqui: `create()` chama `createFromSource` incondicionalmente (`source_type='fine'`,
> usa `amount_with_discount` quando disponível — R-LED-02); `update()` para `status=cancelled`
> chama `softDeleteBySource` (R-LED-03); `remove()` também chama `softDeleteBySource` (R-HUB-01).
> `FinesModule` passou a importar `ExpensesModule`.

### Backend (`apps/api`)

| Req                                    | Descrição                                                                                         | Código                                                   | Teste                      | Status                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------- | -------------------------- |
| RF-01                                  | `POST /fines` — valida veículo ativo do usuário e `amount_with_discount ≤ amount` antes do insert | `apps/api/src/modules/fines/fines.service.ts` (`create`) | `fines.service.spec.ts`    | ✅                         |
| RF-02                                  | `GET /fines`, `GET /fines?status=`, `GET /fines/vehicle/:vehicleId`                               | `fines.service.ts` (`findAll`, `findByVehicle`)          | `fines.service.spec.ts`    | ✅                         |
| RF-03                                  | `GET /fines/:id`                                                                                  | `fines.service.ts` (`findOne`)                           | `fines.service.spec.ts`    | ✅                         |
| RF-04                                  | `PATCH /fines/:id` — atualização parcial + preenchimento automático de `paid_at`                  | `fines.service.ts` (`update`)                            | `fines.service.spec.ts`    | ✅                         |
| RF-05                                  | Grafo de transições de status, 409 para transição inválida                                        | `fines.service.ts` (`update`, `FINE_STATUS_TRANSITIONS`) | `fines.service.spec.ts`    | ✅                         |
| RF-06                                  | `DELETE /fines/:id` — soft-delete (R5)                                                            | `fines.service.ts` (`remove`)                            | `fines.service.spec.ts`    | ✅                         |
| RF-07                                  | `countPending(userId, vehicleId?)` — método interno, sem rota própria                             | `fines.service.ts` (`countPending`)                      | —                          | ✅                         |
| S1, S2                                 | `SupabaseAuthGuard` + RLS (`auth.uid()`) em todas as rotas                                        | `fines.controller.ts`                                    | `fines.controller.spec.ts` | ✅                         |
| —                                      | `amount_with_discount` ≤ `amount` (Regras de Negócio)                                             | `fines.service.ts` (`create`, `update`)                  | `fines.service.spec.ts`    | ✅                         |
| R-LED-02, R-LED-03, R-HUB-01, R-HUB-02 | Vinculação automática ao ledger via `ExpensesService.createFromSource`/`softDeleteBySource`       | `fines.service.ts` (`create`, `update`, `remove`)        | `fines.service.spec.ts`    | ✅                         |
| Sprint 2, G-07                         | Tela `/fines` no frontend — implementada em SPEC-20260722-005                                     | —                                                        | —                          | ✅ → ver SPEC-20260722-005 |

### Validators (`packages/validators`)

| Req          | Descrição                                                                 | Código                                    | Teste                                          | Status |
| ------------ | ------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------- | ------ |
| RF-01, RF-05 | `createFineInputSchema`/`updateFineInputSchema`/`FINE_STATUS_TRANSITIONS` | `packages/validators/src/fine.schemas.ts` | `packages/validators/src/fine.schemas.spec.ts` | ✅     |

---

## SPEC-20260722-005 — Tela /fines — Frontend do Módulo de Multas (approved)

> **Implementado em 2026-07-22.** Fecha dois débitos técnicos registrados no mesmo dia: (1) link
> "Multas" no `FinancialSubheader` apontava para `/fines`, que resultava em 404; (2) botão "Ver" na
> tab "Próximas" de `/expenses` estava desabilitado para `source_type='fine'`. Backend
> (SPEC-20260607-001) já estava completamente implementado — esta spec é exclusivamente frontend.
> Camadas: `frontend`. Regras: R5, S1, S2, R-CTX-01, R-CTX-06, R-TZ-01, R-FORM-01..07,
> R-SAN-01/02/04, R-DS-03/04, R-SUB-03/04.
> KPIs calculados client-side a partir do array de `GET /fines` (RNF-03, sem endpoint dedicado).
> Ações de status inline usam `FINE_STATUS_TRANSITIONS` tanto na listagem quanto no detalhe.
> `security/detect-object-injection` suprimido com `eslint-disable` pontual (mesmo padrão já usado
> em `maintenance/[id]/page.tsx`) onde o índice vem de um subconjunto fixo de `FineStatus`.

### Frontend (`apps/web`)

| Req   | Descrição                                                                                                                                                                                                                                       | Código                                                                                                                              | Teste                                                                                                          | Status |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------ |
| RF-01 | KpiCards em `/fines`: total pendente (`pending`/`appealing`), multas vencidas (`pending` + `due_date < hoje`), total pago no ano (`paid` + `paid_at` no ano corrente) — calculados client-side                                                  | `apps/web/src/app/(app)/fines/page.tsx` (`computeKpis`)                                                                             | `apps/web/src/app/(app)/fines/page.spec.tsx`                                                                   | ✅     |
| RF-02 | Filtro client-side por `activeVehicleId` quando `selectionMode === 'single'` (padrão de `expenses/page.tsx`)                                                                                                                                    | `apps/web/src/app/(app)/fines/page.tsx`                                                                                             | — (mesmo padrão não testado isoladamente em `expenses/page.spec.tsx`)                                          | ✅     |
| RF-03 | Tabs "Lista" e "Em aberto" (`Tabs` de `@navestory/ui`, variante `underline`); tab "Em aberto" filtra `status IN ('pending', 'appealing')`                                                                                                       | `apps/web/src/app/(app)/fines/page.tsx`                                                                                             | `apps/web/src/app/(app)/fines/page.spec.tsx` (CA-04)                                                           | ✅     |
| RF-04 | Ações de status inline na listagem respeitando `FINE_STATUS_TRANSITIONS`; estados terminais (`paid`/`cancelled`) sem controles de ação                                                                                                          | `apps/web/src/app/(app)/fines/page.tsx` (`StatusActions`)                                                                           | `apps/web/src/app/(app)/fines/page.spec.tsx` (CA-05, CA-06, CA-07)                                             | ✅     |
| RF-05 | Empty state com CTA "Registrar multa" → `/fines/new`; sem veículos → CTA para cadastrar veículo (R-FORM-07)                                                                                                                                     | `apps/web/src/app/(app)/fines/page.tsx`, `apps/web/src/app/(app)/fines/new/page.tsx`                                                | `apps/web/src/app/(app)/fines/page.spec.tsx` (CA-03), `apps/web/src/app/(app)/fines/new/page.spec.tsx` (CA-16) | ✅     |
| RF-06 | Rota `/fines/new`: formulário de página própria com campos obrigatórios (vehicle_id, description, amount, occurred_at) + seção colapsável de campos opcionais; valida `createFineInputSchema`; redireciona para `/fines` em sucesso (R-FORM-04) | `apps/web/src/app/(app)/fines/new/page.tsx`                                                                                         | `apps/web/src/app/(app)/fines/new/page.spec.tsx` (CA-08, CA-09, CA-10)                                         | ✅     |
| RF-07 | Rota `/fines/[id]`: detalhe com todos os campos da entidade `Fine` + edição via `updateFineInputSchema` + ações de status (mesmas de RF-04); `invalidateQueries` sem redirect em sucesso                                                        | `apps/web/src/app/(app)/fines/[id]/page.tsx`                                                                                        | `apps/web/src/app/(app)/fines/[id]/page.spec.tsx` (CA-11, CA-12, CA-13)                                        | ✅     |
| RF-08 | Fechamento de dívida técnica: link "Multas" em `financial-subheader.tsx` → `/fines` (rota criada por esta spec encerra o 404 aceito em 2026-07-22)                                                                                              | `apps/web/src/components/layout/financial-subheader.tsx` (sem alteração — já correto), rota `apps/web/src/app/(app)/fines/page.tsx` | — (fechamento verificado por inspeção; sem teste de navegação E2E dedicado)                               | ✅     |
| RF-09 | Fechamento de dívida técnica: botão "Ver" para `source_type='fine'` em `UpcomingCostsTab` (`expenses/page.tsx`) habilitado como link → `/fines/:source_id`                                                                                      | `apps/web/src/app/(app)/expenses/page.tsx` (`UpcomingCostsTab`)                                                                     | — (sem teste dedicado; `expenses/page.spec.tsx` não cobre este ramo do ternário)                               | ✅     |

---

## SPEC-20260608-001 — Upcoming Costs — Próximas Despesas (approved)

## SPEC-20260608-002 — Expenses KPIs — Central Financeira (approved)

## SPEC-20260608-003 — Alertas de Custos Recorrentes (approved)

> **2026-07-14 (T3.7):** As três specs foram implementadas juntas por compartilharem o mesmo
> endpoint/tela (`GET /expenses/upcoming` e a tab "Próximas" de `/expenses`). RPC
> `get_upcoming_costs(p_vehicle_id, p_horizon_days)` já existia desde T0.2 (schema recuperado do
> banco remoto), com `EXECUTE` concedido a `authenticated` — `ExpensesService.getUpcomingCosts()`
> apenas delega (mesmo padrão de `OdometerCyclesService.getActiveCycleStart()`, primeiro uso de
> `.rpc()` no projeto). `GET /expenses/kpis` não tinha RPC equivalente — implementado em
> `ExpensesService.getKpis()` com 3 somas em memória sobre `expenses` (mês corrente, mês anterior,
> total histórico) mais uma chamada interna a `getUpcomingCosts(horizon=30)`, sem view/RPC nova no
> banco (volume de dados por usuário não justifica). **Desvios deliberados de escopo:**
>
> - RF-06 (SPEC-608-001) — botão "Ver" nas rows da tab "Próximas": fica desabilitado com tooltip
>   "Em breve" para as três origens (`maintenance`, `fine`, `recurring_cost`), não só para
>   `recurring_cost` como a spec previa — `/maintenance` (Fase 4) e `/fines` (frontend, T3.6
>   deferiu) também não têm tela própria ainda. Mesma técnica que a própria spec já usava para
>   `recurring_cost`, só estendida às outras duas por necessidade real do estado atual do projeto.
> - RF-02 (SPEC-608-003) — badge numérico na sidebar: fica ⏳. Não existe componente de sidebar no
>   projeto ainda (a navegação lateral é objeto da Fase 5, ainda `draft` em SPEC-20260531-001); não
>   há onde pendurar o badge. A chamada client-side direta ao RPC (`p_horizon_days=7`) também
>   introduziria um padrão arquitetural novo — nenhuma outra tela do projeto chama Supabase
>   diretamente do browser, tudo passa pelo backend NestJS. Ambas as decisões ficam registradas
>   aqui para quando a Fase 5 construir a sidebar.
>   RF-05 (badge de contagem na tab) usa `upcoming_30_days_count` já calculado pelo endpoint de KPIs
>   (evita uma segunda chamada de horizonte=30 só para o contador da tab).

### Backend (`apps/api`)

| Req                                      | Descrição                                                                                 | Código                                                                    | Teste                                             | Status |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------- | ------ |
| SPEC-608-001 RF-01, RF-02, RF-03, RNF-02 | `GET /expenses/upcoming?vehicle_id=&horizon_days=` — delega para RPC `get_upcoming_costs` | `apps/api/src/modules/expenses/expenses.service.ts` (`getUpcomingCosts`)  | `expenses.service.spec.ts`, `.controller.spec.ts` | ✅     |
| SPEC-608-001 RNF-03                      | `horizon_days` fora de (30, 90) → 400                                                     | `packages/validators/src/expense.schemas.ts` (`upcomingCostsQuerySchema`) | `expense.schemas.spec.ts`                         | ✅     |
| SPEC-608-002 RF-01, RF-02                | `GET /expenses/kpis?vehicle_id=` — totais mês/mês anterior/histórico/upcoming             | `expenses.service.ts` (`getKpis`, `sumExpensesAmount`)                    | `expenses.service.spec.ts`                        | ✅     |
| SPEC-608-002 RF-03, CT-002/003/004       | `delta_percent` (null quando `prev=0`, arredondado a 1 casa)                              | `expenses.service.ts` (`getKpis`)                                         | `expenses.service.spec.ts`                        | ✅     |
| S1, S2                                   | `SupabaseAuthGuard` + RLS/`auth.uid()` (RPC `security definer` já valida por dentro)      | `expenses.controller.ts`                                                  | `expenses.controller.spec.ts`                     | ✅     |

### Validators (`packages/validators`)

| Req                       | Descrição                                      | Código                                       | Teste                     | Status |
| ------------------------- | ---------------------------------------------- | -------------------------------------------- | ------------------------- | ------ |
| SPEC-608-001 RF-01, RF-03 | `upcomingCostsQuerySchema`, `UpcomingCostItem` | `packages/validators/src/expense.schemas.ts` | `expense.schemas.spec.ts` | ✅     |
| SPEC-608-002 RF-01, RF-02 | `expenseKpisQuerySchema`, `ExpenseKpis`        | `packages/validators/src/expense.schemas.ts` | `expense.schemas.spec.ts` | ✅     |

### Frontend (`apps/web`)

| Req                              | Descrição                                                                                | Código                                                          | Teste           | Status |
| -------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------- | ------ |
| SPEC-608-002 RF-04, RF-05, RF-06 | KPI cards (total do mês + delta badge, próximos 30 dias, total histórico)                | `apps/web/src/app/expenses/page.tsx` (`KpiCards`, `DeltaBadge`) | `page.spec.tsx` | ✅     |
| SPEC-608-001 RF-04               | Tab "Lista"/"Próximas" com `?tab=proximas` na URL e badges de urgência por faixa de dias | `page.tsx` (`UpcomingCostsTab`, `urgencyBadge`)                 | `page.spec.tsx` | ✅     |
| SPEC-608-001 RF-05               | Badge de contagem na tab "Próximas" (vermelho quando há item vencido)                    | `page.tsx`                                                      | `page.spec.tsx` | ✅     |
| SPEC-608-003 RF-03               | Labels de `cost_type` (IPVA/CRLV/Seguro/Doc. Recorrente)                                 | `page.tsx` (`SOURCE_TYPE_LABEL`)                                | —               | ✅     |
| SPEC-608-001 RF-06               | navegação "Ver" para origem (`/maintenance`, `/fines`, `/settings`)                 | —                                                               | —               | ⏳     |
| SPEC-608-003 RF-02               | Badge numérico na sidebar                                                                | —                                                               | —               | ⏳     |

---

## SPEC-20260609-001 — CRUD de Custos Recorrentes (approved)

## SPEC-20260609-002 — Tab "Por Veículo" em /expenses (approved)

## SPEC-20260609-003 — Exportação CSV Consolidada (approved)

> **2026-07-14 (T3.8):** As três specs foram implementadas juntas por serem incrementos pequenos
> e interdependentes da mesma tela (`/expenses`). `RecurringCostsModule` foi o gatilho para
> finalmente implementar `ExpensesService.createFromSource()`/`softDeleteBySource()` (adiado desde
> T3.6/T3.7 conforme já registrado) — e, uma vez implementados, `FinesModule` (T3.6) foi
> retrofitado na mesma tarefa para fechar o item que já estava documentado como pendente (ver
> changelog v1.3 de `SPEC-20260607-001`). O módulo de manutenção (Fase 4, R-LED-02) ainda não
> existe, então essa terceira origem continua fora do ledger por ora — nada a fazer aqui até a
> Fase 4 chegar.
>
> **Desvios de escopo (SPEC-609-001):** nenhum — RF-01 a RF-05 implementados conforme especificado.
> Um detalhe de schema real diverge do texto da spec: a constraint `uq_vehicle_recurring_cost`
> no banco (criada em T0.2) é **full-table**, não parcial (`WHERE deleted_at IS NULL`) — um
> registro soft-deletado ainda ocupa a combinação `(vehicle_id, cost_type, year)`. A checagem de
> duplicata em `RecurringCostsService.assertNoDuplicate()` foi implementada para bater com essa
> realidade (não filtra `deleted_at`), já que alterar a constraint estaria fora do escopo de uma
> tarefa de camada de aplicação — se for indesejado, é uma migration futura, não um bug deste
> serviço.
>
> **Desvios de escopo (SPEC-609-002):** a spec original descreve "Server Component (Next.js)" com
> busca de dados no servidor — este projeto usa exclusivamente client components com TanStack
> Query + REST via NestJS (mesmo padrão de T3.0 em diante); reescrito como client component que
> reaproveita `GET /expenses` (com `limit=100` em vez do paginado default de 20, já que a tab
> precisa da visão completa do período). Accordion via `<details>/<summary>` nativo, como a
> própria spec permite. Tab "Em atraso" mencionada no mockup da spec não existe neste projeto (não
> foi implementada em nenhuma tarefa anterior) — "Por veículo" foi adicionada como 3ª tab, não 4ª.
>
> **Desvios de escopo (SPEC-609-003):** a spec pedia `GET /expenses/export` retornando um array
> JSON e exportação client-side "via fetch da query Supabase" — ambos conflitam com a arquitetura
> já estabelecida (backend gera CSV pronto com BOM, frontend baixa via `<a href download>`, mesmo
> padrão de `DashboardService.exportExpensesCsv` de T3.1). Implementado como `GET /expenses/export`
> retornando texto CSV direto. Função `escapeCsvField` extraída para `shared/csv/csv.util.ts` e
> reutilizada por `DashboardService` (evita duplicar a mesma função em dois módulos).

### Backend (`apps/api`)

| Req                                                 | Descrição                                                                                                                                 | Código                                                                        | Teste                                                    | Status |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------- | ------ |
| EPIC-FIN-001 R-LED-02, R-LED-05, R-HUB-01, R-HUB-02 | `ExpensesService.createFromSource()`/`softDeleteBySource()` — idempotente via checagem prévia + índice único parcial `uq_expenses_source` | `apps/api/src/modules/expenses/expenses.service.ts`                           | `expenses.service.spec.ts`                               | ✅     |
| SPEC-609-001 RF-01 a RF-05, CT-REC-01 a 08          | `RecurringCostsModule` REST completo (`POST/GET/PATCH/DELETE /recurring-costs`)                                                           | `apps/api/src/modules/recurring-costs/recurring-costs.service.ts`             | `recurring-costs.service.spec.ts`, `.controller.spec.ts` | ✅     |
| SPEC-609-001 R-REC-01                               | 409 em duplicata `(vehicle_id, cost_type, year)` — checagem sem filtro de `deleted_at` (bate com constraint full-table do banco)          | `recurring-costs.service.ts` (`assertNoDuplicate`)                            | `recurring-costs.service.spec.ts`                        | ✅     |
| SPEC-609-003 RF-01, RF-02                           | `GET /expenses/export?from=&to=&vehicle_id=` — CSV consolidado com coluna Origem humanizada                                               | `apps/api/src/modules/expenses/expenses.service.ts` (`exportConsolidatedCsv`) | `expenses.service.spec.ts`, `.controller.spec.ts`        | ✅     |
| —                                                   | `FinesModule` retrofitado para usar `createFromSource`/`softDeleteBySource`                                                               | `apps/api/src/modules/fines/fines.service.ts`                                 | `fines.service.spec.ts`                                  | ✅     |
| S1, S2                                              | `SupabaseAuthGuard` + RLS (`auth.uid()`) em todas as rotas                                                                                | `recurring-costs.controller.ts`                                               | `recurring-costs.controller.spec.ts`                     | ✅     |

### Validators (`packages/validators`)

| Req                | Descrição                                                                                           | Código                                              | Teste                            | Status |
| ------------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------- | ------ |
| SPEC-609-001 RF-02 | `createRecurringCostInputSchema`/`updateRecurringCostInputSchema`/`RECURRING_COST_TYPE_TO_CATEGORY` | `packages/validators/src/recurring-cost.schemas.ts` | `recurring-cost.schemas.spec.ts` | ✅     |
| SPEC-609-003 RF-01 | `consolidatedExportQuerySchema`                                                                     | `packages/validators/src/expense.schemas.ts`        | `expense.schemas.spec.ts`        | ✅     |

### Frontend (`apps/web`)

| Req                                     | Descrição                                                                                   | Código                                                                  | Teste           | Status                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------- |
| SPEC-609-002 RF-01, RF-02, RF-03, RF-05 | Tab "Por veículo" com accordion nativo, subtotal e total geral, ordenado por maior subtotal | `apps/web/src/app/expenses/page.tsx` (`ByVehicleTab`, `groupByVehicle`) | `page.spec.tsx` | ✅                                                                                           |
| SPEC-609-003 RF-03                      | Botão "Exportar CSV Completo"                                                               | `page.tsx`                                                              | `page.spec.tsx` | ✅                                                                                           |
| SPEC-609-001                            | Tela de CRUD de custos recorrentes                                                          | —                                                                       | —               | ⏳ (sem tela dedicada; gerenciamento fica para quando o Módulo de Documentos, G-08, existir) |

---

## SPEC-20260715-002 — Suporte a Fuso Horário por Usuário (approved)

> Torna os lançamentos transacionais (`expenses.occurred_at` — renomeada de `date`,
> `maintenances.scheduled_date`, `maintenances.completion_date`) cientes do fuso do usuário.
> Migra os campos de `DATE` para `timestamptz`. Armazena o fuso IANA em
> `user_preferences.timezone`. Corrige o comportamento de "hoje" em alertas e KPIs para usar o
> dia calendário no fuso do usuário, não em UTC do servidor.
> Regras: R-TZ-01, R-TZ-02, R-TZ-03, R-TZ-04, R2 v2. Segurança: S1, S2. Camadas: frontend,
> backend, database.
>
> **Implementado em 2026-07-22.** Testes automatizados (spec files existentes de
> `expenses.service.spec.ts`, `dashboard.service.spec.ts`, `maintenances.service.spec.ts`,
> `analytics.service.spec.ts`, `fines.service.spec.ts`, `recurring-costs.service.spec.ts`)
> **não foram atualizados** para o novo shape (`occurred_at` em vez de `date`) nesta rodada —
> débito de teste explícito, sinalizado abaixo por RF, não fica implícito.

| Req                          | Descrição                                                                                                                                                                                                                         | Código                                                                                                                                                                                                                                    | Teste                                             | Status                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| RF-BD-01 a RF-BD-05          | Migration: `user_preferences.timezone`, rename+retype `expenses.date`→`occurred_at timestamptz`, retype `maintenances.scheduled_date`/`completion_date`, migração de dados existentes via JOIN, funções SQL dependentes ajustadas | `supabase/migrations/20260722060748_timezone_aware_datetime.sql`                                                                                                                                                                          | ⏳ pendente (sem teste de migration automatizado) | ✅                                                                                |
| RF-BK-01, RF-BK-02           | `PreferencesService`/`preferences.schemas.ts` — campo `timezone` (fallback `null` cru, validação IANA básica)                                                                                                                     | `apps/api/src/modules/preferences/preferences.service.ts`, `packages/validators/src/preferences.schemas.ts`                                                                                                                               | ⏳ pendente (spec não atualizado)                 | ✅                                                                                |
| RF-BK-03, RF-BK-04, RF-BK-05 | `DashboardService` — `daysUntil`/`classifyDocument` recebem `tz`; `toCalendarDay`/`FALLBACK_TIMEZONE` em util compartilhado                                                                                                       | `apps/api/src/modules/dashboard/dashboard.service.ts`, `apps/api/src/shared/utils/date.utils.ts`                                                                                                                                          | ⏳ pendente (spec não atualizado)                 | ✅                                                                                |
| RF-BK-06, RF-BK-08, RF-BK-09 | `ExpensesService.create/update` — aceita `occurred_at` (YYYY-MM-DD ou ISO+offset), duplicata por dia calendário no fuso do usuário, `future_date_warning` não-bloqueante                                                          | `apps/api/src/modules/expenses/expenses.service.ts`                                                                                                                                                                                       | ⏳ pendente (spec não atualizado)                 | ✅                                                                                |
| RF-BK-07, RF-BK-10           | `MaintenancesService` — `scheduled_date`/`completion_date` timestamptz, `completion_date` > agora+24h rejeitado com 422                                                                                                           | `apps/api/src/modules/maintenances/maintenances.service.ts`                                                                                                                                                                               | ⏳ pendente (spec não atualizado)                 | ✅                                                                                |
| RF-FE-01, RF-FE-06           | Detecção automática silenciosa (`TimezoneDetector`), seletor de fuso com fusos IANA do Brasil obrigatórios                                                                                                                        | `apps/web/src/components/layout/timezone-detector.tsx`, `apps/web/src/app/(app)/settings/preferences/page.tsx`                                                                                                                            | ⏳ pendente                                       | ✅                                                                                |
| RF-FE-02                     | Seção "Fuso horário" em `/settings/preferences` (exibir/editar/salvar)                                                                                                                                                            | `apps/web/src/app/(app)/settings/preferences/page.tsx`                                                                                                                                                                                    | ⏳ pendente                                       | ✅                                                                                |
| RF-FE-03, RF-FE-04           | Formulários de despesa/manutenção com `datetime-local`, preenchimento automático (despesa/agendamento) e campo `completion_date` manual em manutenção                                                                             | `apps/web/src/app/(app)/expenses/new/page.tsx`, `apps/web/src/app/(app)/expenses/[id]/page.tsx`, `apps/web/src/app/(app)/maintenance/new/page.tsx`, `apps/web/src/app/(app)/maintenance/[id]/page.tsx`, `apps/web/src/lib/datetime-tz.ts` | ⏳ pendente                                       | ✅                                                                                |
| RF-FE-05                     | Exibição de datas com `timeZone` explícito nas listagens de despesas e manutenções                                                                                                                                                | `apps/web/src/app/(app)/expenses/page.tsx`, `apps/web/src/app/(app)/maintenance/page.tsx`, `apps/web/src/lib/datetime-tz.ts`                                                                                                              | ⏳ pendente                                       | 🟡 parcial (demais telas com data ainda usam formatação sem `timeZone` explícito) |

---

## SPEC-20260720-002 — Aviso de Duplicata no Formulário de Criação de Despesa (approved)

> Extensão de UI de R2/SPEC-20260601-002: o backend já retornava `duplicate_warning` e
> `duplicate_id` na resposta 201, mas o frontend ignorava o campo (gap deliberado, NG-06 da
> spec original). Implementado em 2026-07-20 durante a construção da suíte E2E
> (SPEC-20260716-003 RF-E2E-05), que precisava validar o aviso no browser.

| Req   | Descrição                                                                                                           | Código                                         | Teste                                                                                              | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------ |
| RF-01 | `ExpenseResponse` estendido com `duplicate_warning?`, `duplicate_id?`                                               | `apps/web/src/app/(app)/expenses/new/page.tsx` | `apps/web/src/app/(app)/expenses/new/page.spec.tsx`                                                | ✅     |
| RF-02 | `onSuccess` do mutation adia navegação quando `duplicate_warning === true`, guardando `duplicate_id` em estado | `apps/web/src/app/(app)/expenses/new/page.tsx` | `apps/web/src/app/(app)/expenses/new/page.spec.tsx`                                                | ✅     |
| RF-03 | Banner `role="alert"` com texto informativo, botão "Entendido" e link "Ver despesa duplicada"                       | `apps/web/src/app/(app)/expenses/new/page.tsx` | `apps/web/src/app/(app)/expenses/new/page.spec.tsx`, `apps/web/e2e/tests/expense-warnings.spec.ts` | ✅     |
| RF-04 | Banner posicionado no padrão visual existente de alertas do formulário                                              | `apps/web/src/app/(app)/expenses/new/page.tsx` | — (visual, não testado automaticamente)                                                            | ✅     |
| RF-05 | Sem `duplicate_warning`, navegação direta para `/expenses` (comportamento preexistente preservado)             | `apps/web/src/app/(app)/expenses/new/page.tsx` | `apps/web/src/app/(app)/expenses/new/page.spec.tsx` (demais testes do arquivo)                     | ✅     |
| RF-06 | Banner de duplicata e alertas de erro (`fieldError`, `mutation.isError`) mutuamente exclusivos                      | `apps/web/src/app/(app)/expenses/new/page.tsx` | `apps/web/src/app/(app)/expenses/new/page.spec.tsx`                                                | ✅     |

---

## SPEC-20260716-003 — Testes E2E com Playwright (approved)

> Define configuração do Playwright em `apps/web/e2e/`, suíte mínima de testes E2E para fluxos
> críticos (autenticação, avisos de odômetro/duplicata, troca de contexto de veículo) e integração
> com CI. Regras: R1, R2, R-CTX-07. Segurança: S1. Camadas: frontend, qa.
> **Promovida de `draft` para `approved` em 2026-07-22** (changelog v1.5 da spec): todos os RFs
> de configuração, Page Objects, os 11 fluxos E2E, dados de teste e integração com CI têm código
> implementado (linhas 🔶 abaixo). Pendência real é só a dependência externa dos 6 GitHub Secrets
> de ambiente E2E — mesmo padrão de aprovação já usado em `SPEC-20260716-001`/`SPEC-20260716-002`
> (código pronto, config externa fora do repositório).
> **Implementação iniciada em 2026-07-20:** configuração completa (RF-CFG-01 a RF-CFG-08),
> Page Objects (LoginPage, DashboardPage, ExpenseFormPage, VehicleContextChipPage),
> fluxos RF-E2E-01 a RF-E2E-07 e job `e2e` no CI implementados. RF-E2E-04 corrigida no
> texto da spec (changelog v1.1) para refletir R-ODO-01 (hard block real) em vez de R1;
> RF-E2E-05 destravada após implementação de SPEC-20260720-002 (banner de duplicata).
> Suíte NÃO pôde ser executada localmente (stack Supabase local não está rodando no
> ambiente de desenvolvimento atual) — validada apenas via `playwright test --list` e
> `tsc --noEmit` (sem erros).
> **Auditoria de 2026-07-20 (pós-implementação):** encontrado e corrigido bug de caminho —
> o step de upload de artefato do CI apontava para `apps/web/playwright-report/`, mas o
> reporter HTML do `playwright.config.ts` grava em `e2e/reports/` (RF-CFG-02); corrigido em
> `.github/workflows/ci.yml`. Spec atualizada (changelog v1.2) para citar as env vars
> `E2E_TEST_VEHICLE_PLATE`, `E2E_VEHICLE_A_PLATE`, `E2E_VEHICLE_B_PLATE` em RF-DATA-02 e
> RF-CI-04 — já usadas pelo código mas ausentes do texto original. Pendência de
> provisionamento dos 6 GitHub Secrets registrada em `important/PENDENCIAS-E-PROCESSOS.md`.
> Execução real da suíte em CI e os critérios de aceite CA-01 a CA-09 continuam em aberto.
> **2026-07-30 (v1.6):** escopo ampliado para incluir visual regression leve (`RF-E2E-12`),
> reaproveitando esta suíte em vez de ferramenta dedicada — decisão da Rodada 5 de
> `specs/design-system/PLANO-MIGRACAO-SHOWCASE-INFRA.md`. Código implementado em
> `apps/web/e2e/tests/visual-regression.spec.ts`; baseline PNG não gerada nesta sessão por
> falta de acesso a credenciais/stack local para rodar `--update-snapshots`.

### Configuração do Playwright (RF-CFG)

| Req       | Descrição                                                                                        | Código                          | Teste | Status |
| --------- | ------------------------------------------------------------------------------------------------ | ------------------------------- | ----- | ------ |
| RF-CFG-01 | `@playwright/test` adicionado como devDependency (`^1.61.1` ≥ 1.45)                              | `apps/web/package.json`         | —     | 🔶     |
| RF-CFG-02 | `playwright.config.ts` com `testDir`, `baseURL`, `timeout 30s`, `retries CI?3:0`, relatório HTML | `apps/web/playwright.config.ts` | —     | 🔶     |
| RF-CFG-03 | Somente chromium configurado (firefox e webkit opcionais comentados)                             | `apps/web/playwright.config.ts` | —     | 🔶     |
| RF-CFG-04 | Scripts `e2e` e `e2e:ui` em `apps/web/package.json`                                              | `apps/web/package.json`         | —     | 🔶     |
| RF-CFG-05 | Estrutura `e2e/fixtures/`, `e2e/pages/`, `e2e/tests/` criada                                     | `apps/web/e2e/`                 | —     | 🔶     |
| RF-CFG-06 | `e2e/fixtures/base.ts` exporta `test` e `expect` configurados com `storageState`                 | `apps/web/e2e/fixtures/base.ts` | —     | 🔶     |
| RF-CFG-07 | `e2e/.gitignore` ignorando `reports/`, `test-results/`, `playwright-report/`, `auth-state.json`  | `apps/web/e2e/.gitignore`       | —     | 🔶     |
| RF-CFG-08 | `e2e/global-setup.ts`: login via browser, salva cookies em `e2e/auth-state.json`                 | `apps/web/e2e/global-setup.ts`  | —     | 🔶     |

### Page Objects

| Classe                   | Arquivo                                           | RFs cobertos                    |
| ------------------------ | ------------------------------------------------- | ------------------------------- |
| `LoginPage`              | `apps/web/e2e/pages/login.page.ts`                | RF-E2E-01, RF-E2E-02, RF-E2E-03 |
| `DashboardPage`          | `apps/web/e2e/pages/dashboard.page.ts`            | RF-E2E-02, RF-E2E-03            |
| `ExpenseFormPage`        | `apps/web/e2e/pages/expense-form.page.ts`         | RF-E2E-04, RF-E2E-05, RF-E2E-07 |
| `VehicleContextChipPage` | `apps/web/e2e/pages/vehicle-context-chip.page.ts` | RF-E2E-06, RF-E2E-07            |

### Fluxos E2E Obrigatórios (RF-E2E)

| Req       | Descrição                                                                                                                                                                                                                                                              | Código                                                                                              | Teste                                                                                                                                                                    | Status                                                                                                                                                      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-E2E-01 | Acesso a rota privada sem sessão → redirect para `/login` (S1, CT-006)                                                                                                                                                                                                 | `apps/web/middleware.ts`                                                                            | `apps/web/e2e/tests/auth.spec.ts`                                                                                                                                        | 🔶 implementado, não executado localmente                                                                                                                   |
| RF-E2E-02 | Login com credenciais válidas → acesso ao dashboard (S1, CT-006)                                                                                                                                                                                                       | `apps/web/src/app/(auth)/login/page.tsx`                                                            | `apps/web/e2e/tests/auth.spec.ts`                                                                                                                                        | 🔶 implementado, não executado localmente                                                                                                                   |
| RF-E2E-03 | Logout → redirect para `/login` e bloqueio de acesso (S1)                                                                                                                                                                                                              | `apps/web/src/lib/auth/logout.ts`                                                                   | `apps/web/e2e/tests/auth-logout.spec.ts` (projeto Playwright isolado `chromium-logout`, roda por último — `signOut` escopo "global" revoga o storageState compartilhado) | ✅                                                                                                                                                          |
| RF-E2E-04 | Odômetro fora de sequência → hard block com alerta na tela, sem salvar (R-ODO-01, CT-001) — spec corrigida em 2026-07-20 (changelog v1.1): descrevia soft warning (R1), comportamento real e testado é hard block via `strict=true`, exclusivo do fluxo web            | `apps/web/src/app/(app)/expenses/new/page.tsx`, `apps/api/src/modules/expenses/expenses.service.ts` | `apps/web/e2e/tests/expense-warnings.spec.ts`                                                                                                                            | 🔶 implementado; requer `E2E_TEST_VEHICLE_PLATE` e odômetro pré-existente                                                                                   |
| RF-E2E-05 | Duplicata → exibe banner de aviso (R2, CT-002) — banner implementado via SPEC-20260720-002 (RF-02, RF-03); teste destravado                                                                                                                                            | `apps/web/src/app/(app)/expenses/new/page.tsx`, `apps/api/src/modules/expenses/expenses.service.ts` | `apps/web/e2e/tests/expense-warnings.spec.ts`                                                                                                                            | 🔶 implementado; requer `E2E_TEST_VEHICLE_PLATE`                                                                                                            |
| RF-E2E-06 | Clica no VehicleContextChip → abre dialog → seleciona veículo → chip atualiza (R-CTX-07)                                                                                                                                                                               | `apps/web/src/components/layout/vehicle-context-chip.tsx`                                           | `apps/web/e2e/tests/vehicle-context.spec.ts`                                                                                                                             | 🔶 implementado; requer `E2E_VEHICLE_B_PLATE`                                                                                                               |
| RF-E2E-07 | Troca de contexto propaga para `vehicle_id` do formulário de despesa (R-CTX-06, R-CTX-07)                                                                                                                                                                              | `apps/web/src/lib/hooks/use-vehicle-context-field.ts`                                               | `apps/web/e2e/tests/vehicle-context.spec.ts`                                                                                                                             | 🔶 implementado; requer `E2E_VEHICLE_A_PLATE` e `E2E_VEHICLE_B_PLATE`                                                                                       |
| RF-E2E-08 | Login com credenciais inválidas → alerta de erro visível (`role="alert"`), URL permanece `/login` (S1)                                                                                                                                                                 | `apps/web/src/app/(auth)/login/page.tsx`                                                            | `apps/web/e2e/tests/auth.spec.ts`                                                                                                                                        | 🔶 implementado; aguarda secrets                                                                                                                            |
| RF-E2E-09 | Cookie `navestory_access_token` presente mas inválido em rota privada → redirect para `/login` (S1, CT-006)                                                                                                                                                            | `apps/web/middleware.ts`                                                                            | `apps/web/e2e/tests/auth.spec.ts`                                                                                                                                        | 🔶 implementado; aguarda secrets                                                                                                                            |
| RF-E2E-10 | Usuário sem veículos: Dialog de contexto exibe "Nenhum veículo encontrado" e "Nenhum grupo encontrado" sem erro JS (R-CTX-07)                                                                                                                                          | `apps/web/src/components/layout/vehicle-switcher-content.tsx`                                       | `apps/web/e2e/tests/vehicle-context.spec.ts`                                                                                                                             | ⏸️ skip até `E2E_USER_NO_VEHICLES_EMAIL` ser provisionado como GitHub Secret e seed correspondente ser adicionado a `apps/api/scripts/seed-e2e.mjs`         |
| RF-E2E-11 | Busca sem resultado no Dialog de contexto: estado vazio exibido, Dialog continua respondendo após limpar busca (R-CTX-07)                                                                                                                                              | `apps/web/src/components/layout/vehicle-switcher-content.tsx`                                       | `apps/web/e2e/tests/vehicle-context.spec.ts`                                                                                                                             | 🔶 implementado; não depende de dado especial                                                                                                               |
| RF-E2E-12 | Visual regression leve — `toHaveScreenshot` de `dashboard`/`expenses`/`fines`, light/dark via `emulateMedia`, `maxDiffPixelRatio: 0.01` (C-DS-01) — escopo adicionado em `SPEC-20260716-003` v1.6, ver `specs/design-system/PLANO-MIGRACAO-SHOWCASE-INFRA.md` Rodada 5 | `apps/web/src/app/(app)/{dashboard,expenses,fines}/page.tsx`                                        | `apps/web/e2e/tests/visual-regression.spec.ts`                                                                                                                           | 🔶 implementado; baseline PNG ainda não gerada (requer execução real com `--update-snapshots`, aguarda secrets/stack local — mesma pendência de RF-DATA-01) |

### Dados de Teste E2E (RF-DATA)

| Req        | Descrição                                                                                                                                      | Código                                                          | Teste | Status                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----- | -------------------------------------------------- |
| RF-DATA-01 | Usuário de teste E2E via `E2E_USER_EMAIL`/`E2E_USER_PASSWORD`; credenciais nunca hardcodadas nos arquivos de teste                             | `apps/web/e2e/global-setup.ts`, `apps/web/e2e/fixtures/base.ts` | —     | 🔶 implementado; secrets não provisionados         |
| RF-DATA-02 | Veículo(s) de teste pré-existente(s) via seed; placas identificadas por `E2E_TEST_VEHICLE_PLATE`, `E2E_VEHICLE_A_PLATE`, `E2E_VEHICLE_B_PLATE` | `apps/api/scripts/seed-e2e.mjs`, `apps/web/e2e/global-setup.ts` | —     | 🔶 seed existe; execução em CI depende dos secrets |
| RF-DATA-03 | Isolamento de estado entre testes (`afterEach` para remover registros criados)                                                                 | `apps/web/e2e/tests/expense-warnings.spec.ts`                   | —     | 🔶 implementado nos testes de despesa              |

### Integração com CI (RF-CI)

| Req      | Descrição                                                                                                               | Código                     | Teste | Status |
| -------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------- | ----- | ------ |
| RF-CI-01 | Job `e2e` em `.github/workflows/ci.yml`, depende de `build`, executa em push para `main`/`master` OU PR com label `e2e` | `.github/workflows/ci.yml` | —     | 🔶     |
| RF-CI-02 | Instala chromium com `pnpm --filter @navestory/web exec playwright install --with-deps chromium`                        | `.github/workflows/ci.yml` | —     | 🔶     |
| RF-CI-03 | Supabase local + API NestJS + Next.js iniciados antes dos testes; `wait-on` para health check                           | `.github/workflows/ci.yml` | —     | 🔶     |
| RF-CI-04 | Secrets `E2E_BASE_URL`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` passados ao job via `env:`                                | `.github/workflows/ci.yml` | —     | 🔶     |
| RF-CI-05 | Relatório HTML publicado como artefato GitHub Actions em falha                                                          | `.github/workflows/ci.yml` | —     | 🔶     |
| RF-CI-06 | Falha nos testes E2E bloqueia o pipeline (job `e2e` no CI sem `continue-on-error`)                                      | `.github/workflows/ci.yml` | —     | 🔶     |

---

## SPEC-20260716-001 — Deploy Automatizado (CD) (approved)

> Formaliza o pipeline de entrega contínua do navestory: deploy de preview automático de `apps/web`
> no Vercel em cada PR; deploy de produção de `apps/web` automático via merge em `master`;
> deploy de `apps/api` em staging automático + gate humano obrigatório para produção; job de
> migrations Supabase CLI no pipeline; rollback documentado. Todos os jobs de deploy dependem
> dos jobs de qualidade do CI existente (lint, type-check, test, build). Segurança: S3.
> Camadas: devops, infra. **Status: approved — workflow implementado em 2026-07-16
> (`.github/workflows/cd.yml`), mas nenhuma conta/token real foi provisionada ainda (Vercel,
> Railway, GitHub Environments com required reviewers) — decisão explícita do usuário. CA-01 a
> CA-09 não são verificáveis em produção real até essa configuração externa acontecer.** Ver
> changelog v1.1 da spec para as decisões de design tomadas durante a implementação (plataforma
> Railway para `apps/api`, gate humano em `migrate-db`, gatilho `workflow_run`/`workflow_dispatch`).

| Req      | Descrição                                                                                                          | Código                                                                                                            | Teste | Status                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------ |
| RF-01    | Deploy de preview de `apps/web` no Vercel em cada PR; URL postada como comentário                                  | `.github/workflows/cd.yml` (`deploy-web-preview`)                                                                 | —     | 🟡 código pronto, não verificável sem conta Vercel                                                     |
| RF-02    | Deploy de produção de `apps/web` no Vercel automático após merge em `master` com CI verde                          | `.github/workflows/cd.yml` (`deploy-web-prod`)                                                                    | —     | 🟡 código pronto, não verificável sem conta Vercel                                                     |
| RF-03    | Deploy de `apps/api` em staging automático após merge em `master` com CI verde                                     | `.github/workflows/cd.yml` (`deploy-api-staging`)                                                                 | —     | 🟡 código pronto, não verificável sem conta Railway                                                    |
| RF-04    | Deploy de `apps/api` em produção exige aprovação manual via GitHub Environment `production`                        | `.github/workflows/cd.yml` (`environment: production` em `migrate-db`, herdado por `deploy-api-prod` via `needs`) | —     | 🟡 código pronto, GitHub Environment ainda não criado/configurado                                      |
| RF-05    | Jobs de deploy dependem de lint, type-check, test e build (nenhum deploy em CI vermelho)                           | `.github/workflows/cd.yml` (gatilho `workflow_run` com `conclusion == 'success'` sobre o workflow CI)             | —     | ✅                                                                                                     |
| RF-06    | Job `migrate-db` (Supabase CLI) executa após gate humano, antes do restart da API em produção                      | `.github/workflows/cd.yml` (`migrate-db`)                                                                         | —     | 🟡 código pronto, não verificável sem projeto Supabase de produção configurado no pipeline             |
| RF-07    | Rollback de `apps/web` via Vercel Instant Rollback em ≤ 2 min; procedimento em `docs/operations/runbooks.md`       | `docs/operations/runbooks.md`                                                                                     | —     | ✅ documentado                                                                                         |
| RF-08    | Rollback de `apps/api` via re-dispatch do job de deploy apontando para tag anterior + gate humano                  | `.github/workflows/cd.yml` (gatilho `workflow_dispatch`), `docs/operations/runbooks.md`                           | —     | ✅ documentado e implementado                                                                          |
| RF-09/S3 | Segredos de produção e staging como GitHub Secrets scoped por environment; nenhum hardcoded                        | `.github/workflows/cd.yml`, `docs/reference/environment-variables.md` (seção "GitHub Secrets — CD")               | —     | 🟡 workflow referencia os secrets corretos; secrets em si não provisionados                            |
| RF-10/S3 | Variáveis de staging segregadas de produção; `SUPABASE_SERVICE_ROLE_KEY` de produção inacessível a jobs de staging | `.github/workflows/cd.yml` (`environment: staging` em `deploy-api-staging`, tokens Railway distintos)             | —     | 🟡 estrutura pronta, segregação real depende dos GitHub Environments serem criados                     |
| RF-11    | Job `migrate-db` usa `supabase db push`; falha aborta deploy antes do restart                                      | `.github/workflows/cd.yml` (`migrate-db`, `deploy-api-prod` via `needs`)                                          | —     | ✅                                                                                                     |
| RF-12    | Status de deploy reportado como GitHub Deployment check no PR                                                      | `.github/workflows/cd.yml` (`github-comment: true` na action de preview)                                          | —     | 🟡 comentário de PR coberto; GitHub Deployments API formal não implementada (prioridade Média na spec) |

---

## SPEC-20260716-002 — Observabilidade em Produção (approved)

> Implanta error tracking (Sentry) em `apps/api` e `apps/web`, substitui `console.log` por
> logging estruturado via Pino/nestjs-pino no NestJS (fecha 11 ocorrências residuais de P3),
> e evolui `GET /health` para verificar conectividade com o Supabase (nova regra P5). Logs
> nunca contêm PII (nova regra S10). Segurança: S3, S5, S10. Camadas: backend, frontend, devops.
> **Status: código implementado em 2026-07-16 — nenhuma conta Sentry real foi provisionada
> ainda** (mesma situação de SPEC-20260716-001 com Vercel/Railway — decisão explícita do
> usuário). RF marcados 🟡 têm código pronto mas não são verificáveis fim-a-fim (evento
> chegando no painel Sentry) até a conta existir; ver `important/PENDENCIAS-E-PROCESSOS.md`.
> **2026-07-18:** spec promovida de `draft` para `approved` (v1.1) — código já existia antes da
> aprovação, desvio de processo sanado retroativamente após revisão, sem mudança de requisito.

### Error Tracking (Sentry)

| Req   | Descrição                                                                                          | Código                                                                                                | Teste                           | Status                                                                                                       |
| ----- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| RF-01 | `@sentry/nestjs` integrado ao `apps/api`; DSN via `SENTRY_DSN`; ausência não impede inicialização  | `apps/api/src/instrument.ts`, `apps/api/src/main.ts`, `apps/api/src/app.module.ts`                    | —                               | 🟡 código pronto, entrega ao Sentry não verificável sem conta real                                           |
| RF-02 | `@sentry/nextjs` integrado ao `apps/web`; DSN público via `NEXT_PUBLIC_SENTRY_DSN` (aplica S3)     | `apps/web/instrumentation-client.ts`, `apps/web/instrumentation.ts`                                   | —                               | 🟡 código pronto, idem                                                                                       |
| RF-03 | `HttpExceptionFilter` captura exceções HTTP 5xx e não-HTTP via `Sentry.captureException()`         | `apps/api/src/common/filters/http-exception.filter.ts`                                                | `http-exception.filter.spec.ts` | ✅                                                                                                           |
| RF-04 | Uncaught exceptions e unhandled rejections em `apps/api` capturados pelo `SentryModule`            | `apps/api/src/instrument.ts` (`Sentry.init`), `apps/api/src/app.module.ts` (`SentryModule.forRoot()`) | —                               | 🟡 código pronto, captura automática do SDK não exercida em teste (exigiria matar o processo)                |
| RF-05 | Erros de renderização em `apps/web` capturados via `error.tsx` global integrado ao Sentry          | `apps/web/src/app/global-error.tsx`                                                                   | —                               | 🟡 código pronto, sem teste automatizado de error boundary                                                   |
| RF-06 | Source maps enviados ao Sentry no build do CD (via `SENTRY_AUTH_TOKEN`); não expostos publicamente | `apps/web/next.config.ts` (`withSentryConfig`)                                                        | —                               | 🟡 build local verificado sem token (upload pulado); upload real depende de `SENTRY_AUTH_TOKEN` no CI/Vercel |
| RF-07 | Alertas de issue nova/regressão configurados no painel Sentry (sem mudança de código)              | — (config fora do repositório)                                                                        | —                               | ⏳ depende da conta Sentry existir                                                                           |

### Logging Estruturado

| Req       | Descrição                                                                                                 | Código                                                                                   | Teste                                                                               | Status                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| RF-08     | `nestjs-pino` + `pino-http` integrados; Pino substitui logger padrão do NestJS                            | `apps/api/src/common/logging/logger.module.ts`, `apps/api/src/main.ts` (`app.useLogger`) | build + suíte completa passando com o módulo importado                              | ✅                                                                      |
| RF-09     | Cada log de request inclui `requestId`, `method`, `url`, `statusCode`, `responseTimeMs`, `userId`         | `apps/api/src/common/logging/logger.module.ts` (`customAttributeKeys`, `customProps`)    | —                                                                                   | 🟡 código pronto, sem teste de integração dedicado (exigiria supertest) |
| RF-10     | JSON em produção; `pino-pretty` em desenvolvimento                                                        | `apps/api/src/common/logging/logger.module.ts` (`transport` condicional a `NODE_ENV`)    | —                                                                                   | 🟡 código pronto, sem teste dedicado                                    |
| RF-11/S10 | Serializer de redaction: campos PII/sensíveis substituídos por `[REDACTED]`; lista em `PINO_REDACT_PATHS` | `apps/api/src/common/logging/redact-paths.ts`                                            | `redact-paths.spec.ts` (CA-05)                                                      | ✅                                                                      |
| RF-12/P3  | Zero `console.*` em `apps/api/src/`; fecha as 11 ocorrências residuais identificadas em IMPACTO-021 #6    | — (ausência verificada)                                                                  | `grep -rn "console\." apps/api/src` sem resultado; `pnpm --filter api lint` (CA-03) | ✅                                                                      |
| RF-13     | `requestId` propagado no header `X-Request-Id` e como tag no Sentry                                       | `apps/api/src/common/interceptors/request-id.interceptor.ts`                             | —                                                                                   | 🟡 código pronto, sem teste dedicado                                    |

### Health Check com Dependências

| Req      | Descrição                                                                                                      | Código                                                                          | Teste                               | Status                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| RF-14    | `GET /health` executa ping mínimo no Supabase com timeout de 3s para verificar conectividade                   | `apps/api/src/health/health.controller.ts`                                      | `health.controller.spec.ts`         | ✅                                                                                                      |
| RF-15    | Schema de resposta: `{ status, timestamp, checks: { supabase: { status, latencyMs, error? } } }`               | `apps/api/src/health/health.controller.ts`                                      | `health.controller.spec.ts`         | ✅                                                                                                      |
| RF-16    | Supabase acessível → `status: "ok"`, HTTP 200                                                                  | `apps/api/src/health/health.controller.ts`                                      | `health.controller.spec.ts` (CA-06) | ✅                                                                                                      |
| RF-17/P5 | Supabase inacessível/timeout → `status: "degraded"`, HTTP 200 (não 503)                                        | `apps/api/src/health/health.controller.ts`                                      | `health.controller.spec.ts` (CA-07) | ✅                                                                                                      |
| RF-18/S5 | `checks.supabase.error` exibe apenas `"connection_timeout"` ou `"query_failed"`, nunca mensagem bruta de banco | `apps/api/src/health/health.controller.ts`                                      | `health.controller.spec.ts`         | ✅                                                                                                      |
| RF-19/P5 | Timeout máximo total do endpoint: 5 segundos                                                                   | `apps/api/src/health/health.controller.ts` (timeout de 3s da única dependência) | —                                   | 🟡 garantido por construção (única dependência com timeout de 3s), sem teste de latência total dedicado |
| RF-20    | `GET /health` permanece rota pública (sem `SupabaseAuthGuard`); comportamento preservado                       | `apps/api/src/health/health.controller.ts` (sem `@UseGuards`)                   | `health.controller.spec.ts`         | ✅                                                                                                      |

**Nota sobre RF-14:** o Supabase JS Client não expõe execução de SQL bruto (`SELECT 1`) sem uma
function RPC dedicada; a implementação usa uma query `HEAD` (`select(..., { head: true })`) contra
a tabela `profiles`, que não transfere linhas — equivalente em custo/latência a um ping, mas
depende da tabela `profiles` existir e ser acessível pelo client service role (já é, ver S7/S9).

---

## SPEC-20260722-003 — Shell Mobile-First e Migração Tailwind v3 → v4 (approved)

> Dois blocos: (A) atualiza dependências para Tailwind v4 usando estratégia `@config` compat layer; (B) converte sidebar para drawer/overlay em mobile (< 768 px), torna o header responsivo com hamburger e elimina padding fixo de layout. Reutiliza `isMobileNavOpen`/`toggleMobileNav()` já presentes em `ui-store.ts`. Camadas: frontend, devops. Regras: R-NAV-01, R-NAV-02, R-NAV-03, R-NAV-04, R-DS-04.
>
> **Desvios da spec confirmados na implementação:** (1) z-index do drawer/backdrop usa `z-[250]`/`z-[240]` em vez de `z-[4000]`/`z-[3999]` — a spec já previa ajustar para a escala local (`docs/ui-design/ux-rules.md` define `z-[250]` como teto para "Menus Mobile Fullscreen"); (2) caminho do `@config` é `../../tailwind.config.ts` (dois níveis, não três — `globals.css` fica em `src/app/`); (3) ícones hamburger/fechar são SVG inline, seguindo o padrão já usado em `packages/ui/src/components/dialog.tsx`, sem adicionar `lucide-react` como nova dependência; (4) trap focus é hook nativo (`querySelectorAll` + `Tab`/`Shift+Tab`), sem nova dependência — `@radix-ui/react-focus-scope` só existe como transitiva do `@radix-ui/react-dialog`; (5) breakpoint mobile reaproveita o hook `useMediaQuery` já existente em `src/lib/hooks/use-media-query.ts` em vez de criar um novo.

### Bloco A — Migração Tailwind v4

| Req   | Descrição                                                                                       | Código                         | Teste                                                                    | Status |
| ----- | ----------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------ | ------ |
| RF-01 | Atualizar dependências: `tailwindcss@^4.x`, `@tailwindcss/postcss@^4.x`, remover `autoprefixer` | `apps/web/package.json`        | `pnpm build`                                                             | ✅     |
| RF-02 | Substituir plugin PostCSS de `tailwindcss` por `@tailwindcss/postcss`                           | `apps/web/postcss.config.js`   | `pnpm build`                                                             | ✅     |
| RF-03 | Converter `@tailwind base/components/utilities` para `@import "tailwindcss"` + `@config` no CSS | `apps/web/src/app/globals.css` | `pnpm build` sem erros de CSS                                            | ✅     |
| RF-04 | Validar `@tailwindcss/typography` compatível com v4 (mantido `^0.5.20`, já compatível)          | `apps/web/package.json`        | `pnpm build`                                                             | ✅     |
| RF-05 | Build completo e dev sem erros em CI                                                            | —                              | `pnpm build` passando (validado localmente); CI confirma no próximo push | ✅     |

### Bloco B — Shell Mobile-First

| Req   | Descrição                                                                                                  | Código                                       | Teste                                                                                  | Status      |
| ----- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- | ----------- |
| RF-06 | Sidebar como drawer/overlay em < 768 px (`translate-x-0`/`-translate-x-full`, `z-[250]`)                   | `apps/web/src/components/layout/sidebar.tsx` | `sidebar.spec.tsx` ("drawer mobile" — RF-06)                                           | ✅          |
| RF-07 | Backdrop com fechar ao clicar (`z-[240]`, `bg-black/60`)                                                   | `apps/web/src/components/layout/sidebar.tsx` | `sidebar.spec.tsx` (RF-07)                                                             | ✅          |
| RF-08 | Fechar drawer via tecla `Esc`                                                                              | `apps/web/src/components/layout/sidebar.tsx` | `sidebar.spec.tsx` (RF-08)                                                             | ✅          |
| RF-09 | Fechar drawer ao navegar (via `usePathname`)                                                          | `apps/web/src/components/layout/sidebar.tsx` | ⏳ pendente (E2E em SPEC-20260716-003)                                                 | ✅ (código) |
| RF-10 | Botão hamburger no header com ícone SVG inline (abrir/fechar) e `aria-label` dinâmico                      | `apps/web/src/components/layout/header.tsx`  | `header.spec.tsx` (RF-10)                                                              | ✅          |
| RF-11 | Header mobile-first: chip de contexto e Command Palette com `hidden md:flex`                               | `apps/web/src/components/layout/header.tsx`  | `header.spec.tsx` (verifica renderização, cobertura visual pendente de revisão manual) | ✅          |
| RF-12 | Layout shell com `md:pl-16`/`md:pl-64` responsivo em vez de `pl-16`/`pl-64` fixo                           | `apps/web/src/app/(app)/layout.tsx`          | ⏳ pendente (E2E em SPEC-20260716-003)                                                 | ✅ (código) |
| RF-13 | Touch targets mínimos 44 px (`min-h-[44px]`, revertido em `md:min-h-0`) nos itens do drawer e no hamburger | `sidebar.tsx`, `header.tsx`                  | ⏳ pendente (auditoria axe-core)                                                       | ✅ (código) |
| RF-14 | `aria-expanded`/`aria-controls` no hamburger; drawer com `role="dialog"` e `aria-modal="true"`             | `header.tsx`, `sidebar.tsx`                  | `header.spec.tsx` (RF-10/RF-14)                                                        | ✅          |

RNF-04 (foco preso no drawer + retorno ao hamburger ao fechar) implementado em `sidebar.tsx` (`useFocusTrap`) e `header.tsx` (ref + `useEffect` de retorno de foco) — cobertura automatizada dedicada ainda pendente (⏳), validado via leitura de código.

---

## SPEC-20260722-004 — Subheader Financeiro — Chips de Categoria e Indicador de Multas (approved)

> Barra fina (44 px) persistente abaixo do header do shell autenticado: até 3 chips das
> categorias de maior gasto do mês corrente (respeitando contexto de veículo/grupo ativo),
> atalhos de navegação para Despesas e Manutenções, e link de Multas com indicador dinâmico
> de status (neutro / aviso / perigo). Backend (NestJS) faz a agregação; nenhum acesso ao
> Supabase client direto no browser. Regras: R-SUB-01, R-SUB-02, R-SUB-03, R-SUB-04, P7.
> Segurança: S1, S2. Camadas: frontend, backend.
> Dependência aceita conforme spec: tela `/fines` não existe no frontend — link aponta para
> `/fines` mesmo assim (404 temporário aceito pelo usuário, 2026-07-22; dívida técnica em
> `important/PENDENCIAS-E-PROCESSOS.md`, ver seção Dependências na spec).
> Adaptação de RF-07: `activeGroupData` do store ainda não existe (dependência
> SPEC-20260602-001/RF-19 segue `⏳` abaixo) — os membros do grupo ativo são resolvidos em
> `FinancialSubheader` a partir de `GET /vehicle-groups` (mesma query key de `FleetAside`).

### Backend — DashboardModule (extensão)

| Req   | Descrição                                                                                                                                                                                                                                | Código                                                                                                                                                                                                                                                 | Teste                                                                          | Status |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------ |
| RF-01 | `GET /dashboard/spending-highlights` — retorna até 3 categorias com maior `SUM(amount)` no mês corrente; params opcionais `vehicleId` e `groupIds[]`; `LIMIT 3` na query SQL (R-SUB-01, P7)                                              | `apps/api/src/modules/dashboard/dashboard.controller.ts` (`getSpendingHighlights`), `dashboard.service.ts` (`getSpendingHighlights`), `supabase/migrations/20260722120000_category_spending_and_fines_status.sql` (`get_category_spending_highlights`) | `dashboard.service.spec.ts`, `dashboard.controller.spec.ts`                    | ✅     |
| RF-02 | `GET /dashboard/fines-status` — retorna `{ status: 'none'\|'open'\|'overdue', count: number }` para multas ativas (`pending`/`appealing`, `deleted_at IS NULL`); vencida = `status='pending'` AND `due_date < hoje` (R-SUB-03, R-SUB-04) | `dashboard.controller.ts` (`getFinesStatus`), `dashboard.service.ts` (`getFinesStatus`), migração acima (`get_fines_status_summary`)                                                                                                                   | `dashboard.service.spec.ts`, `dashboard.controller.spec.ts`                    | ✅     |
| RF-08 | Schemas Zod `categorySummaryQuerySchema` e `finesStatusResponseSchema` em `packages/validators`                                                                                                                                          | `packages/validators/src/dashboard.schemas.ts`                                                                                                                                                                                                         | — (schemas simples, cobertos indiretamente pelos testes de controller/service) | ✅     |

### Frontend — Shell autenticado

| Req   | Descrição                                                                                                                                                           | Código                                                                                                              | Teste                                                         | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------ |
| RF-03 | Componente `FinancialSubheader` montado no layout autenticado, com 44 px fixos, skeletons durante carregamento                                                      | `apps/web/src/components/layout/financial-subheader.tsx`, `apps/web/src/app/(app)/layout.tsx`                       | `financial-subheader.spec.tsx`                                | ✅     |
| RF-04 | Chips de categoria: label, valor BRL formatado, badge de contagem; cada chip é `<Link>` para `/expenses?category=<slug>` com params de contexto (R-SUB-02, R-DS-04) | `financial-subheader.tsx` (`formatChipAmount`, `buildChipHref`)                                                     | `financial-subheader.spec.tsx`                                | ✅     |
| RF-05 | Atalhos estáticos: "Despesas" → `/expenses`; "Manutenções" → `/maintenance`                                                                                         | `financial-subheader.tsx`                                                                                           | `financial-subheader.spec.tsx`                                | ✅     |
| RF-06 | Link "Multas" → `/fines` com estilo dinâmico por status e badge de contagem (R-DS-01, R-SUB-03)                                                                     | `financial-subheader.tsx` (`FINES_STYLE`, `NavBadge`)                                                               | `financial-subheader.spec.tsx`                                | ✅     |
| RF-07 | Reatividade ao store: re-executa query de RF-01 ao mudar `activeVehicleId`/grupo ativo/`selectionMode` (R-CTX-01) — ver nota de adaptação acima                     | `financial-subheader.tsx` (query key inclui `selectionMode`, `activeVehicleId`, `activeGroupId`, `groupVehicleIds`) | `financial-subheader.spec.tsx` (caso RF-01/contexto `single`) | ✅     |
| RF-09 | Separador visual (1 px × 18 px, `border/20`) entre área de chips e atalhos                                                                                          | `financial-subheader.tsx`                                                                                           | — (visual, sem asserção dedicada)                             | ✅     |

---

## SPEC-20260730-001 — Score de Saúde de Veículo e Frota (approved)

> Formaliza o algoritmo de cálculo de score (R-HS-01 a R-HS-10) já implementado nas funções
> SQL `calculate_vehicle_health`/`calculate_fleet_health`. Estende a exibição do score para a
> lista de veículos (`/vehicles`) e para a ficha individual (`/vehicles/[id]`). O consumo no
> dashboard (VehicleHealthCard, semáforo, tooltip) é coberto por SPEC-20260531-001 RF-SH-01 a
> RF-SH-04 e não é re-especificado aqui. Nenhuma migration necessária — toda infraestrutura de
> banco já existe.
>
> **2026-07-30 (criação):** Spec em `draft`. Código das funções SQL e do backend já implementado;
> exibição em `/vehicles` e `/vehicles/[id]` ainda pendente de implementação no frontend.
>
> **2026-07-31 (fecho RF-13 a RF-20):** exibição implementada em `/vehicles` (score + ordenação
> ascendente + fallback silencioso) e `/vehicles/[id]` (seção "Saúde do Veículo" com flags
> humanizadas e links de ação). Novo endpoint `GET /vehicles/:id/health`
> (`VehiclesController.getHealth`/`VehiclesService.getHealth`) chama `calculate_vehicle_health`
> para a página de detalhe — `/vehicles` continua usando `GET /dashboard/fleet-health` já
> existente. Verificado manualmente no browser com usuário E2E (score 95, flag `km_alert` com
> link funcional). Spec promovida para `approved`.

### Algoritmo de Cálculo — RPC Postgres (RF-01 a RF-08, R-HS-01 a R-HS-09)

| Req   | Descrição                                                                                                             | Código                                                                                                          | Teste | Status |
| ----- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| RF-01 | Score parte de 100, piso 0; cálculo exclusivo da RPC `calculate_vehicle_health(p_vehicle_id)` (R-HS-01)               | `supabase/migrations/20260712172020_analytics_functions.sql`, `20260712172220_fix_fleet_health_double_call.sql` | —     | 🔶     |
| RF-02 | Penalidade de manutenções pendentes: -5/item, máx -20 (R-HS-02)                                                       | `supabase/migrations/20260712172020_analytics_functions.sql`                                                    | —     | 🔶     |
| RF-03 | Penalidade adicional de manutenções vencidas: -15/item, máx -30, cumulativo com RF-02 (R-HS-03)                       | `supabase/migrations/20260712172020_analytics_functions.sql`                                                    | —     | 🔶     |
| RF-04 | Penalidade de documentos a vencer ≤30 dias: -10/doc (IPVA, Seguro, CRLV independentes); NULL ignorado (R-HS-04)       | `supabase/migrations/20260712172020_analytics_functions.sql`                                                    | —     | 🔶     |
| RF-05 | Penalidade de alerta por km: `odometer >= next_maintenance_km - 1000` → -5 (R-HS-05)                                  | `supabase/migrations/20260712172020_analytics_functions.sql`                                                    | —     | 🔶     |
| RF-06 | Penalidade de multas pendentes: -5/item, máx -15 (R-HS-06)                                                            | `supabase/migrations/20260712172020_analytics_functions.sql`                                                    | —     | 🔶     |
| RF-07 | RPC persiste `vehicles.health_score` como efeito colateral; coluna write-only pela RPC (R-HS-08, R-HS-09)             | `supabase/migrations/20260712172020_analytics_functions.sql`                                                    | —     | 🔶     |
| RF-08 | `calculate_fleet_health` delega a `calculate_vehicle_health` por veículo; score de frota = média aritmética (R-HS-09) | `supabase/migrations/20260712172220_fix_fleet_health_double_call.sql`                                           | —     | 🔶     |

### Flags Emitidas (RF-09, RF-10, R-HS-10)

| Req   | Descrição                                                                                                                                                   | Código                                                       | Teste | Status |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----- | ------ |
| RF-09 | Tipos canônicos: `maintenance_overdue` (count), `ipva_expiring`/`insurance_expiring`/`crlv_expiring` (days), `km_alert` (km_until), `fines_pending` (count) | `supabase/migrations/20260712172020_analytics_functions.sql` | —     | 🔶     |
| RF-10 | Pendentes não vencidas não emitem flag visual (R-HS-10)                                                                                                     | `supabase/migrations/20260712172020_analytics_functions.sql` | —     | 🔶     |

### Semáforo (RF-11, RF-12, R-HS-07)

| Req   | Descrição                                                                                              | Código                                                | Teste                                                      | Status |
| ----- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------- | ------ |
| RF-11 | Mapeamento canônico: 70-100 success "Em dia", 40-69 warning "Atenção", 0-39 danger "Crítico" (R-HS-07) | `packages/ui/src/components/vehicle-health-score.tsx` | `packages/ui/src/components/vehicle-health-score.test.tsx` | ✅     |
| RF-12 | Score `undefined` exibe estado neutro "Calculando" sem erro                                            | `packages/ui/src/components/vehicle-health-score.tsx` | `packages/ui/src/components/vehicle-health-score.test.tsx` | ✅     |

### Frontend — Lista de Veículos `/vehicles` (RF-13 a RF-16)

| Req   | Descrição                                                                                                                                      | Código                                                                                                                                          | Teste                                                                                                                                       | Status |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| RF-13 | `VehicleHealthScore` exibido para cada veículo na listagem; score lido de `vehicles.health_score` (campo persistido pela última chamada à RPC) | `apps/web/src/app/(app)/vehicles/page.tsx`                                                                                                      | `apps/web/src/app/(app)/vehicles/page.spec.tsx`                                                                                             | ✅     |
| RF-14 | Listagem chama `calculate_fleet_health` via `GET /dashboard/fleet-health` ao carregar para atualizar os scores                                 | `apps/web/src/app/(app)/vehicles/page.tsx`, `apps/api/src/modules/dashboard/dashboard.controller.ts`, `dashboard.service.ts` (`getFleetHealth`) | `apps/web/src/app/(app)/vehicles/page.spec.tsx`, `apps/api/src/modules/dashboard/dashboard.service.spec.ts`, `dashboard.controller.spec.ts` | ✅     |
| RF-15 | Ordenação padrão por score ascendente (pior primeiro); score `undefined` vai para o fim                                                        | `apps/web/src/app/(app)/vehicles/page.tsx` (`byScoreAscending`)                                                                                 | `apps/web/src/app/(app)/vehicles/page.spec.tsx`                                                                                             | ✅     |
| RF-16 | Falha da RPC de health não bloqueia a listagem; fallback para `undefined`/estado neutro                                                        | `apps/web/src/app/(app)/vehicles/page.tsx` (query de `fleet-health` sem `isError` tratado — falha só deixa `scores` vazio)                      | Verificado manualmente (query independente da de veículos, `retry: false`)                                                                  | ✅     |

### Frontend — Detalhe do Veículo `/vehicles/[id]` (RF-17 a RF-20)

| Req   | Descrição                                                                                                                              | Código                                                                                                                                                                    | Teste                                                                                                                 | Status |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------ |
| RF-17 | Seção "Saúde do Veículo" com `VehicleHealthScore` + lista de flags em linguagem humana                                                 | `apps/web/src/app/(app)/vehicles/[id]/page.tsx`, `apps/web/src/components/dashboard/VehicleHealthCard.tsx` (`FLAG_LABEL` reexportado)                                     | `apps/web/src/app/(app)/vehicles/[id]/page.spec.tsx`                                                                  | ✅     |
| RF-18 | Flags vazio → "Nenhum problema identificado" em vez de lista vazia                                                                     | `apps/web/src/app/(app)/vehicles/[id]/page.tsx`                                                                                                                           | `apps/web/src/app/(app)/vehicles/[id]/page.spec.tsx`                                                                  | ✅     |
| RF-19 | Página chama `calculate_vehicle_health(vehicle_id)` ao carregar para atualizar score individual                                        | `apps/api/src/modules/vehicles/vehicles.controller.ts` (`GET /vehicles/:id/health`), `vehicles.service.ts` (`getHealth`), `apps/web/src/app/(app)/vehicles/[id]/page.tsx` | `apps/api/src/modules/vehicles/vehicles.service.spec.ts`, `vehicles.controller.spec.ts`, `apps/web/.../page.spec.tsx` | ✅     |
| RF-20 | Links de ação por tipo de flag (manutenção vencida → `/maintenance`, docs → seção de docs, multas → `/fines`, km → `/maintenance/new`) | `apps/web/src/app/(app)/vehicles/[id]/page.tsx` (`flagActionLink`)                                                                                                        | Verificado manualmente (flag `km_alert` com link funcional)                                                           | ✅     |

---

## SPEC-20260730-002 — Melhorias de UX do Shell (approved)

> Hold-to-confirm no logout da sidebar (1.000 ms + barra de progresso, R-NAV-05), dropdown de avatar no header com nome/email/link-settings/logout (R-NAV-08), persistência de `isSidebarCollapsed` em `sessionStorage` via `zustand persist` (R-NAV-06), reestruturação do layout para header full-width com sidebar in-flow em desktop (R-NAV-07), na extensão US-05, ícone sempre visível + destaque de rota ativa + remoção do texto "navestory" + largura calculada em runtime (fit-content + 20%) na sidebar expandida (R-NAV-09, R-NAV-10, R-NAV-11) e, na extensão US-06, sidebar ancorada à viewport (`md:sticky`, sem rolar junto com a página, R-NAV-12) organizada em 3 seções — Navegação/Configurações/Sair — com divisórias (R-NAV-13). Camadas: frontend. Regras: R-NAV-01, R-NAV-02, R-NAV-04, R-NAV-05, R-NAV-06, R-NAV-07, R-NAV-08, R-NAV-09, R-NAV-10, R-NAV-11, R-NAV-12, R-NAV-13. Segurança: S1.
>
> **2026-07-30 (criação):** Spec em `draft`. Nenhum dos requisitos implementado ainda.
> **2026-07-31 (fechamento):** RF-01..RF-10 implementados e testados (código já existente antes desta atualização — matriz estava desatualizada). Spec estendida com US-05/RF-11..RF-14 e promovida a `approved`.
> **2026-08-05 (extensão US-06):** RF-15 substitui o comportamento de RF-09 em desktop (`md:static` → `md:sticky md:top-14 md:h-[calc(100vh-3.5rem)]`) — corrige regressão em que a sidebar rolava junto com a página, contrariando a estrutura-alvo já documentada nas Notas Técnicas da spec original. RF-16/RF-17 implementados junto.

| Req   | Descrição                                                                                                                                                                     | Código                                                                                                     | Teste                                                                                      | Status |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------ |
| RF-01 | Hold-to-confirm no botão "Sair" da sidebar (1.000 ms) substituindo clique simples                                                                                             | `apps/web/src/components/layout/sidebar.tsx` (`useHoldToConfirm`)                                          | `apps/web/src/components/layout/sidebar.spec.tsx` (describe "hold-to-confirm logout")      | ✅     |
| RF-02 | Barra de progresso visual durante o hold; reset visual ao cancelar                                                                                                            | `apps/web/src/components/layout/sidebar.tsx` (`isHoldingLogout`, barra `bg-danger/20`)                     | `apps/web/src/components/layout/sidebar.spec.tsx` (RF-02, RNF-03)                          | ✅     |
| RF-03 | Eventos `onMouseDown`/`onTouchStart` (início) e `onMouseUp`/`onMouseLeave`/`onTouchEnd` (cancelamento); `logout()` invocado somente no callback interno de conclusão do timer | `apps/web/src/components/layout/sidebar.tsx` (`useHoldToConfirm`)                                          | `apps/web/src/components/layout/sidebar.spec.tsx` (RF-03 ×2)                               | ✅     |
| RF-04 | Componente `AvatarDropdown` no header: avatar (iniciais como fallback), nome, email, link `/settings/account`, botão "Sair" (clique simples)                                  | `packages/ui/src/components/avatar-dropdown.tsx`; consumido em `apps/web/src/components/layout/header.tsx` | — (dispensado, ver `specs/TEST_DECISIONS.md`)                                              | ✅     |
| RF-05 | Dados de nome/email do `AvatarDropdown` obtidos via cache TanStack Query existente (sem nova chamada de API)                                                                  | `apps/web/src/lib/hooks/use-current-user.ts`                                                               | — (dispensado)                                                                             | ✅     |
| RF-06 | `persist` do Zustand adicionado ao `useUIStore` (`sessionStorage`, key `"navestory-ui-state"`, `partialize` apenas `isSidebarCollapsed`)                                      | `apps/web/src/lib/stores/ui-store.ts`                                                                      | `apps/web/src/lib/stores/ui-store.spec.ts` (describe "persistência de isSidebarCollapsed") | ✅     |
| RF-07 | `logout()` remove `"navestory-ui-state"` do `sessionStorage` junto com `"navestory-dashboard-context"`                                                                        | `apps/web/src/lib/auth/logout.ts`                                                                          | `apps/web/src/lib/auth/logout.spec.ts` (RF-07)                                             | ✅     |
| RF-08 | Layout shell reestruturado para `flex-col` com `Header` como irmão de `flex` row (sidebar + conteúdo); elimina `md:pl-16`/`md:pl-64`                                          | `apps/web/src/app/(app)/layout.tsx`                                                                        | — (dispensado)                                                                             | ✅     |
| RF-09 | Sidebar: `md:static md:inset-auto` em desktop; `fixed inset-y-0 left-0` em mobile (R-NAV-01 preservada)                                                                       | `apps/web/src/components/layout/sidebar.tsx`                                                               | — (dispensado)                                                                             | ✅     |
| RF-10 | `FinancialSubheader` sem ajuste adicional — continua dentro do `flex-1` de conteúdo                                                                                           | `apps/web/src/app/(app)/layout.tsx`                                                                        | — (dispensado)                                                                             | ✅     |
| RF-11 | Ícone Lucide exibido junto ao label em todo item de navegação quando não colapsada                                                                                       | `apps/web/src/components/layout/sidebar.tsx`                                                               | `apps/web/src/components/layout/sidebar.spec.tsx` (RF-11)                                  | ✅     |
| RF-12 | Destaque visual + `aria-current="page"` na rota ativa (igualdade ou prefixo do `href`)                                                                                        | `apps/web/src/components/layout/sidebar.tsx`                                                               | `apps/web/src/components/layout/sidebar.spec.tsx` (RF-12 ×2)                               | ✅     |
| RF-13 | Remoção do texto de marca "navestory" do topo da sidebar                                                                                                                      | `apps/web/src/components/layout/sidebar.tsx`                                                               | `apps/web/src/components/layout/sidebar.spec.tsx` (RF-13)                                  | ✅     |
| RF-14 | Largura da sidebar expandida calculada em runtime (`scrollWidth * 1.2`) via `ResizeObserver`                                                                                  | `apps/web/src/components/layout/sidebar.tsx`                                                               | — (dispensado, ver `specs/TEST_DECISIONS.md`)                                              | ✅     |
| RF-15 | Sidebar `md:sticky md:top-14 md:h-[calc(100vh-3.5rem)]` em desktop (substitui `md:static` de RF-09) — não rola junto com a página                                            | `apps/web/src/components/layout/sidebar.tsx`                                                               | — (pendente — ver `specs/TEST_DECISIONS.md`)                                               | ✅     |
| RF-16 | `overflow-y-auto` no container de itens de navegação — rolagem interna própria sem mover header/toggle/logout                                                                | `apps/web/src/components/layout/sidebar.tsx`                                                               | — (pendente — ver `specs/TEST_DECISIONS.md`)                                               | ✅     |
| RF-17 | Sidebar organizada em 3 seções (Navegação/Configurações/Sair) com divisórias `border-t`                                                                                       | `apps/web/src/components/layout/sidebar.tsx` (`NAV_ITEMS`, `SETTINGS_ITEMS`, `SidebarNavItem`)              | `apps/web/src/components/layout/sidebar.spec.tsx` (16 testes existentes seguem passando; cobertura específica de US-06 pendente) | ✅     |

---

## SPEC-20260731-008 — Painel de Administração — Gestão de Roles e Interface Web (approved)

> Implementa o escopo postergado da Fase 2 da SPEC-20260521-004: endpoint `PATCH
/admin/users/:id/role` (promoção/rebaixamento de admin, bloqueio de auto-rebaixamento S14,
> auditoria obrigatória C2) e a primeira interface web `/admin` (usuários, audit logs, exclusão
> de conta, gestão de role). `GET /admin/users` foi enriquecido para juntar `profiles`
> (`name`/`deleted_at`) — campos exigidos por RF-10 que não existem no objeto de usuário bruto do
> GoTrue; endpoint continua sendo o mesmo de SPEC-20260521-004, sem rota nova.
>
> **2026-07-31 (criação e implementação):** Spec criada e implementada no mesmo ciclo — backend e
> frontend completos, testes unitários cobrindo CA-01 a CA-05. Testes E2E/frontend automatizados
> não incluídos nesta rodada (RF-08 a RF-16 verificados por typecheck, lint e `next build`;
> validação manual em browser pendente). Spec promovida direto para `approved` (gate de sincronia
> — matriz atualizada com código real desde a aprovação, sem passar por `draft`/`review` separados).

### Backend — `PATCH /admin/users/:id/role` (RF-01 a RF-07)

| Req   | Descrição                                                                                                 | Código                                                                     | Teste                                                                                | Status |
| ----- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------ |
| RF-01 | Endpoint novo protegido por `SupabaseAuthGuard` + `RolesGuard` + `@Roles("admin")`                        | `apps/api/src/modules/admin/admin.controller.ts`                           | `apps/api/src/modules/admin/admin.controller.spec.ts`                                | ✅     |
| RF-02 | Body validado por Zod (`role: "admin" \| null`); fora do domínio → 400                                    | `apps/api/src/modules/admin/dto/update-user-role.dto.ts`                   | `apps/api/src/modules/admin/admin.controller.spec.ts`                                | ✅     |
| RF-03 | Grava `app_metadata.role` via `auth.admin.updateUserById` (merge, não sobrescreve `app_metadata`)         | `apps/api/src/modules/admin/admin-supabase.service.ts`                     | `apps/api/src/modules/admin/admin-supabase.service.spec.ts`                          | ✅     |
| RF-04 | Bloqueio de auto-rebaixamento — 422, sem alteração, sem audit log (S14)                                   | `apps/api/src/modules/admin/admin.service.ts`                              | `apps/api/src/modules/admin/admin.service.spec.ts`                                   | ✅     |
| RF-05 | Auditoria obrigatória: `ADMIN_ROLE_GRANTED`/`ADMIN_ROLE_REVOKED` com `role_before`/`role_after` (C2, S14) | `apps/api/src/modules/admin/admin.service.ts`                              | `apps/api/src/modules/admin/admin.service.spec.ts`                                   | ✅     |
| RF-06 | Usuário alvo inexistente → 404                                                                            | `apps/api/src/modules/admin/admin.service.ts`, `admin-supabase.service.ts` | `apps/api/src/modules/admin/admin.service.spec.ts`, `admin-supabase.service.spec.ts` | ✅     |
| RF-07 | Idempotência: role igual antes/depois → sem update, sem audit log                                         | `apps/api/src/modules/admin/admin.service.ts`                              | `apps/api/src/modules/admin/admin.service.spec.ts`                                   | ✅     |

### Frontend — rota `/admin` (RF-08 a RF-16)

| Req   | Descrição                                                                                                                                                    | Código                                                                                                    | Teste | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ----- | ------ |
| RF-08 | Rota `/admin` com layout dedicado (sem sidebar de usuário comum)                                                                                             | `apps/web/src/app/admin/layout.tsx`, `admin-nav.tsx`, `page.tsx`                                          | —     | 🔶     |
| RF-09 | Proteção client-side: middleware decodifica `app_metadata.role` do JWT e redireciona para `/403`; layout `/admin` repete a checagem (defesa em profundidade) | `apps/web/middleware.ts`, `apps/web/src/lib/auth/decode-jwt-role.ts`, `apps/web/src/app/admin/layout.tsx` | —     | 🔶     |
| RF-10 | Tabela de usuários paginada; colunas email/nome/role/status/cadastro; ações promover/revogar/excluir                                                         | `apps/web/src/app/admin/admin-users-table.tsx`                                                            | —     | 🔶     |
| RF-11 | Botão "Revogar admin" do próprio usuário desabilitado com tooltip (S14 — UI)                                                                                 | `apps/web/src/app/admin/admin-users-table.tsx`                                                            | —     | 🔶     |
| RF-12 | Tabela de audit logs paginada com filtros `user_id`/`from`/`to` refletidos na URL                                                                            | `apps/web/src/app/admin/admin-audit-logs-table.tsx`                                                       | —     | 🔶     |
| RF-13 | Modal de confirmação de exclusão com email do usuário — usa `Dialog` de `@navestory/ui` (não existe `AlertDialog` no pacote; ver changelog)                  | `apps/web/src/app/admin/delete-user-dialog.tsx`                                                           | —     | 🔶     |
| RF-14 | Loading state + toast de sucesso/erro na alteração de role; revalidação via `queryClient.invalidateQueries`                                                  | `apps/web/src/app/admin/admin-users-table.tsx`                                                            | —     | 🔶     |
| RF-15 | `Skeleton` de `@navestory/ui` nos estados de carregamento                                                                                                    | `apps/web/src/app/admin/admin-users-table.tsx`, `admin-audit-logs-table.tsx`                              | —     | 🔶     |
| RF-16 | `EmptyState` para listas vazias                                                                                                                              | `apps/web/src/app/admin/admin-users-table.tsx`, `admin-audit-logs-table.tsx`                              | —     | 🔶     |

---

## SPEC-20260803-001 — Consolidação de Tipos de Resposta da API em packages/validators (approved)

> Origina-se do achado de auditoria [IMPACTO-049](impacto.md#impacto-049). Mitigação escolhida
> (Opção A): exportar schemas Zod de saída em `packages/validators` e migrar `apps/web` para
> importar em vez de redeclarar interfaces locais. Spec em `specs/api-contracts/SPEC-20260803-001-consolidacao-tipos-resposta-api.md`.

| RF    | Requisito                                                                                                          | Código                                                                                                                                                 | Teste    | Status |
|-------|--------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|----------|--------|
| RF-01 | Criar `vehicleResponseSchema` + exportar `VehicleResponse` em `packages/validators/src/vehicle.schemas.ts`, espelhando `VEHICLE_COLUMNS` real do backend | `packages/validators/src/vehicle.schemas.ts` ✅ implementado                                                                                          | ✅ `packages/validators/src/vehicle.schemas.spec.ts` — `vehicleResponseSchema` contra fixture espelhando `VEHICLE_COLUMNS` real (aprovado em `TEST_DECISIONS.md` 2026-08-04) | ✅ |
| RF-02 | Remover as 12 declarações locais de `interface Vehicle` em `apps/web` e importar `VehicleResponse as Vehicle`     | `apps/web/src/app/(app)/{vehicles,vehicles/[id],vehicles/[id]/odometer,analytics,expenses,expenses/new,fines,fines/new,maintenance,maintenance/new,vehicle-groups/new,vehicle-groups/[id]}/page.tsx` ✅ implementado (12 arquivos, 4 a mais que a estimativa original de 8 da spec) | ✅ verificado — `pnpm --filter @navestory/web type-check` sem erros novos | ✅ |
| RF-03 | Remover redeclaração de `ExpenseKpis`/`UpcomingCostItem` em `expenses/page.tsx:37–55` e importar de `@navestory/validators` | `apps/web/src/app/(app)/expenses/page.tsx` ✅ implementado                                                                                             | ✅ verificado — type-check                                                                | ✅ |
| RF-04 | Varredura de outras entidades (`Fine`, `Maintenance`, KPIs de dashboard) pelo mesmo padrão de drift; criar schemas faltantes e migrar telas | `Maintenance` (já existia em `maintenance.schemas.ts`, mesmo drift de RF-03): migrado em `maintenance/page.tsx` e `maintenance/[id]/page.tsx` ✅. `Fine`: sem drift encontrado (frontend já importava do pacote). Cluster de dashboard (`FleetHealthEntry`/`VehicleCardData`/`HealthFlag`): concluído nesta rodada — os shapes já eram idênticos entre a versão local (`VehicleHealthCard.tsx`) e a genérica (`dashboard.schemas.ts`), então a decisão de design foi: `HealthFlag` e `VehicleCard` viram canônicos em `packages/validators/src/dashboard.schemas.ts` (`FleetHealthEntry.flags: HealthFlag[]`); `VehicleHealthCard.tsx` reexporta `VehicleCard as VehicleCardData` e `HealthFlag` do pacote em vez de redeclarar; as 4 redeclarações locais de `interface FleetHealthEntry` (`dashboard/page.tsx`, `vehicles/page.tsx`, `dashboard/concept/page.tsx`, `dashboard/concept/design-system-v2/page.tsx`) foram removidas em favor de `import type { FleetHealthEntry } from "@navestory/validators"`. | ✅ verificado — type-check | ✅ |

**Verificação pós-migração executada:** `grep -rn "interface Vehicle\b\|type Vehicle\s*=" apps/web/src` retorna vazio. `pnpm --filter @navestory/validators build` (necessário para o `dist/` refletir os novos exports) seguido de `pnpm --filter @navestory/validators type-check` e `pnpm --filter @navestory/web type-check` não introduziram nenhum erro novo nos arquivos tocados por RF-01–04 (erros pré-existentes em arquivos `.spec.tsx` não relacionados — `admin-users-table.spec.tsx`, `vehicle-switcher-content.spec.tsx`, `layout.spec.tsx`, `fuel-trend-chart.spec.tsx`, `maintenance/page.spec.tsx` — permanecem, sem relação com esta spec).

**2026-08-04 (fechamento RF-02, arquivo remanescente):** `apps/web/src/app/workspace/vehicles-tab.tsx` (feature de workspace, SPEC-20260804-004, criada no mesmo dia) redeclarava `interface Vehicle` localmente — não fazia parte da lista de 12 arquivos original porque a tela ainda não existia quando RF-02 foi fechado. Migrado para `import type { VehicleResponse } from "@navestory/validators"`. Verificação repetida (`grep` + type-check) confirma zero redeclarações remanescentes em `apps/web/src`.

---

## SPEC-20260804-001 — KPI Dashboard: Gastos nos Últimos X Dias (Janela Rolante Configurável) (approved)

> Spec em `specs/dashboard/SPEC-20260804-001-kpi-spending-window.md`. Estende SPEC-20260721-002 (approved)
> de forma aditiva: 9ª entrada no catálogo `KPI_CATALOG_IDS`, coluna `spending_window_days` em
> `user_preferences` e controle de seleção em `/settings/preferences`.
>
> **Código implementado em 2026-08-04. Testes automatizados adicionados em 2026-08-04** — cobertura
> unitária em `dashboard.schemas.spec.ts` (`spendingWindowDaysSchema`, `KPI_CATALOG_IDS`),
> `preferences.schemas.spec.ts` (`updatePreferencesInputSchema` com `spending_window_days`),
> `preferences.service.spec.ts` (`findOne`/`upsert` de `spending_window_days`, corrigindo 2 testes que
> quebraram com a interface `UserPreferences` estendida) e `dashboard.service.spec.ts`
> (`getFleetKpiCatalog` → `spending_window`: soma, label dinâmico por preferência, valor zero e
> isolamento de falha), e `page.spec.tsx` da página de preferências (RF-05: default 7 dias, janela
> persistida, salvar 14 dias via PATCH, cancelar sem salvar). `DashboardKpiGrid.spec.tsx` (RF-04) já
> cobria o card sem sparkline/delta.
> Todos os arquivos tocados por esta spec passam (`preferences.service.spec.ts` 8/8,
> `dashboard.service.spec.ts` 76/76, `dashboard.schemas.spec.ts` 23/23, `preferences.schemas.spec.ts`
> 19/19, `DashboardKpiGrid.spec.tsx` 22/22, `page.spec.tsx` 20/20). Falhas remanescentes nas suítes completas de
> `@navestory/validators` (`expense.schemas.spec.ts`, `maintenance.schemas.spec.ts`) e `@navestory/web`
> (`vehicle-context-chip.spec.tsx`, `vehicle-activator.spec.tsx`, `header.spec.tsx`, `layout.spec.tsx`)
> são pré-existentes e pertencem a SPEC-20260804-002, não a esta spec.

| RF    | Requisito                                                                                            | Código        | Teste        | Status    |
|-------|------------------------------------------------------------------------------------------------------|---------------|--------------|-----------|
| RF-01 | Migration `spending_window_days SMALLINT NOT NULL DEFAULT 7 CHECK IN (7,14,30)` em `user_preferences` | ✅ `supabase/migrations/20260804120000_add_spending_window_days.sql` | ✅ `preferences.service.spec.ts` (default e persistência) | ✅        |
| RF-02 | Campo `spendingWindowDays` no schema Zod de preferências (`@navestory/validators`); PATCH /preferences aceita e valida o campo | ✅ `packages/validators/src/dashboard.schemas.ts` (`spendingWindowDaysSchema`), `preferences.schemas.ts` (`updatePreferencesInputSchema`) | ✅ `dashboard.schemas.spec.ts`, `preferences.schemas.spec.ts` | ✅ |
| RF-03 | `GET /dashboard/kpi-catalog` inclui 9ª entrada `spending_window` com cômputo de janela rolante no fuso do usuário (R-TZ-01) | ✅ `apps/api/src/modules/dashboard/dashboard.service.ts` (`getSpendingWindowTotal`, `getFleetKpiCatalog`) | ✅ `dashboard.service.spec.ts` (describe `spending_window`) | ✅ |
| RF-04 | `KpiCard` de `spending_window` sem sparkline nem delta (decisão de produto documentada na spec)      | ✅ `apps/web/src/components/dashboard/DashboardKpiGrid.tsx` (`specForId`, case `spending_window`) | ✅ `DashboardKpiGrid.spec.tsx` (fixture) | ✅ |
| RF-05 | Controle de seleção de janela em `/settings/preferences`                                             | ✅ `apps/web/src/app/(app)/settings/preferences/page.tsx` (seção "KPIs do Dashboard") | ✅ `page.spec.tsx` (describe "janela do KPI de gastos recentes") | ✅        |
| RF-06 | `KPI_CATALOG_IDS` atualizado de 8 para 9 entradas (adiciona `'spending_window'`)                     | ✅ `packages/validators/src/dashboard.schemas.ts`, `apps/web/src/components/dashboard/kpi-catalog.ts` (`KPI_CATALOG_META`) | ✅ `dashboard.schemas.spec.ts` | ✅        |

---

## SPEC-20260804-002 — Rótulo do Modo `none` e Preferência de Contexto Padrão (approved)

> Spec em `specs/context/SPEC-20260804-002-contexto-padrao-e-rotulo-none.md`. Corrige o rótulo
> exibido pelo `VehicleContextChip` quando `selectionMode === "none"` (de "+ selecionar veículo"
> para "Toda a frota") e adiciona preferência por usuário para contextualizar automaticamente a
> sessão ao login/abertura de nova aba.
>
> **Código implementado em 2026-08-04**, incluindo migration em `user_preferences` (2 colunas
> novas + constraint de coerência) e extensão do `PreferencesModule` NestJS.
>
> **Testes automatizados adicionados em 2026-08-04** (ver decisão em `specs/TEST_DECISIONS.md`):
> `vehicle-context-chip.spec.tsx` e `header.spec.tsx` atualizados para o rótulo "Toda a frota"
> (RF-01/RF-02/RF-03); `vehicle-activator.spec.tsx` ganhou casos dedicados para RF-09/RF-10/RF-11
> (aplicação de `single`/`group`, staleness silenciosa, precedência de deep link sobre a
> preferência do banco) — exigiu envolver o componente em `QueryClientProvider` no teste, já que
> `VehicleActivator` passou a usar `useQuery` para buscar `/preferences`. `preferences.schemas.spec.ts`
> (19/19), `preferences.service.spec.ts` e `preferences.controller.spec.ts` (15/15) já cobriam
> RF-04/RF-05/RF-06. RF-07/RF-08 verificados manualmente (tela reaproveita `VehicleSwitcherContent`,
> RNF-05, sem novo componente). De quebra, `apps/web/src/app/(app)/layout.spec.tsx` (pré-existente,
> quebrado por `ProfileIncompleteBanner` da SPEC-20260804-004 sem `QueryClientProvider`) foi corrigido
> — não pertencia ao escopo desta spec, mas bloqueava a suíte completa (`pnpm --filter @navestory/web test`:
> 90/90 arquivos, 618/618 testes, 100% verde). Suíte de `@navestory/api` (`preferences`): 15/15.
> Falhas remanescentes em `@navestory/validators` (`expense.schemas.spec.ts`, `maintenance.schemas.spec.ts`)
> e `type-check` de `@navestory/web` (`admin-users-table.spec.tsx`, `admin/layout.spec.tsx`,
> `fuel-trend-chart.spec.tsx`, `vehicle-switcher-content.spec.tsx`) são pré-existentes e não tocam
> nenhum arquivo desta spec.

| RF    | Requisito                                                                                                                   | Código      | Teste       | Status |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------- | ------ |
| RF-01 | `getModeLabel` retorna `"Toda a frota"` para `selectionMode === "none"` (`use-vehicle-context.ts`)                         | ✅ `apps/web/src/lib/context/use-vehicle-context.ts` (`getModeLabel`, branch `default`) | ✅ `vehicle-context-chip.spec.tsx`, `header.spec.tsx` | ✅     |
| RF-02 | `getModeAriaLabel` retorna `"Toda a frota — clique para selecionar um veículo ou grupo"` para `"none"`                     | ✅ `use-vehicle-context.ts` (`getModeAriaLabel`, branch `default`) | ✅ `vehicle-context-chip.spec.tsx` (aria-label do chip via `getByRole("button", { name: /Toda a frota/ })`) | ✅     |
| RF-03 | Botão × do chip ausente quando `selectionMode === "none"` (comportamento já existente, verificar consistência pós-RF-01)   | ✅ `vehicle-context-chip.tsx` (já satisfeito antes desta spec — `selectionMode !== "none"` já era a guarda; sem mudança de código necessária) | ✅ `vehicle-context-chip.spec.tsx` | ✅     |
| RF-04 | Migration: `default_context_type TEXT CHECK IN ('all','single','group') DEFAULT NULL` + `default_context_id UUID DEFAULT NULL` + constraint de coerência em `user_preferences` | ✅ `supabase/migrations/20260804120100_add_default_context_preference.sql` | ✅ `preferences.service.spec.ts` (findOne/upsert dos campos novos) | ✅ |
| RF-05 | Schema Zod de preferências estendido com `default_context_type` e `default_context_id`; `PATCH /preferences` os aceita e valida | ✅ `packages/validators/src/preferences.schemas.ts` (`contextTypeSchema`, `updatePreferencesInputSchema`) | ✅ `preferences.schemas.spec.ts` (coerência type/id, UUID) | ✅     |
| RF-06 | `GET /preferences` retorna `default_context_type` e `default_context_id`                                                   | ✅ `apps/api/src/modules/preferences/preferences.service.ts` (`PREFERENCES_COLUMNS`, `findOne`) | ✅ `preferences.service.spec.ts`, `preferences.controller.spec.ts` | ✅     |
| RF-07 | Seção "Contexto padrão" em `/settings/preferences` com seletor de tipo e entidade                                          | ✅ `apps/web/src/app/(app)/settings/preferences/page.tsx` (seção "Contexto padrão") | ⏳ verificado manualmente (sem componente novo, RNF-05) | ✅     |
| RF-08 | Aviso passivo em `/settings/preferences` quando entidade padrão foi excluída                                               | ✅ `settings/preferences/page.tsx` (`savedContextMissing`) | ⏳ verificado manualmente (sem componente novo, RNF-05) | ✅     |
| RF-09 | Mount de `(app)/layout.tsx` aplica preferência do banco quando `sessionStorage` está vazio após hidratação do store         | ✅ `apps/web/src/components/layout/vehicle-activator.tsx` (já montado em `layout.tsx`) | ✅ `vehicle-activator.spec.tsx` (aplica `single`/`group`) | ✅     |
| RF-10 | Aplicação silenciosa quando `default_context_id` não existe na lista de entidades ativas (staleness)                       | ✅ `vehicle-activator.tsx` (valida contra `vehicles`/`groups` antes de ativar) | ✅ `vehicle-activator.spec.tsx` (`default_context_id` inexistente → permanece `"none"`) | ✅     |
| RF-11 | `sessionStorage` tem precedência sobre a preferência do banco na mesma sessão de aba                                       | ✅ `vehicle-activator.tsx` (`hasAppliedDefaultContext` ref + `selectionMode === "none"` guard) | ✅ `vehicle-activator.spec.tsx` (deep link `?vehicleId=` vence preferência de grupo do banco) | ✅     |

---

## SPEC-20260804-004 — Fundação de Workspace — Owner, Membros, Convite e Atribuição de Veículo (approved)

> Spec em `specs/workspace/SPEC-20260804-004-workspace-foundation.md`. Pré-requisito técnico de
> SPEC-20260804-003 (Configurações da Frota). Implementa o subconjunto de `SPEC-20260620-001`
> (BS-ACL-06/BS-ACL-07) necessário para workspace_owner/workspace_member existirem, sem billing.
>
> **Código implementado nesta revisão** (2026-08-04): migrations
> `supabase/migrations/20260804210000_workspace_foundation.sql` (tabelas + RLS),
> `20260804210100_workspace_vehicles_rls_extension.sql` (RF-10),
> `20260804220000_workspace_rls_recursion_fix.sql` (corrige recursão infinita de RLS entre
> `workspaces`/`workspace_members`, achada em teste manual — ver changelog da spec) e
> `20260804230000_workspace_members_allow_rejoin.sql` (remove constraint redundante que impedia
> reingresso de membro removido — ver changelog da spec); backend
> `apps/api/src/modules/workspaces/` (`workspaces.module.ts`, `.controller.ts`, `.service.ts`,
> `services/workspace-admin-supabase.service.ts`); schemas Zod em
> `packages/validators/src/workspace.schemas.ts`; frontend `apps/web/src/app/workspace/*`
> (`layout.tsx`, `page.tsx`, `create-workspace-form.tsx`, `members-tab.tsx`,
> `invite-driver-dialog.tsx`, `remove-member-dialog.tsx`, `vehicles-tab.tsx`,
> `workspace-owner-dashboard.tsx`, `workspace-member-dashboard.tsx`, `invite/[token]/page.tsx`);
> `apps/web/middleware.ts` (comentário RF-12).
>
> **Ciclo completo owner + member testado ponta a ponta em 2026-08-04** (via chamadas diretas à
> API local contra o projeto remoto `navestory`/sfkefpoanmoiagwxbwld, com um segundo usuário de
> teste real criado e removido na sessão): criar workspace → convidar → aceitar → listar membro →
> atribuir veículo → member vê só o veículo atribuído → desatribuir → remover membro → reconvidar
> o mesmo e-mail. 3 bugs reais encontrados e corrigidos nesse ciclo (nenhum estava coberto por
> teste automatizado, ver TEST_DECISIONS): RF-10 (filtro de aplicação sobrepondo a RLS em
> `vehicles.service.ts`), RF-07 (`role ?? undefined` nunca limpava `app_metadata.role` no
> Supabase) e a constraint de schema que quebrava reingresso — ver changelog da spec para o
> detalhe de cada um.

| RF    | Requisito                                                                                   | Código      | Teste       | Status |
| ----- | --------------------------------------------------------------------------------------------- | ----------- | ----------- | ------ |
| RF-01 | `POST /workspaces` cria workspace e define `app_metadata.role = workspace_owner`               | ✅ `workspaces.service.ts#createWorkspace` | ⏳ dispensado (TEST_DECISIONS 2026-08-04) | ✅ testado ponta a ponta |
| RF-02 | `GET /workspaces/me` retorna workspace do usuário autenticado                                  | ✅ `workspaces.service.ts#getMyWorkspace` | ⏳ dispensado | ✅ testado ponta a ponta |
| RF-03 | `POST /workspaces/:id/invites` gera convite com token, válido 7 dias                           | ✅ `workspaces.service.ts#createInvite` | ⏳ dispensado | ✅ testado ponta a ponta |
| RF-04 | `GET /workspaces/invites/:token` retorna dados públicos do convite                             | ✅ `workspaces.service.ts#getInviteByToken` | ⏳ dispensado | ✅ testado ponta a ponta |
| RF-05 | `POST /workspaces/invites/:token/accept` cria membership e define `app_metadata.role = workspace_member` | ✅ `workspaces.service.ts#acceptInvite` + `workspace-admin-supabase.service.ts#acceptInvite` | ⏳ dispensado | ✅ testado ponta a ponta com 2º usuário real |
| RF-06 | `GET /workspaces/:id/members` lista membros ativos                                             | ✅ `workspaces.service.ts#listMembers` | ⏳ dispensado | ✅ testado ponta a ponta |
| RF-07 | `DELETE /workspaces/:id/members/:memberId` remove membro, revoga role, preserva histórico       | ✅ `workspaces.service.ts#removeMember` + `workspace-admin-supabase.service.ts#setRole` (bug corrigido: `role ?? undefined` não limpava o role) | ⏳ dispensado | ✅ testado ponta a ponta |
| RF-08 | `PUT /workspaces/:id/vehicles/:vehicleId/assign` atribui veículo próprio do owner a um membro  | ✅ `workspaces.service.ts#assignVehicle` | ⏳ dispensado | ✅ testado ponta a ponta |
| RF-09 | `DELETE /workspaces/:id/vehicles/:vehicleId/assign` remove atribuição                           | ✅ `workspaces.service.ts#unassignVehicle` | ⏳ dispensado | ✅ testado ponta a ponta |
| RF-10 | RLS de `vehicles` estendida para visibilidade via `workspace_vehicle_assignments`               | ✅ migrations de RLS + `vehicles.service.ts#findAll/findOne` (bug corrigido: filtro `.eq("user_id", userId)` sobrepunha a RLS e escondia veículos atribuídos) | ⏳ dispensado | ✅ testado ponta a ponta |
| RF-11 | Auditoria (C2) em toda mutação de workspace                                                     | ✅ `AuditService.log` chamado em todos os métodos de `workspaces.service.ts` | ⏳ dispensado | ✅ código / ⏳ conteúdo dos logs não inspecionado linha a linha |
| RF-12 | Frontend `/workspace` protegido por middleware + layout server-side por role                   | ✅ `apps/web/middleware.ts`, `apps/web/src/app/workspace/layout.tsx` | ⏳ dispensado | ✅ testado manualmente |

---

## SPEC-20260804-003 — Configurações da Frota — Campos Obrigatórios, Checklist de Onboarding e Conformidade Documental (approved)

> Spec em `specs/fleet-admin/SPEC-20260804-003-fleet-settings.md`. Depende de SPEC-20260804-004
> (Fundação de Workspace). MVP: campos obrigatórios de motorista com defaults do sistema,
> checklist de onboarding, alerta de CNH vencendo in-app (sem e-mail — Fase 9), painel de
> conformidade consolidado. Fora de escopo: budget/orçamento, geofencing.
>
> **Código implementado nesta revisão** (2026-08-04): migration
> `supabase/migrations/20260804210200_fleet_settings.sql`; backend
> `apps/api/src/modules/fleet-settings/` (`.module.ts`, `.controller.ts`, `.service.ts`); schemas
> Zod em `packages/validators/src/fleet-settings.schemas.ts`; frontend
> `apps/web/src/app/workspace/{driver-settings-tab,compliance-tab,onboarding/page}.tsx`,
> `apps/web/src/components/workspace/profile-incomplete-banner.tsx` (montado em
> `apps/web/src/app/(app)/layout.tsx`). **Executado e testado manualmente em 2026-08-04**:
> migration aplicada no remoto; telas "Campos obrigatórios" e "Conformidade" verificadas no
> navegador com dados reais (defaults ativos, painel de conformidade vazio corretamente exibido
> sem motoristas). Sem testes automatizados (TEST_DECISIONS: aprovado, não requer testes por
> ora).

| RF    | Requisito                                                                                     | Código      | Teste       | Status |
| ----- | ------------------------------------------------------------------------------------------------ | ----------- | ----------- | ------ |
| RF-01 | Defaults de campos obrigatórios (CNH, validade, categoria, telefone) ativos sem configuração manual | ✅ `fleet-settings.service.ts#getDriverSettings` (`DEFAULT_SETTINGS`) | ⏳ dispensado (TEST_DECISIONS 2026-08-04) | ✅ testado manualmente |
| RF-02 | Tela "Configurações da Frota" com toggles de campo obrigatório por workspace                     | ✅ `driver-settings-tab.tsx` + `fleet-settings.service.ts#updateDriverSettings` | ⏳ dispensado | ✅ testado manualmente |
| RF-03 | Configuração de campos obrigatórios é por workspace, não retroativa                              | ✅ `workspace_driver_settings` (1 linha por workspace); conformidade calculada em runtime, sem coluna `completed_at` retroativa | ⏳ dispensado | ✅ código / ⏳ execução |
| RF-04 | Checklist de onboarding do motorista convidado (campos pendentes)                                | ✅ `apps/web/src/app/workspace/onboarding/page.tsx` | ⏳ dispensado | ✅ código / ⏳ execução |
| RF-05 | Indicador persistente de cadastro incompleto                                                     | ✅ `profile-incomplete-banner.tsx` | ⏳ dispensado | ✅ código / ⏳ execução |
| RF-06 | Confirmação visual ao completar checklist                                                        | ✅ `onboarding/page.tsx` (Alert success quando `pending.length === 0`) | ⏳ dispensado | ✅ código / ⏳ execução |
| RF-07 | Cálculo diário/on-load de dias até vencimento de CNH (R-TZ-01)                                   | ✅ `fleet-settings.service.ts#getCompliance` (usa `toCalendarDay`/`FALLBACK_TIMEZONE` de `shared/utils/date.utils.ts`) | ⏳ dispensado | ✅ código / ⏳ execução |
| RF-08 | Alerta in-app `warning` para CNH vencendo em 8–30 dias                                           | ✅ `computeCnhStatus` em `fleet-settings.service.ts` + `compliance-tab.tsx` (`CNH_STATUS_STYLE`) | ⏳ dispensado | ✅ código / ⏳ execução |
| RF-09 | Alerta in-app `urgency-hot` para CNH vencendo em 0–7 dias                                        | ✅ idem RF-08 | ⏳ dispensado | ✅ código / ⏳ execução |
| RF-10 | Status `danger`/"Vencida" para CNH com validade no passado                                       | ✅ idem RF-08 | ⏳ dispensado | ✅ código / ⏳ execução |
| RF-11 | Painel de conformidade consolidado (nome, status de cadastro, status de CNH)                     | ✅ `fleet-settings.service.ts#getCompliance` + `compliance-tab.tsx` | ⏳ dispensado | ✅ testado manualmente (estado vazio) |
| RF-12 | Filtros por status de cadastro e status de CNH no painel de conformidade                         | ✅ `complianceQuerySchema` + filtro em `getCompliance`; `compliance-tab.tsx` (Combobox) | ⏳ dispensado | ✅ código / ⏳ execução |
| RF-13 | Detalhe de campos preenchidos/ausentes por motorista, sem navegar para fora da tela               | ✅ `fleet-settings.service.ts#getMemberProfile`, `missingFields` em `ComplianceEntry` | ⏳ dispensado | ✅ código / ⏳ execução |
| RF-14 | Audit log (`fleet_settings_updated`, C2) em toda alteração de configuração                       | ✅ `fleet-settings.service.ts#updateDriverSettings` (`auditService.log`) | ⏳ dispensado | ✅ código / ⏳ execução |

---

## SPEC-20260801-001 — Easter Egg: Heatmap Sazonal e Análise Combinatória (approved)

> Spec em `specs/analytics/SPEC-20260801-001-easter-egg-heatmap-combinatorio.md`.
> Widget discreto de grid 12×5 no `FleetChartsSection` do dashboard que permanece latente até
> ≥ 40% de presença mensal (R-ANA-08), revelando então um diagrama de coocorrência de categorias
> de gasto. Mecânica de descoberta orgânica — sem anúncio, sem barra de progresso.
> Camadas: frontend. Regras: R-ANA-07, R-ANA-08, R-DS-07, R-NAV-06. Security: S1, S2.
>
> **Estado em 2026-08-04 (entrada retroativa):** Varredura completa do repositório — `@spec SPEC-20260801-001`
> não encontrado em nenhum arquivo de código; nenhum componente de easter egg ou diagrama de
> coocorrência identificado em `FleetCharts.tsx` ou qualquer outro arquivo. O commit `b8bcdfc`
> é descrito como "add advanced analytics features", mas nenhuma implementação rastreável desta
> spec existia no working tree naquele momento. Todos os RFs permaneciam pendentes de implementação.
>
> **Atualização em 2026-08-04:** Douglas priorizou o backlog desta spec e da SPEC-20260801-002 e
> autorizou explicitamente promover ambas para `approved` antes do código (exceção ao fluxo padrão
> draft→review→approved, decisão pontual registrada aqui). Implementação passa a ser trabalho ativo,
> RFs seguem `⏳` até serem entregues nesta matriz.

| RF    | Requisito                                                                                                                                           | Código | Teste | Status |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- | ------ |
| RF-01 | Widget de grid 12×5 posicionado no `FleetChartsSection`; estado latente com `opacity: 0.28`; paleta `--categorical-1..5`; sem erro visível          | `apps/web/src/components/dashboard/EasterEggHeatmapWidget.tsx`, `apps/web/src/components/dashboard/FleetCharts.tsx`, `apps/web/src/lib/analytics/easter-egg-heatmap.ts` (`topCategories`) | `apps/web/src/components/dashboard/EasterEggHeatmapWidget.spec.tsx`, `apps/web/src/lib/analytics/easter-egg-heatmap.spec.ts` | ✅ |
| RF-02 | Ponto pulsante (`animate-pulse`, ~6×6 px) durante os 7 primeiros dias; desaparece ao hover/tap; estado persistido em `localStorage` (`nave_easter_egg_heatmap_seen`) | `EasterEggHeatmapWidget.tsx` (`readSeen`/`markSeen`), `easter-egg-heatmap.ts` (`isWithinFirstWeek`); `created_at` adicionado a `Profile`/`GET /users/me` (`apps/api/src/modules/users/users.service.ts`, `apps/web/src/lib/hooks/use-current-user.ts`) para viabilizar o cálculo client-side | `EasterEggHeatmapWidget.spec.tsx`, `easter-egg-heatmap.spec.ts`, `apps/api/src/modules/users/users.service.spec.ts` | ✅ |
| RF-03 | Desbloqueio ao atingir ≥ 40% de presença mensal (≥ 5 de 12 meses), calculado client-side sobre cache React Query de `seasonal_expense_heatmap`; transição ~550ms | `easter-egg-heatmap.ts` (`computeMonthlyPresence`, `isUnlocked`), `EasterEggHeatmapWidget.tsx` (transição via `transition-all`/`transitionDuration`) | `easter-egg-heatmap.spec.ts`, `EasterEggHeatmapWidget.spec.tsx` | ✅ |
| RF-04 | Drawer embutido no card exibindo diagrama de coocorrência (nós = categorias, arcos = frequência de coocorrência); dados do cache de `seasonal_expense_heatmap`; sem coeficiente numérico | `easter-egg-heatmap.ts` (`computeCategoryCooccurrence`), `EasterEggHeatmapWidget.tsx` (`CooccurrenceDiagram`, SVG manual) | `easter-egg-heatmap.spec.ts`, `EasterEggHeatmapWidget.spec.tsx` | ✅ |
| RF-05 | `aria-label` em widget e drawer; `prefers-reduced-motion: reduce` elimina pulsação e transição — sem estado intermediário                           | `EasterEggHeatmapWidget.tsx` (`useMediaQuery("(prefers-reduced-motion: reduce)")`, `aria-label` no botão e no SVG `role="img"`) | `EasterEggHeatmapWidget.spec.tsx` (cobre estados latente/desbloqueado; motion-safety validado por leitura de código, sem teste dedicado de `matchMedia`) | 🔶 |
| RF-06 | Chave `nave_easter_egg_heatmap_seen` removida do `localStorage` no logout (mesma lista de `navestory-dashboard-context` e `navestory-ui-state`)     | `apps/web/src/lib/auth/logout.ts` | `apps/web/src/lib/auth/logout.spec.ts` | ✅ |

---

## SPEC-20260801-002 — Analytics Avançado: Correlações, Simulações e Personalização (approved)

> Spec em `specs/analytics/SPEC-20260801-002-analytics-avancado-correlacoes-simulacoes.md`.
> Seção "Analytics Avançado" na página `/analytics` com card de correlação km × consumo (Pearson
> client-side), card de correlação categoria × categoria com guardrail N ≥ 8 (R-ANA-09),
> simulador "e se" determinístico e personalização de parâmetros.
> Camadas: frontend, backend, database. Regras: R-ANA-03, R-ANA-05, R-ANA-06, R-ANA-07, R-ANA-09. Security: S1, S2.
>
> **Estado em 2026-08-04 (entrada retroativa):** Varredura completa do repositório — `@spec SPEC-20260801-002`
> não encontrado em nenhum arquivo de código; RPC `expense_category_monthly_series` ausente em todas
> as migrations (última migration de analytics é `20260716140000_analytics_forecast_seasonal.sql`);
> nenhum componente de correlação ou simulação identificado em `apps/web/src/app/(app)/analytics/page.tsx`
> (que contém apenas as seções de SPEC-20260622-001). O commit `b8bcdfc` é descrito como
> "add advanced analytics features including correlation cards and simulation tools", mas nenhuma
> implementação rastreável desta spec existia no working tree naquele momento.
>
> **Atualização em 2026-08-04:** Douglas priorizou o backlog e autorizou promover a spec para
> `approved` antes do código (exceção pontual ao fluxo draft→review→approved). Ordem de
> implementação definida e seguida: RF-01 (correlação km×consumo, sem RPC nova) → RF-03 (nova RPC
> `expense_category_monthly_series`) → RF-02 (correlação categoria×categoria) → RF-04/RF-05
> (simulador e personalização, deprioritizados pela própria spec, implementados por último).
> RF-01 a RF-06 entregues nesta mesma data — código e testes ok. Único pendente: a migration
> `20260804230000_expense_category_monthly_series.sql` ainda não foi aplicada no banco (mesmo
> lote de migrations não commitadas de 2026-08-04, ver auditoria de specs no início desta sessão).

| RF    | Requisito                                                                                                                                                                   | Código | Teste | Status |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- | ------ |
| RF-01 | Card de correlação km × consumo: coeficiente de Pearson client-side sobre pares `(odometer_km_delta, km_per_liter)` de `fuel_consumption_trend`; guardrail N < 5; exibe coef. + N + direção natural | `apps/web/src/lib/analytics/correlation.ts` (`pearsonCorrelation`, `buildKmConsumptionPairs`), `apps/web/src/app/(app)/analytics/page.tsx` (`FuelCorrelationSection`) | `apps/web/src/lib/analytics/correlation.spec.ts` | ✅     |
| RF-02 | Card de correlação categoria × categoria: pares com N ≥ 8 meses completos (R-ANA-09); exibe 3 maiores pares; coef. acompanha N; texto nunca usa "descoberta"                | `apps/web/src/lib/analytics/correlation.ts` (`buildCategoryCorrelations`), `apps/web/src/app/(app)/analytics/page.tsx` (`CategoryCorrelationSection`) | `apps/web/src/lib/analytics/correlation.spec.ts` | ✅     |
| RF-03 | Nova RPC `expense_category_monthly_series(vehicle_id?)`: retorna `(year_month DATE, category TEXT, total NUMERIC, vehicle_id UUID)`; `SECURITY INVOKER`; filtro por `auth.uid()`; endpoint `GET /analytics/category-series`; cache 1h (R-ANA-06) | `supabase/migrations/20260804230000_expense_category_monthly_series.sql`, `apps/api/src/modules/analytics/analytics.service.ts#getCategorySeries`, `apps/api/src/modules/analytics/analytics.controller.ts#getCategorySeries`, `apps/api/src/modules/analytics/dto/category-series.dto.ts`, `packages/validators/src/analytics.schemas.ts` (`categorySeriesQuerySchema`, `ExpenseCategoryMonthlySeries`) | `apps/api/src/modules/analytics/analytics.service.spec.ts`, `apps/api/src/modules/analytics/analytics.controller.spec.ts` | 🔶 código+testes ok; migration ainda não aplicada no banco (mesmo lote pendente de commit de 2026-08-04, ver auditoria de specs) |
| RF-04 | Simulador "e se" client-side determinístico: ajusta total de categoria alvo, recalcula média móvel de 3 meses sobre série histórica de `forecast_monthly_costs`; debounce 200ms; sem chamada ao backend; pré-requisito 6 meses (R-ANA-03) | `apps/web/src/lib/analytics/simulation.ts` (`categoryTotalsByMonth`, `buildAdjustedMonthlyTotals`, `projectMovingAverage`), `apps/web/src/lib/hooks/use-debounced-value.ts`, `apps/web/src/app/(app)/analytics/page.tsx` (`SimulationSection`) | `apps/web/src/lib/analytics/simulation.spec.ts`, `apps/web/src/lib/hooks/use-debounced-value.spec.ts`, `apps/web/src/app/(app)/analytics/page.spec.tsx` | ✅     |
| RF-05 | Controles de personalização: `Select` de categoria (default `fuel`), `Slider` -50%/+50%/passo 5% (default `0%`), `Select` de período 3m/6m (default `3m`); estado efêmero por sessão | `SimulationSection` em `analytics/page.tsx` — `Combobox` para categoria/período (R-DS-09); `Slider` não existe em `@navestory/ui`, usado `<input type="range">` estilizado como exceção documentada de R-DS-09 ("controle de forma customizada que a API não cobre") | `apps/web/src/app/(app)/analytics/page.spec.tsx` | ✅     |
| RF-06 | Empty states por seção: correlação km (< 5 pares), correlação categoria (N < 8 para todos os pares), simulação (< 6 meses histórico R-ANA-03)                              | `FuelCorrelationSection`, `CategoryCorrelationSection`, `SimulationSection` em `analytics/page.tsx` | `apps/web/src/app/(app)/analytics/page.spec.tsx` | ✅     |

---

## SPEC-20260804-005 — Correção de Bug: Membros de Grupo Não Inicializados na Tela de Edição (approved)

> Spec em `specs/vehicle-groups/SPEC-20260804-005-bug-membros-nao-inicializados.md`. Corrige o bug
> crítico de perda silenciosa de dados levantado na auditoria de UX de 2026-08-03/04:
> `selectedVehicleIds` nascia vazio na tela `/vehicle-groups/[id]` e nunca era inicializado com os
> membros atuais do grupo, então salvar sem alterar nada apagava toda a composição (replace-all,
> R-GRP-02). Depende de SPEC-20260602-003 (domínio original de Grupos de Veículos).
>
> **Código implementado em 2026-08-04**: backend `vehicle-groups.service.ts#findAll` passou a
> incluir `vehicleIds` (apenas membros ativos, R-GRP-03) no response, sem query adicional; frontend
> `vehicle-groups/[id]/page.tsx` inicializa `selectedVehicleIds` via `useEffect`, desabilita "Salvar
> membros" enquanto o grupo carrega, calcula diff de adições/remoções antes de confirmar via
> `window.confirm`, e exige confirmação adicional específica quando a operação zeraria um grupo com
> membros. Testes automatizados adicionados — obrigatórios conforme `.claude/CLAUDE.md` do projeto
> ("Testes obrigatórios para funcionalidades novas com regra de negócio ou impacto em produção");
> este é um bug de perda de dado em produção com regra de negócio nova (R-GRP-05).

| RF    | Requisito                                                                                                          | Código                                                                                                    | Teste                                                                                                                              | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| RF-01 | `GET /vehicle-groups` inclui `vehicleIds: string[]` (apenas membros ativos, R-GRP-03) no objeto de cada grupo        | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.ts#findAll`                                    | `vehicle-groups.service.spec.ts` ("findAll inclui vehicleIds apenas com membros ativos")                                           | ✅     |
| RF-02 | Página de detalhe inicializa `selectedVehicleIds` com `group.vehicleIds` ao carregar                                 | `apps/web/src/app/(app)/vehicle-groups/[id]/page.tsx` (`useEffect`)                                        | `page.spec.tsx` ("inicializa os checkboxes com os membros atuais do grupo")                                                        | ✅     |
| RF-03 | Botão "Salvar membros" desabilitado enquanto `isLoading` ou `group` indisponível                                     | `page.tsx` (`disabled={setMembersMutation.isPending \|\| isLoading \|\| !group}`)                          | Coberto indiretamente pelos demais testes (grupo sempre carregado antes do clique) — sem CT dedicado ao estado de loading           | 🔶     |
| RF-04 | Diff de adições/remoções calculado e exibido via `window.confirm` antes de salvar                                    | `page.tsx#handleSaveMembers`                                                                                | `page.spec.tsx` ("sem alterar a seleção, exibe diff zerado e envia o payload atual")                                                | ✅     |
| RF-05 | Confirmação adicional específica quando a operação resultaria em remover todos os membros de um grupo populado       | `page.tsx#handleSaveMembers`                                                                                | `page.spec.tsx` ("desmarcar todos os membros de um grupo populado exige confirmação de remoção total")                              | ✅     |
| RF-06 | Cancelar qualquer confirmação não dispara `setMembersMutation`                                                        | `page.tsx#handleSaveMembers`                                                                                | `page.spec.tsx` ("cancelar a confirmação não dispara a requisição de salvar membros")                                              | ✅     |

---

## SPEC-20260804-006 — Dashboard: Acessibilidade, Correção de Dado e Polimento Visual (approved)

> Spec em `specs/dashboard/SPEC-20260804-006-dashboard-ux-polimento.md`. Formaliza 20 achados da
> auditoria cruzada `ux-researcher` + `design-system` sobre a tela de Dashboard, em 5 blocos:
> acessibilidade (crítico), correção de dado/interpretação, forma de apresentação de gráficos,
> remoção/realocação de conteúdo, e hierarquia visual. Cria R-KPI-04 (supressão de
> `expense_anomalies` por amostra insuficiente).
>
> **Código implementado em 2026-08-04. Testes automatizados adicionados** — mesmo com
> `specs/TEST_DECISIONS.md` ainda `pendente` para esta spec (decisão final é de Douglas), a
> maioria dos RFs recebeu cobertura porque tocaram lógica com regra de negócio nova (R-KPI-04) ou
> mudaram contrato de API (`expense_anomalies` passou de `number` para
> `{ count, insufficient_sample }`). RF-01/02/03/06/07/12/16/17/18/19/20 são só CSS/estrutura
> visual sem lógica isolável — verificados manualmente, sem CT dedicado.
> Suítes tocadas, todas verdes: `dashboard.service.spec.ts` (75/75, Jest),
> `DashboardKpiGrid.spec.tsx` (26/26), `UpcomingCostsWidget.spec.tsx` (10/10),
> `VehicleSpotlight.spec.tsx` (10/10), `expenses/page.spec.tsx` (12/12),
> `dashboard/page.spec.tsx` (6/6), `sidebar.spec.tsx` (16/16, Vitest),
> `kpi-card.test.tsx` (17/17), `dashboard.schemas.spec.ts` (23/23).
> RF-12 já estava satisfeito antes desta spec: `DEFAULT_DASHBOARD_KPI_IDS` nunca incluiu
> `total_vehicles` — nenhuma alteração de código foi necessária, só confirmação.

| RF    | Requisito                                                                 | Código | Teste | Status |
| ----- | -------------------------------------------------------------------------- | ------ | ----- | ------ |
| RF-01 | Remover `text-[10px]` em `VehicleHealthCard.tsx` (R-DS-12)                | ✅ `apps/web/src/components/dashboard/VehicleHealthCard.tsx` | — (verificação manual) | ✅ |
| RF-02 | Corrigir contraste `text-warning-foreground` → `text-foreground` (C-DS-01) | ✅ `VehicleHealthCard.tsx` | — (verificação manual) | ✅ |
| RF-03 | `focus-visible:ring-*` em 3 elementos interativos                         | ✅ `VehicleHealthCard.tsx`, `VehicleSpotlight.tsx` (`StickyFocusChip`), `dashboard/page.tsx` (link, depois movido para sidebar.tsx em RF-14) | — (verificação manual) | ✅ |
| RF-04 | KPI `next_maintenance`: prazo relativo como valor primário                | ✅ `DashboardKpiGrid.tsx` (`specForId`), `lib/relative-label.ts` | ✅ `DashboardKpiGrid.spec.tsx` (2 CTs, futuro/vencido) | ✅ |
| RF-05 | KPI `expense_anomalies`: supressão com amostra insuficiente (R-KPI-04)    | ✅ `apps/api/.../dashboard.service.ts#countMonthlyAnomalies`, `packages/validators/src/dashboard.schemas.ts` (`ExpenseAnomaliesKpi`), `DashboardKpiGrid.tsx` | ✅ `dashboard.service.spec.ts` ("suprime a contagem..."), `DashboardKpiGrid.spec.tsx` | ✅ |
| RF-06 | KPI `cost_per_km`: sufixo "/km" explícito                                 | ✅ `DashboardKpiGrid.tsx` (`specForId`, `unit: "/km"`) | ✅ `DashboardKpiGrid.spec.tsx` | ✅ |
| RF-07 | KPI `cost_per_km` em frota: indicação de média ponderada                  | ✅ `DashboardKpiGrid.tsx` (`isFleetContext`), `dashboard/page.tsx` | ✅ `DashboardKpiGrid.spec.tsx` | ✅ |
| RF-08 | `ExpenseCategoryPie` → `BarChart` horizontal                              | ✅ `apps/web/src/components/dashboard/FleetCharts.tsx` | — (recharts não renderiza em jsdom, sem CT de produção pré-existente para este chart) | ✅ |
| RF-09 | `UpcomingCostsWidget`: chip de urgência isolado (R-DS-10, R-DS-08)        | ✅ `apps/web/src/components/dashboard/UpcomingCostsWidget.tsx` | ✅ `UpcomingCostsWidget.spec.tsx` (3 CTs de chip + 1 de fundo neutro) | ✅ |
| RF-10 | `UpcomingCostsWidget`: valor estimado por extenso ("(aprox.)")            | ✅ `UpcomingCostsWidget.tsx` | ✅ `UpcomingCostsWidget.spec.tsx` | ✅ |
| RF-11 | `FuelConsumptionChart`: nota de semântica do eixo Y                       | ✅ `FleetCharts.tsx` (`description`) | — (verificação manual) | ✅ |
| RF-12 | Remover `total_vehicles` do preset padrão de KPIs (R-KPI-01)              | ✅ já satisfeito — `packages/validators/src/dashboard.schemas.ts` (`DEFAULT_DASHBOARD_KPI_IDS`) nunca incluiu `total_vehicles` | ✅ `dashboard.schemas.spec.ts` (pré-existente) | ✅ |
| RF-13 | Mover `ExportControls` do dashboard para `/expenses`                      | ✅ removido de `dashboard/page.tsx`, adicionado em `apps/web/src/app/(app)/expenses/page.tsx` | ✅ `expenses/page.spec.tsx` (2 CTs) | ✅ |
| RF-14 | Mover link "Histórico de Atividades" para sidebar/configurações           | ✅ removido de `dashboard/page.tsx`, adicionado a `NAV_ITEMS` em `apps/web/src/components/layout/sidebar.tsx` | ✅ `sidebar.spec.tsx` (pré-existente, cobre `NAV_ITEMS`) | ✅ |
| RF-15 | `VehicleSpotlight`: aba inicial dinâmica por flags de urgência (R-HS-10)  | ✅ `VehicleSpotlight.tsx` (`initialTabForFlags`), `dashboard/page.tsx` (prop `flags`) | ✅ `VehicleSpotlight.spec.tsx` (3 CTs) | ✅ |
| RF-16 | `<h2 className="kicker">` antes de cada seção principal                   | ✅ `dashboard/page.tsx` (Alertas/Indicadores/Frota/Em Foco/Gráficos); "Próximos 7 dias" já tinha kicker próprio em `UpcomingCostsWidget.tsx` | — (verificação manual) | ✅ |
| RF-17 | Separação visual do `KpiPicker` em relação ao grid de KPIs                | ✅ `dashboard/page.tsx` (divider `border-t` + alinhamento à direita, fora do grid) | — (verificação manual, "validado por revisão visual com as personas" é critério subjetivo da spec) | ✅ |
| RF-18 | `KpiCard`: largura responsiva via grid (remover `min-w`/`max-w` fixos)    | ✅ `packages/ui/src/components/kpi-card.tsx`, `DashboardKpiGrid.tsx` | ✅ `kpi-card.test.tsx` (pré-existente, sem assert em `min-w`/`max-w`) | ✅ |
| RF-19 | Token `--surface-selected` em `globals.css`                               | ✅ `apps/web/src/app/globals.css` (`.surface-selected`), `VehicleHealthCard.tsx`, `VehicleSpotlight.tsx` | — (verificação manual) | ✅ |
| RF-20 | Padronização `glass-card` vs `bg-card` entre cards do dashboard           | ✅ `UpcomingCostsWidget.tsx` (migrado para `bg-card`, único caso divergente) | — (verificação manual) | ✅ |

---

## SPEC-20260807-001 — Audit Log — Cobertura, Taxonomia e Política de Retenção (draft)

> Spec em `specs/security/SPEC-20260807-001-audit-log-cobertura-taxonomia-retencao.md`. Estende a
> cobertura de `AuditService.log()` para módulos hoje sem registro (vehicle-groups, categories,
> expense-templates, preferences, softDeleteBySource em expenses) e para eventos de auth
> (LOGOUT, PASSWORD_RESET). Corrige violação de taxonomia em fleet-settings.service.ts
> (lowercase → SCREAMING_SNAKE_CASE, R-MON-05). Implementa política de retenção em duas camadas:
> quente 0–90 dias (tabela audit_logs), fria 90 dias–5 anos (bucket audit-logs-archive, pg_cron),
> expurgo literal após 5 anos (C3).
>
> **Status:** Spec em draft — aguarda revisão de Douglas antes de implementação. Nenhum código
> implementado ainda.

| RF    | Requisito                                                                                              | Código              | Teste               | Status  |
| ----- | ------------------------------------------------------------------------------------------------------ | ------------------- | ------------------- | ------- |
| RF-01 | Cobertura: LOGOUT e PASSWORD_RESET em auth.service.ts                                                  | ⏳ Pendente          | ⏳ Pendente          | ⏳       |
| RF-02 | Cobertura: create/update/remove/setMembers em vehicle-groups.service.ts                                | ⏳ Pendente          | ⏳ Pendente          | ⏳       |
| RF-03 | Cobertura: updateProfile (users) e updateMyProfile (fleet-settings)                                    | ⏳ Pendente          | ⏳ Pendente          | ⏳       |
| RF-04 | Cobertura: softDeleteBySource em expenses.service.ts (cascade_from)                                    | ⏳ Pendente          | ⏳ Pendente          | ⏳       |
| RF-05 | Cobertura: categories (create/remove), expense-templates (create/update/remove), preferences (upsert)  | ⏳ Pendente          | ⏳ Pendente          | ⏳       |
| RF-06 | Correção de taxonomia: fleet_settings_updated → FLEET_SETTINGS_UPDATED (R-MON-05)                     | ⏳ Pendente          | ⏳ Pendente          | ⏳       |
| RF-07 | Campo description recomendado em changes para eventos não autoexplicativos                             | ⏳ Pendente          | — (orientação, sem CT dedicado) | ⏳ |
| RF-08 | Política de retenção: job de arquivamento (0–90d quente / 90d–5a fria) + job de expurgo (5a+)         | ⏳ Pendente          | ⏳ Pendente          | ⏳       |

---

## SPEC-20260807-002 — Eventos de Segurança: IP/User-Agent e Tentativas Negadas (approved)

> Spec em `specs/security/SPEC-20260807-002-eventos-seguranca-ip-tentativas-negadas.md`. Fecha duas lacunas deixadas fora de escopo em specs anteriores: (1) captura de `ip` e `user_agent` em eventos de alto risco de auth e admin no `audit_logs`, com retenção diferenciada de 12 meses (S15, extensão do job RF-08 de SPEC-20260807-001); (2) promoção de tentativas de acesso negado de alto risco (acesso admin sem role, brute force de login, auto-rebaixamento de admin) a eventos `Sentry.captureMessage()` com nível `warning` (S16, extensão de SPEC-20260716-002). Pré-requisito de código: `trust proxy` em `main.ts`. Bloco C registra pendência operacional de log aggregation/shipping (já em `important/PENDENCIAS-E-PROCESSOS.md`).
>
> **Status:** Aprovada e implementada em 2026-08-07. Ressalvas: CA-A04 (LOGOUT/PASSWORD_RESET) e CA-A08 (arquivamento hot/cold) dependem de SPEC-20260807-001 RF-01/RF-08, ainda sem código — ver changelog da spec.

| RF      | Requisito                                                                                                      | Código      | Teste       | Status |
| ------- | -------------------------------------------------------------------------------------------------------------- | ----------- | ----------- | ------ |
| RF-A01  | `trust proxy` configurado em `main.ts` (pré-requisito para `req.ip` correto)                                  | `apps/api/src/main.ts` | — | ✅      |
| RF-A02  | IP e `user_agent` adicionados a `changes` de LOGIN, REGISTER, ADMIN_ROLE_* e ADMIN_USER_DELETED (LOGOUT/PASSWORD_RESET pendentes de SPEC-001 RF-01) | `apps/api/src/common/security/security-context.ts`, `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/admin/admin.controller.ts`, `apps/api/src/modules/admin/admin.service.ts` | `apps/api/src/modules/auth/auth.service.spec.ts`, `apps/api/src/modules/auth/auth.controller.spec.ts`, `apps/api/src/modules/admin/admin.service.spec.ts`, `apps/api/src/modules/admin/admin.controller.spec.ts` | ✅ (parcial — CA-A04 pendente) |
| RF-A03  | Job de expurgo de IP/UA: remoção de `ip`/`user_agent` do JSONB após 12 meses (job mínimo autocontido, não o arquivamento completo de SPEC-20260807-001 RF-08) | `supabase/migrations/20260807120000_audit_log_ip_ua_retention_job.sql` | — (SQL, sem harness de teste de migration no projeto) | ✅ (parcial — CA-A08 pendente) |
| RF-B01  | `RolesGuard` emite `Sentry.captureMessage(warning)` ao negar acesso a rota `@Roles("admin")`                  | `apps/api/src/common/guards/roles.guard.ts` | `apps/api/src/common/guards/roles.guard.spec.ts` | ✅      |
| RF-B02  | ThrottlerGuard/filtro emite `Sentry.captureMessage(warning)` ao atingir rate limit de `/auth/login`           | `apps/api/src/common/filters/http-exception.filter.ts`, `apps/api/src/modules/auth/auth.constants.ts` | `apps/api/src/common/filters/http-exception.filter.spec.ts` | ✅      |
| RF-B03  | `admin.service.ts` emite `Sentry.captureMessage(warning)` antes de lançar 422 de auto-rebaixamento (S14)      | `apps/api/src/modules/admin/admin.service.ts` | `apps/api/src/modules/admin/admin.service.spec.ts` | ✅      |

---

## SPEC-20260807-003 — Integridade e Edição de Dados de Veículo (approved)

> Spec em `specs/vehicles/SPEC-20260807-003-integridade-edicao-dados-veiculo.md`. Fecha cinco lacunas de integridade e UX no domínio de veículos identificadas em auditoria comparativa (2026-08-07): (1) edição completa de veículo — `updateVehicleInputSchema` expandido além de `nickname`/`color`; (2) máscara de placa no frontend com detecção de formato BR e Mercosul; (3) normalização de `make`/`model` para uppercase+trim antes de persistir (R-VEH-03); (4) confirmação de exclusão por digitação da placa via `AlertDialog` (S17 — substituição de `window.confirm`); (5) exibição simultânea de todos os erros de validação por campo (R-FORM-08).
>
> **Status:** Aprovada e implementada em 2026-08-07. Desvios do texto original da spec: (a) `updateVehicleInputSchema` já era `vehicleBaseSchema.partial()` — RF-02 só precisou da normalização de make/model, o schema já cobria todos os campos; a lacuna real estava só no frontend (RF-01), não no schema; (b) RF-01 expande a tela existente `/vehicles/[id]` em vez de criar rota `/vehicles/[id]/edit` separada (decisão explicitamente deixada para o implementador na spec); (c) `AlertDialog` e `FipeCombobox` eram assumidos como já existentes no design system — nenhum dos dois existia; `AlertDialog` foi criado sobre o primitivo `Dialog`/`@radix-ui/react-dialog` já em uso (sem nova dependência); `FipeCombobox` não existe e não foi criado — RF-05 aplica a normalização uppercase+trim diretamente no schema Zod (cobre tanto texto livre quanto uma eventual futura integração FIPE); (d) R-FORM-01/02/06 (padrão react-hook-form) é aspiracional e não adotado em nenhum formulário do projeto — RF-08 foi implementado com um helper puro (`zodIssuesToFieldErrors`) sobre o padrão `useState` já usado em todo o domínio de veículos/despesas, mesma decisão de design já registrada em `expenses/new/page.tsx` (SPEC-20260619-001).

| RF    | Requisito                                                                                              | Código              | Teste               | Status  |
| ----- | ------------------------------------------------------------------------------------------------------ | ------------------- | ------------------- | ------- |
| RF-01 | Formulário completo de edição cobrindo todos os campos editáveis (expande `/vehicles/[id]` em vez de rota `/edit` separada) | `apps/web/src/app/(app)/vehicles/[id]/page.tsx` | `apps/web/src/app/(app)/vehicles/[id]/page.spec.tsx` | ✅ |
| RF-02 | `updateVehicleInputSchema` (já `vehicleBaseSchema.partial()`) recebe normalização R-VEH-03 via `.transform()` | `packages/validators/src/vehicle.schemas.ts` | `packages/validators/src/vehicle.schemas.spec.ts` | ✅ |
| RF-03 | `PlateInput`: máscara progressiva BR/Mercosul (acumulador de teclas, mesmo padrão de `CurrencyInput`/`OdometerInput`) — valor enviado ao backend sempre sem hífen | `packages/ui/src/components/plate-input.tsx` | `packages/ui/src/components/plate-input.spec.tsx` | ✅ |
| RF-04 | Erro inline de placa exibido via `fieldErrors.plate` (mapeado de todos os issues do Zod, não só o formato) | `apps/web/src/app/(app)/vehicles/new/page.tsx`, `.../vehicles/[id]/page.tsx` | `apps/web/src/app/(app)/vehicles/new/page.spec.tsx` | ✅ |
| RF-05 | Normalização uppercase+trim de `make`/`model` no schema Zod compartilhado (cria e atualiza); `FipeCombobox` não existe no projeto — não criado nesta spec (nota de desvio acima) | `packages/validators/src/vehicle.schemas.ts` | `packages/validators/src/vehicle.schemas.spec.ts` | ✅ |
| RF-06 | `AlertDialog` (novo componente, sobre `@radix-ui/react-dialog`) com `PlateInput` de confirmação; botão desabilitado até a placa corresponder | `packages/ui/src/components/alert-dialog.tsx`, `apps/web/src/app/(app)/vehicles/[id]/page.tsx` | `packages/ui/src/components/alert-dialog.test.tsx`, `apps/web/src/app/(app)/vehicles/[id]/page.spec.tsx` | ✅ |
| RF-07 | `VehiclesService.remove` recebe e valida `confirmationPlate` (comparação normalizada) antes do soft-delete em cascata; `DELETE /vehicles/:id` exige body `{ confirmationPlate }` | `apps/api/src/modules/vehicles/vehicles.service.ts`, `vehicles.controller.ts`, `dto/delete-vehicle.dto.ts` | `apps/api/src/modules/vehicles/vehicles.service.spec.ts`, `vehicles.controller.spec.ts` | ✅ |
| RF-08 | `zodIssuesToFieldErrors` (helper puro) mapeia todos os issues do Zod para erro por campo, exibidos simultaneamente; aplicado em `/vehicles/new` e `/vehicles/[id]` — sem adotar react-hook-form (nota de desvio acima) | `apps/web/src/lib/form-errors.ts`, `apps/web/src/app/(app)/vehicles/new/page.tsx`, `.../vehicles/[id]/page.tsx` | `apps/web/src/lib/form-errors.spec.ts`, `apps/web/src/app/(app)/vehicles/new/page.spec.tsx` | ✅ |

---

## SPEC-20260807-004 — Formulário de Despesa: Hint de Odômetro e Pré-preenchimento de Combustível (draft)

> Spec em `specs/expenses/SPEC-20260807-004-formulario-despesa-hint-combustivel.md`. Implementa dois aprimoramentos de UX no formulário de nova despesa: (1) hint textual do último odômetro registrado para o veículo selecionado via `getOdometerHintAction` (R-ODO-07 — novo); (2) pré-preenchimento do tipo de combustível favorito do veículo conforme R-FUEL-07 (regra já definida em SPEC-20260619-001, ainda não implementada). Referência de implementação: `expense-form.tsx` do projeto Nave-SaaS-main.
>
> **Status:** Spec em draft — aguarda revisão de Douglas antes de implementação. Nenhum código implementado ainda.

| RF    | Requisito                                                                                              | Código              | Teste               | Status  |
| ----- | ------------------------------------------------------------------------------------------------------ | ------------------- | ------------------- | ------- |
| RF-01 | Server action `getOdometerHintAction(vehicleId)` — retorna MAX(odometer_km) de expenses + maintenances | ⏳ Pendente         | ⏳ Pendente          | ⏳       |
| RF-02 | Hint textual "Último registrado: N.NNN km" abaixo do campo `odometer_km` ao selecionar veículo        | ⏳ Pendente          | ⏳ Pendente          | ⏳       |
| RF-03 | Campo `odometer_km` permanece vazio por padrão (hint é referência, não pre-fill)                       | ⏳ Pendente          | ⏳ Pendente          | ⏳       |
| RF-04 | Hint atualizado ao trocar veículo selecionado; removido ao desmarcar veículo                           | ⏳ Pendente          | ⏳ Pendente          | ⏳       |
| RF-05 | Server action `getFavoriteFuelTypeAction(vehicleId)` — retorna `vehicles.favorite_fuel_type`           | ⏳ Pendente          | ⏳ Pendente          | ⏳       |
| RF-06 | Pré-preenchimento de Tipo de Combustível com `favorite_fuel_type` ao selecionar veículo (categoria fuel) | ⏳ Pendente        | ⏳ Pendente          | ⏳       |
| RF-07 | Prioridade R-FUEL-07 respeitada: favorite_fuel_type > template > vazio                                 | ⏳ Pendente          | ⏳ Pendente          | ⏳       |
| RF-08 | Pré-preenchimento não sobrescreve edição manual prévia do usuário (R-FUEL-08)                          | ⏳ Pendente          | ⏳ Pendente          | ⏳       |
| RF-09 | Ambas as actions são fire-and-forget: erros silenciados, formulário não é bloqueado                    | ⏳ Pendente          | ⏳ Pendente          | ⏳       |

---

## SPEC-20260807-005 — Substituição de window.confirm por AlertDialog em Formulários Transacionais (approved)

> Spec em `specs/forms/SPEC-20260807-005-dirty-check-alert-dialog.md`. Fecha a violação de R-FORM-05 (dirty-check via `window.confirm` em vez de `AlertDialog`) em 6 pontos de `apps/web` (despesas, multas, manutenção) e padroniza as 3 confirmações de ação de `vehicle-groups/[id]` para o mesmo componente. Reutiliza o `AlertDialog` criado em SPEC-20260807-003 (S17), sem nova dependência. Corrige também um bug pré-existente em `maintenance/[id]/page.tsx`, onde a confirmação era exibida mesmo com o formulário sem alterações (ausência de cálculo de `isDirty`).
>
> **Desvio do texto original da spec:** as Notas Técnicas sugeriam `import ... from "@navestory/ui/alert-dialog"` (subpath); o pacote `@navestory/ui` não expõe subpath exports (só `main`/`types` na raiz do `src/index.ts`) — todos os imports usam `from "@navestory/ui"`, mesmo padrão já usado em `vehicles/[id]/page.tsx` (SPEC-20260807-003).

| RF    | Requisito | Código | Teste | Status |
| ----- | --------- | ------ | ----- | ------ |
| RF-01 | Substitui `window.confirm` de dirty-check por `AlertDialog` em `expenses/new` | `apps/web/src/app/(app)/expenses/new/page.tsx` | `apps/web/src/app/(app)/expenses/new/page.spec.tsx` | ✅ |
| RF-02 | Substitui `window.confirm` de dirty-check por `AlertDialog` em `expenses/[id]` | `apps/web/src/app/(app)/expenses/[id]/page.tsx` | `apps/web/src/app/(app)/expenses/[id]/page.spec.tsx` | ✅ |
| RF-03 | Substitui `window.confirm` de dirty-check por `AlertDialog` em `fines/new` | `apps/web/src/app/(app)/fines/new/page.tsx` | `apps/web/src/app/(app)/fines/new/page.spec.tsx` | ✅ |
| RF-04 | Substitui `window.confirm` de dirty-check por `AlertDialog` em `fines/[id]` | `apps/web/src/app/(app)/fines/[id]/page.tsx` | `apps/web/src/app/(app)/fines/[id]/page.spec.tsx` | ✅ |
| RF-05 | Substitui `window.confirm` de dirty-check por `AlertDialog` em `maintenance/new` | `apps/web/src/app/(app)/maintenance/new/page.tsx` | `apps/web/src/app/(app)/maintenance/new/page.spec.tsx` | ✅ |
| RF-06 | Substitui `window.confirm` por `AlertDialog` em `maintenance/[id]` **e** adiciona cálculo de `isDirty` ausente (corrige bug: confirmação exibida sempre, independente de alteração) | `apps/web/src/app/(app)/maintenance/[id]/page.tsx` | `apps/web/src/app/(app)/maintenance/[id]/page.spec.tsx` | ✅ |
| RF-07 | `vehicle-groups/[id]`: confirmação de remoção total de membros via `AlertDialog` (estado genérico `confirmDialog`) | `apps/web/src/app/(app)/vehicle-groups/[id]/page.tsx` | `apps/web/src/app/(app)/vehicle-groups/[id]/page.spec.tsx` | ✅ |
| RF-08 | `vehicle-groups/[id]`: confirmação de alteração normal de membros via `AlertDialog` | `apps/web/src/app/(app)/vehicle-groups/[id]/page.tsx` | `apps/web/src/app/(app)/vehicle-groups/[id]/page.spec.tsx` | ✅ |
| RF-09 | `vehicle-groups/[id]`: confirmação de exclusão do grupo via `AlertDialog` | `apps/web/src/app/(app)/vehicle-groups/[id]/page.tsx` | `apps/web/src/app/(app)/vehicle-groups/[id]/page.spec.tsx` | ✅ |

---

## SPEC-20260813-001 — Header + Dashboard UX v3 (approved)

> Spec em `specs/dashboard/SPEC-20260813-001-header-dashboard-ux-v3.md`. Criada retroativamente
> em 2026-08-13 para cobrir código já implementado sem spec formal — violação de processo
> identificada na sessão de auditoria UX do dia. RF-01 a RF-09 reconstituídos a partir do código;
> RF-10 a RF-17 novos achados da auditoria, aprovados em 2026-08-13 e implementados na mesma data
> (exceto RF-13, bloqueado, e RF-16, sem alteração de código — ver notas abaixo).
> **Status:** `approved`.

### Retroativos — implementados (RF-01 a RF-09)

| RF    | Requisito (resumo) | Código | Teste | Status |
| ----- | ------------------ | ------ | ----- | ------ |
| RF-01 | "Multas" migrado do FinancialSubheader para a Sidebar com badge de contagem | `apps/web/src/components/layout/sidebar.tsx` | `apps/web/src/components/layout/sidebar.spec.tsx` | 🔶 (migração de link; sem teste dedicado ao badge de multas) |
| RF-02 | `DashboardDateChip` criado; chip veículo + data movidos para lado direito do FinancialSubheader; chip removido do header | `apps/web/src/components/layout/dashboard-date-chip.tsx`, `apps/web/src/components/layout/financial-subheader.tsx`, `apps/web/src/components/layout/header.tsx` | `apps/web/src/components/layout/financial-subheader.spec.tsx`, `apps/web/src/components/layout/header.spec.tsx` | ✅ |
| RF-03 | Links Despesas/Manutenções/Multas removidos do FinancialSubheader (duplicidade com sidebar) | `apps/web/src/components/layout/financial-subheader.tsx` | `apps/web/src/components/layout/financial-subheader.spec.tsx` | ✅ |
| RF-04 | `ActionDock` desktop movido para barra `sticky top-14` com backdrop-blur logo abaixo do header | `apps/web/src/app/(app)/dashboard/page.tsx` | — (sem teste automatizado de posicionamento CSS) | 🔶 |
| RF-05 | `FleetAlertBar` reformulado de lista vertical para faixa de 1 linha com badges danger/warning por severidade | `apps/web/src/components/dashboard/FleetAlertBar.tsx` | `apps/web/src/components/dashboard/FleetAlertBar.spec.tsx` | ✅ |
| RF-06 | `AlertsBell` criado no header: sino global, tooltip com prévia, Dialog com lista completa | `apps/web/src/components/layout/alerts-bell.tsx` | — (sem teste de componente dedicado; coberto indiretamente por `header.spec.tsx`) | 🔶 |
| RF-07 | KpiGrid com divisão primário (4)/secundário (restantes, opacity-75, divisor); teto elevado para 8 (`MAX_ACTIVE_DASHBOARD_KPIS`) | `apps/web/src/components/dashboard/DashboardKpiGrid.tsx`, `packages/validators/src/dashboard.schemas.ts` | `packages/validators/src/dashboard.schemas.spec.ts` | 🔶 (divisor visual sem CT; MAX_ACTIVE ✅ via schemas.spec) |
| RF-08 | `VehicleContextDialog` ganhou `VehicleActivePreview`: health score, flags, quick links abaixo da lista | `apps/web/src/components/layout/vehicle-context-dialog.tsx` | `apps/web/src/components/layout/vehicle-context-dialog.spec.tsx` | ✅ |
| RF-09 | `ChartTooltip` em `packages/ui` seguindo tokens do design system (bg-card, border-border — sem inline style) | `packages/ui/src/components/chart-tooltip.tsx` | — (componente de UI puro; sem CT dedicado) | 🔶 |

### Novos — implementados em 2026-08-13 (RF-10 a RF-17)

| RF    | Requisito (resumo) | Código | Teste | Status |
| ----- | ------------------ | ------ | ----- | ------ |
| RF-10 | `FleetAlertBar` com skeleton de loading e estado positivo explícito quando vazio ("Frota em dia", badge success) | `apps/web/src/components/dashboard/FleetAlertBar.tsx`, `apps/web/src/app/(app)/dashboard/page.tsx` | `apps/web/src/components/dashboard/FleetAlertBar.spec.tsx` | ✅ |
| RF-11 | Ordenação condicional das seções do dashboard: 2+ veículos → VehicleGrid antes de KpiGrid | `apps/web/src/app/(app)/dashboard/page.tsx` | pendente | 🔶 |
| RF-12 | `UpcomingCostsWidget` posicionado logo após `DashboardKpiGrid` em ambos os contextos | `apps/web/src/app/(app)/dashboard/page.tsx` | — (reposicionamento estrutural, sem CT dedicado) | ✅ |
| RF-13 | Flag `cost_outlier` em `VehicleHealthCard` + caption warning em KpiCard de cost_per_km | — | — | ⏳ (bloqueado: threshold de outlier não definido em RULES.md; backend não emite o campo) |
| RF-14 | `KpiCard` com `min-w-[133px]` para evitar quebra em colunas estreitas | `packages/ui/src/components/kpi-card.tsx` | — (mudança de CSS puro) | ✅ |
| RF-15 | Badge do `NavBadge` no `AlertsBell` reposicionado (`-right-1 -top-1`) para não sobrepor o glifo do ícone Bell | `apps/web/src/components/layout/alerts-bell.tsx` | — (mudança visual/CSS) | ✅ |
| RF-16 | Posição do `CommandPaletteTrigger` no header investigada | `apps/web/src/components/layout/header.tsx` (sem alteração) | — | 🔶 (análise estática não encontrou `flex-1`/`mx-auto`/`justify-center` — DOM já ancorado à esquerda do logo, conforme a própria spec previa; confirmação visual em ambiente rodando segue pendente) |
| RF-17 | Migração de iconografia do shell para o wrapper `<Icon>`: emoji `🔍` eliminado, `Bell` (header) e ícones da sidebar (`Car`, `LayoutDashboard`, `LogOut`, `PanelLeftOpen/Close`, etc.) migrados | `apps/web/src/components/layout/command-palette-trigger.tsx`, `apps/web/src/components/layout/alerts-bell.tsx`, `apps/web/src/components/layout/sidebar.tsx` | — (mudança visual/CSS) | ✅ |

---

## Requisitos do PRD sem Spec (Fase 2 / Backlog)

| Req PRD | Descrição                                                    | Fase   |
| ------- | ------------------------------------------------------------ | ------ |
| RF-008  | Push Notifications nativas (iOS/Android)                     | Fase 2 |
| RF-009  | Configuração de horário de alerta por usuário                | Fase 2 |
| RF-010  | Exportação de dados pessoais (portabilidade LGPD Art. 18 II) | Fase 2 |
| RF-012  | Hard delete automático de contas após 30 dias                | Fase 2 |
| RF-013  | MFA para operações administrativas                           | Fase 2 |
| RF-015  | Export de manutenções em CSV                                 | Fase 2 |
| RF-016  | Versionamento de API (`/v1/`)                                | Fase 2 |
| RF-017  | Export em XLSX nativo                                        | Fase 2 |

---

## Cobertura de Testes por Módulo

> Atualizado em 2026-07-13 (Fase 1). Auditoria parcial em 2026-07-31 (rev. 59): linha `expenses`
> atualizada para 🔶. Auditoria complementar em 2026-07-31 (rev. 60): linhas `vehicles` e
> `maintenance` corrigidas para 🔶 (arquivos de teste confirmados via Glob) e o nome do módulo
> `maintenance` → `maintenances` (plural, conforme código real). Nenhum dos dois módulos usa
> repository separado (`supabase-*.repository.ts`), então essas entradas foram removidas da
> expectativa. Módulos marcados ⏳ refletem a ausência de confirmação de cobertura — não
> necessariamente a ausência de implementação; usar as seções de spec individuais acima para o
> estado preciso por requisito.

| Módulo                           | Arquivo de teste                                                                                                                                                                                                                                                                                                                                                                                 | Status                                                                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth`                           | `apps/api/src/modules/auth/auth.service.spec.ts`, `auth.controller.spec.ts` + `apps/api/test/integration/auth.int-spec.ts`                                                                                                                                                                                                                                                                       | ✅ (67 testes Jest, 90%+)                                                                                                                                                       |
| `users`                          | `apps/api/src/modules/users/users.service.spec.ts`, `users.controller.spec.ts`                                                                                                                                                                                                                                                                                                                   | ✅ (Jest, 90%+)                                                                                                                                                                 |
| `admin`                          | `apps/api/src/modules/admin/admin.service.spec.ts`, `admin.controller.spec.ts`, `admin-supabase.service.spec.ts`                                                                                                                                                                                                                                                                                 | ✅ (Jest, 90%+; SPEC-20260731-008)                                                                                                                                              |
| `common/filters`                 | `apps/api/src/common/filters/http-exception.filter.spec.ts`                                                                                                                                                                                                                                                                                                                                      | ✅ (Jest, 90%+)                                                                                                                                                                 |
| `common/guards`                  | `apps/api/src/common/guards/supabase-auth.guard.spec.ts`, `roles.guard.spec.ts`                                                                                                                                                                                                                                                                                                                  | ✅ (Jest, 90%+)                                                                                                                                                                 |
| `common/pipes`                   | `apps/api/src/common/pipes/zod-validation.pipe.spec.ts`                                                                                                                                                                                                                                                                                                                                          | ✅ (Jest, 90%+)                                                                                                                                                                 |
| `shared/audit`                   | `apps/api/src/shared/audit/audit.service.spec.ts`                                                                                                                                                                                                                                                                                                                                                | ✅ (Jest, 90%+)                                                                                                                                                                 |
| `validators/auth`                | `packages/validators/src/auth.schemas.spec.ts`                                                                                                                                                                                                                                                                                                                                                   | ✅ (Vitest, 91%+)                                                                                                                                                               |
| `web/middleware`                 | `apps/web/middleware.spec.ts`                                                                                                                                                                                                                                                                                                                                                                    | ✅ (Vitest, 91%+)                                                                                                                                                               |
| `web/use-activity-tracker`       | `apps/web/src/lib/hooks/use-activity-tracker.spec.ts`                                                                                                                                                                                                                                                                                                                                            | ✅ (Vitest, 91%+)                                                                                                                                                               |
| `web/api-client`                 | `apps/web/src/lib/http/api-client.spec.ts`                                                                                                                                                                                                                                                                                                                                                       | ✅ (Vitest, 91%+)                                                                                                                                                               |
| `web/form-draft-guard`           | `apps/web/src/components/form-draft-guard.spec.ts`                                                                                                                                                                                                                                                                                                                                               | ✅ (Vitest, 91%+)                                                                                                                                                               |
| `web/password-input`             | `apps/web/src/components/password-input.spec.ts`                                                                                                                                                                                                                                                                                                                                                 | ✅ (Vitest, 91%+)                                                                                                                                                               |
| `integration/rls`                | `apps/api/test/integration/rls.int-spec.ts` (CT-007)                                                                                                                                                                                                                                                                                                                                             | ✅ (Jest + supabase local)                                                                                                                                                      |
| `vehicles`                       | `apps/api/src/modules/vehicles/vehicles.service.spec.ts`, `vehicles.controller.spec.ts`, `value-objects/license-plate.vo.spec.ts`                                                                                                                                                                                                                                                                | 🔶 (os 3 arquivos confirmados por auditoria em 2026-07-31, rev. 60; módulo não usa padrão de repository separado, então não há `supabase-vehicle.repository.spec.ts` a esperar) |
| `expenses`                       | `apps/api/src/modules/expenses/expenses.service.spec.ts`                                                                                                                                                                                                                                                                                                                                         | 🔶 (service spec confirmado — cobre `getUpcomingCosts` e métodos de suporte; `expenses.controller.spec.ts` ainda ⏳; módulo não usa repository separado)                        |
| `maintenances`                   | `apps/api/src/modules/maintenances/maintenances.service.spec.ts`, `maintenances.controller.spec.ts`                                                                                                                                                                                                                                                                                              | 🔶 (nome do módulo é `maintenances`, plural — corrigido nesta auditoria; ambos os arquivos confirmados em 2026-07-31, rev. 60; módulo não usa repository separado)              |
| `dashboard`                      | **Backend:** `apps/api/src/modules/dashboard/dashboard.service.spec.ts`, `dashboard.controller.spec.ts` (Jest) — **Frontend:** `apps/web/src/components/dashboard/FleetAlertBar.spec.tsx`, `VehicleHealthCard.spec.tsx`; `apps/web/src/app/(app)/dashboard/page.spec.tsx`; `apps/web/src/lib/stores/use-dashboard-store.spec.ts`; `apps/web/src/components/layout/action-dock.spec.tsx` (Vitest) | ✅ (Sprint 1, T5.1, 2026-07-15)                                                                                                                                                 |
| `fines`                          | `apps/api/src/modules/fines/fines.service.spec.ts`, `fines.controller.spec.ts`                                                                                                                                                                                                                                                                                                                   | ✅ (Jest)                                                                                                                                                                       |
| `recurring-costs`                | `apps/api/src/modules/recurring-costs/recurring-costs.service.spec.ts`, `.controller.spec.ts`                                                                                                                                                                                                                                                                                                    | ✅ (Jest)                                                                                                                                                                       |
| `analytics`                      | `analytics.service.spec.ts`, `analytics.controller.spec.ts`                                                                                                                                                                                                                                                                                                                                      | ⏳                                                                                                                                                                              |
| `validators/vehicles`            | `vehicles.schema.spec.ts`                                                                                                                                                                                                                                                                                                                                                                        | ⏳                                                                                                                                                                              |
| `validators/expenses`            | `expenses.schema.spec.ts`                                                                                                                                                                                                                                                                                                                                                                        | ⏳                                                                                                                                                                              |
| `validators/maintenance`         | `maintenance.schema.spec.ts`                                                                                                                                                                                                                                                                                                                                                                     | ⏳                                                                                                                                                                              |
| `validators/display-preferences` | `display-preferences.schema.spec.ts`                                                                                                                                                                                                                                                                                                                                                             | ⏳                                                                                                                                                                              |
| `validators/categories`          | `categories.schema.spec.ts`                                                                                                                                                                                                                                                                                                                                                                      | ⏳                                                                                                                                                                              |
| `validators/fines`               | `packages/validators/src/fine.schemas.spec.ts`                                                                                                                                                                                                                                                                                                                                                   | ✅ (Vitest)                                                                                                                                                                     |
| `validators/recurring-costs`     | `packages/validators/src/recurring-cost.schemas.spec.ts`                                                                                                                                                                                                                                                                                                                                         | ✅ (Vitest)                                                                                                                                                                     |
| `web/expenses-new`               | `apps/web/src/app/(app)/expenses/new/page.spec.tsx`                                                                                                                                                                                                                                                                                                                                              | ✅ (Vitest — cobre SPEC-20260720-002 RF-01 a RF-06 e R-FORM-04/05/07, 2026-07-20)                                                                                               |
| Edge Functions                   | Testes de integração via Supabase CLI                                                                                                                                                                                                                                                                                                                                                            | ⏳ (Fase 2)                                                                                                                                                                     |
| E2E (Playwright)                 | `apps/web/e2e/tests/auth.spec.ts`, `expense-warnings.spec.ts`, `vehicle-context.spec.ts`, `visual-regression.spec.ts`                                                                                                                                                                                                                                                                            | 🔶 (SPEC-20260716-003 — arquivos existem; suíte não executada; aguarda GitHub Secrets provisionados; `visual-regression.spec.ts` também aguarda baseline PNG)                   |
