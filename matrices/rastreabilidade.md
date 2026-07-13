# Matriz de Rastreabilidade — Nave SaaS

> **AVISO DE CORRECAO — 2026-07-12 (rev. 41)**
> Esta matriz foi reescrita em 2026-07-12 para refletir o estado real do projeto.
> Versoes anteriores (rev. 1 a rev. 40) continham informacoes aspiracionais/fictícias sobre
> implementação — nomes de arquivos de codigo, hashes de commit, contagens de teste e
> status "Implementado" ou "✅" — que não correspondiam ao filesystem real do repositório.
> O repositório Nave é **greenfield**: não existe nenhum código-fonte implementado hoje
> (sem `apps/`, `packages/`, `src/`, `package.json`).
>
> Unica excecao já correta antes desta revisão: SPEC-20260712-001 (PWA Offline, draft),
> cujas entradas já estavam marcadas como ⏳ pendente — usada como modelo.
>
> **O que foi preservado:** o mapeamento requisito → spec é genuino e foi mantido integralmente.
> **O que foi corrigido:** colunas Código e Teste foram zeradas para ⏳ pendente em todas as
> specs cujo código não existe no filesystem. Caminhos de arquivo, hashes de commit e contagens
> de teste fictícios foram removidos.
> Quando a implementação de uma spec iniciar, o agente `doc-keeper` deve ser acionado para
> preencher as colunas Código e Teste com os caminhos reais, conforme o Gate de Sincronia
> definido em `.claude/CLAUDE.md`.

---

## Legenda de Status

| Símbolo | Significado |
|---------|-------------|
| ✅ | Implementado e com teste cobrindo o comportamento |
| 🔶 | Implementado, mas sem cobertura de teste |
| ⏳ | Não implementado ainda (estado atual de todas as specs abaixo) |
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
> Fecha NG-04 de SPEC-20260601-001. Status: approved — nenhum código implementado ainda.

### Validação de Manutenção (R-ODO-03)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | `updateMaintenanceInputSchema` com `superRefine`: `odometer_km` obrigatório quando `status === 'completed'` | — | — | ⏳ |
| RF-02 | `MaintenanceService.update()` rejeita HTTP 422 quando `status = completed` sem `odometer_km` válido | — | — | ⏳ |
| RF-03 | Correção de bug pré-existente em `createMaintenanceAction`: `odometer_km` do FormData não era mapeado para o corpo do request | — | — | ⏳ |
| RF-04 | Validação de sequência de odômetro em manutenções via `MaintenanceWarningException`; usa `findMaxOdometerByVehicle` filtrado pelo ciclo ativo | — | — | ⏳ |

### Modelo de Dados — `vehicle_odometer_cycles` (R-ODO-05, R-ODO-06)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-05 | Migration `20260711000000_vehicle_odometer_cycles.sql`: tabela com colunas descritas na spec; constraint `cycle_number >= 2` | — | — | ⏳ |
| RF-06 | RLS: SELECT e INSERT filtrados por `auth.uid() = (SELECT user_id FROM vehicles WHERE id = vehicle_id)`; sem policy UPDATE ou DELETE | — | — | ⏳ |
| RF-07 | Função SQL `get_active_cycle_start(p_vehicle_id uuid) RETURNS timestamptz` | — | — | ⏳ |

### Backend — OdometerCyclesModule

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-08 | `POST /vehicles/:vehicleId/odometer-cycles`: valida ownership, aceita `{ starting_value, reason }`, persiste, dispara audit fire-and-forget (R-ODO-05) | — | — | ⏳ |
| RF-09 | `GET /vehicles/:vehicleId/odometer-cycles`: retorna ciclos do veículo paginados (padrão 20, máx 100 — P1) | — | — | ⏳ |
| RF-10 | `OdometerCyclesService.getActiveCycleStart(vehicleId, userId)`: retorna `started_at` ISO 8601 do ciclo mais recente ou `null` | — | — | ⏳ |
| RF-11 | Validação de `reason`: obrigatório, 3–500 chars; retorna 400 com `fieldErrors.reason` se ausente ou fora do intervalo | — | — | ⏳ |

