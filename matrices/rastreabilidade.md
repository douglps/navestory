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

---

## Legenda de Status

| Símbolo | Significado |
|---------|-------------|
| ✅ | Implementado e com teste cobrindo o comportamento |
| 🔶 | Implementado, mas sem cobertura de teste |
| ⏳ | Não implementado ainda |
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
| RF-01 | `updateMaintenanceInputSchema` com `superRefine`: `odometer_km` obrigatório quando `status === 'completed'` | — | — | ⏳ Depende do módulo de manutenções (Fase 4) |
| RF-02 | `MaintenanceService.update()` rejeita HTTP 422 quando `status = completed` sem `odometer_km` válido | — | — | ⏳ Depende do módulo de manutenções (Fase 4) |
| RF-03 | Correção de bug pré-existente em `createMaintenanceAction`: `odometer_km` do FormData não era mapeado para o corpo do request | — | — | ⏳ Depende do módulo de manutenções (Fase 4) |
| RF-04 | Validação de sequência de odômetro em manutenções via `MaintenanceWarningException`; usa `findMaxOdometerByVehicle` filtrado pelo ciclo ativo | — | — | ⏳ Depende do módulo de manutenções (Fase 4) |

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
| RF-13 | `MaintenanceRepositoryPort.findMaxOdometerByVehicle(vehicleId, userId, excludeMaintenanceId?, sinceDate?)`: análogo ao de expenses | — | — | ⏳ Depende do módulo de manutenções (Fase 4) |
| RF-14 | `ExpensesService` consulta `OdometerCyclesService.getActiveCycleStart()` antes da verificação de sequência e passa resultado como `sinceDate` | — | — | ⏳ Depende do módulo de despesas (Fase 3) |
| RF-15 | `MaintenanceService` aplica o mesmo padrão de RF-14 para o repositório de manutenções (R-ODO-04) | — | — | ⏳ Depende do módulo de manutenções (Fase 4) |

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
| RF-24 | `MaintenanceForm`: campo `odometer_km` torna-se visualmente obrigatório quando `status = completed` (R-ODO-03) | — | — | ⏳ Depende do módulo de manutenções (Fase 4) |

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

> Motor de BI com 8 módulos (TCO, Fuel Intelligence, Anomalias, Benchmark, Forecast, Seasonal,
> Maintenance Prediction, Insights NL). Regras: R-ANA-01..R-ANA-07, R-FUEL-02, R-FUEL-03,
> R-LED-01, R-MON-01, R5. Status: approved — nenhum código implementado ainda.

### Backend — AnalyticsModule

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | RPC `calculate_vehicle_tco(vehicle_id)`: TCO com breakdown, cost_per_km, cost_per_month (R-ANA-04) | — | — | ⏳ |
| RF-02 | RPC `fuel_consumption_trend(vehicle_id, limit)`: km/L, tendência com rolling average (R-ANA-01) | — | — | ⏳ |
| RF-03 | RPC `detect_expense_anomalies(vehicle_id)`: Z-Score por categoria (R-ANA-02) | — | — | ⏳ |
| RF-04 | RPC `benchmark_fleet_vehicles()`: ranking entre veículos (R-ANA-05) | — | — | ⏳ |
| RF-05 | RPC `forecast_costs(vehicle_id, months)`: projeção de custos com média móvel (R-ANA-03) | — | — | ⏳ |
| RF-06 | RPC `seasonal_analysis()`: heatmap mês x categoria (R-ANA-07) | — | — | ⏳ |
| RF-07 | `GET /analytics/tco/:vehicleId`: endpoint REST com cache 1h (R-ANA-06); `GET /analytics/fuel-trend/:vehicleId?limit=N` | — | — | ⏳ |
| RF-08 | `AnalyticsService`: getTco (404 se veículo não encontrado), getFuelTrend (clamp limit 1-100) | — | — | ⏳ |
| — | `AnalyticsRepositoryPort`: interface abstrata com `calculateVehicleTco` e `fuelConsumptionTrend` | — | — | ⏳ |
| — | `TcoResult` e `FuelTrendPoint` interfaces de resposta | — | — | ⏳ |
| — | `AnalyticsModule` registrado em `AppModule` | — | — | ⏳ |

