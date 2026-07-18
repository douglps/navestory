# Matriz de Rastreabilidade — Nave SaaS

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
> - Cobertura de Testes do módulo `dashboard` atualizada de ⏳ para ✅ (backend: `dashboard.service.spec.ts`/
>   `dashboard.controller.spec.ts`; frontend: `FleetAlertBar.spec.tsx`, `VehicleHealthCard.spec.tsx`,
>   `page.spec.tsx`, `use-dashboard-store.spec.ts`, `action-dock.spec.tsx`).
> - Seção de Validators adicionada à entrada de SPEC-20260531-001 (`packages/validators/src/dashboard.schemas.ts`).
> - SPEC-20260715-002 (Suporte a Fuso Horário, `draft`) registrada como placeholder — nenhum
>   código existe ainda; entrada será completada quando a spec avançar para `approved`.
> - IMPACTO-033 e IMPACTO-035 atualizados em `matrices/impacto.md` para refletir T5.1 concluída.
>
> **ATUALIZAÇÃO — 2026-07-16 (rev. 47)**
> SPEC-20260716-001 (Testes E2E com Playwright) criada em `specs/qa/`. Configuração do Playwright
> em `apps/web/e2e/`, fluxos críticos RF-E2E-01 a RF-E2E-07 e integração com CI documentados.
> Nenhum código existe ainda. `specs/TESTS_SPEC.md` atualizado para referenciar a nova spec como
> fonte formal da estratégia E2E. Entrada adicionada nesta matriz.

---

## Legenda de Status

| Símbolo | Significado |
|---------|-------------|
| ✅ | Implementado e com teste cobrindo o comportamento |
| 🔶 | Implementado, mas sem cobertura de teste |
| ⏳ | Não implementado ainda |
| ⏸️ | Adiado — decisão explícita registrada (não é apenas "ainda não chegou a vez"); ver nota da spec/tarefa para o motivo e o gatilho de retomada |
| ❌ | Fora de escopo do MVP |

---

## Como ler

Cada linha mapeia um requisito à sua spec, ao(s) arquivo(s) de código que o implementam
e ao(s) teste(s) que o verificam. Colunas Código e Teste preenchidas com "—" indicam
que o artefato ainda não existe no repositório.

---

## SPEC-20260712-001 — PWA Offline (draft)

> Primeira fase do PWA do Nave: instalação (manifest + ícones + prompt) e modo offline
> somente-leitura via Service Worker (Serwist) — cache de shell, assets e leitura de API.
> Escrita offline (fila de sync), resolução de conflito e push notifications ficam fora de
> escopo (Fase 2). Status: draft — nenhum código ou teste existe; feature não iniciada.

### Manifest e Instalação (R-PWA-04, R-PWA-05)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | Web App Manifest via `app/manifest.ts` (nome, ícones, `display: standalone`, cores da marca Nave) | — | — | ⏳ |
| RF-02 | Ícones 192×192 e 512×512 em formato `any` e `maskable` | — | — | ⏳ |
| RF-03 | Captura de `beforeinstallprompt` + CTA próprio de instalação após 2ª visita (Android/Chrome) | — | — | ⏳ |
| RF-04 | Banner de instrução manual de instalação para Safari iOS (sem `beforeinstallprompt`) | — | — | ⏳ |

### Cache de Shell e Assets (R-PWA-01)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-05 | Precache do shell (HTML de layout, CSS, JS) via Service Worker com `CacheFirst` para assets versionados | — | — | ⏳ |
| RF-06 | Navegação HTML com `NetworkFirst` (timeout 3s) e fallback para cache da rota ou página offline | — | — | ⏳ |
| RF-07 | Página `apps/web/app/offline/page.tsx` como fallback de navegação para rotas nunca visitadas | — | — | ⏳ |

### Cache de Leitura da API (R-PWA-01, R-PWA-06)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-08 | `GET` de rotas de dados via `StaleWhileRevalidate` | — | — | ⏳ |
| RF-09 | Mutações (`POST`/`PUT`/`PATCH`/`DELETE`) nunca interceptadas pelo Service Worker — `NetworkOnly` | — | — | ⏳ |
| RF-10 | TTL máximo de 7 dias no cache de dados de API, alinhado à validade do refresh token (ADR-003) | — | — | ⏳ |

### Bloqueio Explícito de Escrita Offline (R-PWA-02)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-11 | Bloqueio client-side de submissões quando `navigator.onLine === false`, com mensagem explícita | — | — | ⏳ |
| RF-12 | Conteúdo do formulário preservado quando a submissão é bloqueada por falta de conexão | — | — | ⏳ |
| RF-13 | Banner global persistente de status offline em qualquer tela | — | — | ⏳ |

### Atualização do Service Worker (R-PWA-03)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-14 | Toast de nova versão disponível; `skipWaiting()`/`clientsClaim()` somente após ação explícita do usuário | — | — | ⏳ |
| RF-15 | Nova versão carregada automaticamente ao reabrir o app após fechar todas as abas | — | — | ⏳ |

### Limpeza de Cache no Logout (R-PWA-06, S6)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-16 | Limpeza do Cache Storage de dados de usuário (`nave-api-data`) no evento `SIGNED_OUT` do Supabase Auth | — | — | ⏳ |
| RF-17 | Nenhum dado residual do usuário anterior visível após troca de conta no mesmo dispositivo | — | — | ⏳ |

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

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | `odometer_km` obrigatório quando `status === 'completed'` — implementado como checagem imperativa em `MaintenancesService.update()` (não via `superRefine` no schema Zod, já que a validação depende do valor *existente* no banco quando não reenviado no payload; mesma decisão de design de `SPEC-20260603-002`/RNF-04) | `apps/api/src/modules/maintenances/maintenances.service.ts` | `apps/api/src/modules/maintenances/maintenances.service.spec.ts` | 🔶 Implementado com padrão diferente do descrito |
| RF-02 | `MaintenancesService.update()` rejeita HTTP 422 quando `status = completed` sem `odometer_km` válido | `apps/api/src/modules/maintenances/maintenances.service.ts` | `apps/api/src/modules/maintenances/maintenances.service.spec.ts` | ✅ |
| RF-03 | Bug de `createMaintenanceAction` (Server Action) não aplicável — projeto não usa Server Actions para mutação (decisão já registrada em T3.9); `POST /maintenances` mapeia `odometer_km` corretamente desde a criação do endpoint | `apps/api/src/modules/maintenances/maintenances.controller.ts` | `apps/api/src/modules/maintenances/maintenances.controller.spec.ts` | ✅ N/A por decisão de arquitetura |
| RF-04 | Validação de sequência de odômetro em manutenções: padrão response-field (`odometer_warning`/`odometer_previous_max_km`), não exceção (`MaintenanceWarningException` descartada — mesma decisão de T3.2/T3.3 para despesas); `findMaxOdometerByVehicle` ainda sem filtro de ciclo ativo (R-ODO-04 permanece ⏳) | `apps/api/src/modules/maintenances/maintenances.service.ts` | `apps/api/src/modules/maintenances/maintenances.service.spec.ts` | 🔶 Implementado com padrão diferente do descrito |

### Modelo de Dados — `vehicle_odometer_cycles` (R-ODO-05, R-ODO-06)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-05 | Migration `20260712171919_vehicle_odometer_cycles.sql`: tabela com colunas descritas na spec; constraint `cycle_number >= 2` | `supabase/migrations/20260712171919_vehicle_odometer_cycles.sql` | — | 🔶 |
| RF-06 | RLS: SELECT e INSERT filtrados por `auth.uid() = (SELECT user_id FROM vehicles WHERE id = vehicle_id)`; sem policy UPDATE ou DELETE | `supabase/migrations/20260712172047_rls_policies.sql` | — | 🔶 |
| RF-07 | Função SQL `get_active_cycle_start(p_vehicle_id uuid) RETURNS timestamptz` | `supabase/migrations/20260712171919_vehicle_odometer_cycles.sql` | — | 🔶 |

### Backend — `OdometerCyclesModule`

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-08/R-ODO-05 | `POST /vehicles/:vehicleId/odometer-cycles`: valida ownership via `VehiclesService.findOne`, calcula `cycle_number` e `previous_cycle_max` (via `expenses.odometer_km`), persiste, dispara audit fire-and-forget omitindo `reason` (D8) | `apps/api/src/modules/odometer-cycles/odometer-cycles.controller.ts`, `odometer-cycles.service.ts` | `apps/api/src/modules/odometer-cycles/odometer-cycles.service.spec.ts`, `odometer-cycles.controller.spec.ts` | ✅ |
| RF-09/P1 | `GET /vehicles/:vehicleId/odometer-cycles`: retorna ciclos ordenados por `cycle_number ASC`, paginados (padrão 20, máx 100, clamp aplicado) | `apps/api/src/modules/odometer-cycles/odometer-cycles.service.ts` | `apps/api/src/modules/odometer-cycles/odometer-cycles.service.spec.ts` | ✅ |
| RF-10/R-ODO-04 | `OdometerCyclesService.getActiveCycleStart(accessToken, userId, vehicleId)`: chama RPC `get_active_cycle_start`; degrada graciosamente (`null`) em caso de falha (D6) — ainda não consumido por nenhum service, pois `ExpensesService`/`MaintenanceService` não existem | `apps/api/src/modules/odometer-cycles/odometer-cycles.service.ts` | `apps/api/src/modules/odometer-cycles/odometer-cycles.service.spec.ts` | ✅ |
| RF-11/R-SAN-01/R-SAN-02 | `createOdometerCycleInputSchema`: `reason` obrigatório 3–500 chars com `.trim().normalize('NFC')`; `starting_value` não-negativo, default 0 | `packages/validators/src/odometer-cycle.schemas.ts` | `packages/validators/src/odometer-cycle.schemas.spec.ts` | ✅ |

### Extensão de `findMaxOdometerByVehicle` — Filtro por Ciclo Ativo (R-ODO-04)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-12 | `ExpenseRepositoryPort.findMaxOdometerByVehicle` recebe parâmetro opcional `sinceDate?: string`; zero breaking change para callers existentes | — | — | ⏳ Depende do módulo de despesas (Fase 3) |
| RF-13 | `MaintenancesService.findMaxOdometerByVehicle(client, vehicleId, userId, excludeMaintenanceId?)`: análogo ao de expenses, sem parâmetro `sinceDate`/filtro de ciclo ainda (ver RF-14/RF-15) | `apps/api/src/modules/maintenances/maintenances.service.ts` | `apps/api/src/modules/maintenances/maintenances.service.spec.ts` | 🔶 Sem filtro de ciclo |
| RF-14 | `ExpensesService` consulta `OdometerCyclesService.getActiveCycleStart()` antes da verificação de sequência e passa resultado como `sinceDate` | — | — | ⏳ Depende do módulo de despesas (Fase 3) |
| RF-15 | `MaintenancesService` aplica o mesmo padrão de RF-14 para o repositório de manutenções (R-ODO-04) | — | — | ⏳ Gap pré-existente também em `ExpensesService` (RF-14); tratamento unificado em spec futura |

### Mensagem de Confirmação e Atalho para Novo Ciclo (R-ODO-06)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-16 | Warning de odômetro exibe `AlertDialog` com botões "Confirmar retroativo" e "Cancelar" | — | — | ⏳ Depende do `ExpenseForm`/`MaintenanceForm` (Fases 3/4) |
| RF-17 | Quando `odometer_km <= 100` OU queda >= 50%: UI exibe caminho "Iniciar novo ciclo" (R-ODO-06) | — | — | ⏳ Depende do `ExpenseForm`/`MaintenanceForm` (Fases 3/4) |

### Atualização das Funções SQL Analíticas

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-18 | `fuel_consumption_trend` atualizada com filtro de ciclo ativo no WHERE | `supabase/migrations/20260712172020_analytics_functions.sql` | — | 🔶 |
| RF-19 | `calculate_vehicle_tco` atualizada com o mesmo filtro de ciclo ativo | `supabase/migrations/20260712172020_analytics_functions.sql` | — | 🔶 |
| RF-20 | `get_vehicle_cost_per_km` atualizada com o mesmo filtro de ciclo ativo | `supabase/migrations/20260712172020_analytics_functions.sql` | — | 🔶 |
| RF-21 | Ordem de deploy obrigatória: (1) migration + funções SQL; (2) backend OdometerCyclesModule; (3) UI de reset | Respeitada — migration+funções (2026-07-12) precederam `OdometerCyclesModule` (2026-07-13, T2.4) | — | ✅ |

### Interface — Tela de Configurações e Badge

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-22 | Rota `/settings/vehicles/[vehicleId]/odometer-cycles`: tabela de histórico + modal "Reiniciar odômetro" (sem dirty-check `AlertDialog` dedicado — mesma limitação de T2.1, pendente do Design System) | `apps/web/src/app/settings/vehicles/[vehicleId]/odometer-cycles/page.tsx` | `apps/web/src/app/settings/vehicles/[vehicleId]/odometer-cycles/page.spec.tsx` | 🔶 |
| RF-23 | `VehicleContextChip` exibe badge "Ciclo {N}" somente quando `cycle_number >= 2`; Ciclo 1 implícito não exibe badge (R-ODO-06) | — | — | ⏳ Depende do dashboard/Em Foco (Fase 5) |
| RF-24 | `MaintenanceForm`: campo `odometer_km` torna-se visualmente obrigatório quando `status = completed` (R-ODO-03) | `apps/web/src/app/maintenance/[id]/page.tsx` | `apps/web/src/app/maintenance/[id]/page.spec.tsx` | 🔶 Campo exposto via `OdometerInput`; obrigatoriedade visual condicional (asterisco/required dinâmico) fica ⏳ — enforcement real já ocorre no backend (422) |

---

## SPEC-20260620-001 — Business Strategy Stories (draft)

> Define cadastro, elegibilidade, modelo de assinatura (Gratis/Pro/Frota), consolidação de
> dados, controle de acesso por roles, onboarding, retenção, crescimento e compliance LGPD.
> Status: draft. Regras: R-BIZ-01..R-BIZ-14, S1, S2, S4, C1. Nenhum código implementado.

### Cadastro e Elegibilidade (Seção 1)

| Requisito | Descrição | Código | Teste | Status |
|-----------|-----------|--------|-------|--------|
| BS-REG-01..05 | Cadastro self-service com email válido; campo `profile_type`; email único; acesso imediato | — | — | ⏳ |
| BS-BLK-01..05 | Blacklist de emails banidos; rate limit 5/15min (S4); honeypot anti-bot; rejeição de emails descartáveis; verificação 18+ | — | — | ⏳ |
| BS-FLW-01..05 | Formulário único (4 campos); redirect para onboarding; pular onboarding; email de boas-vindas; PWA responsivo | — | — | ⏳ |

### Modelo de Assinatura e Monetização (Seção 2)

| Requisito | Descrição | Código | Teste | Status |
|-----------|-----------|--------|-------|--------|
| BS-PLN-01..06 | Planos Gratis (beta ilimitado, pós-beta 3 veículos/2 meses), Pro Mensal (R$ 29,90), Pro Anual (R$ 199), Frota (R$ 49,90); trial 14 dias | — | — | ⏳ |
| BS-MON-01..08 | Banners de upgrade; checkout integrado (Stripe/MP); downgrade com consolidação; cancelamento self-service; retry de cobrança; grace period proporcional; win-back; countdown banner | — | — | ⏳ |
| BS-VLT-01..06 | Timeline com meses consolidados; CTA de upgrade; garantia de retenção de dados; KPIs com dados gerais; batch job de consolidação; busca em meses consolidados | — | — | ⏳ |

### Controle de Acesso (Seção 3)

| Requisito | Descrição | Código | Teste | Status |
|-----------|-----------|--------|-------|--------|
| BS-ACL-01..07 | Roles: anonymous, user, admin, workspace_owner, workspace_member; CRUD owner-only (RLS); anti-enumeração (404 não 403); admin sem acesso a dados de negócio; workspace member com atribuição por veículo | — | — | ⏳ |
| BS-SEC-01..06 | Lock após 5 tentativas; exclusão LGPD self-service; sessão 30min inatividade; troca de senha invalida sessões; (Fase 2) MFA TOTP; (Fase 2) Login social | — | — | ⏳ |

### Onboarding e Ativação (Seção 4)

| Requisito | Descrição | Código | Teste | Status |
|-----------|-----------|--------|-------|--------|
| BS-ONB-01..06 | Wizard 3 passos; pre-fill via placa FIPE; checklist primeiros passos; nudge 48h; import CSV para frotas; empty state com CTA | — | — | ⏳ |

### Retenção e Engajamento (Seção 5)

| Requisito | Descrição | Código | Teste | Status |
|-----------|-----------|--------|-------|--------|
| BS-RET-01..07 | Lembrete semanal; streak de registro; alerta vencimento 60 dias; resumo mensal por email; insights de anomalia; reengajamento 14d; win-back 60d | — | — | ⏳ |

### Crescimento e Aquisição (Seção 6)

| Requisito | Descrição | Código | Teste | Status |
|-----------|-----------|--------|-------|--------|
| BS-GRW-01..05 | Referral com benefício mútuo; rastreamento de referral; card compartilhável; calculadora de custo/km; blog SEO | — | — | ⏳ |
| BS-EXP-01..04 | Sugestão de upgrade ao exceder limites; upgrade para Frota; onboarding assistido 10+ veículos; (Fase 3) API pública com simulação de custos | — | — | ⏳ |
| BS-INFRA-01..02 | Simulação de custos de infra Supabase; rate limits por plano baseados na simulação | — | — | ⏳ |

### Compliance e Suporte (Seções 7-8)

| Requisito | Descrição | Código | Teste | Status |
|-----------|-----------|--------|-------|--------|
| BS-LGP-01..05 | Export por plano (LGPD portabilidade); exclusão self-service 30 dias; anonimização; audit logs preservados; cookies com consentimento | — | — | ⏳ |
| BS-TRM-01..03 | Aceite de termos no cadastro; re-aceite em atualização; política de privacidade detalhada | — | — | ⏳ |
| BS-SUP-01..05 | FAQ/comunidade (Gratis); email 48h (Pro); chat prioritário 24h (Frota); NPS a cada 30 dias; alerta de feedback negativo | — | — | ⏳ |

### Roadmap de Implementação

| Fase | Stories | Status |
|------|---------|--------|
| MVP (atual) | BS-REG-01..05, BS-BLK-01..02, BS-FLW-01..03, BS-ACL-01..05, BS-SEC-01..04, BS-LGP-02..04 | ⏳ Não iniciado |
| Pós-beta (Fase 2) | BS-PLN-01..06, BS-MON-01..08, BS-VLT-01..06, BS-BLK-03..05, BS-FLW-04, BS-ONB-01..06, BS-TRM-01..03 | ⏳ |
| Crescimento (Fase 3) | BS-RET-01..07, BS-GRW-01..05, BS-EXP-01..03, BS-SUP-01..05, BS-SEC-05..06, BS-INFRA-01..02 | ⏳ |
| Enterprise (Fase 4) | BS-ACL-06..07, BS-EXP-04, BS-PLN-05 (Frota expandido com API) | ⏳ |

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

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | RPC `calculate_vehicle_tco(vehicle_id)`: TCO com breakdown fixo (fuel/maintenance/fines/recurring/other), cost_per_km, cost_per_month, total_km, period_days (R-ANA-04) — substitui a função homônima divergente já existente | `supabase/migrations/20260716120000_analytics_tco_fuel_trend.sql`, `apps/api/src/modules/analytics/analytics.service.ts` | `apps/api/src/modules/analytics/analytics.service.spec.ts` | ✅ |
| RF-02 | RPC `fuel_consumption_trend(vehicle_id, limit)`: km/L, price_per_liter, rolling_avg_kpl (janela 5) (R-ANA-01, R-FUEL-02/03) — substitui a função homônima divergente já existente | `supabase/migrations/20260716120000_analytics_tco_fuel_trend.sql`, `apps/api/src/modules/analytics/analytics.service.ts` | `apps/api/src/modules/analytics/analytics.service.spec.ts` | ✅ |
| RF-03 | RPC `detect_expense_anomalies(threshold)`: Z-Score por (vehicle_id, category) (R-ANA-02) | `supabase/migrations/20260716130000_analytics_anomalies_benchmark.sql`, `apps/api/src/modules/analytics/analytics.service.ts` | `apps/api/src/modules/analytics/analytics.service.spec.ts` | ✅ |
| RF-04 | RPC `fleet_benchmark()`: ranking de veículos por custo/km (R-ANA-05) | `supabase/migrations/20260716130000_analytics_anomalies_benchmark.sql`, `apps/api/src/modules/analytics/analytics.service.ts` | `apps/api/src/modules/analytics/analytics.service.spec.ts` | ✅ |
| RF-05 | RPC `forecast_monthly_costs(vehicle_id?, months_ahead)`: projeção com média móvel 3 meses + banda ±1σ (R-ANA-03) | `supabase/migrations/20260716140000_analytics_forecast_seasonal.sql`, `apps/api/src/modules/analytics/analytics.service.ts` | `apps/api/src/modules/analytics/analytics.service.spec.ts` | ✅ |
| RF-06 | RPC `seasonal_expense_heatmap(vehicle_id?)`: heatmap mês x categoria (R-ANA-07) | `supabase/migrations/20260716140000_analytics_forecast_seasonal.sql`, `apps/api/src/modules/analytics/analytics.service.ts` | `apps/api/src/modules/analytics/analytics.service.spec.ts` | ✅ |
| RF-07 | `GET /analytics/tco/:vehicleId`: cache 1h stale-while-revalidate, 404 se veículo não encontrado/não pertence ao usuário | `apps/api/src/modules/analytics/analytics.controller.ts` | `apps/api/src/modules/analytics/analytics.controller.spec.ts` | ✅ |
| RF-08 | `GET /analytics/fuel-trend/:vehicleId`: query param `limit` (default 20, max 100) | `apps/api/src/modules/analytics/analytics.controller.ts`, `packages/validators/src/analytics.schemas.ts` | `apps/api/src/modules/analytics/analytics.controller.spec.ts` | ✅ |
| RF-09 | `GET /analytics/anomalies`: query params `threshold` (1.5-4.0), `vehicle_id` opcional (filtro aplicado server-side) | `apps/api/src/modules/analytics/analytics.controller.ts`, `apps/api/src/modules/analytics/dto/anomalies.dto.ts`, `packages/validators/src/analytics.schemas.ts` | `apps/api/src/modules/analytics/analytics.controller.spec.ts` | ✅ |
| RF-10 | `GET /analytics/benchmark`: array vazio se < 2 veículos (empty state é responsabilidade do frontend, a RPC sempre retorna os dados) | `apps/api/src/modules/analytics/analytics.controller.ts` | `apps/api/src/modules/analytics/analytics.controller.spec.ts` | ✅ |
| RF-11 | `GET /analytics/forecast`: query params `vehicle_id` opcional, `months` (default 3, max 12) | `apps/api/src/modules/analytics/analytics.controller.ts`, `apps/api/src/modules/analytics/dto/forecast.dto.ts` | `apps/api/src/modules/analytics/analytics.controller.spec.ts` | ✅ |
| RF-12 | `GET /analytics/seasonal`: query param `vehicle_id` opcional | `apps/api/src/modules/analytics/analytics.controller.ts`, `apps/api/src/modules/analytics/dto/seasonal.dto.ts` | `apps/api/src/modules/analytics/analytics.controller.spec.ts` | ✅ |
| RF-14 | Geração de insights em linguagem natural (eficiência, degradação de consumo, multas, fornecedor, projeção) (R-ANA-05); exposta via `GET /analytics/insights` (endpoint não numerado na spec, necessário para RF-13 consumir os insights) | `apps/api/src/modules/analytics/analytics.service.ts`, `apps/api/src/modules/analytics/analytics.controller.ts`, `apps/api/src/modules/analytics/dto/insights.dto.ts` | `apps/api/src/modules/analytics/analytics.service.spec.ts`, `apps/api/src/modules/analytics/analytics.controller.spec.ts` | ✅ |
| RF-16 | `GET /analytics/export`: CSV (TCO breakdown + forecast), throttle 10/5min | `apps/api/src/modules/analytics/analytics.controller.ts`, `apps/api/src/modules/analytics/analytics.service.ts`, `apps/api/src/modules/analytics/dto/export-analytics.dto.ts` | `apps/api/src/modules/analytics/analytics.controller.spec.ts`, `apps/api/src/modules/analytics/analytics.service.spec.ts` | ✅ |