### Extensão de `findMaxOdometerByVehicle` — Filtro por Ciclo Ativo (R-ODO-04)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-12 | `ExpenseRepositoryPort.findMaxOdometerByVehicle` recebe parâmetro opcional `sinceDate?: string`; zero breaking change para callers existentes | — | — | ⏳ |
| RF-13 | `MaintenanceRepositoryPort.findMaxOdometerByVehicle(vehicleId, userId, excludeMaintenanceId?, sinceDate?)`: análogo ao de expenses | — | — | ⏳ |
| RF-14 | `ExpensesService` consulta `OdometerCyclesService.getActiveCycleStart()` antes da verificação de sequência e passa resultado como `sinceDate` | — | — | ⏳ |
| RF-15 | `MaintenanceService` aplica o mesmo padrão de RF-14 para o repositório de manutenções (R-ODO-04) | — | — | ⏳ |

### Mensagem de Confirmação e Atalho para Novo Ciclo (R-ODO-06)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-16 | Warning de odômetro exibe `AlertDialog` com botões "Confirmar retroativo" e "Cancelar" | — | — | ⏳ |
| RF-17 | Quando `odometer_km <= 100` OU queda >= 50%: UI exibe caminho "Iniciar novo ciclo" (R-ODO-06) | — | — | ⏳ |

### Atualização das Funções SQL Analíticas

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-18 | `fuel_consumption_trend` atualizada com filtro de ciclo ativo no WHERE | — | — | ⏳ |
| RF-19 | `calculate_vehicle_tco` atualizada com o mesmo filtro de ciclo ativo | — | — | ⏳ |
| RF-20 | `get_vehicle_cost_per_km` atualizada com o mesmo filtro de ciclo ativo | — | — | ⏳ |
| RF-21 | Ordem de deploy obrigatória: (1) migration + funções SQL; (2) backend OdometerCyclesModule; (3) UI de reset | — | — | ⏳ |

### Interface — Tela de Configurações e Badge

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-22 | Rota `/settings/vehicles/[vehicleId]/odometer-cycles`: tabela de histórico + modal "Reiniciar odômetro" | — | — | ⏳ |
| RF-23 | `VehicleContextChip` exibe badge "Ciclo {N}" somente quando `cycle_number >= 2`; Ciclo 1 implícito não exibe badge (R-ODO-06) | — | — | ⏳ |
| RF-24 | `MaintenanceForm`: campo `odometer_km` torna-se visualmente obrigatório quando `status = completed` (R-ODO-03) | — | — | ⏳ |

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
> configurável em Perfil, com default desativado. Regras: R-PREF-01, R-PREF-02. Segurança: S2.
> Status: approved — nenhum código implementado ainda.

### Banco de dados

| Artefato | Descrição | Regra | Status |
|----------|-----------|-------|--------|
| `supabase/migrations/20260623000000_add_auto_draft_enabled.sql` | `ALTER TABLE user_preferences ADD COLUMN auto_draft_enabled BOOLEAN NOT NULL DEFAULT FALSE` | R-PREF-02 | ⏳ Não aplicado |

### Schema / Validação

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | Campo `auto_draft_enabled` adicionado ao schema; constante `DEFAULT_AUTO_DRAFT_ENABLED = false` exportada | — | — | ⏳ |

### Server Actions (frontend)

| Req | Descrição | Código | Regra | Teste | Status |
|-----|-----------|--------|-------|-------|--------|
| RF-02 | `getAutoDraftPreference()`: lê `auto_draft_enabled` de `user_preferences`; retorna `false` como fallback | — | R-PREF-01 | — | ⏳ |
| RF-02 | `updateAutoDraftPreference(enabled)`: persiste em `user_preferences.auto_draft_enabled` | — | R-PREF-02 | — | ⏳ |