### Frontend — Página `/analytics`

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-13 | Página `/analytics`: Server Component com auth redirect; lista veículos do usuário | — | — | ⏳ |
| — | `AnalyticsContent`: componente cliente com seleção de veículo e tabs de módulos | — | — | ⏳ |
| — | `TcoKpiCards`: cards de KPI (total, custo/km, custo/mês) | — | — | ⏳ |
| — | `TcoBreakdownChart`: gráfico de breakdown por categoria de custo | — | — | ⏳ |
| — | `FuelTrendChart`: gráfico de tendência de consumo de combustível | — | — | ⏳ |
| — | Endpoint `GET /analytics/insights`: insights em linguagem natural (R-ANA-05) | — | — | ⏳ |
| — | RPC `predict_maintenance_needs(vehicle_id)`: previsão baseada em km/tempo | — | — | ⏳ |

### Implementação por Fase

| Fase | Módulos | Status |
|------|---------|--------|
| Fase 1 — Fundação | TCO, Fuel Intelligence | ⏳ Não iniciado |
| Fase 2 — Inteligência | Anomalias, Benchmark, Forecast | ⏳ |
| Fase 3 — Avançado | Seasonal, Maintenance Prediction, Insights NL | ⏳ |

---

## SPEC-20260619-001 — Padrão de Comportamento de Formulários (approved)

> Define stack, regras (R-FORM-01..R-FORM-07, R-FUEL-07, R-FUEL-08) e fases de implementação
> para todos os formulários. Status: approved — nenhum código implementado ainda.

### Regras de Formulário (R-FORM)

| Requisito | Descrição | Código | Teste | Status |
|-----------|-----------|--------|-------|--------|
| R-FORM-01 | `mode: 'onBlur'`, `reValidateMode: 'onChange'` em todos os forms | — | — | ⏳ |
| R-FORM-02 | `FormField` + `Controller` pattern; nunca `.register()` direto | — | — | ⏳ |
| R-FORM-03 | Valores monetários usam `CurrencyInput` (ATM-style) | — | — | ⏳ |
| R-FORM-04 | Create actions redirect para listagem; update/delete fazem revalidate sem redirect | — | — | ⏳ |
| R-FORM-05 | Dirty check com `AlertDialog` de confirmação ao cancelar | — | — | ⏳ |
| R-FORM-06 | Server Actions retornam `ActionResult` padrão | — | — | ⏳ |
| R-FORM-07 | Empty state com CTA quando sem veículos cadastrados | — | — | ⏳ |

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
> e reorganização do layout. Status: approved — nenhum código implementado ainda.

| Requisito | Descrição | Código | Teste | Status |
|-----------|-----------|--------|-------|--------|
| RF-01 | `amount` aceita até R$ 100.000.000,00 (R-EXP-01); `CurrencyInput` permite digitar até 11 dígitos | — | — | ⏳ |
| RF-02 | Campo "Ano" (4 dígitos) ao lado da Data: editar atualiza apenas o ano; ano inválido ajusta para o último dia válido do mês | — | — | ⏳ |
| RF-03 | "Tanque cheio?" tri-state (`true`/`false`/`null`, default `null`); botões "Sim"/"Não", clicar no ativo desmarca para `null` (R-FUEL-06) | — | — | ⏳ |
| RF-04 | `odometer_km` limitado a 9.999.999 (7 dígitos) no `expenseBaseSchema` (R-ODO-02) | — | — | ⏳ |
| RF-05 | Reordenação do layout: Data + Ano lado a lado; Odômetro movido para após Data/Ano quando `category = fuel` | — | — | ⏳ |

---

## SPEC-20260612-001 — Melhorias de UX do Formulário/Hub de Despesas (approved)

> Consolida 6 itens da análise de UX de `/expenses` (KPIs, reatividade de contexto, máscaras
> pt-BR, cálculo cruzado de combustível, hard-block de odômetro, mensagens de erro de update).
> Regras: R-ODO-01 (novo), R-CTX-06 (atualizado). Status: approved — nenhum código implementado.