### Frontend — Página `/analytics`

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-13 | Página `/analytics`: KPI cards, TCO (stacked bar + donut), fuel trend (area chart), anomalias (alert cards), benchmark (horizontal bar), forecast (area chart com banda), sazonalidade (heatmap), insights (cards); responsivo mobile/desktop; usa `recharts` (dependência nova, ver spec) | `apps/web/src/app/(app)/analytics/page.tsx` | `apps/web/src/app/(app)/analytics/page.spec.tsx` | ✅ todas as seções (TCO, fuel trend, anomalias, benchmark, forecast, sazonalidade, insights) prontas com seletor de veículo e botão "Exportar" (RF-16) |
| RF-15 | Empty states por seção com CTA (TCO, combustível, anomalias, benchmark, forecast, sazonalidade, insights) | `apps/web/src/app/(app)/analytics/page.tsx` | `apps/web/src/app/(app)/analytics/page.spec.tsx` | ✅ todas as 7 seções com empty state; benchmark com CTA "Adicionar Veículo →" — demais sem CTA de navegação, conforme redação original de cada linha da RF-15 |

### Implementação por Fase

| Fase | Tarefa | Módulos | Status |
|------|--------|---------|--------|
| T6.1 — Foundation | RPCs TCO + Fuel Trend, endpoints, página `/analytics` (TCO + fuel chart) | TCO, Fuel Intelligence | ✅ concluído em 2026-07-16 |
| T6.2 — Intelligence | RPCs de anomalias e benchmark, endpoints, seções na página | Anomalias, Benchmark | ✅ concluído em 2026-07-16 |
| T6.3 — Prediction | RPCs de forecast e sazonalidade, insights NL, export CSV, empty states completos | Forecast, Seasonal, Insights NL | ✅ concluído em 2026-07-16 |

---

## SPEC-20260619-001 — Padrão de Comportamento de Formulários (approved)

> Define stack, regras (R-FORM-01..R-FORM-07, R-FUEL-07, R-FUEL-08) e fases de implementação
> para todos os formulários. Status: approved.
> **2026-07-14:** decisão tomada com o usuário ao retomar T3.9 (ver changelog de
> SPEC-20260612-001) de **não** construir esta stack agora — react-hook-form/Server
> Actions/`@nave/ui` form kit ficam para quando a Fase 8 (Design System) evoluir os
> componentes. `R-FUEL-08` foi implementada sem essa stack, via hook `useFuelCrossCalc`
> (`apps/web/src/lib/hooks/use-fuel-cross-calc.ts`).
> **2026-07-14 (T3.10):** R-FORM-05 e R-FORM-07 aplicados retroativamente ao Expense Form
> (única tela transacional existente no frontend), adaptados sem `AlertDialog`/`FormField`
> (confirmação via `window.confirm`, mesmo padrão das exclusões). Ver changelog da spec.

### Regras de Formulário (R-FORM)

| Requisito | Descrição | Código | Teste | Status |
|-----------|-----------|--------|-------|--------|
| R-FORM-01 | `mode: 'onBlur'`, `reValidateMode: 'onChange'` em todos os forms | — | — | ⏳ Depende da stack react-hook-form (Fase 8) |
| R-FORM-02 | `FormField` + `Controller` pattern; nunca `.register()` direto | — | — | ⏳ Depende da stack react-hook-form (Fase 8) |
| R-FORM-03 | Valores monetários usam `CurrencyInput` (ATM-style) | `packages/ui/src/components/masked-input.tsx` | `packages/ui/src/components/masked-input.spec.tsx` | ✅ (Expense Form) |
| R-FORM-04 | Create actions redirect para listagem; update/delete fazem revalidate sem redirect | `apps/web/src/app/expenses/new/page.tsx`, `apps/web/src/app/expenses/[id]/page.tsx` | `apps/web/src/app/expenses/new/page.spec.tsx`, `apps/web/src/app/expenses/[id]/page.spec.tsx` | ✅ (Expense Form) |
| R-FORM-05 | Dirty check com confirmação (`window.confirm`, adaptado de `AlertDialog`) ao cancelar | `apps/web/src/app/expenses/new/page.tsx`, `apps/web/src/app/expenses/[id]/page.tsx` | `apps/web/src/app/expenses/new/page.spec.tsx`, `apps/web/src/app/expenses/[id]/page.spec.tsx` | ✅ (Expense Form) |
| R-FORM-06 | Server Actions retornam `ActionResult` padrão | — | — | ⏳ Não aplicável sem Server Actions; API usa `ApiError`/`apiClient` uniformemente |
| R-FORM-07 | Empty state com CTA quando sem veículos cadastrados | `apps/web/src/app/expenses/new/page.tsx` | `apps/web/src/app/expenses/new/page.spec.tsx` | ✅ (Expense Form) |

### Fases de Implementação

| Fase | Descrição | Status |
|------|-----------|--------|
| Fase 1 | Stack padrão (zodResolver, FormField, CurrencyInput) | ⏳ |
| Fase 2 | `typedResolver` centralizado; formulários migrados | ⏳ |
| Fase 3 | Dirty check + AlertDialog; feedback sonner | ⏳ |
| Fase 4 | Auto-draft com preferência R-PREF-02 | ⏳ |
| Fase 5 | Auditoria de conformidade de todos os forms | ⏳ |

---

## SPEC-20260612-003 — Preferência de Rascunho Automático (approved)

> Transforma o rascunho automático do `ExpenseForm` em preferência opcional do usuário,
> configurável em Preferências, com default desativado. Regras: R-PREF-01, R-PREF-02. Segurança: S2.
> Status: approved — RF-01/RF-02 concluídos em 2026-07-14 via `PreferencesModule` REST (NestJS)
> + React Query, não server actions Next.js como originalmente descrito (ver changelog da spec).
> RF-03 (integração com `ExpenseForm`) ⏳ até a Fase 3 (módulo de despesas ainda não existe).

### Banco de dados

| Artefato | Descrição | Regra | Status |
|----------|-----------|-------|--------|
| `supabase/migrations/20260712171846_grouping_templates_preferences.sql` | Coluna `auto_draft_enabled BOOLEAN NOT NULL DEFAULT FALSE` incluída diretamente no `CREATE TABLE user_preferences` (sem ALTER TABLE separado) | R-PREF-02 | 🔶 Aplicado (sem teste) |

### Schema / Validação

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | Campo `auto_draft_enabled` no schema; `DEFAULT_AUTO_DRAFT_ENABLED = false` exportado | `packages/validators/src/preferences.schemas.ts` | `packages/validators/src/preferences.schemas.spec.ts` | ✅ |

### API REST (backend) — substitui Server Actions da spec original

| Req | Descrição | Código | Regra | Teste | Status |
|-----|-----------|--------|-------|-------|--------|
| RF-01.3 | `GET /preferences`: lê `auto_draft_enabled`; retorna `false` como fallback quando ausente | `apps/api/src/modules/preferences/preferences.{controller,service}.ts` | R-PREF-01 | `apps/api/src/modules/preferences/preferences.{controller,service}.spec.ts` | ✅ |
| RF-01.3 | `PATCH /preferences`: upsert idempotente de `auto_draft_enabled` por `user_id` | `apps/api/src/modules/preferences/preferences.{controller,service}.ts` | R-PREF-02 | `apps/api/src/modules/preferences/preferences.{controller,service}.spec.ts` | ✅ |

### Componente de Preferência

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-02 | Toggle "Rascunho automático" com label e descrição; estado local + `isDirty` + `safeParse` + feedback "Salvando…"/"✓ Salvo" | `apps/web/src/app/settings/preferences/page.tsx` | `apps/web/src/app/settings/preferences/page.spec.tsx` | ✅ |

### Integração com ExpenseForm

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-03/RF-04 | `ExpenseForm` recebe prop `autoDraftEnabled`; draft condicionado à essa prop; página de nova despesa carrega a preferência via `GET /preferences` | — | — | ⏳ Depende da Fase 3 (`ExpenseForm` ainda não existe) |

---

## SPEC-20260612-002 — Ajustes de Campos e Layout do Formulário de Despesas (approved)

> Ajustes pontuais no `ExpenseForm`: limite máximo do campo Valor (R-EXP-01), campo Ano
> editável, "Tanque cheio?" tri-state (R-FUEL-06), limite de 7 dígitos no Odômetro (R-ODO-02)
> e reorganização do layout. **2026-07-14 (T3.9):** implementado sobre a stack real do projeto
> (client component + `useState` + TanStack Query), não react-hook-form/`@nave/ui` como a spec
> original descreve — ver changelog da spec e de SPEC-20260612-001.

| Requisito | Descrição | Código | Teste | Status |
|-----------|-----------|--------|-------|--------|
| RF-01 | `amount` aceita até R$ 100.000.000,00 (R-EXP-01); `CurrencyInput` permite digitar até 11 dígitos | `packages/validators/src/expense.schemas.ts` (já vigente desde T3.0), `packages/ui/src/components/masked-input.tsx` (`CURRENCY_MAX_DIGITS = 11`) | `packages/ui/src/components/masked-input.spec.tsx` | ✅ |
| RF-02 | Campo "Ano" (4 dígitos) ao lado da Data: editar atualiza apenas o ano; ano inválido faz rollover (comportamento padrão de `Date`) | `apps/web/src/lib/date-year.ts`, `apps/web/src/app/expenses/{new/page.tsx,[id]/page.tsx}` | `apps/web/src/lib/date-year.spec.ts`, `apps/web/src/app/expenses/new/page.spec.tsx` | ✅ |
| RF-03 | "Tanque cheio?" tri-state (`true`/`false`/`null`, default `null`); botões "Sim"/"Não", clicar no ativo desmarca para `null` (R-FUEL-06) | `apps/web/src/app/expenses/{new/page.tsx,[id]/page.tsx}` | `apps/web/src/app/expenses/new/page.spec.tsx` | ✅ |
| RF-04 | `odometer_km` limitado a 9.999.999 (7 dígitos) no `expenseBaseSchema` (R-ODO-02); `OdometerInput` limita digitação a 7 dígitos | `packages/validators/src/expense.schemas.ts` (já vigente desde T3.0), `packages/ui/src/components/masked-input.tsx` (`ODOMETER_MAX_DIGITS = 7`) | `packages/validators/src/expense.schemas.spec.ts`, `packages/ui/src/components/masked-input.spec.tsx` | ✅ |
| RF-05 | Reordenação do layout: Data + Ano lado a lado; Odômetro movido para após Data/Ano quando `category = fuel` | `apps/web/src/app/expenses/{new/page.tsx,[id]/page.tsx}` | — (verificado visualmente na estrutura do JSX) | ✅ |

---

## SPEC-20260612-001 — Melhorias de UX do Formulário/Hub de Despesas (approved)

> Consolida 6 itens da análise de UX de `/expenses` (KPIs, reatividade de contexto, máscaras
> pt-BR, cálculo cruzado de combustível, hard-block de odômetro, mensagens de erro de update).
> Regras: R-ODO-01 (novo), R-CTX-06 (atualizado). **2026-07-14 (T3.9):** implementado com
> adaptação de arquitetura — decisão tomada com o usuário (ver changelog da spec): sem
> react-hook-form/Server Actions/`@nave/ui` form kit (SPEC-20260619-001), que nunca foram
> construídos neste projeto. `CurrencyInput`/`OdometerInput` viraram componentes React simples
> controlados (`value`/`onChange`) em `packages/ui`, consumidos por `useState` puro.
> RF-02 (reatividade ao contexto global) fica ⏳ — depende do `useDashboardStore`/"Em Foco"
> da Fase 5 (SPEC-20260602-001), ainda não implementado.