### Componente de Preferência

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-03 | `AutoDraftPreference`: toggle com label e descrição; chama `updateAutoDraftPreference` | — | — | ⏳ |
| RF-03 | Seção "Formulários" adicionada à página de perfil com o toggle | — | — | ⏳ |

### Integração com ExpenseForm

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-04 | `ExpenseForm` recebe prop `autoDraftEnabled`; draft condicionado à essa prop | — | — | ⏳ |
| RF-04 | `/expenses/new` carrega preferência via `getAutoDraftPreference()` e passa ao form | — | — | ⏳ |

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
> Regras: R-LED-01, R-LED-02, R-LED-03, R-REC-01, R-REC-02. Nenhum código implementado.

| Requisito | Descrição | Código | Teste | Status |
|-----------|-----------|--------|-------|--------|
| RF-01 | RPC `get_upcoming_costs(p_user_id)`: unifica maintenance, fines, recurring_costs | — | — | ⏳ |
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
> Regras: R-REC-01, R-REC-02, R-LED-05, R-HUB-01. Nenhum código implementado.

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
> Regras: R-LED-01..R-LED-05, R-HUB-01, R-HUB-02. Nenhum código implementado.

### Banco de dados

| Artefato | Descrição | Regra | Status |
|----------|-----------|-------|--------|
| Migration `20260608000000_unified_ledger.sql` | Campos `source_type`, `source_id`, `is_readonly` em `expenses`; constraints de coerência e índice de idempotência; tabela `vehicle_recurring_costs` com RLS | R-LED-04, R-HUB-02, R-REC-01 | ⏳ Não aplicado |
| Migration `20260608000001_rpc_upcoming_costs.sql` | RPC `get_upcoming_costs(p_user_id UUID)` | R-REC-02 | ⏳ Não aplicado |

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
> Regras: S1, S2, R-DISP-03, R-PREF-01. Nenhum código implementado.

### Banco de dados

| Artefato | Descrição | Regra | Status |
|----------|-----------|-------|--------|
| `supabase/migrations/20260604000000_user_preferences.sql` | `CREATE TABLE IF NOT EXISTS public.user_preferences` com colunas `user_id` (PK FK), `vehicle_chip_fields JSONB`, `updated_at`; FK `ON DELETE CASCADE` | R-PREF-01, R-DISP-03 | ⏳ Não aplicado |
| RLS `user_preferences_select_own` | `FOR SELECT USING (auth.uid() = user_id)` | S2 | ⏳ |
| RLS `user_preferences_insert_own` | `FOR INSERT WITH CHECK (auth.uid() = user_id)` | S2 | ⏳ |
| RLS `user_preferences_update_own` | `FOR UPDATE USING (...) WITH CHECK (auth.uid() = user_id)` | S2 | ⏳ |
| Sem policy de DELETE | Exclusão somente via cascade de `profiles.id` (C1 — LGPD) | S2, C1 | ⏳ |

---

## SPEC-20260603-003 — Preferências de Exibição do Veículo no Chip de Contexto (draft)

> Permite que o usuário configure quais campos de identidade do veículo aparecem no chip.
> Adiciona campo `nickname` à entidade `vehicles`. Regras: R-DISP-01, R-DISP-02, R-DISP-03.
> Status: draft — nenhum código implementado.

### Schema / Validação

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01..RF-03/RF-08 | Schema Zod `chipFieldsSchema`: array 1–3 campos enum, `plate` obrigatório, sem repetição | — | — | ⏳ |

### Backend — Entidade e DTOs de Veículo

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-09 | Campo `nickname: string \| null` adicionado à entidade `Vehicle` (text nullable, max 30 chars) | — | — | ⏳ |
| RF-09 | `nickname` adicionado ao `CreateVehicleDto` e `UpdateVehicleDto` (opcional, max 30) | — | — | ⏳ |

### Server Actions (frontend)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-06 | `getChipFields()`: lê `vehicle_chip_fields` de `user_preferences` via Supabase; retorna fallback (R-DISP-03) | — | — | ⏳ |
| RF-06 | `updateChipFields(fields)`: valida com `chipFieldsSchema`, persiste em `user_preferences.vehicle_chip_fields` | — | — | ⏳ |