| Requisito | Descrição | Código | Teste | Status |
|-----------|-----------|--------|-------|--------|
| RF-01 | KPI "Próximos 30 dias" e tab "Próximas" consideram despesas manuais como 4ª fonte | — | — | ⏳ |
| RF-02 | Campo `vehicle_id` do `ExpenseForm` reativo a mudanças do contexto global enquanto `isInherited === true` | — | — | ⏳ |
| RF-03 | Máscaras pt-BR progressivas (acumulador de dígitos estilo caixa eletrônico) nos campos Valor, Odômetro e Litros | — | — | ⏳ |
| RF-04 | Hard-block de regressão de odômetro (R-ODO-01): rejeita valor menor que o máximo registrado em data anterior/igual, ou maior que o mínimo registrado em data posterior | — | — | ⏳ |
| RF-05 | Campo "Valor por litro" editável na seção de combustível, com cálculo cruzado entre `amount`, `liters` e `price_per_liter`; algoritmo de pilha de ordem de edição `fuelEditOrder` (R-FUEL-08) | — | — | ⏳ |
| RF-06.1 | `updateExpenseInputSchema` recebe o mesmo `superRefine` de `createExpenseInputSchema` (categoria `fuel` ⇒ `odometer_km` obrigatório) | — | — | ⏳ |
| RF-06.2 | `updateExpenseAction` busca a despesa existente e bloqueia edição quando `source_type IS NOT NULL` (R-LED-01) | — | — | ⏳ |
| RF-06.3 | Erros do Supabase em create/update/delete diferenciam `PGRST116` de erro genérico | — | — | ⏳ |

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
> baseado no histórico do usuário. Regras: R-FUEL-04, R-FUEL-05. Nenhum código implementado.

| Req | Descrição | Código | Regra | Teste | Status |
|-----|-----------|--------|-------|-------|--------|
| RF-01 | Aceitar `supplier` no payload da API (backend) — validação ≤ 100 chars | — | — | — | ⏳ |
| RF-02 | `getSupplierSuggestionsAction()`: busca 50 registros com `supplier IS NOT NULL`, deduplica em JS, retorna top 10 | — | R-FUEL-04 | — | ⏳ |
| RF-02 | `ExpenseForm`: campo `supplier` com autocomplete inline via Popover; filtro client-side por substring | — | R-FUEL-04 | — | ⏳ |
| RF-03 | Sem tabela separada — abordagem de query direta em `expenses` | — | — | — | ⏳ |
| RF-04 | Aceitar texto livre sem match no histórico | — | — | — | ⏳ |

---

## SPEC-20260606-001 — Tipo de Combustível, Tanque Cheio e Cálculo de Consumo (approved)

> Enriquece o formulário de abastecimento com `fuel_type`, `full_tank`, cálculo de km/l
> e preço/litro. Campos derivados sem persistência.
> Regras: R4, R-FUEL-01, R-FUEL-02, R-FUEL-03, R-FUEL-05. Nenhum código implementado.

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | Persistir `fuel_type` no payload da API (backend) — validação contra enum `FuelType` | — | — | ⏳ |
| RF-02 | Persistir `full_tank` (boolean nullable) no payload da API (backend) | — | — | ⏳ |
| RF-03 | Retornar `computed.km_per_liter` e `computed.price_per_liter` na resposta da API | — | — | ⏳ |
| RF-04 | `getLastFuelTypeAction(vehicleId)`: consulta último `fuel_type` selecionado para pré-preencher o campo (R-FUEL-01) | — | — | ⏳ |
| RF-04 | `ExpenseForm`: `useEffect` de pré-preenchimento de `fuel_type` dispara em modo criação | — | — | ⏳ |
| RF-05 | Default de `full_tank = true` no formulário (toggle "Abastecimento parcial?") | — | — | ⏳ |
| RF-06 | `ExpenseForm`: hint de odômetro exibe delta quando valor digitado supera o último registrado (R4) | — | — | ⏳ |
| RF-07 | `ExpenseForm`: exibe mensagem "Consumo aparece após o 2º abastecimento completo" (R-FUEL-02, R-FUEL-03) | — | — | ⏳ |
| RF-08 | Exibir preço/litro em tempo real no formulário | — | — | ⏳ |

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

## SPEC-20260603-002 — Transições de Status de Manutenção (approved)

> Enforcement do grafo de transições de status no `MaintenancesService` (NestJS).
> Estados: `pending`, `in_progress`, `completed`, `cancelled`. Regra: R7.
> Nenhum código implementado ainda.