| Requisito | Descrição | Código | Teste | Status |
|-----------|-----------|--------|-------|--------|
| RF-01.1 | KPI "Próximos 30 dias" calculado em todas as abas (já não dependia da aba ativa nesta implementação — `kpis`/`upcoming` são carregados incondicionalmente em `/expenses`) | `apps/web/src/app/expenses/page.tsx` | `apps/web/src/app/expenses/page.spec.tsx` | ✅ |
| RF-01.2 | RPC `get_upcoming_costs` ganha 4ª fonte: despesas manuais (`source_type IS NULL`, `date > current_date`) como `source_type = 'expense'` | `supabase/migrations/20260714220000_upcoming_costs_manual_expenses.sql` | — (RPC; sem harness de teste de banco no projeto) | 🔶 Aplicado |
| RF-02 | Campo `vehicle_id` do `ExpenseForm` reativo a mudanças do contexto global enquanto `isInherited === true` | — | — | ⏳ Depende da Fase 5 (`useDashboardStore` ainda não existe) |
| RF-03 | Máscaras pt-BR progressivas (acumulador de dígitos estilo caixa eletrônico) nos campos Valor, Odômetro e Litros | `packages/ui/src/components/masked-input.tsx` (`CurrencyInput`, `OdometerInput`) | `packages/ui/src/components/masked-input.spec.tsx` | ✅ |
| RF-04 | Hard-block de regressão de odômetro (R-ODO-01): rejeita valor menor que o máximo registrado em data anterior/igual, ou maior que o mínimo registrado em data posterior. Adaptação: opt-in via query param `?strict=true` (enviado só pelo `apps/web`) em vez de "fluxo web" separado — o soft-warning R1 (SPEC-20260601-001) permanece o default para os demais consumidores da API | `apps/api/src/modules/expenses/expenses.service.ts` (`checkOdometerHardBlock`, `findOdometerBoundary`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| RF-05 | Campo "Valor por litro" editável na seção de combustível, com cálculo cruzado entre `amount`, `liters` e `price_per_liter`; algoritmo de pilha de ordem de edição `fuelEditOrder` (R-FUEL-08) | `apps/web/src/lib/hooks/use-fuel-cross-calc.ts` | `apps/web/src/lib/hooks/use-fuel-cross-calc.spec.ts` | ✅ |
| RF-06.1 | `category = fuel` ⇒ `odometer_km` obrigatório, via `superRefine` compartilhado por `createExpenseInputSchema` e `updateExpenseInputSchema` (o update só valida quando `category` está presente no payload — "já é fuel" sem alterar a categoria depende do estado persistido e não é verificável no schema) | `packages/validators/src/expense.schemas.ts` (`requireOdometerForFuel`) | `packages/validators/src/expense.schemas.spec.ts` | ✅ |
| RF-06.2 | Edição bloqueada quando `is_readonly === true` — já implementado desde T3.0 (`ForbiddenException`), reafirmado sem mudança de código | `apps/api/src/modules/expenses/expenses.service.ts` (`update`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| RF-06.3 | Mensagem de erro do hard-block exibida inline no formulário via `ApiError.message` (substitui a diferenciação `PGRST116`/genérico da spec original, que pressupõe Server Actions) | `apps/web/src/app/expenses/[id]/page.tsx` (`onError` de `updateMutation`) | `apps/web/src/app/expenses/[id]/page.spec.tsx` | ✅ |

---

## SPEC-20260608-001 — Upcoming Costs: Próximas Despesas (approved)

> Tab "Próximas" na central financeira com RPC `get_upcoming_costs`.
> Regras: R-LED-01, R-LED-02, R-LED-03, R-REC-01, R-REC-02. RPC implementada (🔶); tabs
> de frontend ainda pendentes (⏳). Nota: assinatura real é
> `get_upcoming_costs(p_vehicle_id uuid default null, p_horizon_days integer default 30)`,
> divergindo do `(p_user_id UUID)` planejado na spec — filtra por `auth.uid()` internamente.

| Requisito | Descrição | Código | Teste | Status |
|-----------|-----------|--------|-------|--------|
| RF-01 | RPC `get_upcoming_costs(p_vehicle_id, p_horizon_days)`: unifica maintenance, fines, recurring_costs | `supabase/migrations/20260712172020_analytics_functions.sql` | — | 🔶 |
| RF-02 | Tab "Próximas" em `/expenses` | — | — | ⏳ |
| RF-03 | Tab "Em atraso" com filtro `due_date < hoje AND paid_at IS NULL` | — | — | ⏳ |

---

## SPEC-20260608-002 — Expenses KPIs: Central Financeira (approved)

> KPI cards financeiros no topo de `/expenses`. Regras: R-LED-01. Nenhum código implementado.

| Requisito | Descrição | Código | Teste | Status |
|-----------|-----------|--------|-------|--------|
| RF-01 | KPI "Total este mês" com delta vs mês anterior | — | — | ⏳ |
| RF-02 | KPI "Próximos 30 dias" com soma de upcoming costs | — | — | ⏳ |
| RF-03 | KPI "Total acumulado" com histórico | — | — | ⏳ |

---

## SPEC-20260608-003 — Recurring Costs Alerts: Alertas de Custos Recorrentes (approved)

> In-app badge no sidebar para custos recorrentes vencendo em 7 dias. Nenhum código implementado.

| Requisito | Descrição | Código | Teste | Status |
|-----------|-----------|--------|-------|--------|
| RF-01 | Badge numérico no item "Despesas" do sidebar | — | — | ⏳ |
| RF-02 | Widget "Próximos 7 dias" no dashboard | — | — | ⏳ |

---

## SPEC-20260609-001 — CRUD de Custos Recorrentes (approved)

> Módulo RecurringCostsModule (NestJS) com CRUD completo.
> Regras: R-REC-01, R-REC-02, R-LED-05, R-HUB-01. Banco implementado (🔶); módulo NestJS
> ainda pendente (⏳).

### Banco de dados

| Artefato | Descrição | Regra | Status |
|----------|-----------|-------|--------|
| `supabase/migrations/20260712171910_recurring_costs_and_ledger_index.sql` | Tabela `vehicle_recurring_costs` (id, user_id FK, vehicle_id FK, cost_type enum, year, amount, due_date, paid_at, expense_id FK nullable, notes, soft-delete); constraint `uq_vehicle_recurring_cost (vehicle_id, cost_type, year)` | R-REC-01 | 🔶 Aplicado (sem teste) |
| RLS `recurring_costs_*` | `supabase/migrations/20260712172047_rls_policies.sql` — SELECT/INSERT/UPDATE por `user_id`; sem hard delete | R-REC-01 | 🔶 |

### Backend — RecurringCostsModule

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | `GET /recurring-costs`: lista com filtros `vehicle_id`, `year`, `cost_type`, `paid` | — | — | ⏳ |
| RF-02 | `POST /recurring-costs`: cria custo recorrente; verifica ownership; rejeita duplicata `(vehicle_id, cost_type, year)` com 409 (R-REC-01) | — | — | ⏳ |
| RF-02 | `POST /recurring-costs`: quando `paid_at` informado, cria expense vinculada imediatamente (R-LED-05) | — | — | ⏳ |
| RF-03 | `PATCH /recurring-costs/:id`: ao definir `paid_at` pela primeira vez, cria expense vinculada (R-LED-05) | — | — | ⏳ |
| RF-04 | `DELETE /recurring-costs/:id`: soft-deleta expense vinculada antes de remover o custo recorrente (R-HUB-01) | — | — | ⏳ |
| RF-05 | `getRecurringCostCategory(cost_type)`: mapeia `ipva|crlv` → `tax`, `insurance` → `insurance`, `other` → `other` | — | — | ⏳ |

---

## SPEC-20260609-002 — Tab "Por Veículo" em /expenses (approved)

> Quarta tab em `/expenses` com agrupamento accordion por veículo e subtotais.
> Nenhum código implementado.

| Requisito | Descrição | Código | Teste | Status |
|-----------|-----------|--------|-------|--------|
| RF-01 | Tab "Por veículo" com URL param `?tab=por-veiculo` | — | — | ⏳ |
| RF-02 | Accordion por veículo com subtotal formatado em BRL | — | — | ⏳ |

---

## SPEC-20260609-003 — Exportação CSV Consolidada (approved)

> CSV unificado de todas as origens financeiras. Regras: R5, R-LED-01. Nenhum código implementado.

| Requisito | Descrição | Código | Teste | Status |
|-----------|-----------|--------|-------|--------|
| RF-01 | Botão "Exportar CSV" com período e filtro por veículo | — | — | ⏳ |
| RF-02 | CSV inclui coluna `Origem` (Manual/Manutenção/Multa/Custo recorrente) | — | — | ⏳ |
| RF-03 | BOM UTF-8 para compatibilidade Excel pt-BR | — | — | ⏳ |

---

## EPIC-FIN-001 — Ledger Financeiro Unificado (ADR-006)

> **Objetivo:** Consolidar todas as origens de despesas financeiras do Nave (manuais, multas,
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
> | Spec | Título | Status |
> |------|--------|--------|
> | [SPEC-20260607-001](#spec-20260607-001--finesmodule-approved) | FinesModule — migration do ledger + `createFromSource`/`softDeleteBySource` | approved |
> | [SPEC-20260608-001](#spec-20260608-001--upcoming-costs-próximas-despesas-approved) | Upcoming Costs: Próximas Despesas | approved |
> | [SPEC-20260608-002](#spec-20260608-002--expenses-kpis-central-financeira-approved) | Expenses KPIs: Central Financeira | approved |
> | [SPEC-20260608-003](#spec-20260608-003--recurring-costs-alerts-alertas-de-custos-recorrentes-approved) | Recurring Costs Alerts: Alertas de Custos Recorrentes | approved |
> | [SPEC-20260609-001](#spec-20260609-001--crud-de-custos-recorrentes-approved) | CRUD de Custos Recorrentes | approved |
>
> **Artefatos transversais do épico:**
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

| Artefato | Descrição | Regra | Status |
|----------|-----------|-------|--------|
| `supabase/migrations/20260712171830_core_tables.sql` | Campos `source_type text`, `source_id uuid`, `is_readonly boolean` em `expenses`; constraint `expenses_source_coherence_check` | R-LED-04, R-HUB-02 | 🔶 Aplicado (sem teste) |
| `supabase/migrations/20260712171910_recurring_costs_and_ledger_index.sql` | Tabela `vehicle_recurring_costs` + índice único `uq_expenses_source ON expenses (source_type, source_id) WHERE deleted_at IS NULL` | R-HUB-02, R-REC-01 | 🔶 Aplicado (sem teste) |
| `supabase/migrations/20260712172020_analytics_functions.sql` | Função `get_upcoming_costs(p_vehicle_id, p_horizon_days)` — unifica maintenance, fines, recurring_costs | R-REC-02 | 🔶 Aplicado (sem teste) |

### Backend — FinesModule

| Req | Descrição | Código | Regra | Teste | Status |
|-----|-----------|--------|-------|-------|--------|
| RF-01 | `POST /fines`: cria multa, valida ownership do veículo, cria expense vinculada via `createFromSource` (R-LED-02, R-HUB-02) | — | R-LED-02 | — | ⏳ |
| RF-02 | `amount_with_discount` não pode ser maior que `amount`; retorna 400 | — | — | — | ⏳ |
| RF-03 | `POST /fines`: usa `amount_with_discount` (quando disponível) como valor da expense vinculada (R-LED-02) | — | R-LED-02 | — | ⏳ |
| RF-04 | `GET /fines`: lista multas do usuário com filtro opcional por `status` | — | S1 | — | ⏳ |
| RF-05 | `PATCH /fines/:id`: grafo de transições `pending → [paid, appealing, cancelled]` | — | — | — | ⏳ |
| RF-05 | Transição para `cancelled`: soft-deleta expense vinculada via `softDeleteBySource` (R-LED-03) | — | R-LED-03 | — | ⏳ |
| RF-06 | `DELETE /fines/:id`: soft-delete + `softDeleteBySource('fine', id)` (R-HUB-01) | — | R-HUB-01 | — | ⏳ |
| RF-07 | `GET /fines/vehicle/:vehicleId`: lista multas de um veículo específico; verifica ownership | — | S1 | — | ⏳ |

### Backend — ExpensesService (extensão para ledger)

| Req | Descrição | Código | Regra | Teste | Status |
|-----|-----------|--------|-------|-------|--------|
| R-LED-01 | `PATCH /expenses/:id` e `DELETE /expenses/:id`: retornam 403 quando `is_readonly = true` | — | R-LED-01 | — | ⏳ |
| R-LED-02 | `createFromSource(dto)`: persiste com `is_readonly = true`; respeita `uq_expenses_source` (idempotente) | — | R-LED-02, R-LED-05 | — | ⏳ |
| R-LED-03 | `softDeleteBySource(sourceType, sourceId)`: encontra expense ativa e aplica soft-delete (R-HUB-01) | — | R-LED-03 | — | ⏳ |

### Frontend — Tela de Multas

| Req | Descrição | Código | Regra | Teste | Status |
|-----|-----------|--------|-------|-------|--------|
| — | `/fines/page.tsx`: listagem de multas com KPIs e ações por linha | — | S1, R-LED-01 | — | ⏳ |
| — | `/fines/new/page.tsx`: formulário de criação de multa | — | S1 | — | ⏳ |

### Frontend — Central de Despesas (reestruturação planejada)

| Req | Descrição | Código | Regra | Teste | Status |
|-----|-----------|--------|-------|-------|--------|
| R-LED-01 | `ExpenseRowActions`: ações de edição e exclusão ocultadas quando `is_readonly = true` | — | R-LED-01 | — | ⏳ |
| — | `LinkedExpenseDrawer`: drawer que exibe informações da origem da despesa | — | R-LED-01 | — | ⏳ |
| — | `/expenses/page.tsx`: reestruturado com tabs, KPIs financeiros, badges `readonly`, filtro por `source_type` | — | R-LED-01 | — | ⏳ |
| — | `ExportCsvButton`: CSV consolidado inclui campo `source_type` | — | — | — | ⏳ |

---

## SPEC-20260606-002 — Fornecedor / Posto de Combustível (approved)

> Permite registrar o posto de combustível no lançamento de abastecimento com autocomplete
> baseado no histórico do usuário. Regras: R-FUEL-04, R-FUEL-05.
> **2026-07-14 (T3.5):** RF-01 e RF-02 (backend) implementados via `ExpensesService`/`ExpensesController`
> — coluna `supplier` já existia na tabela `expenses` desde a migration consolidada (T3.0). Campo
> `supplier` (com datalist de sugestões) adicionado aos formulários web de criação/edição de despesa
> e ao fluxo de templates; UX de autocomplete "estilo Popover" fica ⏳ (T3.9/T3.10, junto do
> `ExpenseForm` reescrito com react-hook-form — ver R-FORM-01/02).

| Req | Descrição | Código | Regra | Teste | Status |
|-----|-----------|--------|-------|-------|--------|
| RF-01 | Aceitar `supplier` no payload da API (backend) — validação ≤ 100 chars | `packages/validators/src/expense.schemas.ts` (`expenseBaseSchema`) | R-FUEL-04 | — | ✅ |
| RF-02 | `GET /expenses/suppliers` — busca 200 registros com `supplier IS NOT NULL`, deduplica case-insensitive em JS, retorna top 10 | `apps/api/src/modules/expenses/expenses.service.ts` (`listSuppliers`), `.controller.ts` | R-FUEL-04 | `expenses.service.spec.ts`, `.controller.spec.ts` | ✅ |
| RF-02 | Campo `supplier` com `<datalist>` alimentado por `GET /expenses/suppliers` nos formulários `new`/`[id]` | `apps/web/src/app/expenses/new/page.tsx`, `[id]/page.tsx` | R-FUEL-04 | — | 🔶 sem teste dedicado de UI; autocomplete via Popover fica ⏳ (T3.9) |
| RF-03 | Sem tabela separada — abordagem de query direta em `expenses` | `expenses.service.ts` (`listSuppliers`) | — | — | ✅ |
| RF-04 | Aceitar texto livre sem match no histórico | `expenseBaseSchema` | — | — | ✅ |

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

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | Persistir `fuel_type` no payload da API (backend) — validação contra enum `FuelType` | `packages/validators/src/expense.schemas.ts` | — | ✅ |
| RF-02 | Persistir `full_tank` (boolean nullable) no payload da API (backend) | `expense.schemas.ts` | — | ✅ |
| RF-03 | Retornar `computed.km_per_liter` e `computed.price_per_liter` na resposta da API | `apps/api/src/modules/expenses/expenses.service.ts` (`computeFuelMetrics`) | `expenses.service.spec.ts` | ✅ |
| RF-04 | `getLastFuelTypeAction(vehicleId)`: consulta último `fuel_type` selecionado para pré-preencher o campo (R-FUEL-01) | — | — | ⏳ (T3.9, ver R-FUEL-07) |
| RF-04 | `ExpenseForm`: `useEffect` de pré-preenchimento de `fuel_type` dispara em modo criação | — | — | ⏳ (T3.9) |
| RF-05 | Default de `full_tank = true` no formulário (toggle "Abastecimento parcial?") | `apps/web/src/app/expenses/new/page.tsx`, `[id]/page.tsx` (checkbox `partialTank`) | — | 🔶 implementado como decidido na spec original; superseded por R-FUEL-06 (tri-state) em T3.9 |
| RF-06 | `ExpenseForm`: hint de odômetro exibe delta quando valor digitado supera o último registrado (R4) | — | — | ⏳ (T3.9) |
| RF-07 | `ExpenseForm`: exibe mensagem "Consumo aparece após o 2º abastecimento completo" (R-FUEL-02, R-FUEL-03) | — | — | ⏳ (T3.9) |
| RF-08 | Exibir preço/litro em tempo real no formulário | — | — | ⏳ (T3.9) |

---

## SPEC-20260603-004 — Migration: Tabela Consolidada `user_preferences` (approved)

> Cria a tabela `public.user_preferences` com RLS owner-only completa.
> Regras: S1, S2, R-DISP-03, R-PREF-01. Banco implementado (🔶, sem teste dedicado; schema
> divergente do texto original da spec — ver changelog v1.1). Camada de serviço para `auto_draft_enabled` concluída
> em 2026-07-14 via `PreferencesModule` REST (ver SPEC-20260612-003). Camada de serviço para
> `vehicle_chip_fields` (SPEC-20260603-003, approved) concluída em 2026-07-14 (T2.7), não mais ⏳. Nota: coluna `auto_draft_enabled`
> (de SPEC-20260612-003) já incluída na migration consolidada, dispensando ALTER TABLE separado.

### Banco de dados

| Artefato | Descrição | Regra | Status |
|----------|-----------|-------|--------|
| `supabase/migrations/20260712171846_grouping_templates_preferences.sql` | `CREATE TABLE public.user_preferences` com colunas `user_id` (PK FK), `vehicle_chip_fields text[]`, `auto_draft_enabled boolean`, `updated_at`; FK `ON DELETE CASCADE` | R-PREF-01, R-DISP-03 | 🔶 Aplicado (sem teste) |
| RLS `user_preferences_owner` (policy `for all`) | `supabase/migrations/20260712172047_rls_policies.sql` — política unificada `FOR ALL USING/WITH CHECK (auth.uid() = user_id)` | S2 | 🔶 |
| Sem policy de DELETE explícita | Exclusão somente via cascade de `profiles.id` (C1 — LGPD); a policy `for all` não inclui hard delete direto pela app | S2, C1 | 🔶 |

---

## SPEC-20260603-003 — Preferências de Exibição do Veículo no Chip de Contexto (approved)

> Permite que o usuário configure quais campos de identidade do veículo aparecem no chip.
> Adiciona campo `nickname` à entidade `vehicles`. Regras: R-DISP-01, R-DISP-02, R-DISP-03.
> Status: aprovada em 2026-07-14 (T2.7) — backend + UI de configuração concluídos; renderização do
> `VehicleContextChip` real no subheader (RF-01/RF-04/RF-05) permanece ⏳ até `SPEC-20260603-001` (Fase 5).

### Schema / Validação

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01..RF-03/RF-08 | Schema Zod `chipFieldsSchema`: array 1–3 campos enum, `plate` obrigatório, sem repetição | `packages/validators/src/preferences.schemas.ts` | `packages/validators/src/preferences.schemas.spec.ts` | ✅ |

### Backend — Entidade e DTOs de Veículo

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-09 | Campo `nickname: string \| null` adicionado à entidade `Vehicle` (text nullable, max 50 chars — corrigido de 30, ver changelog da spec) | `apps/api/src/modules/vehicles/vehicles.service.ts`, `supabase/migrations/20260712171830_core_tables.sql` | — | ✅ (concluído em T2.1) |
| RF-09 | `nickname` adicionado ao `CreateVehicleDto` e `UpdateVehicleDto` (opcional, max 50) | `packages/validators/src/vehicle.schemas.ts` | — | ✅ (concluído em T2.1) |

### Backend — API REST (NestJS + React Query, não server actions)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-06 | `GET /preferences`: retorna `vehicle_chip_fields` de `user_preferences`; fallback `DEFAULT_CHIP_FIELDS` quando ausente (R-DISP-03) | `apps/api/src/modules/preferences/preferences.service.ts` | `apps/api/src/modules/preferences/preferences.service.spec.ts` | ✅ |
| RF-06/RF-08 | `PATCH /preferences`: valida com `chipFieldsSchema` (via `updatePreferencesInputSchema`), upsert parcial em `user_preferences.vehicle_chip_fields` | `apps/api/src/modules/preferences/preferences.controller.ts`, `preferences.service.ts` | `preferences.controller.spec.ts`, `preferences.service.spec.ts` | ✅ |

### Banco de dados

| Artefato | Descrição | Regra | Status |
|----------|-----------|-------|--------|
| `ALTER TABLE vehicles ADD COLUMN nickname text CHECK (char_length(nickname) <= 50)` | Campo apelido nullable na tabela vehicles | R-DISP-01 | ✅ Aplicado (T2.1) |
| `CREATE TABLE user_preferences` com coluna `vehicle_chip_fields text[]` e RLS owner-only | Formalizada em SPEC-20260603-004; default `['make','plate','model']` já bate com RF-05 | S2, R-DISP-03 | ✅ Aplicado (sem teste dedicado de RLS) |

### Componentes de Layout e Tela de Preferências

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01/RF-04/RF-05 | `VehicleContextChip`: renderização dinâmica por `chipFields`; fallback `nickname → model` — helper puro `resolveChipValue`/`formatChipPreview` já pronto para reuso | `apps/web/src/lib/vehicle-chip.ts` (helper) | `apps/web/src/lib/vehicle-chip.spec.ts` | 🔶 Helper pronto; componente do chip real ⏳ até Fase 5 (`SPEC-20260603-001`) |
| RF-07/RNF-03 | Seção "Exibição do veículo" em `/settings/preferences`: seleção de 1-3 campos, reordenação, prévia em tempo real, salvar/cancelar | `apps/web/src/app/settings/preferences/page.tsx` | `apps/web/src/app/settings/preferences/page.spec.tsx` | ✅ |

---

## SPEC-20260715-001 — CRUD Base de Manutenções (MaintenancesModule) (approved)

> Concluído em 2026-07-15: `MaintenancesModule` REST completo (mesmo padrão de
> SPEC-20260714-001, T3.0). Absorveu o enforcement de transição de status (T4.2,
> SPEC-20260603-002) e a integração com o ledger (R-LED-02/03, R-HUB-01) no mesmo módulo,
> replicando o padrão de `FinesModule` (T3.6/T3.8). Frontend mínimo (RF-15..RF-17) também
> concluído no mesmo dia.

### Camada de serviço (backend)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01..RF-06/RF-13 | CRUD (`create`, `findAll`, `findOne`, `update`, `remove`) — inline, sem Repository/Port | `apps/api/src/modules/maintenances/maintenances.service.ts`, `.controller.ts`, `.module.ts` | `apps/api/src/modules/maintenances/maintenances.service.spec.ts`, `.controller.spec.ts` | ✅ |
| RF-07/R7 | Validação de transição de status via `MAINTENANCE_STATUS_TRANSITIONS`; 409 se inválida | `apps/api/src/modules/maintenances/maintenances.service.ts`, `packages/validators/src/maintenance.schemas.ts` | `apps/api/src/modules/maintenances/maintenances.service.spec.ts`, `packages/validators/src/maintenance.schemas.spec.ts` | ✅ |
| RF-08/R-ODO-03 | `odometer_km` obrigatório para transição a `completed`; 422 se ausente | `apps/api/src/modules/maintenances/maintenances.service.ts` | `apps/api/src/modules/maintenances/maintenances.service.spec.ts` | ✅ |
| RF-09 | `findMaxOdometerByVehicle` (sem filtro de ciclo — R-ODO-04 permanece ⏳ em ambos os módulos); warning não-bloqueante | `apps/api/src/modules/maintenances/maintenances.service.ts` | `apps/api/src/modules/maintenances/maintenances.service.spec.ts` | ✅ |
| RF-10/R-LED-02 | Transição a `completed` com `cost` cria despesa vinculada via `ExpensesService.createFromSource()` | `apps/api/src/modules/maintenances/maintenances.service.ts` | `apps/api/src/modules/maintenances/maintenances.service.spec.ts` | ✅ |
| RF-11/R-LED-03 | Transição a `cancelled` soft-deleta a despesa vinculada via `softDeleteBySource()` | `apps/api/src/modules/maintenances/maintenances.service.ts` | `apps/api/src/modules/maintenances/maintenances.service.spec.ts` | ✅ |
| RF-12/R-HUB-01 | `remove()` soft-deleta a despesa vinculada, se existir | `apps/api/src/modules/maintenances/maintenances.service.ts` | `apps/api/src/modules/maintenances/maintenances.service.spec.ts` | ✅ |
| RF-14/C2 | Audit log em mutações bem-sucedidas; transições rejeitadas não geram entrada | `apps/api/src/modules/maintenances/maintenances.service.ts` | `apps/api/src/modules/maintenances/maintenances.service.spec.ts` | ✅ |

### Frontend (mínimo)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-15 | `/maintenance`: lista com data, descrição, veículo, badge de status | `apps/web/src/app/maintenance/page.tsx` | `apps/web/src/app/maintenance/page.spec.tsx` | ✅ |
| RF-16 | `/maintenance/new`: formulário mínimo, empty state sem veículos (R-FORM-07) | `apps/web/src/app/maintenance/new/page.tsx` | `apps/web/src/app/maintenance/new/page.spec.tsx` | ✅ |
| RF-17 | `/maintenance/[id]`: edição + seletor de status restrito às transições válidas (UX progressiva, R7) | `apps/web/src/app/maintenance/[id]/page.tsx` | `apps/web/src/app/maintenance/[id]/page.spec.tsx` | ✅ |
| RF-24 (SPEC-20260711-001) | `odometer_km` exposto no formulário de manutenção via `OdometerInput` (não torna-se visualmente obrigatório em `completed` — refinamento de UX deixado para spec futura) | `apps/web/src/app/maintenance/[id]/page.tsx` | idem | 🔶 Parcial |

---

## SPEC-20260603-002 — Transições de Status de Manutenção (approved)

> Enforcement do grafo de transições de status no `MaintenancesService` (NestJS).
> Estados: `scheduled`, `in_progress`, `completed`, `cancelled` (corrigido em 2026-07-15 —
> ver changelog v0.2 da spec: o schema real usa `scheduled`, não `pending` como a v0.1 assumia).
> Implementado junto com SPEC-20260715-001 em 2026-07-15 (mesmo módulo, ver seção acima) —
> linhas abaixo mantidas para rastreabilidade histórica do requisito original.

### Camada de serviço (backend)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | `MaintenancesService.update()` valida transição quando `status` está no payload | `apps/api/src/modules/maintenances/maintenances.service.ts` | `apps/api/src/modules/maintenances/maintenances.service.spec.ts` | ✅ |
| RF-02..RF-05 | Constante `MAINTENANCE_STATUS_TRANSITIONS` define saídas de cada estado; `completed` e `cancelled` terminais | `packages/validators/src/maintenance.schemas.ts` | `packages/validators/src/maintenance.schemas.spec.ts` | ✅ |
| RF-06 | Transição para o mesmo estado atual é rejeitada com 409 | idem | idem | ✅ |
| RF-07 | Sem campo `status` no payload, validação de transição é ignorada | idem | idem | ✅ |
| RF-08 | Status atual lido do `findOne()` de ownership — sem query adicional | idem | idem | ✅ |
| RF-09 | Resposta 409 com `message: "Transição inválida: {de} → {para}"` | idem | idem | ✅ |
| RF-10/C2 | Audit log gravado apenas após transição bem-sucedida | idem | idem | ✅ |

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

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| — | `useVehicleContext`: hidratação, queries de veículos/grupos sob demanda, resolução de label/aria-label por modo — extraído de `focus-slot.tsx`, reaproveitado por chip e switcher | `apps/web/src/lib/context/use-vehicle-context.ts` | Coberto indiretamente por `vehicle-context-chip.spec.tsx`, `header.spec.tsx` | ✅ |
| Notas Técnicas | `useMediaQuery('(min-width: 768px)')` — SSR-safe, sem `window.innerWidth` direto | `apps/web/src/lib/hooks/use-media-query.ts` | `apps/web/src/lib/hooks/use-media-query.spec.ts` | ✅ |
| RF-14 | `useOnlineStatus` — eventos `online`/`offline` + `navigator.onLine` | `apps/web/src/lib/hooks/use-online-status.ts` | `apps/web/src/lib/hooks/use-online-status.spec.ts` | ✅ |

### VehicleContextChip

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | Chip visível no `Header` (novo, não `FluidFleetHeader`) em todos os breakpoints e páginas autenticadas | `apps/web/src/components/layout/header.tsx`, `apps/web/src/app/(app)/layout.tsx` | `apps/web/src/components/layout/header.spec.tsx` | ✅ |
| RF-02 | Estados visuais por modo (none/single/group/multi/attribute); ícones emoji em vez de `lucide-react` (não adicionado ao projeto) | `apps/web/src/components/layout/vehicle-context-chip.tsx` | `apps/web/src/components/layout/vehicle-context-chip.spec.tsx` | ✅ |
| RF-03 | Dimensões h-11 (44px) + max-width 140px + text truncation (WCAG 2.5.5) | `apps/web/src/components/layout/vehicle-context-chip.tsx` | — (verificação visual/classe Tailwind, sem teste dedicado de dimensão) | 🔶 |
| RF-04 | Botão X com `clearAllSelection()` + `stopPropagation` | `apps/web/src/components/layout/vehicle-context-chip.tsx` | `apps/web/src/components/layout/vehicle-context-chip.spec.tsx` | ✅ |
| RF-05 | `aria-label` dinâmico por modo descrevendo contexto ativo | `apps/web/src/lib/context/use-vehicle-context.ts` (`getModeAriaLabel`) | `apps/web/src/components/layout/vehicle-context-chip.spec.tsx` (via texto do label) | ✅ |
| RF-06 | Estado hover (`ring-1`) e focus-visible (`ring-2 ring-primary`) | `apps/web/src/components/layout/vehicle-context-chip.tsx` | — (classes Tailwind, sem teste de estilo computado) | 🔶 |
| RF-24 | Skeleton `w-32 h-11 animate-pulse` durante hidratação; nunca exibe `none` transitório | `apps/web/src/components/layout/vehicle-context-chip.tsx` | Coberto indiretamente (demais testes aguardam hidratação via `waitFor`) | 🔶 |

### VehicleContextDialog, VehicleContextSheet e VehicleSwitcherContent

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-07/RF-08 | Dialog desktop (`@radix-ui/react-dialog`): backdrop blur, `max-w-[380px]`, `Esc` com `stopPropagation` | `apps/web/src/components/layout/vehicle-context-dialog.tsx` | `apps/web/src/components/layout/vehicle-context-chip.spec.tsx` (abertura via clique) | 🔶 (sem teste dedicado de `Esc`) |
| RF-09 | Skeleton `animate-pulse` durante loading; erro com retry após 8s (`setTimeout`) | `apps/web/src/components/layout/vehicle-switcher-content.tsx` | — (sem teste dedicado de timeout/retry) | 🔶 |
| RF-10 | Fechamento do Dialog com animação `data-[state=closed]:fade-out duration-150` ao selecionar item | `apps/web/src/components/layout/vehicle-context-dialog.tsx` | — | 🔶 |
| RF-11..RF-13 | Sheet mobile (`vaul`): bottom-up `snapPoints=[0.7]`, handle de drag, `overscroll-behavior: contain` | `apps/web/src/components/layout/vehicle-context-sheet.tsx` | `apps/web/src/components/layout/vehicle-context-chip.spec.tsx` (abertura via clique) | 🔶 (sem teste de snap-point/drag, específico do vaul) |
| RF-12 | `padding-bottom: env(safe-area-inset-bottom)` | `apps/web/src/components/layout/vehicle-switcher-content.tsx` | — | 🔶 |
| RF-14 | Banner offline via `useOnlineStatus`; cache TanStack Query `staleTime: 60_000` (não SWR, ver nota RF-14 da spec) | `apps/web/src/components/layout/vehicle-switcher-content.tsx`, `apps/web/src/lib/context/use-vehicle-context.ts` | — (sem teste dedicado do banner offline) | 🔶 |
| RNF-05 | Busca client-side normaliza diacríticos (`normalize('NFD')`) e remove hífens de placa | `apps/web/src/components/layout/vehicle-switcher-content.tsx` (`normalizeForSearch`) | — (sem teste unitário dedicado da função de busca) | 🔶 |

### Migração do Sidebar

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-15 | Remoção de `FocusSlot` do sidebar; arquivo deletado do repositório (`focus-slot.tsx`/`focus-slot.spec.tsx`) | `apps/web/src/components/layout/sidebar.tsx` | `apps/web/src/components/layout/sidebar.spec.tsx` (RF-15) | ✅ |
| RF-16 | Dot passivo (`w-2 h-2 rounded-full`, `aria-hidden`) no sidebar colapsado, cor por `selectionMode`, sem interação | `apps/web/src/components/layout/sidebar.tsx` | `apps/web/src/components/layout/sidebar.spec.tsx` (RF-16) | ✅ |
| RF-17 | Confirmado satisfeito pelo `onClick` de logout já existente (sem gesto de hold — fora de escopo) | `apps/web/src/components/layout/sidebar.tsx` (comentário `@spec`) | — (nenhum comportamento novo a testar) | ✅ |

### Backend

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-18 | `.limit(100)` em `VehiclesService.findAll`/`VehicleGroupsService.findAll` — corrigido de "sem limite" (não "20→100", ver changelog da spec) | `apps/api/src/modules/vehicles/vehicles.service.ts`, `apps/api/src/modules/vehicle-groups/vehicle-groups.service.ts` | `apps/api/src/modules/vehicles/vehicles.service.spec.ts`, `apps/api/src/modules/vehicle-groups/vehicle-groups.service.spec.ts` | ✅ |
| RF-19 | `member_count` exclui membros com veículo soft-deletado (busca veículos ativos + conta em memória) | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.ts` (`findAll`) | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.spec.ts` | ✅ |
| RF-20 | 404 para veículo soft-deleted — reaproveitado de `VehiclesService.findOne` (não criado endpoint `/dashboard/stats` novo) | `apps/api/src/modules/vehicles/vehicles.service.ts` (`findOne`, já existente) | `apps/api/src/modules/vehicles/vehicles.service.spec.ts` (já existente) | ✅ |

### Persistência e limpeza de contexto

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-21 | `zustand/persist` com `sessionStorage` (corrige localStorage da SPEC-20260602-001) | `apps/web/src/lib/stores/use-dashboard-store.ts` | `apps/web/src/lib/stores/use-dashboard-store.spec.ts` | ✅ |
| RF-22 | Limpeza automática de contexto em 404 de `GET /vehicles/:id` do veículo ativo; reutiliza `ContextStaleToast`/`ui-store` já existentes | `apps/web/src/lib/http/api-client.ts` (`handleNotFound`) | `apps/web/src/lib/http/api-client.spec.ts` | ✅ |
| RF-23 | `sessionStorage.removeItem("nave-dashboard-context")` explícito no logout, além de `clearAllSelection()` | `apps/web/src/lib/auth/logout.ts` | `apps/web/src/lib/auth/logout.spec.ts` | ✅ |

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

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01/RF-02/RF-03 | `AuditService.log()`: injeta `timestamp`/`requestId` em `changes`; fire-and-forget via try/catch + `Logger`; escritor único (sem contraparte no frontend) | `apps/api/src/shared/audit/audit.service.ts` | `apps/api/src/shared/audit/audit.service.spec.ts` | ✅ |
| RF-04/RNF-04/R-MON-04 | Imutabilidade de `audit_logs` via RLS (`audit_logs_no_update`, `audit_logs_no_delete`) | `supabase/migrations/20260712172047_rls_policies.sql` | — (sem harness de teste de integração de banco além do já existente em `rls.int-spec.ts`) | 🔶 Aplicado |
| RF-05 | `audit_logs.user_id ON DELETE SET NULL` | `supabase/migrations/20260712171830_core_tables.sql` | — | 🔶 Aplicado |
| RF-06 | `changes` sem PII na leitura: `AuditLogsService` remove `user_id`/`deleted_at`/`photo_url`/`photo_thumbnail_url` antes de retornar (defesa em profundidade; registro em si já não grava esses campos por convenção dos callers) | `apps/api/src/modules/audit-logs/audit-logs.service.ts` | `apps/api/src/modules/audit-logs/audit-logs.service.spec.ts` | ✅ |
| RF-07/CA-11 | `AuditService.log()` grava `requestId` em `changes` via `AsyncLocalStorage` populado pelo `RequestIdInterceptor` | `apps/api/src/common/context/request-context.ts`, `apps/api/src/common/interceptors/request-id.interceptor.ts`, `apps/api/src/shared/audit/audit.service.ts` | `apps/api/src/shared/audit/audit.service.spec.ts` | ✅ |
| RF-08 | Cobertura atual de `AuditService.log()`: `auth`, `admin`, `users`, `vehicles`, `expenses`, `maintenances`, `fines`, `recurring-costs`, `odometer-cycles` | `apps/api/src/modules/{auth,admin,users,vehicles,expenses,maintenances,fines,recurring-costs,odometer-cycles}/*.service.ts` | ver specs de cada módulo | ✅ |

### Página Histórico de Atividades (`/atividades`)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-09/RF-10 | Client component + `apiClient`; consulta `GET /audit-logs` (top-100 `audit_logs` do usuário, `created_at DESC`); autenticação via middleware (`apps/web/middleware.ts`), não redirect na própria página | `apps/web/src/app/(app)/atividades/page.tsx`, `apps/api/src/modules/audit-logs/{audit-logs.controller,audit-logs.service}.ts` | `apps/web/src/app/(app)/atividades/page.spec.tsx`, `apps/api/src/modules/audit-logs/{audit-logs.controller,audit-logs.service}.spec.ts` | ✅ |
| RF-11 | KPI cards: Total, Veículos, Despesas, Manutenções (computados a partir do mesmo array de 100 entradas, sem query adicional) | `apps/web/src/app/(app)/atividades/page.tsx` | `apps/web/src/app/(app)/atividades/page.spec.tsx` | ✅ |
| RF-12..RF-14 | Tabela: Quando (relativo), Ação (badge colorido por sufixo `_CREATED`/`_UPDATED`/`_DELETED`), Domínio (emoji + label, sem depender de ícone lib — projeto não usa lucide-react), Detalhes (oculto em mobile, `hidden sm:table-cell`) | `apps/web/src/app/(app)/atividades/page.tsx` | `apps/web/src/app/(app)/atividades/page.spec.tsx` | ✅ |
| RF-15 | Empty state com emoji 🛡️ e mensagem "Nenhuma operação registrada ainda." | `apps/web/src/app/(app)/atividades/page.tsx` | `apps/web/src/app/(app)/atividades/page.spec.tsx` | ✅ |
| RF-16 | Link "Histórico de Atividades" no cabeçalho do dashboard principal (fora do `ActionDock`, que é fixo em 4 itens) | `apps/web/src/app/(app)/dashboard/page.tsx` | — (coberto indiretamente por `dashboard/page.spec.tsx` já existente; sem asserção dedicada ao novo link) | 🔶 |

---

## SPEC-20260714-001 — CRUD Base de Despesas (ExpensesModule) (approved)

> **2026-07-14 (T3.0, pré-requisito da Fase 3):** `ExpensesModule` implementado — API REST
> completa (create, list paginado, get, update, soft-delete), schemas Zod e frontend mínimo
> (`/expenses`, `/expenses/new`, `/expenses/[id]`). RF-08 (checagem de sequência de odômetro,
> R1) fica ⏳ deliberadamente — objeto de SPEC-20260601-001 (T3.2). RF-14 (campo `computed` de
> consumo) fica ⏳ — objeto de SPEC-20260606-001 (fuel enrichment).

### Banco de dados

| Artefato | Descrição | Regra | Status |
|----------|-----------|-------|--------|
| `supabase/migrations/20260712171830_core_tables.sql` | `CREATE TABLE public.expenses` — já aplicado, schema não alterado por esta spec | R1, R-LED-04 | ✅ (schema já existente) |

### API (backend) — `ExpensesModule`

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01/RF-02/CA-01 | `POST /expenses` cria despesa manual | `apps/api/src/modules/expenses/expenses.service.ts`, `expenses.controller.ts` | `apps/api/src/modules/expenses/expenses.service.spec.ts`, `expenses.controller.spec.ts` | ✅ |
| RF-03/CA-06/CA-07/CA-17 | `GET /expenses` lista paginada, filtros, isolamento por usuário | `apps/api/src/modules/expenses/expenses.service.ts` (`findAll`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| RF-04/CA-08 | `GET /expenses/:id` | `apps/api/src/modules/expenses/expenses.service.ts` (`findOne`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| RF-05/CA-13 | `PATCH /expenses/:id` | `apps/api/src/modules/expenses/expenses.service.ts` (`update`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| RF-06/CA-11 | `DELETE /expenses/:id` soft-delete | `apps/api/src/modules/expenses/expenses.service.ts` (`remove`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| RF-07/CA-09/CA-10/R-LED-01 | Bloqueio de PATCH/DELETE em despesas `is_readonly` (403) | `apps/api/src/modules/expenses/expenses.service.ts` (`update`, `remove`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| RF-08/CA-05 | `odometer_km` persistido; checagem de sequência (R1) implementada em T3.2 — ver [SPEC-20260601-001](expenses/SPEC-20260601-001-odometer-validation.md) | `apps/api/src/modules/expenses/expenses.service.ts` (`create`, `buildOdometerWarning`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| RF-09/CA-12 | `vehicle_id` de outro usuário → 404 | `apps/api/src/modules/expenses/expenses.service.ts` (`create`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| RF-10/CA-15/C2 | Audit log em mutações (fire-and-forget via `AuditService`) | `apps/api/src/modules/expenses/expenses.service.ts` | `apps/api/src/modules/expenses/expenses.service.spec.ts` | 🔶 (chamada verificada via mock; sem teste de integração do `audit_logs`) |
| RF-14 | Campo `computed` (`price_per_liter`, `km_per_liter`) | `apps/api/src/modules/expenses/expenses.service.ts` (`computeFuelMetrics`) — implementado em T3.5, ver [SPEC-20260606-001](expenses/SPEC-20260606-001-fuel-enrichment.md) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| RF-15 | Paginação por `cursor` | — | — | ❌ Baixa prioridade, não implementada nesta tarefa |

### Schema / Validação

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-02 | `expenseBaseSchema`, `createExpenseInputSchema`, `updateExpenseInputSchema`, `listExpensesQuerySchema` | `packages/validators/src/expense.schemas.ts` | `packages/validators/src/expense.schemas.spec.ts` | ✅ |

### Frontend

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-11 | Página `/expenses` (listagem, resolve veículo por `vehicle_id`) | `apps/web/src/app/expenses/page.tsx` | `apps/web/src/app/expenses/page.spec.tsx` | ✅ |
| RF-12 | Página `/expenses/new` (formulário de criação) | `apps/web/src/app/expenses/new/page.tsx` | `apps/web/src/app/expenses/new/page.spec.tsx` | ✅ |
| RF-13 | Página `/expenses/[id]` (edição + remoção, bloqueio quando `is_readonly`) | `apps/web/src/app/expenses/[id]/page.tsx` | `apps/web/src/app/expenses/[id]/page.spec.tsx` | ✅ |

---

## SPEC-20260602-004 — Categorias Personalizadas de Despesa (approved)

> **2026-07-13 (T2.3):** `CategoriesModule` (RF-01 a RF-06) implementado — API REST completa +
> schemas Zod. Durante a implementação foi encontrado e corrigido um gap: a migration
> consolidada não incluía a constraint `UNIQUE(user_id, value)` que a spec original assumia
> existir (ver changelog da spec). RF-07/RF-08 (integração com `ExpenseForm`) permanecem ⏳ —
> dependem do módulo de despesas (Fase 3, ainda não implementado). UI de gerenciamento de
> categorias é fora de escopo do MVP (definição original da spec, não uma omissão desta tarefa).

### Banco de dados

| Artefato | Descrição | Regra | Status |
|----------|-----------|-------|--------|
| `supabase/migrations/20260712171846_grouping_templates_preferences.sql` | `CREATE TABLE public.user_categories` (id, user_id FK, value slug `[a-z0-9_-]+`, label 1–100 chars, created_at) com FK `→ profiles(id) ON DELETE CASCADE` | — | 🔶 Aplicado (sem teste) |
| `supabase/migrations/20260713210000_user_categories_unique_value.sql` | `ADD CONSTRAINT uq_user_categories_user_value UNIQUE (user_id, value)` — gap corrigido em T2.3 | R-CAT-02, RF-03 | ✅ Aplicado (coberto indiretamente por `categories.service.spec.ts`, caso de violação `23505`) |
| RLS `user_categories_owner` | `supabase/migrations/20260712172047_rls_policies.sql` — policy `for all` por `user_id` | S2 | 🔶 |

### API (backend) — `CategoriesModule`

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01/CA-07 | `GET /categories`: retorna `{ default: DEFAULT_EXPENSE_CATEGORIES, custom: [...] }` ordenado por `label` | `apps/api/src/modules/categories/categories.controller.ts`, `categories.service.ts` | `apps/api/src/modules/categories/categories.service.spec.ts` | ✅ |
| RF-02/CA-01/CA-05 | `POST /categories`: cria categoria; `value` validado via `createCategoryInputSchema` (slug, 1–50) | `apps/api/src/modules/categories/categories.controller.ts`, `categories.service.ts` | `apps/api/src/modules/categories/categories.service.spec.ts` | ✅ |
| RF-04/CA-02/R-CAT-03 | `POST /categories` com `value` de categoria padrão retorna 409 | `apps/api/src/modules/categories/categories.service.ts` | `apps/api/src/modules/categories/categories.service.spec.ts` | ✅ |
| RF-03/CA-03/R-CAT-02 | `POST /categories` com `value` duplicado do mesmo usuário retorna 409 (via `23505` + constraint nova) | `apps/api/src/modules/categories/categories.service.ts` | `apps/api/src/modules/categories/categories.service.spec.ts` | ✅ |
| RF-05/CA-04/R-CAT-01 | `POST /categories` quando usuário já tem 20 categorias retorna 422 | `apps/api/src/modules/categories/categories.service.ts` | `apps/api/src/modules/categories/categories.service.spec.ts` | ✅ |
| RF-06/CA-06/R-CAT-04 | `DELETE /categories/:id`: hard-delete; verifica ownership; 404 se não encontrada | `apps/api/src/modules/categories/categories.controller.ts`, `categories.service.ts` | `apps/api/src/modules/categories/categories.service.spec.ts` | ✅ |
| RNF-01/RNF-02/S1/S2 | Toda rota exige JWT (`SupabaseAuthGuard`); client escopado por usuário + filtro `user_id` | `apps/api/src/modules/categories/categories.service.ts` | `apps/api/src/modules/categories/categories.service.spec.ts` | ✅ |
| RNF-03/C1 | Cascade FK `user_categories.user_id → profiles(id) ON DELETE CASCADE` garante remoção na exclusão de conta | `supabase/migrations/20260712171846_grouping_templates_preferences.sql` | — | 🔶 Garantido pelo DB, sem teste de integração |

### Schema / Validação

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-02 | `createCategoryInputSchema`, `DEFAULT_EXPENSE_CATEGORIES` (9 categorias), `DEFAULT_EXPENSE_CATEGORY_VALUES` | `packages/validators/src/category.schemas.ts` | `packages/validators/src/category.schemas.spec.ts` | ✅ |

### Frontend

| Req | Descrição | Status |
|-----|-----------|--------|
| RF-07/RF-08 | `ExpenseForm` com `customCategories: { value, label }[]`; migração do legado `profiles.preferences.expense_categories` para `GET /categories` — depende do módulo de despesas (Fase 3) | ⏳ |
| — | UI de gerenciamento de categorias (página de configurações) | ❌ Fora de escopo do MVP (definição original da spec) |

---

## SPEC-20260602-003 — Grupos de Veículos (approved)

> **2026-07-13 (T2.2):** CRUD core implementado (RF-01 a RF-07) via `VehicleGroupsModule`
> (NestJS REST API) + frontend mínimo, seguindo o padrão de SPEC-20260602-002 em vez de
> Server Actions (mudança registrada no changelog da spec). Ficam pendentes, como itens que
> dependem do sistema Em Foco/dashboard ainda não construídos (Fase 5): `FleetAside`,
> `FleetCommand`, `GroupKpiSummary`, integração com `activeGroupId` no store Zustand e com o
> query param `groupId` na URL (RF-08 a RF-15).

### Banco de dados

| Artefato | Descrição | Regra | Status |
|----------|-----------|-------|--------|
| `supabase/migrations/20260712171846_grouping_templates_preferences.sql` | Tabelas `vehicle_groups` (id, user_id FK, name, color, timestamps) e `vehicle_group_members` (group_id FK, vehicle_id FK, PK composta) | — | 🔶 Aplicado (sem teste) |
| RLS `vehicle_groups_owner` + `vehicle_group_members_owner` | `supabase/migrations/20260712172047_rls_policies.sql` — policies `for all` por `user_id` (groups) e por ownership transitivo via join (members) | S2 | 🔶 |

### API (backend) — `VehicleGroupsModule`

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01/RF-02/CA-01..03 | `POST /vehicle-groups`: cria grupo com `name` + `color`; valida via `createGroupInputSchema` | `apps/api/src/modules/vehicle-groups/vehicle-groups.controller.ts`, `vehicle-groups.service.ts` | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.spec.ts`, `vehicle-groups.controller.spec.ts` | ✅ |
| RF-08 | `GET /vehicle-groups`: lista grupos do usuário com `member_count` (agregação `vehicle_group_members(count)`) | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.ts` | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.spec.ts` | ✅ |
| RF-03/CA-08 | `PATCH /vehicle-groups/:id`: atualiza `name`/`color` por `id + user_id`; 404 se não for do dono | `apps/api/src/modules/vehicle-groups/vehicle-groups.controller.ts`, `vehicle-groups.service.ts` | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.spec.ts` | ✅ |
| RF-04/R-GRP-04/CA-07 | `DELETE /vehicle-groups/:id`: hard-delete; cascade FK remove membros | `apps/api/src/modules/vehicle-groups/vehicle-groups.controller.ts`, `vehicle-groups.service.ts` | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.spec.ts` | ✅ |
| RF-05/RF-06/RF-07/R-GRP-01..03/CA-04..06 | `PUT /vehicle-groups/:id/members`: replace-all; valida max 200 ids via schema; descarta veículos sem ownership ou soft-deletados | `apps/api/src/modules/vehicle-groups/vehicle-groups.controller.ts`, `vehicle-groups.service.ts` | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.spec.ts` | ✅ |
| RNF-01/RNF-02/S1/S2 | Toda mutação usa client Supabase escopado pelo JWT do usuário (`clientForUser`) + filtro `user_id` redundante à RLS | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.ts` | `apps/api/src/modules/vehicle-groups/vehicle-groups.service.spec.ts` | ✅ |

### Schema / Validação

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01/RF-16 | `createGroupInputSchema`/`updateGroupInputSchema`/`setGroupMembersInputSchema`, `PRESET_GROUP_COLORS` | `packages/validators/src/vehicle-group.schemas.ts` | `packages/validators/src/vehicle-group.schemas.spec.ts` | ✅ |

### Frontend

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-08 | `/vehicle-groups`: listagem com contagem de membros | `apps/web/src/app/vehicle-groups/page.tsx` | `apps/web/src/app/vehicle-groups/page.spec.tsx` | ✅ |
| RF-01/RF-05/RF-09 (parcial) | `/vehicle-groups/new`: formulário de criação (nome, paleta preset, checkboxes de veículos) | `apps/web/src/app/vehicle-groups/new/page.tsx` | `apps/web/src/app/vehicle-groups/new/page.spec.tsx` | ✅ |
| RF-03/RF-04/RF-05 | `/vehicle-groups/[id]`: edição de nome/cor, gerenciamento de membros, exclusão | `apps/web/src/app/vehicle-groups/[id]/page.tsx` | `apps/web/src/app/vehicle-groups/[id]/page.spec.tsx` | ✅ |
| RF-08..RF-11 | `FleetAside`: chips de grupos; formulário inline criar/editar; ativar modo `group` no store — depende do dashboard (Fase 5) | — | — | ⏳ |
| RF-12/RF-13 | `FleetCommand`: chips de grupos para filtro rápido; `GroupKpiSummary` filtrado por vehicleIds — depende do dashboard (Fase 5) | — | — | ⏳ |
| RF-10/RF-11/R-CTX-02 | `activeGroupId` no store Zustand + persistência em localStorage + query param `groupId` na URL — depende do sistema Em Foco (SPEC-20260602-001, Fase 5) | — | — | ⏳ |
| RF-14/RF-15 | Limpeza silenciosa de contexto ao excluir grupo ativo / detectar staleness — depende do item acima | — | — | ⏳ |

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

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01/RF-07 | `vehicleBaseSchema`/`createVehicleInputSchema`/`updateVehicleInputSchema` (Zod) | `packages/validators/src/vehicle.schemas.ts` | `packages/validators/src/vehicle.schemas.spec.ts` | ✅ |
| RF-02/R-VEH-02 | `plateSchema` + `normalizePlate`: uppercase sem hífen, valida BR/Mercosul | `packages/validators/src/vehicle.schemas.ts` | `packages/validators/src/vehicle.schemas.spec.ts` | ✅ |

### API (backend)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01/RF-02/CA-01 | `POST /vehicles`: cria veículo; placa normalizada via `LicensePlate` VO | `apps/api/src/modules/vehicles/vehicles.controller.ts`, `vehicles.service.ts` | `apps/api/src/modules/vehicles/vehicles.service.spec.ts`, `vehicles.controller.spec.ts` | ✅ |
| RF-03/RF-16/CA-04 | `GET /vehicles`: lista veículos do `user_id` do JWT com `deleted_at IS NULL` | `apps/api/src/modules/vehicles/vehicles.controller.ts`, `vehicles.service.ts` | `apps/api/src/modules/vehicles/vehicles.service.spec.ts` | ✅ |
| RF-04/RF-15/RF-16/CA-08 | `GET /vehicles/:id`: busca por `id + user_id`; retorna 404 se não encontrado ou de outro usuário | `apps/api/src/modules/vehicles/vehicles.controller.ts`, `vehicles.service.ts` | `apps/api/src/modules/vehicles/vehicles.service.spec.ts` | ✅ |
| RF-05/CA-07 | `PATCH /vehicles/:id`: atualiza campos parciais; verifica propriedade | `apps/api/src/modules/vehicles/vehicles.controller.ts`, `vehicles.service.ts` | `apps/api/src/modules/vehicles/vehicles.service.spec.ts` | ✅ |
| RF-06/R-VEH-01/CA-05/CA-06 | `DELETE /vehicles/:id`: soft-delete em cascata — vehicle + expenses + maintenances via `Promise.all` | `apps/api/src/modules/vehicles/vehicles.controller.ts`, `vehicles.service.ts` | `apps/api/src/modules/vehicles/vehicles.service.spec.ts` | ✅ |
| RF-02/R-VEH-02/CA-01..03 | `LicensePlate` VO valida e normaliza placa (BR + Mercosul); placa inválida lança 400 | `apps/api/src/modules/vehicles/value-objects/license-plate.vo.ts` | `apps/api/src/modules/vehicles/value-objects/license-plate.vo.spec.ts` | ✅ |
| RF-17/C2 | Audit log (`VEHICLE_CREATED`/`VEHICLE_UPDATED`/`VEHICLE_DELETED`) registrado em mutações via `AuditService.log` fire-and-forget | `apps/api/src/modules/vehicles/vehicles.service.ts` | `apps/api/src/modules/vehicles/vehicles.service.spec.ts` | ✅ |
| RNF-04 | Nota de risco preservada da spec original: os 3 updates do soft-delete cascata rodam em `Promise.all` sem RPC transacional — falha parcial é teoricamente possível; melhoria futura registrada nas Notas Técnicas da spec | `apps/api/src/modules/vehicles/vehicles.service.ts` | — | 🔶 Risco conhecido, não bloqueante |

### Frontend

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-03/CA-04 | `/vehicles`: listagem de veículos ativos | `apps/web/src/app/vehicles/page.tsx` | `apps/web/src/app/vehicles/page.spec.tsx` | ✅ |
| RF-01/CA-01/CA-02 | `/vehicles/new`: formulário de cadastro (campos obrigatórios apenas) | `apps/web/src/app/vehicles/new/page.tsx` | `apps/web/src/app/vehicles/new/page.spec.tsx` | ✅ |
| RF-04/RF-05/CA-07/CA-08 | `/vehicles/[id]`: ficha do veículo com edição parcial (apelido, cor) | `apps/web/src/app/vehicles/[id]/page.tsx` | `apps/web/src/app/vehicles/[id]/page.spec.tsx` | ✅ |
| RF-06/CA-05 | Confirmação de remoção (soft-delete) via `window.confirm` — sem componente `AlertDialog` dedicado, pendente do Design System (Fase 8, T8.1) | `apps/web/src/app/vehicles/[id]/page.tsx` | `apps/web/src/app/vehicles/[id]/page.spec.tsx` | 🔶 |
| RF-07 | Campos opcionais além de apelido/cor (foto, combustível, documentação, motor) não expostos no formulário mínimo desta tarefa | — | — | ⏳ |
| RF-11 | Upload de foto de capa com `PhotoFramingDialog` | — | — | ⏳ |
| RF-12 | Autocomplete FIPE via `FipeCombobox` | — | — | ⏳ |
| RF-13 | `/vehicles/[id]/history`: histórico de atividades via `ActivityTimelineView.tsx` | — | — | ⏳ |
| RF-14 | `/vehicles/[id]/manage`: gestão de documentação e especificações técnicas | — | — | ⏳ |
| RF-09/RF-10 | `QuickVehicleRegister`: fluxo de onboarding para primeiro veículo | — | — | ⏳ |

---

## SPEC-20260602-001 — Sistema Em Foco: Contexto de Veículo Global (approved)

> Torna o contexto de veículo/grupo/seleção visível de forma persistente em toda a aplicação.
> Sincroniza formulários transacionais com o contexto ativo.
> **2026-07-15 (T5.3a):** Divergência encontrada — a spec presumia `Sidebar`/`FleetAside`
> já existentes; o repositório não tinha nenhum app shell (`layout.tsx` era só `QueryProvider`,
> cada página um `<main>` solto). T5.3 foi dividida em sub-tarefas (T5.3a-d). Esta rodada
> (T5.3a) criou o pré-requisito: rota group `app/(app)/` (páginas autenticadas movidas para lá)
> + `components/layout/sidebar.tsx` com nav básica.
> **2026-07-15 (T5.3b):** `use-dashboard-store.ts` (5 modos, R-CTX-01/02) e `focus-slot.tsx`
> (RF-01–06, com botão "Trocar" abrindo seletor inline de veículo/grupo) implementados e
> integrados ao `Sidebar` (expandido e recolhido via `isSidebarCollapsed` em `ui-store.ts`).
> RF-07 a RF-19 (integração com formulários, `VehicleActivator`, staleness) ficam para
> T5.3c/T5.3d.
> **2026-07-15 (T5.3c):** `VehicleActivator` (bootstrap `?vehicleId=`/`?groupId=` na URL →
> store, e `ContextFilterSync` store → URL via `window.location.search` não-reativo, RF-15,
> RF-17.1, R-CTX-04) e `FleetAside` (staleness de `activeVehicleId`/`activeGroupId`, RF-16,
> reaproveitando as query keys `["vehicles"]`/`["vehicle-groups"]` já usadas pelo `focus-slot`
> — sem request extra, RNF-03) implementados. RF-19 (logout limpa contexto) exigiu criar
> `apps/web/src/lib/auth/logout.ts` e um botão "Sair" no `Sidebar` — não havia nenhum
> mecanismo de logout no frontend até esta rodada (endpoint `POST /auth/logout` já existia
> no backend, sem consumidor no cliente).
> **2026-07-15 (T5.3d):** `use-vehicle-context-field.ts` (RF-07, RF-13, RF-14, R-CTX-06) e
> `vehicle-recency.ts` (RF-12) implementados e integrados a `expenses/new/page.tsx` e
> `maintenance/new/page.tsx`. **Desvios de escopo, documentados em IMPACTO-032:** RF-09
> (lista de veículos pré-filtrada pelos membros do grupo) mostra a dica textual do grupo mas
> não filtra a lista — não existe endpoint que retorne os IDs de membros de um grupo
> específico (só `PUT /vehicle-groups/:id/members`, replace-all); RF-11 (dropdown filtrado por
> atributo) funciona apenas client-side, sobre a lista de veículos já carregada. Ambos os
> gaps ficam registrados para tratamento futuro (endpoint dedicado, se o modo `group`/
> `attribute` ganhar um seletor de UI real — hoje só acionável via API/store direto).

### Frontend

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| — | Pré-requisito (T5.3a): app shell — route group `(app)` + `Sidebar` com navegação | `apps/web/src/app/(app)/layout.tsx`, `apps/web/src/components/layout/sidebar.tsx` | `apps/web/src/components/layout/sidebar.spec.tsx` | ✅ |
| R-CTX-01/R-CTX-02 | `use-dashboard-store.ts`: 5 modos de contexto (`none`/`single`/`group`/`multi`/`attribute`), `clearAllSelection`, persistência seletiva (`single`/`group` via localStorage; `multi`/`attribute` efêmeros) | `apps/web/src/lib/stores/use-dashboard-store.ts` | `apps/web/src/lib/stores/use-dashboard-store.spec.ts` | ✅ |
| RF-01, RF-02, RF-03, RF-06 | `focus-slot.tsx`: slot "Em Foco" com os 5 estados visuais, label por modo, botão "×" (`clearAllSelection`) | `apps/web/src/components/layout/focus-slot.tsx` | `apps/web/src/components/layout/focus-slot.spec.tsx` | ✅ |
| RF-04 | Sidebar recolhido: slot mostra só ícone + dot, tooltip nativo (`title`) com detalhes | `apps/web/src/components/layout/focus-slot.tsx`, `apps/web/src/lib/stores/ui-store.ts` (`isSidebarCollapsed`) | — | ✅ (tooltip via `title` nativo, sem componente de tooltip customizado) |
| RF-05 | Botão "Trocar" abre seletor inline (lista de veículos/grupos) | `apps/web/src/components/layout/focus-slot.tsx` | — | 🟡 Funcional, mas é uma lista simples sem busca/paginação — suficiente para o volume atual de veículos por usuário |
| RNF-05 | Nomenclatura canônica centralizada | `apps/web/src/lib/context/context-labels.ts` | — | ✅ |
| RNF-01/RNF-02 | Slot reserva espaço fixo antes da hidratação (evita CLS); render inicial não bloqueia em rede | `apps/web/src/components/layout/focus-slot.tsx` | — | ✅ |
| RF-15, R-CTX-04 | `VehicleActivator`: único componente que sincroniza URL↔store; bootstrap de `?vehicleId=`/`?groupId=` no mount | `apps/web/src/components/layout/vehicle-activator.tsx` | `apps/web/src/components/layout/vehicle-activator.spec.tsx` | ✅ |
| RF-17.1 | `ContextFilterSync` (mesma implementação): reage só a mudanças do store; lê `window.location.search` não-reativamente para não conflitar com filtros locais de página | `apps/web/src/components/layout/vehicle-activator.tsx` | `apps/web/src/components/layout/vehicle-activator.spec.tsx` | ✅ |
| RF-16 | `FleetAside`: staleness de `activeVehicleId` (toast + clear) e `activeGroupId` (clear silencioso) | `apps/web/src/components/layout/fleet-aside.tsx` | `apps/web/src/components/layout/fleet-aside.spec.tsx` | ✅ |
| RNF-03 | Staleness reaproveita as query keys `["vehicles"]`/`["vehicle-groups"]` já ativas no `focus-slot` — sem request extra (dedupe do TanStack Query) | `apps/web/src/components/layout/fleet-aside.tsx` | — | ✅ |
| RNF-04 | Toast não-obstrutivo, descartável, some sozinho em 5s | `apps/web/src/components/layout/context-stale-toast.tsx` | `apps/web/src/components/layout/context-stale-toast.spec.tsx` | ✅ |
| RF-19 | Logout limpa todos os campos de contexto | `apps/web/src/lib/auth/logout.ts`, botão "Sair" em `sidebar.tsx` | `apps/web/src/lib/auth/logout.spec.ts` | ✅ |
| RF-07, R-CTX-06 | `use-vehicle-context-field.ts`: captura o contexto do store apenas no mount; pré-seleciona `vehicle_id` só no modo `single` | `apps/web/src/lib/hooks/use-vehicle-context-field.ts` | `apps/web/src/lib/hooks/use-vehicle-context-field.spec.tsx` | ✅ |
| RF-08 | Ícone ↩ + fundo/borda âmbar quando o campo está herdado do contexto | `apps/web/src/app/(app)/expenses/new/page.tsx`, `.../maintenance/new/page.tsx` | `page.spec.tsx` de cada formulário | ✅ |
| RF-09 | Modo `group`: campo vazio + dica com nome do grupo | `use-vehicle-context-field.ts` | — | 🟡 Dica textual pronta; lista **não** é pré-filtrada pelos membros — não existe endpoint `GET` para os IDs de membros de um grupo específico (só `PUT .../members`, replace-all) |
| RF-10 | Modo `multi`: dica "N veículos selecionados" + atalhos | `use-vehicle-context-field.ts` | `use-vehicle-context-field.spec.tsx` | ✅ |
| RF-11 | Modo `attribute`: dropdown filtrado pelo atributo ativo | `use-vehicle-context-field.ts` | `use-vehicle-context-field.spec.tsx` | 🟡 Filtragem client-side sobre a lista já carregada; modo `attribute` ainda não tem seletor de UI (só acionável via store/API direto) |
| RF-12 | Modo `none`: atalhos dos últimos veículos acessados | `apps/web/src/lib/vehicle-recency.ts`, `use-vehicle-context-field.ts` | `expenses/new/page.spec.tsx` ("modo none: exibe os veículos recentes") | ✅ |
| RF-13 | Seleção manual troca o ícone para ✓ e remove o visual âmbar | `use-vehicle-context-field.ts` | `page.spec.tsx` de cada formulário ("troca para indicador ✓") | ✅ |
| RF-14 | Mudança de contexto com formulário aberto não reseta o campo; aviso com ação "Atualizar campo" | `use-vehicle-context-field.ts` | `expenses/new/page.spec.tsx` ("mudança de contexto com o formulário aberto") | ✅ (aviso inline no formulário, não o toast fixo global de RF-16 — natureza diferente: ação específica do campo, não staleness) |
| RF-17 (dashboard/listas) | Filtragem de KPIs, Spotlight, listas de despesas/manutenções pelo contexto ativo | — | — | ⏳ Sync já existe (T5.3c); filtragem em si depende da Fase 5/6 (dashboard e listas ainda não leem o store) |
| RF-18 | `/vehicles/[id]` e `/settings` ignoram o contexto | — | — | ⏳ Trivial (não fazem leitura do store hoje) — confirmar quando o contexto passar a influenciar outras páginas |
| RF-17 | `expenses/page.tsx` e `maintenance/page.tsx`: filtro por contexto via `ContextFilterSync` | — | — | ⏳ |

---

## SPEC-20260601-003 — Sistema de Modelos Rápidos de Despesas (approved)

> **2026-07-14 (T3.4):** Implementado. Tabela, índices, trigger de limite (RNF-06) e RLS já
> existiam desde T0.2 (schema recuperado do banco remoto) — nenhuma migration nova necessária.
> `ExpenseTemplatesModule` sem camada Repository/Port, mesmo padrão inline de
> `CategoriesModule`/`ExpensesModule`. **Desvios deliberados de escopo frente à spec** (frontend
> deste projeto usa formulários HTML simples, sem `react-hook-form`, modal ou design system —
> mesmo padrão já estabelecido em `/expenses/new` e `/expenses/[id]`):
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
> RF-13 (aviso de veículo excluído) foi implementado no frontend via comparação client-side com
> a lista de veículos ativos, sem o ícone âmbar especificado — mensagem inline apenas.

### Banco de dados

| Artefato | Descrição | Regra | Status |
|----------|-----------|-------|--------|
| `supabase/migrations/20260712171846_grouping_templates_preferences.sql` | Tabela `expense_templates` (id, user_id FK, vehicle_id FK, name, category, amount, description, liters, fuel_type, supplier, timestamps) | R3, R6 | ✅ |
| Trigger `trg_expense_templates_limit` | `supabase/migrations/20260712171941_trigger_functions.sql` — `enforce_expense_templates_limit()`, bloqueia o 21º insert | R3, RNF-06 | ✅ |
| RLS `expense_templates_*` | `supabase/migrations/20260712172047_rls_policies.sql` — policies SELECT, INSERT, UPDATE, DELETE por `user_id` | S1, S2, RNF-04 | ✅ |

### Validators (`packages/validators`)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-06, R6 | `createExpenseTemplateInputSchema`/`updateExpenseTemplateInputSchema` — sem `date`/`odometer_km`/`full_tank` | `packages/validators/src/expense-template.schemas.ts` | `packages/validators/src/expense-template.schemas.spec.ts` | ✅ |

### Backend (`apps/api`)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | `GET /expense-templates` — lista ordenada por `last_used_at DESC` | `apps/api/src/modules/expense-templates/expense-templates.service.ts` (`findAll`) | `expense-templates.service.spec.ts` | ✅ |
| RF-06, RF-07, RNF-06 | `POST /expense-templates` — valida veículo ativo do usuário e limite de 20 (422) antes do insert | `expense-templates.service.ts` (`create`) | `expense-templates.service.spec.ts` | ✅ |
| RF-08 | `PATCH /expense-templates/:id/touch` — bump de `last_used_at` | `expense-templates.service.ts` (`touch`), `expense-templates.controller.ts` | `expense-templates.service.spec.ts`, `.controller.spec.ts` | ✅ |
| RF-09 | `PATCH /expense-templates/:id` — atualização parcial (nome/campos) | `expense-templates.service.ts` (`update`) | `expense-templates.service.spec.ts` | ✅ |
| RF-10, CA-08 | `DELETE /expense-templates/:id` — hard delete após checagem de ownership | `expense-templates.service.ts` (`remove`) | `expense-templates.service.spec.ts` | ✅ |
| RNF-04, RNF-05 | `SupabaseAuthGuard` + RLS (`auth.uid()`) em todas as rotas | `expense-templates.controller.ts` | `expense-templates.controller.spec.ts` | ✅ |

### Frontend (`apps/web`)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01, RF-02, RF-11 | Tray de modelos no topo de `/expenses/new`, estado vazio, scroll horizontal | `apps/web/src/app/expenses/new/page.tsx` (`ExpenseTemplatesTray`) | `page.spec.tsx` | ✅ |
| RF-03, RF-04 | Aplicação de modelo preenche `vehicle_id`/`category`/`amount`/`description`; `date`/`odometer_km` inalterados | `page.tsx` (`handleApplyTemplate`) | `page.spec.tsx` | ✅ |
| RF-05 | Criação inline de modelo (formulário expansível, não modal — ver nota acima) | `page.tsx` (`ExpenseTemplatesTray`, `creating`) | `page.spec.tsx` | 🔶 (sem teste de criação inline dedicado) |
| RF-06, CA-10 | "Salvar como modelo" em `/expenses/[id]` | `apps/web/src/app/expenses/[id]/page.tsx` (`handleSaveAsTemplate`) | `page.spec.tsx` | ✅ |
| RF-07, CA-06 | Botão "+" desabilitado ao atingir 20 modelos | `page.tsx` (`ExpenseTemplatesTray`, `atLimit`) | — | 🔶 (sem teste dedicado) |
| RF-08 | Aplicação dispara `PATCH .../touch` fire-and-forget | `page.tsx` (`handleApply`, `touchMutation`) | `page.spec.tsx` | ✅ |
| RF-09 | Renomear via menu de contexto | — | — | ⏳ deliberado (ver nota acima) |
| RF-10, CA-08 | Exclusão de modelo com confirmação | `page.tsx` (`handleDelete`) | — | 🔶 (sem teste dedicado) |
| RF-13, EC-01 | Aviso inline (sem ícone âmbar) quando `vehicle_id` do modelo não existe mais entre os veículos ativos | `page.tsx` (`handleApplyTemplate`, `templateNotice`) | — | 🔶 (sem teste dedicado) |
| RF-02 (responsivo), Feature flag | Contagem exata de cartões por breakpoint; `NEXT_PUBLIC_EXPENSE_TEMPLATES_ENABLED` | — | — | ⏳ deliberado (ver nota acima) |

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
> (a spec invoca a busca *após* o insert), gerando falso positivo em toda criação sem duplicata
> real. Exibição do aviso no frontend fica ⏳ deliberadamente, mesma justificativa de T3.2.

### Camada de serviço

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | `findPotentialDuplicate(userId, vehicleId, date, amount, category, excludeExpenseId)` — método privado do service | `apps/api/src/modules/expenses/expenses.service.ts` (`findPotentialDuplicate`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| RF-02 | `ExpensesService.create()`: invoca `findPotentialDuplicate()` após o insert bem-sucedido | `apps/api/src/modules/expenses/expenses.service.ts` (`create`, `buildDuplicateWarning`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| RF-03 | Enriquece resposta com `duplicate_warning: true` e `duplicate_id`; HTTP 201 mantido | `apps/api/src/modules/expenses/expenses.service.ts` (`buildDuplicateWarning`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| RF-04 | Sem `duplicate_warning` quando `findPotentialDuplicate` retorna `null` | `apps/api/src/modules/expenses/expenses.service.ts` (`buildDuplicateWarning`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| RF-05 | Apenas registros com `deleted_at IS NULL` são candidatos a duplicata | `apps/api/src/modules/expenses/expenses.service.ts` (`findPotentialDuplicate`, `.is("deleted_at", null)`) | — | 🔶 (filtro aplicado; sem teste dedicado ao soft-delete neste método) |
| RF-06 | `ExpensesService.update()` não invoca `findPotentialDuplicate` | `apps/api/src/modules/expenses/expenses.service.ts` (`update`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| EC-05 | Falha na consulta de duplicata degrada graciosamente (loga e não bloqueia) | `apps/api/src/modules/expenses/expenses.service.ts` (`buildDuplicateWarning`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |

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

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | `ExpensesService.create()`/`update()`: pula verificação quando `odometer_km` é `null` ou ausente | `apps/api/src/modules/expenses/expenses.service.ts` (`buildOdometerWarning`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| RF-02 | `findMaxOdometerByVehicle(vehicleId, userId, excludeExpenseId?)` — método privado do service (sem Repository/Port; consulta Supabase inline, mesmo padrão do restante do módulo) | `apps/api/src/modules/expenses/expenses.service.ts` (`findMaxOdometerByVehicle`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| RF-03 | `ExpensesService.create()`/`update()`: enriquece resposta com `odometer_warning: true` e `odometer_previous_max_km` | `apps/api/src/modules/expenses/expenses.service.ts` (`buildOdometerWarning`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| RF-04 | Sem warning quando `odometer_km >= máximo` ou sem registros anteriores | `apps/api/src/modules/expenses/expenses.service.ts` (`buildOdometerWarning`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| RF-05 | `ExpensesService.update()`: exclui o próprio registro da comparação via `excludeExpenseId` | `apps/api/src/modules/expenses/expenses.service.ts` (`update`, `findMaxOdometerByVehicle`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| RF-06 | Verificação considera apenas `deleted_at IS NULL` | `apps/api/src/modules/expenses/expenses.service.ts` (`findMaxOdometerByVehicle`) | — | 🔶 (filtro aplicado via `.is("deleted_at", null)`; sem teste dedicado ao filtro de soft-delete neste método) |
| EC-05 | Falha na consulta de máximo degrada graciosamente (loga e não bloqueia) | `apps/api/src/modules/expenses/expenses.service.ts` (`buildOdometerWarning`) | `apps/api/src/modules/expenses/expenses.service.spec.ts` | ✅ |
| NG-05 | Exibição do warning no frontend | — | — | ⏳ deliberado — fora do escopo desta spec (ver nota acima) |

---

## SPEC-20260525-001 — Design System: Novos Componentes UI (rascunho)

> Define 11 novos componentes para o dashboard mobile-first. Status: rascunho — nenhum
> componente implementado.

| Componente | Arquivo destino planejado | Status |
|------------|--------------------------|--------|
| `KpiCard` (vertical + sparkline) | `packages/ui/src/components/kpi-card.tsx` | ⏳ |
| `ChartWrapper` | `packages/ui/src/components/chart-wrapper.tsx` | ⏳ |
| `Steps` (horizontal) | `packages/ui/src/components/steps.tsx` | ⏳ |
| `Tabs` | `packages/ui/src/components/tabs.tsx` | ⏳ |
| `Breadcrumb` | `packages/ui/src/components/breadcrumb.tsx` | ⏳ |
| `Combobox` | `packages/ui/src/components/combobox.tsx` | ⏳ |
| `DateRangePicker` | `packages/ui/src/components/date-range-picker.tsx` | ⏳ |
| `FileUpload` | `packages/ui/src/components/file-upload.tsx` | ⏳ |
| `Alert` | `packages/ui/src/components/alert.tsx` | ⏳ |
| `Toast` | `packages/ui/src/components/toast.tsx` | ⏳ |
| `EmptyState` | `packages/ui/src/components/empty-state.tsx` | ⏳ |

---

## SPEC-20260524-002 — Cadastro de Conta: Regras de Senha e Frontend (aprovado)

> Atualiza SPEC-20260524-001 §4.1 (nova regra de senha: 6 chars + letra + número + especial) e
> documenta stories STORY-01 a STORY-04 de frontend do fluxo de cadastro.
> Implementado em 2026-07-13 como parte da Fase 1 do roadmap (T1.1–T1.5). Schema Zod autoritativo
> em `packages/validators/src/auth.schemas.ts` — SPEC-20260524-001 §4.1 supersedida por esta regra.

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01/STORY-02 | `registerInputSchema`: aceita 6+ chars com letra + número + especial | `packages/validators/src/auth.schemas.ts` | `apps/web/` (Vitest, 42 testes, 91%+ cobertura) | ✅ |
| RF-02/STORY-02 | `registerInputSchema`: rejeita senha sem letra, sem número, sem especial | `packages/validators/src/auth.schemas.ts` | `apps/web/` (Vitest) | ✅ |
| RF-03/STORY-02 | `resetPasswordInputSchema`: mesma nova regra de senha | `packages/validators/src/auth.schemas.ts` | `apps/web/` (Vitest) | ✅ |
| RF-04/STORY-02 | Mensagem inline por campo violado (não batch) | `apps/web/src/app/(auth)/register/page.tsx` | `apps/web/` (Vitest) | ✅ |
| RF-05/STORY-03 | Email duplicado (409) → bloco amarelo com email, botão login e botão recuperar senha | `apps/web/src/app/(auth)/register/page.tsx` | `apps/web/` (Vitest) | ✅ |
| RF-07/STORY-03 | Link "Recuperar senha" → `/recover-password?email={encoded}` | `apps/web/src/app/(auth)/register/page.tsx` | `apps/web/` (Vitest) | ✅ |
| RF-08/STORY-04 | Erro de sistema (não-409) → bloco vermelho com mensagem do Supabase | `apps/web/src/app/(auth)/register/page.tsx` | `apps/web/` (Vitest) | ✅ |
| RF-09/STORY-04 | Formulário NÃO resetado após erro — dados persistem para reenvio | `apps/web/src/app/(auth)/register/page.tsx` | `apps/web/` (Vitest) | ✅ |
| RF-10/STORY-01 | Email normalizado para lowercase via `.transform()` no schema Zod | `packages/validators/src/auth.schemas.ts` | `apps/web/` (Vitest) | ✅ |

---

## SPEC-20260524-001 — Autenticação e Cadastro (Unificada) (aprovado)

> Consolida: `stories.md §1, §7, §8`, `ADR-003 (lifecycle)`, rate limits de SPEC-001.
> Mudança principal: lifecycle de sessão — 30 min idle sem atividade / 7 dias com "lembrar de mim".
> Implementado em 2026-07-13 como parte da Fase 1 do roadmap (T1.1–T1.5).
> Rate limits de auth são autoritativos nesta spec (SPEC-20260521-001 §RF-SEC-004 supersedida).

### Backend — AuthModule

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| STORY-REG-01 | Registro com rollback atômico em falha de criação de perfil; `POST /auth/register` | `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/modules/auth/dto/register.dto.ts` | `apps/api/` (Jest, 67 testes, 90%+ cobertura); `apps/api/test/integration/auth.int-spec.ts` (CT-006) | ✅ |
| STORY-REG-01 | E-mail duplicado → 409 + mensagem direcionada no frontend | `apps/api/src/modules/auth/auth.service.ts` | `apps/api/` (Jest) | ✅ |
| STORY-01 | `POST /auth/login` — retorna JWT; audit REGISTER/LOGIN | `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/modules/auth/dto/login.dto.ts`, `apps/api/src/modules/auth/jwt.strategy.ts` | `apps/api/` (Jest); `apps/api/test/integration/auth.int-spec.ts` | ✅ |
| STORY-02 | Mensagem INVALID_CREDENTIALS genérica (anti-enumeração) | `apps/api/src/modules/auth/auth.service.ts` | `apps/api/` (Jest) | ✅ |
| STORY-03 | Bloqueio por tentativas via `supabase/migrations/20260713190000_auth_login_attempts.sql` | `supabase/migrations/20260713190000_auth_login_attempts.sql`, `apps/api/src/modules/auth/auth.service.ts` | `apps/api/` (Jest) | ✅ |
| STORY-04 | `POST /auth/recover-password` → 200 sempre; rate limit 3/15min | `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/modules/auth/dto/recover-password.dto.ts` | `apps/api/` (Jest) | ✅ |
| STORY-05 | `POST /auth/reset-password` — valida token Supabase; invalida sessões anteriores | `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/modules/auth/dto/reset-password.dto.ts` | `apps/api/` (Jest) | ✅ |
| STORY-SEC-01 | `POST /auth/logout` e `POST /auth/refresh` com `SupabaseAuthGuard` | `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/common/guards/supabase-auth.guard.ts` | `apps/api/` (Jest) | ✅ |
| CA-20 | audit_logs registra REGISTER e LOGIN com campos corretos | `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/shared/audit/audit.service.ts` | `apps/api/` (Jest) | ✅ |

### Frontend — Páginas de Auth e Gestão de Sessão

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| STORY-01 | Redirect para rota original após login; usuário logado em /login → /dashboard | `apps/web/middleware.ts`, `apps/web/src/app/(auth)/login/page.tsx` | `apps/web/` (Vitest, 42 testes, 91%+ cobertura) | ✅ |
| STORY-REG-02 | Toggle show/hide senha com aria-label acessível | `apps/web/src/components/password-input.tsx` | `apps/web/` (Vitest) | ✅ |
| STORY-04 | Reenvio de e-mail com cooldown de 60 s + rate limit 3/15min | `apps/web/src/app/(auth)/recover-password/page.tsx` | `apps/web/` (Vitest) | ✅ |
| STORY-05 | Link expirado/usado → mensagem amigável com botão de novo link | `apps/web/src/app/(auth)/reset-password/page.tsx` | `apps/web/` (Vitest) | ✅ |
| STORY-06 | "Lembrar de mim" → preferência em sessionStorage; idle timer ativado apenas sem lembrar | `apps/web/src/app/(auth)/login/page.tsx`, `apps/web/src/lib/hooks/use-activity-tracker.ts` | `apps/web/` (Vitest) | ✅ |
| STORY-07a | Hook `useActivityTracker`: idle timer 30 min, reset por evento/rota; renovação via `/auth/refresh` | `apps/web/src/lib/hooks/use-activity-tracker.ts`, `apps/web/src/lib/auth/decode-jwt-exp.ts` | `apps/web/` (Vitest) | ✅ |
| STORY-07b | `<FormDraftGuard>`: salva/restaura estado de formulário em sessionStorage | `apps/web/src/components/form-draft-guard.tsx` | `apps/web/` (Vitest) | ✅ |
| STORY-08 | Timeout/offline via `api-client.ts`; mensagem sem loading infinito | `apps/web/src/lib/http/api-client.ts` | `apps/web/` (Vitest) | ✅ |
| IMPACTO-021 #1 | Middleware SSR `apps/web/middleware.ts` — proteção de rotas + renovação de sessão | `apps/web/middleware.ts`, `apps/web/next.config.ts` (rewrite `/api/backend/*`) | `apps/web/` (Vitest) | ✅ |

---

## SPEC-20260521-005 — OpenAPI / Swagger (Aprovada)

> Documentação automática da API NestJS via `@nestjs/swagger`. Swagger UI acessível em `/api/docs`
> somente em `development` ou com `SWAGGER_ENABLED=true`. Módulo `admin` incluído na documentação.
> Implementado em 2026-07-13 como parte da Fase 1 do roadmap (T1.5).

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | Swagger UI em `/api/docs` em `development` ou com `SWAGGER_ENABLED=true` | `apps/api/src/main.ts` | `apps/api/` (Jest, 90%+ cobertura — integração não exposta em produção via RNF-01) | ✅ |
| RF-02 | Desabilitado em `production` (sem `SWAGGER_ENABLED=true`) | `apps/api/src/main.ts` | `apps/api/` (Jest) | ✅ |
| RF-03 | `@ApiTags` em todos os controllers (auth, users, admin, vehicles, expenses, maintenance, dashboard) | `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/modules/admin/admin.controller.ts`, demais controllers | `apps/api/` (Jest) | ✅ |
| RF-04 | `@ApiOperation` e `@ApiResponse` em cada endpoint | Todos os controllers em `apps/api/src/modules/` | `apps/api/` (Jest) | ✅ |
| RF-05 | Plugin automático via `apps/api/nest-cli.json` | `apps/api/nest-cli.json` | — (build-time) | ✅ |
| RF-06 | Bearer JWT documentado globalmente via `addBearerAuth` | `apps/api/src/main.ts` | — (visual) | ✅ |
| RF-07 | `@ApiBearerAuth` em endpoints protegidos | Todos os controllers com `SupabaseAuthGuard` | — (visual) | ✅ |
| RF-08 | `openapi.json` gerado via `pnpm docs:generate` | `apps/api/src/main.ts` | — (script de build) | 🔶 |

---

## SPEC-20260521-004 — Admin Role e Operações LGPD (Aprovada)

> Módulo admin com bypass de RLS via `AdminSupabaseService` (SERVICE_ROLE_KEY); auto-exclusão de
> conta LGPD em `DELETE /users/me`; audit de todas as operações admin.
> Implementado em 2026-07-13 como parte da Fase 1 do roadmap (T1.3–T1.4).
> Decisão pós-aprovação: admin identificado por `user_metadata.role = 'admin'` no JWT (RF-09);
> `DELETE /users/me` usa exclusão física via `auth.admin.deleteUser` + cascata FK (não soft-delete
> anonimizado do RF-02) — ver changelog no rodapé da spec.

### Backend — AdminModule e UsersModule

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | `DELETE /users/me` — auto-exclusão com `{ confirm: true }` | `apps/api/src/modules/users/users.controller.ts`, `apps/api/src/modules/users/users.service.ts` | `apps/api/` (Jest, 67 testes, 90%+ cobertura) | ✅ |
| RF-02 | Exclusão física via `auth.admin.deleteUser` + cascata FK `auth.users → profiles → demais` (satisfaz C1) | `apps/api/src/modules/users/users.service.ts` | `apps/api/` (Jest) | ✅ |
| RF-03 | Revogação de JWT via `auth.admin.deleteUser` | `apps/api/src/modules/users/users.service.ts` | `apps/api/` (Jest) | ✅ |
| RF-04 | `{ confirm: true }` obrigatório → 400 se ausente | `apps/api/src/modules/users/users.controller.ts` | `apps/api/` (Jest) | ✅ |
| RF-05 | `AdminSupabaseService` com `SERVICE_ROLE_KEY`; `AdminModule` e `SupabaseAdminModule` separados | `apps/api/src/modules/admin/admin-supabase.service.ts`, `apps/api/src/shared/supabase/supabase-admin.module.ts` | `apps/api/` (Jest) | ✅ |
| RF-06 | `GET /admin/users` — listar usuários (paginado, apenas admin) | `apps/api/src/modules/admin/admin.controller.ts`, `apps/api/src/modules/admin/admin.service.ts` | `apps/api/` (Jest) | ✅ |
| RF-07 | `GET /admin/audit-logs` — filtro por `user_id` e período | `apps/api/src/modules/admin/admin.controller.ts`, `apps/api/src/modules/admin/admin.service.ts` | `apps/api/` (Jest) | ✅ |
| RF-08 | `DELETE /admin/users/:id` — admin exclui qualquer conta (LGPD) | `apps/api/src/modules/admin/admin.controller.ts`, `apps/api/src/modules/admin/admin.service.ts` | `apps/api/` (Jest) | ✅ |
| RF-09 | Admin identificado por `user_metadata.role = 'admin'` no JWT; `SupabaseAuthGuard + RolesGuard/@Roles('admin')` | `apps/api/src/common/guards/roles.guard.ts`, `apps/api/src/common/decorators/roles.decorator.ts`, `apps/api/src/modules/admin/admin.controller.ts` | `apps/api/` (Jest) | ✅ |

### Backend — Decorators e Guards Comuns

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| — | `@UserId()` decorator — extrai userId do JWT para controllers | `apps/api/src/common/decorators/user-id.decorator.ts` | `apps/api/` (Jest) | ✅ |
| — | `GET /users/me` e `PATCH /users/me` — perfil do usuário autenticado | `apps/api/src/modules/users/users.controller.ts`, `apps/api/src/modules/users/users.service.ts` | `apps/api/` (Jest) | ✅ |

---

## SPEC-20260521-003 — Export CSV do Dashboard (Aprovada)

> **2026-07-14 (T3.1):** `DashboardModule` criado do zero — a spec assumia um `DashboardController`
> pré-existente (`GET /dashboard/stats`), mas nenhum módulo de dashboard havia sido implementado
> ainda (Fase 5, `SPEC-20260531-001`, ainda `draft`). Escopo desta tarefa ficou restrito ao
> endpoint de export descrito nesta spec — nenhum endpoint de estatísticas foi criado. Página
> `/dashboard` mínima criada apenas com o seletor de mês/veículo e o link de exportação; o
> redesign completo do Dashboard (Fleet Command + Vehicle Spotlight) permanece objeto da Fase 5.

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | `GET /dashboard/export` retorna arquivo CSV | `apps/api/src/modules/dashboard/dashboard.controller.ts`, `dashboard.service.ts` | `apps/api/src/modules/dashboard/dashboard.controller.spec.ts`, `dashboard.service.spec.ts` | ✅ |
| RF-02 | Filtro obrigatório: `period` (YYYY-MM) | `packages/validators/src/dashboard.schemas.ts` (`exportExpensesQuerySchema`) | `apps/api/src/modules/dashboard/dashboard.controller.spec.ts` | ✅ |
| RF-03 | Filtro opcional: `vehicle_id` | `apps/api/src/modules/dashboard/dashboard.service.ts` (`exportExpensesCsv`) | `apps/api/src/modules/dashboard/dashboard.service.spec.ts`, `dashboard.controller.spec.ts` | ✅ |
| RF-04 | Colunas: Data, Placa, Modelo, Categoria, Descrição, Valor | `apps/api/src/modules/dashboard/dashboard.service.ts` | `apps/api/src/modules/dashboard/dashboard.service.spec.ts` | ✅ |
| RF-05 | BOM UTF-8 no arquivo CSV (compatibilidade Excel) | `apps/api/src/modules/dashboard/dashboard.controller.ts` (`CSV_BOM`) | `apps/api/src/modules/dashboard/dashboard.controller.spec.ts` | ✅ |
| RF-06 | Nome do arquivo: `nave-despesas-{YYYY-MM}.csv` | `apps/api/src/modules/dashboard/dashboard.controller.ts` (`Content-Disposition`) | `apps/api/src/modules/dashboard/dashboard.controller.spec.ts` | ✅ |
| RF-07 | Botão "Exportar CSV" no Dashboard com seletor de mês | `apps/web/src/app/dashboard/page.tsx` | `apps/web/src/app/dashboard/page.spec.tsx` | ✅ |
| RF-08 | Isolamento por `user_id` do JWT | `apps/api/src/modules/dashboard/dashboard.service.ts` (`.eq("user_id", userId)`, `SupabaseAuthGuard`) | `apps/api/src/modules/dashboard/dashboard.service.spec.ts` | ✅ |
| RNF-03 | Limite de 5.000 linhas por exportação | `apps/api/src/modules/dashboard/dashboard.service.ts` (`CSV_MAX_ROWS`, `.limit`) | — | 🔶 (constante aplicada; sem teste de volume) |
| RNF-04 | Rate limiting 10 req/5min | `apps/api/src/modules/dashboard/dashboard.controller.ts` (`@Throttle`) | — | 🔶 (decorator aplicado; sem teste de integração do throttler) |

---

## SPEC-20260521-002 — Alertas de Manutenção por Email (aprovado)

> Job diário via pg_cron; Edge Function; envio via Resend. Nenhum código implementado.
> **Adiada em 2026-07-15** (decisão do usuário, não bloqueio técnico): Resend exige domínio
> próprio verificado para envio em produção — o projeto ainda não tem domínio registrado. A
> decisão foi vincular este recurso ao lançamento da monetização (Fase 9, `SPEC-20260620-001`),
> não à Fase 4. Retomar junto com T9.1, quando domínio e conta Resend estiverem disponíveis.

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | Job diário via pg_cron às 11:00 UTC | — | — | ⏸️ Adiado para Fase 9 |
| RF-02 | Edge Function busca manutenções `scheduled_date = +7d AND alert_sent = false` | — | — | ⏸️ Adiado para Fase 9 |
| RF-03 | Email com nome, data, veículo via Resend (com retry idempotente) | — | — | ⏸️ Adiado para Fase 9 |
| RF-04 | `alert_sent = true` somente após confirmação de envio | — | — | ⏸️ Adiado para Fase 9 |
| RF-05 | Não reenvia alertas já enviados (filtro `alert_sent = false` na query) | — | — | ⏸️ Adiado para Fase 9 |
| RF-06 | `MAINTENANCE_ALERT_SENT` em `audit_logs` com `record_id` da manutenção | — | — | ⏸️ Adiado para Fase 9 |
| RF-07 | Respeita soft delete (filtro `.is('deleted_at', null)` na query) | — | — | ⏸️ Adiado para Fase 9 |

---

## SPEC-20260521-001 — Hardening de Segurança (aprovado)

> Correções de segurança no backend NestJS: variáveis de ambiente (Joi), audit logs, rate limit
> diferenciado de auth, HttpExceptionFilter global, rollback scripts de migrations, AuditService.
> Implementado em 2026-07-13 como parte da Fase 1 do roadmap (T1.2).
> Rate limits de auth supersedidos pela tabela de SPEC-20260524-001 §4.2 (valores idênticos — sem conflito).

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-SEC-001 | `SUPABASE_URL` (sem prefixo `NEXT_PUBLIC_`) via `ConfigService`; env vars via Joi | `apps/api/src/common/config/env.validation.ts`, `apps/api/src/modules/auth/auth.module.ts` | `apps/api/` (Jest, 67 testes, 90%+ cobertura) | ✅ |
| RF-SEC-002 | `AuditService` — audit_logs com campos corretos (`action`, `table_name`, `record_id`, `changes`); fire-and-forget | `apps/api/src/shared/audit/audit.service.ts` | `apps/api/` (Jest) | ✅ |
| RF-SEC-002b | `AuditService.log()` não propaga exceção — try/catch + NestJS Logger | `apps/api/src/shared/audit/audit.service.ts` | `apps/api/` (Jest) | ✅ |
| RF-SEC-002c | Timestamp ISO injetado em `changes` (sobrescreve qualquer valor passado) | `apps/api/src/shared/audit/audit.service.ts` | `apps/api/` (Jest) | ✅ |
| RF-SEC-003 | `HttpExceptionFilter` global — sem stack trace em produção; shape `{ statusCode, message, timestamp }` | `apps/api/src/common/filters/http-exception.filter.ts` | `apps/api/` (Jest) | ✅ |
| RF-SEC-003b | Filter registrado em `main.ts` via `app.useGlobalFilters()` | `apps/api/src/main.ts` | `apps/api/` (Jest) | ✅ |
| RF-SEC-004 | Rate limit diferenciado: register 5/15min, login 10/15min, demais 100/60s (ThrottlerGuard global) | `apps/api/src/modules/auth/auth.controller.ts`, `apps/api/src/main.ts` | `apps/api/` (Jest) | ✅ |
| RF-SEC-005 | Rollback scripts para as migrations | `supabase/migrations/rollback/` | — (DDL manual) | ✅ |
| RF-SEC-006 | `SUPABASE_SERVICE_ROLE_KEY` e demais vars obrigatórias validados no Joi na startup | `apps/api/src/common/config/env.validation.ts` | `apps/api/` (Jest) | ✅ |
| RF-SEC-007 | `console.log` substituído por `Logger` do NestJS em `main.ts` | `apps/api/src/main.ts` | `apps/api/` (Jest) | ✅ |
| RF-SEC-008 | `AdminSupabaseService` inicializa com `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` isolados | `apps/api/src/modules/admin/admin-supabase.service.ts`, `apps/api/src/shared/supabase/supabase-admin.module.ts` | `apps/api/` (Jest) | ✅ |
| RF-SEC-009 | `SupabaseService` (anon) e `SupabaseAdminModule` (service-role) isolados; clients separados por módulo | `apps/api/src/shared/supabase/supabase.module.ts`, `apps/api/src/shared/supabase/create-user-scoped-client.ts`, `apps/api/src/shared/supabase/supabase.constants.ts` | `apps/api/` (Jest) | ✅ |

### Testes de Integração (novos — Fase 1)

| ID | Descrição | Arquivo | Status |
|----|-----------|---------|--------|
| CT-006 | 401 sem JWT; fluxo real de registro/login contra Supabase local | `apps/api/test/integration/auth.int-spec.ts` | ✅ |
| CT-007 | RLS bloqueia acesso a `profiles` de outro usuário | `apps/api/test/integration/rls.int-spec.ts` | ✅ |
| — | CI `integration-test` job — `supabase start` + testes de integração no pipeline | `.github/workflows/ci.yml` | ✅ |

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

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-SH-01, RF-SH-02 | `GET /dashboard/fleet-health` — wrapper de `calculate_fleet_health` | `apps/api/src/modules/dashboard/dashboard.service.ts` (`getFleetHealth`), `dashboard.controller.ts` | `dashboard.service.spec.ts`, `dashboard.controller.spec.ts` | ✅ |
| RF-DA-01, RF-DA-02 | `GET /dashboard/alerts` — alertas de manutenção vencida/próxima (7 dias), ordenados por urgência. Escopo Sprint 1: só manutenção; documentos entram na Sprint 3 (CA-S3-02) | `dashboard.service.ts` (`getAlerts`) | `dashboard.service.spec.ts` | ✅ |
| RF-DA-03, CA-S1-05, CA-S1-05.1 | `GET /dashboard/fleet-kpis` — 4 KPIs isolados via `Promise.allSettled`, `?vehicle_id=` só afeta "Próxima manutenção" | `dashboard.service.ts` (`getFleetKpis`, `countUrgentMaintenances`, `getFleetCostPerKm`, `getNextMaintenance`) | `dashboard.service.spec.ts` | ✅ |
| RF-DA-04 | `GET /dashboard/vehicle-cards` — odômetro, último abastecimento, status de documentos (sem reconciliação com `vehicle_recurring_costs`, RF-DB-06 é Sprint 3) | `dashboard.service.ts` (`getVehicleCards`, `getLastFuelExpense`, `classifyDocument`) | `dashboard.service.spec.ts` | ✅ |
| — | `VEHICLE_COLUMNS` passa a incluir `insurance_expires_at`/`crlv_expires_at` (lacuna pré-existente desde T0.2) | `apps/api/src/modules/vehicles/vehicles.service.ts` | `vehicles.service.spec.ts` (suíte existente, sem regressão) | ✅ |
| RF-BD-04 | `odometer_km` obrigatório para `category=fuel` | `packages/validators/src/expense.schemas.ts` (`requireOdometerForFuel`) | `expense.schemas.spec.ts` | ✅ (já satisfeito antes desta tarefa) |

### Frontend (`apps/web`) — Sprint 1

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-ST-01 | `dockOpen`/`setDockOpen` no store global (sem recriar `activeVehicleId`) | `apps/web/src/lib/stores/use-dashboard-store.ts` | `use-dashboard-store.spec.ts` | ✅ |
| RF-DA-01, RF-DA-02 | `FleetAlertBar` — máx. 3 itens + link "ver todos (+N)" para `/maintenance?filter=urgent` | `apps/web/src/components/dashboard/FleetAlertBar.tsx` | `FleetAlertBar.spec.tsx` | ✅ |
| RF-DA-03, CA-S1-05.1 | `FleetKpis` — 4 KPIs com fallback "—"/tooltip por card em falha isolada | `apps/web/src/components/dashboard/FleetKpis.tsx` | `page.spec.tsx` (via `DashboardPage`) | ✅ |
| RF-DA-04, RF-DA-05, RF-SH-01, RF-SH-02 | `VehicleHealthCard` — semáforo, odômetro, último abastecimento, badges de documento, click → `setActiveVehicle` | `apps/web/src/components/dashboard/VehicleHealthCard.tsx` | `VehicleHealthCard.spec.tsx` | ✅ |
| RF-DA-08 | Auto-seleção com exatamente 1 veículo | `apps/web/src/app/(app)/dashboard/page.tsx` (efeito de auto-seleção) | `page.spec.tsx` | ✅ |
| RF-DA-09 | `EmptyState` de boas-vindas sem veículos, sem KPIs "zerados" | `dashboard/page.tsx` (`NoVehiclesEmptyState`) | `page.spec.tsx` | ✅ |
| RF-DA-10 | Grid sem virtualização até 15; acima disso, 10 piores primeiro + "ver mais" | `dashboard/page.tsx` (`VehicleGrid`) | — (comportamento >15 veículos não coberto por teste automatizado; validado por leitura de código) | 🟡 |
| RF-DC-01 a RF-DC-06 | `ActionDock` — dock mobile 2×2, inline desktop ≥1024px, fecha ao navegar, sem "Multa"/"IA Nave"/"Novo Veículo" | `apps/web/src/components/layout/action-dock.tsx` | `action-dock.spec.tsx` | ✅ |
| RF-DC-02 item 1 | `?category=` em `/expenses/new` (gap novo, ver nota acima) | `apps/web/src/app/(app)/expenses/new/page.tsx` | `expenses/new/page.spec.tsx` (mock de `useSearchParams` atualizado) | ✅ |
| RF-DC-02 item 4 | Rota `/vehicles/[id]/odometer` (gap novo, ver nota acima) | `apps/web/src/app/(app)/vehicles/[id]/odometer/page.tsx` | `vehicles/[id]/odometer/page.spec.tsx` | ✅ |
| — | Preservação do stub original (seletor mês/veículo + export CSV) dentro da nova estrutura (seção 12.3) | `dashboard/page.tsx` (`ExportControls`) | `page.spec.tsx` | ✅ |

### Validators (`packages/validators`) — Sprint 1

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-DA-01, RF-DA-03, RF-DA-04, RF-SH-01 | Tipos e schemas de runtime: `fleetKpisQuerySchema`, `FleetKpisQuery`, `FleetHealthEntry`, `FleetAlert`, `FleetAlertType`, `KpiResult`, `FleetKpis`, `DocumentStatus`, `VehicleDocumentsStatus`, `VehicleCard` | `packages/validators/src/dashboard.schemas.ts` | — (tipos e schema puro, sem branches condicionais; consumido por `dashboard.service.spec.ts`) | 🔶 |
| RF-DA-03 | DTO thin wrapper: `fleetKpisDtoSchema`/`FleetKpisDto` (re-exporta `fleetKpisQuerySchema`) | `apps/api/src/modules/dashboard/dto/fleet-kpis.dto.ts` | — | 🔶 |

### Backend (`apps/api`) — Sprint 2/3

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| CA-S3-02, RF-DB-06 | `GET /dashboard/alerts` estendido — alertas de documentos vencidos (IPVA/Seguro/CRLV), reconciliados com `vehicle_recurring_costs.paid_at` do ano corrente; combinado e ordenado com alertas de manutenção | `dashboard.service.ts` (`getDocumentOverdueAlerts`, `getPaidDocumentsCurrentYear`) | `dashboard.service.spec.ts` | ✅ |
| RF-DB-07 | `GET /dashboard/vehicle-history?vehicle_id=` — combina últimas 20 despesas + manutenções, ordenadas por data decrescente, reaproveitando `ExpensesService`/`MaintenancesService.findAll` | `dashboard.service.ts` (`getVehicleHistory`), `dashboard.controller.ts` | `dashboard.service.spec.ts`, `dashboard.controller.spec.ts` | ✅ |
| CA-S3-03 | `VehicleCard.last_fuel_odometer_missing` — true quando o último abastecimento não tem `odometer_km` | `dashboard.service.ts` (`getVehicleCards`, `getLastFuelExpense`) | `dashboard.service.spec.ts` (suíte existente, sem regressão) | ✅ |
| RF-DB-04, RF-DB-05 | Reaproveitados (sem código novo): `GET /analytics/tco/:vehicleId`, `GET /analytics/fuel-trend/:vehicleId` (T6.1) | `apps/api/src/modules/analytics/analytics.controller.ts` | `analytics.controller.spec.ts` (suíte existente) | ✅ |

### Frontend (`apps/web`) — Sprint 2/3

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-DB-01 | Chip sticky "Em Foco: [Marca Modelo] [PLACA] ×", nomenclatura canônica de SPEC-20260602-001, "×" chama `clearAllSelection` | `apps/web/src/components/dashboard/VehicleSpotlight.tsx` (`StickyFocusChip`) | `VehicleSpotlight.spec.tsx` | ✅ |
| RF-DB-02, RF-DB-03 | Tabs em mobile (`useMediaQuery`) / grid em desktop, sem tabs | `VehicleSpotlight.tsx` | `VehicleSpotlight.spec.tsx` | ✅ |
| RF-DB-04 | Seção Despesas — `TcoBreakdownChart` reaproveitado; empty state quando `total===0`; estado de erro | `VehicleSpotlight.tsx` (`ExpensesSection`), `apps/web/src/components/charts/tco-breakdown-chart.tsx` | `VehicleSpotlight.spec.tsx` | ✅ |
| RF-DB-05 | Seção Consumo — `FuelTrendChart` reaproveitado; empty state; estado de erro | `VehicleSpotlight.tsx` (`FuelSection`), `apps/web/src/components/charts/fuel-trend-chart.tsx` | — (padrão idêntico a `ExpensesSection`, coberto indiretamente via `analytics/page.spec.tsx` para o componente de gráfico) | 🟡 |
| RF-DB-06 | Seção Docs — badges Vencido/Atenção/Pago, reconciliados com `GET /recurring-costs` do ano corrente | `VehicleSpotlight.tsx` (`DocsSection`) | `VehicleSpotlight.spec.tsx` | ✅ |
| RF-DB-07 | Seção Histórico — últimas 20 despesas/manutenções + links "ver todos" | `VehicleSpotlight.tsx` (`HistorySection`) | `VehicleSpotlight.spec.tsx` | ✅ |
| RF-DB-08 | `EmptyState` quando nenhum veículo em foco | `VehicleSpotlight.tsx` (`NoActiveVehicleEmptyState`) | `VehicleSpotlight.spec.tsx` | ✅ |
| RF-DA-05 | Scroll suave até a Zona B ao clicar num `VehicleHealthCard` | `apps/web/src/app/(app)/dashboard/page.tsx` (`handleSelectVehicle`, `spotlightRef`) | `page.spec.tsx` | ✅ |
| RF-SH-03 | Tooltip do semáforo detalha os `flags` da RPC (sem recalcular pesos) | `apps/web/src/components/dashboard/VehicleHealthCard.tsx` (`flagsTooltip`, `FLAG_LABEL`) | `VehicleHealthCard.spec.tsx` | ✅ |
| CA-S3-03 | Badge de aviso no card quando `last_fuel_odometer_missing` | `VehicleHealthCard.tsx` | `VehicleHealthCard.spec.tsx` | ✅ |
| — | `FleetAlertBar.type` estendido para `"document_overdue"` (sem mudança de lógica de estilo, já baseada em `days_until_due`) | `apps/web/src/components/dashboard/FleetAlertBar.tsx` | `FleetAlertBar.spec.tsx` (suíte existente, sem regressão) | ✅ |

### Validators (`packages/validators`) — Sprint 2/3

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| CA-S3-02 | `FleetAlertType` estendido com `"document_overdue"` | `packages/validators/src/dashboard.schemas.ts` | — (tipo puro) | 🔶 |
| RF-DB-07 | `vehicleHistoryQuerySchema`/`VehicleHistoryItem` | `packages/validators/src/dashboard.schemas.ts` | — (tipo puro, consumido por `dashboard.service.spec.ts`) | 🔶 |
| CA-S3-03 | `VehicleCard.last_fuel_odometer_missing` | `packages/validators/src/dashboard.schemas.ts` | — | 🔶 |

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

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | `POST /fines` — valida veículo ativo do usuário e `amount_with_discount ≤ amount` antes do insert | `apps/api/src/modules/fines/fines.service.ts` (`create`) | `fines.service.spec.ts` | ✅ |
| RF-02 | `GET /fines`, `GET /fines?status=`, `GET /fines/vehicle/:vehicleId` | `fines.service.ts` (`findAll`, `findByVehicle`) | `fines.service.spec.ts` | ✅ |
| RF-03 | `GET /fines/:id` | `fines.service.ts` (`findOne`) | `fines.service.spec.ts` | ✅ |
| RF-04 | `PATCH /fines/:id` — atualização parcial + preenchimento automático de `paid_at` | `fines.service.ts` (`update`) | `fines.service.spec.ts` | ✅ |
| RF-05 | Grafo de transições de status, 409 para transição inválida | `fines.service.ts` (`update`, `FINE_STATUS_TRANSITIONS`) | `fines.service.spec.ts` | ✅ |
| RF-06 | `DELETE /fines/:id` — soft-delete (R5) | `fines.service.ts` (`remove`) | `fines.service.spec.ts` | ✅ |
| RF-07 | `countPending(userId, vehicleId?)` — método interno, sem rota própria | `fines.service.ts` (`countPending`) | — | ✅ |
| S1, S2 | `SupabaseAuthGuard` + RLS (`auth.uid()`) em todas as rotas | `fines.controller.ts` | `fines.controller.spec.ts` | ✅ |
| — | `amount_with_discount` ≤ `amount` (Regras de Negócio) | `fines.service.ts` (`create`, `update`) | `fines.service.spec.ts` | ✅ |
| R-LED-02, R-LED-03, R-HUB-01, R-HUB-02 | Vinculação automática ao ledger via `ExpensesService.createFromSource`/`softDeleteBySource` | `fines.service.ts` (`create`, `update`, `remove`) | `fines.service.spec.ts` | ✅ |
| Sprint 2, G-07 | Tela `/fines` no frontend | — | — | ⏳ |

### Validators (`packages/validators`)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01, RF-05 | `createFineInputSchema`/`updateFineInputSchema`/`FINE_STATUS_TRANSITIONS` | `packages/validators/src/fine.schemas.ts` | `packages/validators/src/fine.schemas.spec.ts` | ✅ |

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
> RF-05 (badge de contagem na tab) usa `upcoming_30_days_count` já calculado pelo endpoint de KPIs
> (evita uma segunda chamada de horizonte=30 só para o contador da tab).

### Backend (`apps/api`)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| SPEC-608-001 RF-01, RF-02, RF-03, RNF-02 | `GET /expenses/upcoming?vehicle_id=&horizon_days=` — delega para RPC `get_upcoming_costs` | `apps/api/src/modules/expenses/expenses.service.ts` (`getUpcomingCosts`) | `expenses.service.spec.ts`, `.controller.spec.ts` | ✅ |
| SPEC-608-001 RNF-03 | `horizon_days` fora de (30, 90) → 400 | `packages/validators/src/expense.schemas.ts` (`upcomingCostsQuerySchema`) | `expense.schemas.spec.ts` | ✅ |
| SPEC-608-002 RF-01, RF-02 | `GET /expenses/kpis?vehicle_id=` — totais mês/mês anterior/histórico/upcoming | `expenses.service.ts` (`getKpis`, `sumExpensesAmount`) | `expenses.service.spec.ts` | ✅ |
| SPEC-608-002 RF-03, CT-002/003/004 | `delta_percent` (null quando `prev=0`, arredondado a 1 casa) | `expenses.service.ts` (`getKpis`) | `expenses.service.spec.ts` | ✅ |
| S1, S2 | `SupabaseAuthGuard` + RLS/`auth.uid()` (RPC `security definer` já valida por dentro) | `expenses.controller.ts` | `expenses.controller.spec.ts` | ✅ |

### Validators (`packages/validators`)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| SPEC-608-001 RF-01, RF-03 | `upcomingCostsQuerySchema`, `UpcomingCostItem` | `packages/validators/src/expense.schemas.ts` | `expense.schemas.spec.ts` | ✅ |
| SPEC-608-002 RF-01, RF-02 | `expenseKpisQuerySchema`, `ExpenseKpis` | `packages/validators/src/expense.schemas.ts` | `expense.schemas.spec.ts` | ✅ |

### Frontend (`apps/web`)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| SPEC-608-002 RF-04, RF-05, RF-06 | KPI cards (total do mês + delta badge, próximos 30 dias, total histórico) | `apps/web/src/app/expenses/page.tsx` (`KpiCards`, `DeltaBadge`) | `page.spec.tsx` | ✅ |
| SPEC-608-001 RF-04 | Tab "Lista"/"Próximas" com `?tab=proximas` na URL e badges de urgência por faixa de dias | `page.tsx` (`UpcomingCostsTab`, `urgencyBadge`) | `page.spec.tsx` | ✅ |
| SPEC-608-001 RF-05 | Badge de contagem na tab "Próximas" (vermelho quando há item vencido) | `page.tsx` | `page.spec.tsx` | ✅ |
| SPEC-608-003 RF-03 | Labels de `cost_type` (IPVA/CRLV/Seguro/Doc. Recorrente) | `page.tsx` (`SOURCE_TYPE_LABEL`) | — | ✅ |
| SPEC-608-001 RF-06 | Navegação "Ver" para origem (`/maintenance`, `/fines`, `/settings`) | — | — | ⏳ |
| SPEC-608-003 RF-02 | Badge numérico na sidebar | — | — | ⏳ |

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

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| EPIC-FIN-001 R-LED-02, R-LED-05, R-HUB-01, R-HUB-02 | `ExpensesService.createFromSource()`/`softDeleteBySource()` — idempotente via checagem prévia + índice único parcial `uq_expenses_source` | `apps/api/src/modules/expenses/expenses.service.ts` | `expenses.service.spec.ts` | ✅ |
| SPEC-609-001 RF-01 a RF-05, CT-REC-01 a 08 | `RecurringCostsModule` REST completo (`POST/GET/PATCH/DELETE /recurring-costs`) | `apps/api/src/modules/recurring-costs/recurring-costs.service.ts` | `recurring-costs.service.spec.ts`, `.controller.spec.ts` | ✅ |
| SPEC-609-001 R-REC-01 | 409 em duplicata `(vehicle_id, cost_type, year)` — checagem sem filtro de `deleted_at` (bate com constraint full-table do banco) | `recurring-costs.service.ts` (`assertNoDuplicate`) | `recurring-costs.service.spec.ts` | ✅ |
| SPEC-609-003 RF-01, RF-02 | `GET /expenses/export?from=&to=&vehicle_id=` — CSV consolidado com coluna Origem humanizada | `apps/api/src/modules/expenses/expenses.service.ts` (`exportConsolidatedCsv`) | `expenses.service.spec.ts`, `.controller.spec.ts` | ✅ |
| — | `FinesModule` retrofitado para usar `createFromSource`/`softDeleteBySource` | `apps/api/src/modules/fines/fines.service.ts` | `fines.service.spec.ts` | ✅ |
| S1, S2 | `SupabaseAuthGuard` + RLS (`auth.uid()`) em todas as rotas | `recurring-costs.controller.ts` | `recurring-costs.controller.spec.ts` | ✅ |

### Validators (`packages/validators`)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| SPEC-609-001 RF-02 | `createRecurringCostInputSchema`/`updateRecurringCostInputSchema`/`RECURRING_COST_TYPE_TO_CATEGORY` | `packages/validators/src/recurring-cost.schemas.ts` | `recurring-cost.schemas.spec.ts` | ✅ |
| SPEC-609-003 RF-01 | `consolidatedExportQuerySchema` | `packages/validators/src/expense.schemas.ts` | `expense.schemas.spec.ts` | ✅ |

### Frontend (`apps/web`)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| SPEC-609-002 RF-01, RF-02, RF-03, RF-05 | Tab "Por veículo" com accordion nativo, subtotal e total geral, ordenado por maior subtotal | `apps/web/src/app/expenses/page.tsx` (`ByVehicleTab`, `groupByVehicle`) | `page.spec.tsx` | ✅ |
| SPEC-609-003 RF-03 | Botão "Exportar CSV Completo" | `page.tsx` | `page.spec.tsx` | ✅ |
| SPEC-609-001 | Tela de CRUD de custos recorrentes | — | — | ⏳ (sem tela dedicada; gerenciamento fica para quando o Módulo de Documentos, G-08, existir) |

---

## SPEC-20260715-002 — Suporte a Fuso Horário por Usuário (draft)

> Torna os lançamentos transacionais (`expenses.date`, `maintenances.scheduled_date`,
> `maintenances.completion_date`) cientes do fuso do usuário. Migra os campos de `DATE` para
> `timestamptz`. Armazena o fuso IANA em `user_preferences.timezone`. Corrige o comportamento
> de "hoje" em alertas e KPIs para usar o dia calendário no fuso do usuário, não em UTC do servidor.
> Regras: R-TZ-01, R-TZ-02, R-TZ-03, R-TZ-04, R2 (critério de duplicata passa a usar dia
> calendário no fuso do usuário). Segurança: S1, S2. Camadas: frontend, backend, database.
> **Status: draft — nenhum código implementado.** Entrada incompleta por design: será preenchida
> quando a spec avançar para `review`/`approved` (gate de sincronia).

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-BK-01 a RF-BK-12 | Backend: migrations `occurred_at`/`completion_date` `timestamptz`, campo `user_preferences.timezone`, endpoint `PATCH /preferences` estendido, lógica de "hoje no fuso do usuário" em dashboard e expenses | — | — | ⏳ |
| RF-FE-01 a RF-FE-08 | Frontend: `datetime-local` + `Intl.DateTimeFormat`, detecção automática de timezone, envio com offset explícito | — | — | ⏳ |

---

## SPEC-20260716-001 — Testes E2E com Playwright (draft)

> Define configuração do Playwright em `apps/web/e2e/`, suíte mínima de testes E2E para fluxos
> críticos (autenticação, avisos de odômetro/duplicata, troca de contexto de veículo) e integração
> com CI. Regras: R1, R2, R-CTX-07. Segurança: S1. Camadas: frontend, qa.
> **Status: draft — nenhum código ou teste existe.** Entrada incompleta por design: será
> preenchida quando a spec avançar para `approved` e a implementação iniciar.

### Configuração do Playwright (RF-CFG)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-CFG-01 a RF-CFG-08 | Instalação de `@playwright/test`, `playwright.config.ts`, estrutura `e2e/fixtures/`/`pages/`/`tests/`, scripts `e2e` e `e2e:ui`, setup global de autenticação reutilizável via `storageState`, `.gitignore` local | — | — | ⏳ |

### Fluxos E2E Obrigatórios (RF-E2E)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-E2E-01 | Acesso a rota privada sem sessão → redirect para `/login` (S1, CT-006) | — | `apps/web/e2e/tests/auth.e2e.ts` | ⏳ |
| RF-E2E-02 | Login com credenciais válidas → acesso ao dashboard (S1, CT-006) | — | `apps/web/e2e/tests/auth.e2e.ts` | ⏳ |
| RF-E2E-03 | Logout → redirect para `/login` e bloqueio de acesso (S1) | — | `apps/web/e2e/tests/auth.e2e.ts` | ⏳ |
| RF-E2E-04 | Criação de despesa com odômetro retroativo → exibe aviso `odometer_warning` na tela (R1, CT-001) | — | `apps/web/e2e/tests/expenses.e2e.ts` | ⏳ |
| RF-E2E-05 | Criação de despesa duplicada → exibe aviso de duplicata (R2, CT-002) | — | `apps/web/e2e/tests/expenses.e2e.ts` | ⏳ |
| RF-E2E-06 | Clicar no VehicleContextChip → abre dialog → seleciona veículo → chip atualiza (R-CTX-07) | — | `apps/web/e2e/tests/vehicle-context.e2e.ts` | ⏳ |
| RF-E2E-07 | Troca de contexto propaga para campo `vehicle_id` do formulário de despesa (R-CTX-06, R-CTX-07) | — | `apps/web/e2e/tests/vehicle-context.e2e.ts` | ⏳ |

### Integração com CI (RF-CI)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-CI-01 a RF-CI-06 | Job `e2e` em `.github/workflows/ci.yml`: depende de `build`, executa em `main`/`master`, instala chromium, provisiona Supabase local + API + Next.js, publica relatório HTML como artifact em falha | — | — | ⏳ |

---

## SPEC-20260716-001 — Deploy Automatizado (CD) (approved)

> Formaliza o pipeline de entrega contínua do Nave: deploy de preview automático de `apps/web`
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

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | Deploy de preview de `apps/web` no Vercel em cada PR; URL postada como comentário | `.github/workflows/cd.yml` (`deploy-web-preview`) | — | 🟡 código pronto, não verificável sem conta Vercel |
| RF-02 | Deploy de produção de `apps/web` no Vercel automático após merge em `master` com CI verde | `.github/workflows/cd.yml` (`deploy-web-prod`) | — | 🟡 código pronto, não verificável sem conta Vercel |
| RF-03 | Deploy de `apps/api` em staging automático após merge em `master` com CI verde | `.github/workflows/cd.yml` (`deploy-api-staging`) | — | 🟡 código pronto, não verificável sem conta Railway |
| RF-04 | Deploy de `apps/api` em produção exige aprovação manual via GitHub Environment `production` | `.github/workflows/cd.yml` (`environment: production` em `migrate-db`, herdado por `deploy-api-prod` via `needs`) | — | 🟡 código pronto, GitHub Environment ainda não criado/configurado |
| RF-05 | Jobs de deploy dependem de lint, type-check, test e build (nenhum deploy em CI vermelho) | `.github/workflows/cd.yml` (gatilho `workflow_run` com `conclusion == 'success'` sobre o workflow CI) | — | ✅ |
| RF-06 | Job `migrate-db` (Supabase CLI) executa após gate humano, antes do restart da API em produção | `.github/workflows/cd.yml` (`migrate-db`) | — | 🟡 código pronto, não verificável sem projeto Supabase de produção configurado no pipeline |
| RF-07 | Rollback de `apps/web` via Vercel Instant Rollback em ≤ 2 min; procedimento em `docs/operations/runbooks.md` | `docs/operations/runbooks.md` | — | ✅ documentado |
| RF-08 | Rollback de `apps/api` via re-dispatch do job de deploy apontando para tag anterior + gate humano | `.github/workflows/cd.yml` (gatilho `workflow_dispatch`), `docs/operations/runbooks.md` | — | ✅ documentado e implementado |
| RF-09/S3 | Segredos de produção e staging como GitHub Secrets scoped por environment; nenhum hardcoded | `.github/workflows/cd.yml`, `docs/reference/environment-variables.md` (seção "GitHub Secrets — CD") | — | 🟡 workflow referencia os secrets corretos; secrets em si não provisionados |
| RF-10/S3 | Variáveis de staging segregadas de produção; `SUPABASE_SERVICE_ROLE_KEY` de produção inacessível a jobs de staging | `.github/workflows/cd.yml` (`environment: staging` em `deploy-api-staging`, tokens Railway distintos) | — | 🟡 estrutura pronta, segregação real depende dos GitHub Environments serem criados |
| RF-11 | Job `migrate-db` usa `supabase db push`; falha aborta deploy antes do restart | `.github/workflows/cd.yml` (`migrate-db`, `deploy-api-prod` via `needs`) | — | ✅ |
| RF-12 | Status de deploy reportado como GitHub Deployment check no PR | `.github/workflows/cd.yml` (`github-comment: true` na action de preview) | — | 🟡 comentário de PR coberto; GitHub Deployments API formal não implementada (prioridade Média na spec) |

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

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | `@sentry/nestjs` integrado ao `apps/api`; DSN via `SENTRY_DSN`; ausência não impede inicialização | `apps/api/src/instrument.ts`, `apps/api/src/main.ts`, `apps/api/src/app.module.ts` | — | 🟡 código pronto, entrega ao Sentry não verificável sem conta real |
| RF-02 | `@sentry/nextjs` integrado ao `apps/web`; DSN público via `NEXT_PUBLIC_SENTRY_DSN` (aplica S3) | `apps/web/instrumentation-client.ts`, `apps/web/instrumentation.ts` | — | 🟡 código pronto, idem |
| RF-03 | `HttpExceptionFilter` captura exceções HTTP 5xx e não-HTTP via `Sentry.captureException()` | `apps/api/src/common/filters/http-exception.filter.ts` | `http-exception.filter.spec.ts` | ✅ |
| RF-04 | Uncaught exceptions e unhandled rejections em `apps/api` capturados pelo `SentryModule` | `apps/api/src/instrument.ts` (`Sentry.init`), `apps/api/src/app.module.ts` (`SentryModule.forRoot()`) | — | 🟡 código pronto, captura automática do SDK não exercida em teste (exigiria matar o processo) |
| RF-05 | Erros de renderização em `apps/web` capturados via `error.tsx` global integrado ao Sentry | `apps/web/src/app/global-error.tsx` | — | 🟡 código pronto, sem teste automatizado de error boundary |
| RF-06 | Source maps enviados ao Sentry no build do CD (via `SENTRY_AUTH_TOKEN`); não expostos publicamente | `apps/web/next.config.ts` (`withSentryConfig`) | — | 🟡 build local verificado sem token (upload pulado); upload real depende de `SENTRY_AUTH_TOKEN` no CI/Vercel |
| RF-07 | Alertas de issue nova/regressão configurados no painel Sentry (sem mudança de código) | — (config fora do repositório) | — | ⏳ depende da conta Sentry existir |

### Logging Estruturado

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-08 | `nestjs-pino` + `pino-http` integrados; Pino substitui logger padrão do NestJS | `apps/api/src/common/logging/logger.module.ts`, `apps/api/src/main.ts` (`app.useLogger`) | build + suíte completa passando com o módulo importado | ✅ |
| RF-09 | Cada log de request inclui `requestId`, `method`, `url`, `statusCode`, `responseTimeMs`, `userId` | `apps/api/src/common/logging/logger.module.ts` (`customAttributeKeys`, `customProps`) | — | 🟡 código pronto, sem teste de integração dedicado (exigiria supertest) |
| RF-10 | JSON em produção; `pino-pretty` em desenvolvimento | `apps/api/src/common/logging/logger.module.ts` (`transport` condicional a `NODE_ENV`) | — | 🟡 código pronto, sem teste dedicado |
| RF-11/S10 | Serializer de redaction: campos PII/sensíveis substituídos por `[REDACTED]`; lista em `PINO_REDACT_PATHS` | `apps/api/src/common/logging/redact-paths.ts` | `redact-paths.spec.ts` (CA-05) | ✅ |
| RF-12/P3 | Zero `console.*` em `apps/api/src/`; fecha as 11 ocorrências residuais identificadas em IMPACTO-021 #6 | — (ausência verificada) | `grep -rn "console\." apps/api/src` sem resultado; `pnpm --filter api lint` (CA-03) | ✅ |
| RF-13 | `requestId` propagado no header `X-Request-Id` e como tag no Sentry | `apps/api/src/common/interceptors/request-id.interceptor.ts` | — | 🟡 código pronto, sem teste dedicado |

### Health Check com Dependências

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-14 | `GET /health` executa ping mínimo no Supabase com timeout de 3s para verificar conectividade | `apps/api/src/health/health.controller.ts` | `health.controller.spec.ts` | ✅ |
| RF-15 | Schema de resposta: `{ status, timestamp, checks: { supabase: { status, latencyMs, error? } } }` | `apps/api/src/health/health.controller.ts` | `health.controller.spec.ts` | ✅ |
| RF-16 | Supabase acessível → `status: "ok"`, HTTP 200 | `apps/api/src/health/health.controller.ts` | `health.controller.spec.ts` (CA-06) | ✅ |
| RF-17/P5 | Supabase inacessível/timeout → `status: "degraded"`, HTTP 200 (não 503) | `apps/api/src/health/health.controller.ts` | `health.controller.spec.ts` (CA-07) | ✅ |
| RF-18/S5 | `checks.supabase.error` exibe apenas `"connection_timeout"` ou `"query_failed"`, nunca mensagem bruta de banco | `apps/api/src/health/health.controller.ts` | `health.controller.spec.ts` | ✅ |
| RF-19/P5 | Timeout máximo total do endpoint: 5 segundos | `apps/api/src/health/health.controller.ts` (timeout de 3s da única dependência) | — | 🟡 garantido por construção (única dependência com timeout de 3s), sem teste de latência total dedicado |
| RF-20 | `GET /health` permanece rota pública (sem `SupabaseAuthGuard`); comportamento preservado | `apps/api/src/health/health.controller.ts` (sem `@UseGuards`) | `health.controller.spec.ts` | ✅ |

**Nota sobre RF-14:** o Supabase JS Client não expõe execução de SQL bruto (`SELECT 1`) sem uma
function RPC dedicada; a implementação usa uma query `HEAD` (`select(..., { head: true })`) contra
a tabela `profiles`, que não transfere linhas — equivalente em custo/latência a um ping, mas
depende da tabela `profiles` existir e ser acessível pelo client service role (já é, ver S7/S9).

---

## Requisitos do PRD sem Spec (Fase 2 / Backlog)

| Req PRD | Descrição | Fase |
|---------|-----------|------|
| RF-008 | Push Notifications nativas (iOS/Android) | Fase 2 |
| RF-009 | Configuração de horário de alerta por usuário | Fase 2 |
| RF-010 | Exportação de dados pessoais (portabilidade LGPD Art. 18 II) | Fase 2 |
| RF-011 | Painel administrativo com UI | Fase 2 |
| RF-012 | Hard delete automático de contas após 30 dias | Fase 2 |
| RF-013 | MFA para operações administrativas | Fase 2 |
| RF-014 | Gestão de roles via UI | Fase 2 |
| RF-015 | Export de manutenções em CSV | Fase 2 |
| RF-016 | Versionamento de API (`/v1/`) | Fase 2 |
| RF-017 | Export em XLSX nativo | Fase 2 |

---

## Cobertura de Testes por Módulo

> Atualizado em 2026-07-13 com o resultado da Fase 1 (T1.1–T1.5). Módulos implementados na
> Fase 1 têm cobertura real (Jest em `apps/api`, Vitest em `apps/web`). Demais módulos permanecem
> no plano de cobertura esperado para quando a implementação iniciar.

| Módulo | Arquivo de teste | Status |
|--------|-----------------|--------|
| `auth` | `apps/api/src/modules/auth/auth.service.spec.ts`, `auth.controller.spec.ts` + `apps/api/test/integration/auth.int-spec.ts` | ✅ (67 testes Jest, 90%+) |
| `users` | `apps/api/src/modules/users/users.service.spec.ts`, `users.controller.spec.ts` | ✅ (Jest, 90%+) |
| `admin` | `apps/api/src/modules/admin/admin.service.spec.ts`, `admin.controller.spec.ts` | ✅ (Jest, 90%+) |
| `common/filters` | `apps/api/src/common/filters/http-exception.filter.spec.ts` | ✅ (Jest, 90%+) |
| `common/guards` | `apps/api/src/common/guards/supabase-auth.guard.spec.ts`, `roles.guard.spec.ts` | ✅ (Jest, 90%+) |
| `common/pipes` | `apps/api/src/common/pipes/zod-validation.pipe.spec.ts` | ✅ (Jest, 90%+) |
| `shared/audit` | `apps/api/src/shared/audit/audit.service.spec.ts` | ✅ (Jest, 90%+) |
| `validators/auth` | `packages/validators/src/auth.schemas.spec.ts` | ✅ (Vitest, 91%+) |
| `web/middleware` | `apps/web/middleware.spec.ts` | ✅ (Vitest, 91%+) |
| `web/use-activity-tracker` | `apps/web/src/lib/hooks/use-activity-tracker.spec.ts` | ✅ (Vitest, 91%+) |
| `web/api-client` | `apps/web/src/lib/http/api-client.spec.ts` | ✅ (Vitest, 91%+) |
| `web/form-draft-guard` | `apps/web/src/components/form-draft-guard.spec.ts` | ✅ (Vitest, 91%+) |
| `web/password-input` | `apps/web/src/components/password-input.spec.ts` | ✅ (Vitest, 91%+) |
| `integration/rls` | `apps/api/test/integration/rls.int-spec.ts` (CT-007) | ✅ (Jest + supabase local) |
| `vehicles` | `vehicles.service.spec.ts`, `vehicles.controller.spec.ts`, `license-plate.vo.spec.ts`, `supabase-vehicle.repository.spec.ts` | ⏳ |
| `expenses` | `expenses.service.spec.ts`, `expenses.controller.spec.ts`, `supabase-expense.repository.spec.ts` | ⏳ |
| `maintenance` | `maintenance.service.spec.ts`, `maintenance.controller.spec.ts`, `supabase-maintenance.repository.spec.ts` | ⏳ |
| `dashboard` | **Backend:** `apps/api/src/modules/dashboard/dashboard.service.spec.ts`, `dashboard.controller.spec.ts` (Jest) — **Frontend:** `apps/web/src/components/dashboard/FleetAlertBar.spec.tsx`, `VehicleHealthCard.spec.tsx`; `apps/web/src/app/(app)/dashboard/page.spec.tsx`; `apps/web/src/lib/stores/use-dashboard-store.spec.ts`; `apps/web/src/components/layout/action-dock.spec.tsx` (Vitest) | ✅ (Sprint 1, T5.1, 2026-07-15) |
| `fines` | `apps/api/src/modules/fines/fines.service.spec.ts`, `fines.controller.spec.ts` | ✅ (Jest) |
| `recurring-costs` | `apps/api/src/modules/recurring-costs/recurring-costs.service.spec.ts`, `.controller.spec.ts` | ✅ (Jest) |
| `analytics` | `analytics.service.spec.ts`, `analytics.controller.spec.ts` | ⏳ |
| `validators/vehicles` | `vehicles.schema.spec.ts` | ⏳ |
| `validators/expenses` | `expenses.schema.spec.ts` | ⏳ |
| `validators/maintenance` | `maintenance.schema.spec.ts` | ⏳ |
| `validators/display-preferences` | `display-preferences.schema.spec.ts` | ⏳ |
| `validators/categories` | `categories.schema.spec.ts` | ⏳ |
| `validators/fines` | `packages/validators/src/fine.schemas.spec.ts` | ✅ (Vitest) |
| `validators/recurring-costs` | `packages/validators/src/recurring-cost.schemas.spec.ts` | ✅ (Vitest) |
| Edge Functions | Testes de integração via Supabase CLI | ⏳ (Fase 2) |