### Banco de dados

| Artefato | Descrição | Regra | Status |
|----------|-----------|-------|--------|
| `ALTER TABLE vehicles ADD COLUMN nickname text CHECK (char_length(nickname) <= 30)` | Campo apelido nullable na tabela vehicles | R-DISP-01 | ⏳ Não aplicado |
| `CREATE TABLE user_preferences` com RLS owner-only | Formalizada em SPEC-20260603-004 | S2, R-DISP-03 | ⏳ |

### Componentes de Layout e Tela de Perfil

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01/RF-04/RF-05 | `VehicleContextChip`: renderização dinâmica por `chipFields`; fallback `nickname → model` | — | — | ⏳ |
| RF-07/RNF-03 | `VehicleDisplayPreferences`: UI de preferências em Perfil; prévia em tempo real; botão "Salvar" | — | — | ⏳ |

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

## SPEC-20260602-004 — Categorias Personalizadas de Despesa (approved)

> API REST completa para categorias customizadas por usuário; tabela `user_categories`.
> Nenhum código implementado.

### API (backend)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | `GET /categories`: retorna `{ default: DEFAULT_EXPENSE_CATEGORIES, custom: [...] }` | — | — | ⏳ |
| RF-02..RF-05 | `POST /categories`: valida slug, verifica conflito com padrões (409), limite 20 (422), cria registro | — | — | ⏳ |
| RF-06 | `DELETE /categories/:id`: verifica ownership; 404 se não encontrada | — | — | ⏳ |
| RF-02 | Schema Zod `createCategorySchema`: `value` slug 1–50 + `label` 1–100 | — | — | ⏳ |
| S2 | RLS owner-only em `user_categories` | — | — | ⏳ |

### Banco de dados

| Artefato | Descrição | Status |
|----------|-----------|--------|
| Migration `003_user_categories.sql` | `CREATE TABLE public.user_categories` com RLS, constraints de slug e comprimento, FK `→ profiles(id) ON DELETE CASCADE` | ⏳ Não aplicado |

### Frontend

| Req | Descrição | Status |
|-----|-----------|--------|
| RF-07/RF-08 | `ExpenseForm` com `customCategories`; integração com `GET /categories` | ⏳ |

---

## SPEC-20260602-003 — Grupos de Veículos (approved)

> CRUD de grupos via Server Actions, replace-all de membros, integração com sistema Em Foco.
> Nenhum código implementado.

### Server Actions (frontend)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01/RF-02 | `createGroup(input)`: cria grupo com name + color; verifica JWT; revalida `/dashboard` | — | — | ⏳ |
| RF-03 | `updateGroup(input)`: atualiza name/color por `id + user_id` | — | — | ⏳ |
| RF-04 | `deleteGroup(groupId)`: hard-delete; cascade FK remove membros | — | — | ⏳ |
| RF-05..RF-07 | `setGroupMembers(input)`: replace-all; valida max 200 ids; filtra veículos sem ownership ou soft-deleted | — | — | ⏳ |

### Frontend

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-08..RF-11 | `FleetAside`: chips de grupos; formulário criar/editar; ativar modo `group` no store | — | — | ⏳ |
| RF-12/RF-13 | `FleetCommand`: chips de grupos para filtro rápido; `GroupKpiSummary` filtrado por vehicleIds | — | — | ⏳ |

---

## SPEC-20260602-002 — Gestão de Veículos (CRUD) (approved)

> CRUD completo de veículos, soft-delete em cascata, validação de placa BR/Mercosul.
> Nenhum código implementado.