### Camada de serviço (backend)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | `MaintenancesService.update()` valida transição quando `status` está no payload | — | — | ⏳ |
| RF-02..RF-05 | Constante `ALLOWED_TRANSITIONS` define saídas de cada estado; `completed` e `cancelled` terminais | — | — | ⏳ |
| RF-06 | Transição para o mesmo estado atual é rejeitada com 409 | — | — | ⏳ |
| RF-07 | Sem campo `status` no payload, validação de transição é ignorada | — | — | ⏳ |
| RF-08 | Status atual lido do `findOne()` de ownership — sem query adicional | — | — | ⏳ |
| RF-09 | Resposta 409 com `message: "Transição inválida: {de} → {para}"` | — | — | ⏳ |
| RF-10/C2 | Audit log gravado apenas após transição bem-sucedida | — | — | ⏳ |

---

## SPEC-20260603-001 — Chip de Contexto de Veículo no Subheader (draft)

> Chip persistente de seleção de veículo/grupo no header. Substitui RF-01 da SPEC-20260602-001.
> Status: draft — nenhum código implementado.

### VehicleContextChip

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | Chip visível no header superior em todos os breakpoints e páginas autenticadas | — | — | ⏳ |
| RF-02 | Estados visuais por modo (none/single/group/multi/attribute) | — | — | ⏳ |
| RF-03 | Dimensões h-11 (44px) + max-width 140px + text truncation (WCAG 2.5.5) | — | — | ⏳ |
| RF-04 | Botão X com `clearAllSelection()` | — | — | ⏳ |
| RF-05 | `aria-label` dinâmico por modo descrevendo contexto ativo | — | — | ⏳ |
| RF-06 | Estado hover (`ring-1`) e focus-visible (`ring-2 ring-primary`) | — | — | ⏳ |

### VehicleContextDialog e VehicleContextSheet

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-07..RF-10 | Dialog desktop: backdrop blur, `max-w-[380px]`, skeleton de carregamento, animação de fechamento | — | — | ⏳ |
| RF-11..RF-14 | Sheet mobile: bottom-up cobrindo 70%, handle de drag, safe-area, banner offline com cache SWR | — | — | ⏳ |

### Migração do Sidebar e Backend

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-15..RF-17 | Remoção de `FocusSlot` do sidebar; dot passivo no sidebar colapsado; anotação `@spec` atualizada | — | — | ⏳ |
| RF-18..RF-20 | `.limit(100)` na query de veículos; filtro `deleted_at IS NULL` em joins; 404 para veículo soft-deleted | — | — | ⏳ |
| RF-21..RF-23 | `zustand/persist` com `sessionStorage`; interceptor global para 404; logout com `sessionStorage.clear()` | — | — | ⏳ |

---

## SPEC-20260602-005 — Monitor do Sistema (Audit Log Dashboard) (approved)

> Formaliza a infraestrutura de audit log e a página Monitor.
> Nenhum código implementado.

### Infraestrutura de Audit Log

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01/RF-02 | `writeAuditLog()`: helper fire-and-forget para Server Actions; erros silenciados via try/catch | — | — | ⏳ |
| RF-03/RF-04 | `AuditService.log()`: injeta `timestamp` em `changes`; fire-and-forget via try/catch + Logger | — | — | ⏳ |
| RF-07 | Server Actions que chamam `writeAuditLog`: vehicles, vehicle-actions, expense-actions, maintenance-actions | — | — | ⏳ |
| RF-08 | `AuditService` no backend: `REGISTER`, `LOGIN` em auth; operações REST de veículos/despesas/manutenções | — | — | ⏳ |

### Página Monitor

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-09/RF-10 | Server Component `force-dynamic`; auth redirect; query top-100 `audit_logs` por `user_id` desc | — | — | ⏳ |
| RF-11 | KPI cards: Total, Veículos, Despesas, Manutenções | — | — | ⏳ |
| RF-12..RF-14 | Tabela: Quando (relativo), Ação (badge colorido), Domínio (ícone), Detalhes | — | — | ⏳ |
| RF-16 | Card "Monitor" + `ShieldCheck` nas Ações Rápidas do dashboard | — | — | ⏳ |

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
| RF-14 | Campo `computed` (`price_per_liter`, `km_per_liter`) | — | — | ⏳ objeto de SPEC-20260606-001 |
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
> Sincroniza formulários transacionais com o contexto ativo. Nenhum código implementado.