### API (backend)

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01/RF-02 | `POST /vehicles`: cria veículo; placa normalizada via `LicensePlate` VO | — | — | ⏳ |
| RF-03/RF-16 | `GET /vehicles`: lista veículos do `user_id` do JWT com `deleted_at IS NULL` | — | — | ⏳ |
| RF-04/RF-15/RF-16 | `GET /vehicles/:id`: busca por `id + user_id`; retorna 404 se não encontrado ou de outro usuário | — | — | ⏳ |
| RF-05 | `PATCH /vehicles/:id`: atualiza campos parciais; verifica propriedade | — | — | ⏳ |
| RF-06/R-VEH-01 | `DELETE /vehicles/:id`: soft-delete em cascata — vehicle + expenses + maintenances via `Promise.all` | — | — | ⏳ |
| RF-02/R-VEH-02 | `LicensePlate` VO valida e normaliza placa (BR + Mercosul); placa inválida lança erro 400 | — | — | ⏳ |
| RF-17/C2 | Audit log registrado em mutações de veículo | — | — | ⏳ |

### Frontend

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-03 | `/vehicles`: listagem de veículos com filtros e cards | — | — | ⏳ |
| RF-01 | `/vehicles/new`: formulário completo `VehicleForm.tsx` para novo cadastro | — | — | ⏳ |
| RF-04 | `/vehicles/[id]`: ficha do veículo com dados e ações | — | — | ⏳ |
| RF-13 | `/vehicles/[id]/history`: histórico de atividades via `ActivityTimelineView.tsx` | — | — | ⏳ |
| RF-14 | `/vehicles/[id]/manage`: gestão de documentação e especificações técnicas | — | — | ⏳ |
| RF-09/RF-10 | `QuickVehicleRegister`: fluxo de onboarding para primeiro veículo | — | — | ⏳ |
| RF-06 | `DeleteVehicleDialog`: confirmação antes do soft-delete | — | — | ⏳ |

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
> Regras: R3, R6. Segurança: S1, S2. Nenhum código implementado.

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| (ver spec) | Templates de despesas: criação, listagem, aplicação ao formulário | — | — | ⏳ |

---

## SPEC-20260601-002 — Detecção de Duplicata de Despesa (approved)

> Aviso não-bloqueante quando `POST /expenses` detecta registro ativo com mesmos
> `vehicle_id`, `date`, `amount` e `category`. Nenhum código implementado.

### Camada de repositório

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | Interface: `findPotentialDuplicate(userId, vehicleId, date, amount, category)` adicionada ao port | — | — | ⏳ |
| RF-01 | Implementação Supabase: `SELECT 1` com filtros nos 5 parâmetros e `deleted_at IS NULL` | — | — | ⏳ |
| RF-05 | Apenas registros com `deleted_at IS NULL` são candidatos a duplicata | — | — | ⏳ |

### Camada de serviço

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-02 | `ExpensesService.create()`: invoca `findPotentialDuplicate()` após o insert bem-sucedido | — | — | ⏳ |
| RF-03 | Enriquece resposta com `duplicate_warning: true` e `duplicate_id`; HTTP 201 mantido | — | — | ⏳ |
| RF-04 | Sem `duplicate_warning` quando `findPotentialDuplicate` retorna `null` | — | — | ⏳ |
| RF-06 | `ExpensesService.update()` não invoca `findPotentialDuplicate` | — | — | ⏳ |

---

## SPEC-20260601-001 — Validação de Sequência de Odômetro em Expenses (approved)

> Adiciona aviso não-bloqueante quando `odometer_km` informado é menor que o maior valor
> registrado para o veículo. Nenhum código implementado.

### Schema de banco

| Artefato | Descrição | Status |
|----------|-----------|--------|
| Migration `002_add_odometer_to_expenses.sql` | `ADD COLUMN IF NOT EXISTS odometer_km INTEGER` em `public.expenses`; índice parcial | ⏳ Não aplicado |

### Camada de repositório

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-02 | Interface: `findMaxOdometerByVehicle(vehicleId, userId, excludeExpenseId?)` adicionada ao port | — | — | ⏳ |
| RF-02 | Implementação Supabase: `SELECT MAX(odometer_km)` com filtros | — | — | ⏳ |

### Camada de serviço

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | `ExpensesService.create()`: pula verificação quando `odometer_km` é `null` ou ausente | — | — | ⏳ |
| RF-03 | `ExpensesService.create()`: enriquece resposta com `odometer_warning: true` e `odometer_previous_max_km` | — | — | ⏳ |
| RF-04 | Sem warning quando `odometer_km >= máximo` ou sem registros anteriores | — | — | ⏳ |
| RF-05 | `ExpensesService.update()`: exclui o próprio registro da comparação via `excludeExpenseId` | — | — | ⏳ |

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

> Atualiza SPEC-20260524-001 §4.1 (nova regra de senha) e documenta stories STORY-01 a STORY-04.
> Nenhum código implementado.

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01/STORY-02 | `registerInputSchema`: aceita 6+ chars com letra + número + especial | — | — | ⏳ |
| RF-02/STORY-02 | `registerInputSchema`: rejeita senha sem letra, sem número, sem especial | — | — | ⏳ |
| RF-03/STORY-02 | `resetPasswordInputSchema`: mesma nova regra de senha | — | — | ⏳ |
| RF-04/STORY-02 | Mensagem inline por campo violado (não batch) | — | — | ⏳ |
| RF-05/STORY-03 | Email duplicado (409) → bloco amarelo com email, botão login e botão recuperar senha | — | — | ⏳ |
| RF-07/STORY-03 | Link "Recuperar senha" → `/recover-password?email={encoded}` | — | — | ⏳ |
| RF-08/STORY-04 | Erro de sistema (não-409) → bloco vermelho com mensagem do Supabase | — | — | ⏳ |
| RF-09/STORY-04 | Formulário NÃO resetado após erro — dados persistem para reenvio | — | — | ⏳ |
| RF-10/STORY-01 | Email normalizado para lowercase via `.transform()` no schema Zod | — | — | ⏳ |

---

## SPEC-20260524-001 — Autenticação e Cadastro (Unificada) (aprovado)

> Consolida: `stories.md §1, §7, §8`, `ADR-003 (lifecycle)`, rate limits de SPEC-001.
> Mudança principal: lifecycle de sessão — 30 min idle / 30 dias (com lembrar).
> Nenhum código implementado.

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| STORY-REG-01 | Registro com rollback atômico em falha de criação de perfil | — | — | ⏳ |
| STORY-REG-01 | E-mail duplicado → 409 + mensagem direcionada no frontend | — | — | ⏳ |
| STORY-REG-02 | Toggle show/hide senha com aria-label acessível | — | — | ⏳ |
| STORY-01 | Login com "lembrar de mim" salvo em sessionStorage + idle timer condicional | — | — | ⏳ |
| STORY-01 | Redirect para rota original após login | — | — | ⏳ |
| STORY-01 | Usuário logado em /login → redirect /dashboard | — | — | ⏳ |
| STORY-02 | Mensagem INVALID_CREDENTIALS genérica (anti-enumeração) | — | — | ⏳ |
| STORY-03 | Bloqueio por 15 min após 5 tentativas inválidas por e-mail (frontend + backend) | — | — | ⏳ |
| STORY-04 | POST /auth/recover-password sempre HTTP 200 (anti-enumeração) | — | — | ⏳ |
| STORY-04 | Reenvio de e-mail com cooldown de 60 s + rate limit 3/15min | — | — | ⏳ |
| STORY-05 | Link expirado/usado → mensagem amigável com botão de novo link | — | — | ⏳ |
| STORY-06 | "Lembrar de mim" → preferência em sessionStorage; idle timer ativado apenas sem lembrar | — | — | ⏳ |
| STORY-07a | Hook `useActivityTracker`: idle timer 30 min, reset por evento/rota | — | — | ⏳ |
| STORY-07b | `<FormDraftGuard>`: salva/restaura estado de formulário em sessionStorage | — | — | ⏳ |
| STORY-08 | Timeout de 10 s no frontend → mensagem sem loading infinito | — | — | ⏳ |
| STORY-SEC-01 | Alterar senha via perfil → fluxo reset por e-mail (sem lógica própria) | — | — | ⏳ |
| CA-20 | audit_logs registra REGISTER e LOGIN com campos corretos | — | — | ⏳ |