### Frontend

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01..RF-06 | `focus-slot.tsx`: slot "Em Foco" no Sidebar com 5 estados visuais | — | — | ⏳ |
| RF-07/RF-13/RF-14 | `use-vehicle-context-field.ts`: hook que captura o contexto do store apenas no mount | — | — | ⏳ |
| RF-15/RF-17 | `context-filter-sync.tsx`: sincroniza contexto do store com URL searchParams | — | — | ⏳ |
| R-CTX-01/R-CTX-02 | `use-dashboard-store.ts`: adicionados `activeVehicleData`, `activeGroupData`, novos setters | — | — | ⏳ |
| RF-07..RF-09/RF-13/RF-14 | `expense-form.tsx` e `maintenance-form.tsx`: herança de contexto via `useVehicleContextField` | — | — | ⏳ |
| RF-17 | `expenses/page.tsx` e `maintenance/page.tsx`: filtro por contexto via `ContextFilterSync` | — | — | ⏳ |

---

## SPEC-20260601-003 — Sistema de Modelos Rápidos de Despesas (approved)

> Templates de despesas frequentes para preenchimento rápido.
> Regras: R3, R6. Segurança: S1, S2. Banco implementado (🔶); backend e frontend ainda
> pendentes (⏳).

### Banco de dados

| Artefato | Descrição | Regra | Status |
|----------|-----------|-------|--------|
| `supabase/migrations/20260712171846_grouping_templates_preferences.sql` | Tabela `expense_templates` (id, user_id FK, vehicle_id FK, name, category, amount, description, liters, fuel_type, supplier, timestamps) | R3, R6 | 🔶 Aplicado (sem teste) |
| RLS `expense_templates_*` | `supabase/migrations/20260712172047_rls_policies.sql` — policies SELECT, INSERT, UPDATE, DELETE por `user_id` | S2 | 🔶 |

### Backend e Frontend

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| (ver spec) | Templates de despesas: API CRUD, listagem, aplicação ao formulário | — | — | ⏳ |

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

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | Job diário via pg_cron às 11:00 UTC | — | — | ⏳ |
| RF-02 | Edge Function busca manutenções `scheduled_date = +7d AND alert_sent = false` | — | — | ⏳ |
| RF-03 | Email com nome, data, veículo via Resend (com retry idempotente) | — | — | ⏳ |
| RF-04 | `alert_sent = true` somente após confirmação de envio | — | — | ⏳ |
| RF-05 | Não reenvia alertas já enviados (filtro `alert_sent = false` na query) | — | — | ⏳ |
| RF-06 | `MAINTENANCE_ALERT_SENT` em `audit_logs` com `record_id` da manutenção | — | — | ⏳ |
| RF-07 | Respeita soft delete (filtro `.is('deleted_at', null)` na query) | — | — | ⏳ |

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

## SPEC-20260531-001 — Redesign do Dashboard (Rascunho)

> Fleet Command + Vehicle Spotlight. Status: rascunho — nenhum código implementado.

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| (ver spec) | Redesign do dashboard com Fleet Command e Vehicle Spotlight | — | — | ⏳ |

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
| `dashboard` | `dashboard.service.spec.ts`, `dashboard.controller.spec.ts` | ⏳ |
| `fines` | `fines.service.spec.ts`, `fines.controller.spec.ts` | ⏳ |
| `recurring-costs` | `recurring-costs.service.spec.ts`, `recurring-costs.controller.spec.ts` | ⏳ |
| `analytics` | `analytics.service.spec.ts`, `analytics.controller.spec.ts` | ⏳ |
| `validators/vehicles` | `vehicles.schema.spec.ts` | ⏳ |
| `validators/expenses` | `expenses.schema.spec.ts` | ⏳ |
| `validators/maintenance` | `maintenance.schema.spec.ts` | ⏳ |
| `validators/display-preferences` | `display-preferences.schema.spec.ts` | ⏳ |
| `validators/categories` | `categories.schema.spec.ts` | ⏳ |
| `validators/fines` | `fines.schema.spec.ts` | ⏳ |
| `validators/recurring-costs` | `recurring-costs.schema.spec.ts` | ⏳ |
| Edge Functions | Testes de integração via Supabase CLI | ⏳ (Fase 2) |