---

## SPEC-20260521-005 — OpenAPI / Swagger (Aprovada)

> Documentação automática da API. Nenhum código implementado.

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | Swagger UI em `/api/docs` em `development` | — | — | ⏳ |
| RF-02 | Desabilitado em `production` (sem `SWAGGER_ENABLED=true`) | — | — | ⏳ |
| RF-03 | `@ApiTags` em todos os controllers (6 domínios) | — | — | ⏳ |
| RF-04 | `@ApiOperation` e `@ApiResponse` em cada endpoint | — | — | ⏳ |
| RF-05 | Plugin automático via `nest-cli.json` | — | — | ⏳ |
| RF-06 | Bearer JWT documentado globalmente via `addBearerAuth` | — | — | ⏳ |
| RF-07 | `@ApiBearerAuth` em endpoints protegidos | — | — | ⏳ |
| RF-08 | `openapi.json` gerado via `pnpm docs:generate` | — | — | ⏳ |

---

## SPEC-20260521-004 — Admin Role e Operações LGPD (Aprovada)

> Módulo admin com bypass de RLS; LGPD — auto-exclusão de conta; audit de operações admin.
> Nenhum código implementado.

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | `DELETE /users/me` — auto-exclusão com `{ confirm: true }` | — | — | ⏳ |
| RF-02 | Soft delete + anonimização: trigger + service anonimiza antes do deleteUser | — | — | ⏳ |
| RF-03 | Revogação de JWT via `auth.admin.deleteUser` | — | — | ⏳ |
| RF-04 | `{ confirm: true }` obrigatório → 400 se ausente | — | — | ⏳ |
| RF-05 | `AdminSupabaseService` com `SERVICE_ROLE_KEY` | — | — | ⏳ |
| RF-06 | `GET /admin/users` — listar usuários (paginado, apenas admin) | — | — | ⏳ |
| RF-07 | `GET /admin/audit-logs` — filtro por `user_id` e período | — | — | ⏳ |
| RF-08 | `DELETE /admin/users/:id` — admin exclui qualquer conta | — | — | ⏳ |
| RF-09 | `AdminGuard` verifica role no JWT payload | — | — | ⏳ |

---

## SPEC-20260521-003 — Export CSV do Dashboard (Aprovada)

> Endpoint `GET /dashboard/export` com filtros de período e veículo. Nenhum código implementado.

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-01 | `GET /dashboard/export` retorna arquivo CSV | — | — | ⏳ |
| RF-02 | Filtro obrigatório: `period` (YYYY-MM) | — | — | ⏳ |
| RF-03 | Filtro opcional: `vehicle_id` | — | — | ⏳ |
| RF-04 | Colunas: Data, Placa, Modelo, Categoria, Descrição, Valor | — | — | ⏳ |
| RF-05 | BOM UTF-8 no arquivo CSV (compatibilidade Excel) | — | — | ⏳ |
| RF-06 | Nome do arquivo: `nave-despesas-{YYYY-MM}.csv` | — | — | ⏳ |
| RF-07 | Botão "Exportar CSV" no Dashboard com seletor de mês | — | — | ⏳ |
| RF-08 | Isolamento por `user_id` do JWT | — | — | ⏳ |

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

> Correções de segurança no backend NestJS: variáveis de ambiente, audit logs, rate limit,
> filtro de exceções, rollback scripts. Nenhum código implementado.

| Req | Descrição | Código | Teste | Status |
|-----|-----------|--------|-------|--------|
| RF-SEC-001 | `SUPABASE_JWT_SECRET` via `ConfigService.getOrThrow` (sem `process.env` direto) | — | — | ⏳ |
| RF-SEC-002 | `audit_logs` com campos corretos (`action`, `table_name`, `record_id`, `changes`) | — | — | ⏳ |
| RF-SEC-002b | `logAudit` não propaga exceção — captura e loga via try/catch | — | — | ⏳ |
| RF-SEC-002c | Timestamp ISO injetado em `changes` (sobrescreve qualquer valor passado) | — | — | ⏳ |
| RF-SEC-003 | `HttpExceptionFilter` global — sem stack trace em produção | — | — | ⏳ |
| RF-SEC-003b | Filter registrado em `main.ts` via `useGlobalFilters` | — | — | ⏳ |
| RF-SEC-004 | Rate limit de auth: register 5/15min, login 10/15min | — | — | ⏳ |
| RF-SEC-005 | Rollback scripts para as migrations | — | — | ⏳ |
| RF-SEC-006 | `SUPABASE_SERVICE_ROLE_KEY` validado no Joi | — | — | ⏳ |
| RF-SEC-007 | `console.log` substituído por `Logger` em main.ts | — | — | ⏳ |
| RF-SEC-008 | `AdminSupabaseService` inicializa com `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` via `getOrThrow` | — | — | ⏳ |
| RF-SEC-009 | `SupabaseService` inicializa com `autoRefreshToken: false` e `persistSession: false` | — | — | ⏳ |

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

> Todos os módulos abaixo estão com cobertura pendente — nenhum teste existe ainda,
> pois nenhum código foi implementado. Esta tabela registra o plano de cobertura esperado
> quando a implementação iniciar, para referência do agente `tester`.

| Módulo | Arquivo de teste planejado | Status |
|--------|---------------------------|--------|
| `auth` | `auth.service.spec.ts`, `auth.controller.spec.ts`, `supabase.strategy.spec.ts` | ⏳ |
| `users` | `users.service.spec.ts`, `users.controller.spec.ts`, `supabase-user.repository.spec.ts` | ⏳ |
| `vehicles` | `vehicles.service.spec.ts`, `vehicles.controller.spec.ts`, `license-plate.vo.spec.ts`, `supabase-vehicle.repository.spec.ts` | ⏳ |
| `expenses` | `expenses.service.spec.ts`, `expenses.controller.spec.ts`, `supabase-expense.repository.spec.ts` | ⏳ |
| `maintenance` | `maintenance.service.spec.ts`, `maintenance.controller.spec.ts`, `supabase-maintenance.repository.spec.ts` | ⏳ |
| `dashboard` | `dashboard.service.spec.ts`, `dashboard.controller.spec.ts` | ⏳ |
| `admin` | `admin.service.spec.ts`, `admin.controller.spec.ts`, `admin.guard.spec.ts` | ⏳ |
| `common/filters` | `http-exception.filter.spec.ts` | ⏳ |
| `common/guards` | `supabase-auth.guard.spec.ts` | ⏳ |
| `common/pipes` | `zod-validation.pipe.spec.ts` | ⏳ |
| `fines` | `fines.service.spec.ts`, `fines.controller.spec.ts` | ⏳ |
| `recurring-costs` | `recurring-costs.service.spec.ts`, `recurring-costs.controller.spec.ts` | ⏳ |
| `analytics` | `analytics.service.spec.ts`, `analytics.controller.spec.ts` | ⏳ |
| `validators/vehicles` | `vehicles.schema.spec.ts` | ⏳ |
| `validators/expenses` | `expenses.schema.spec.ts` | ⏳ |
| `validators/maintenance` | `maintenance.schema.spec.ts` | ⏳ |
| `validators/auth` | `auth.schema.spec.ts` | ⏳ |
| `validators/display-preferences` | `display-preferences.schema.spec.ts` | ⏳ |
| `validators/categories` | `categories.schema.spec.ts` | ⏳ |
| `validators/fines` | `fines.schema.spec.ts` | ⏳ |
| `validators/recurring-costs` | `recurring-costs.schema.spec.ts` | ⏳ |
| Edge Functions | Testes de integração via Supabase CLI | ⏳ (Fase 2) |
