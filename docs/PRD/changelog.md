# Changelog - navestory SaaS

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato baseia-se em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added

- **JTBDs do workspace_owner (2026-08-04):** Adicionados JTBD 6 e JTBD 7 na nova seção "Gestor de workspace" do documento (seção 4 — Jobs to Be Done, criada nesta data, pois o PRD não possuía a seção formalmente no documento canônico). JTBD 6: visão consolidada de conformidade documental dos motoristas do workspace (CNH vigente, cadastro mínimo) sem depender de planilha externa. JTBD 7: configuração de campos obrigatórios e critérios de preenchimento mínimo para motoristas convidados no workspace. Personas associadas: P-002 Ana e P-003 Roberto no papel de `workspace_owner` (plano Frota). Motivação: análise de UX Research identificou lacuna — nenhum dos 5 JTBDs originais endereçava o papel de gestor de workspace supervisionando conformidade da equipe, bloqueando a criação da spec "Configurações da frota" por ausência de critério de sucesso ancorado no PRD. Referência: `specs/business/SPEC-20260620-001-business-strategy-stories.md` (BS-PLN-05, BS-ACL-06, BS-ACL-07).

- **Ciclos de Odômetro (decisão de produto/arquitetura — 2026-07-11):** Introdução do conceito de "ciclos de odômetro" como série temporal auditável de resets formais (troca de painel, revenda, correção em cascata). Nova tabela `vehicle_odometer_cycles` com `cycle_number >= 2` (Ciclo 1 é implícito — sem linha na tabela). `odometer_km` torna-se obrigatório em manutenções transitando para `status = completed`, fechando o Non-Goal NG-04 da SPEC-20260601-001. As funções analíticas `fuel_consumption_trend`, `calculate_vehicle_tco` e `get_vehicle_cost_per_km` passarão a filtrar apenas o ciclo ativo via helper SQL `get_active_cycle_start()`, eliminando km negativos e TCO distorcido pós-reset. UI com tela de Configurações para criação de ciclos e badge "Ciclo N" no chip de veículo a partir do 2º ciclo. Permissão de reset restrita ao dono do veículo. Spec: SPEC-20260711-001. ADR: ADR-007. Impacto: IMPACTO-025 (Risco Alto, estimativa 11–14 dias). Não há código implementado — decisão de escopo documentada.

- **Preferencia de Rascunho Automatico:** rascunho automatico do formulario de despesas transformado em preferencia opcional do usuario (default: desativado). Toggle em Perfil → Preferencias → Formularios. Migration `auto_draft_enabled` em `user_preferences`, server actions, componente toggle e integracao com `ExpenseForm`. (SPEC-20260612-003)
- **Analytics Engine (Fase 1):** pagina `/analytics` com modulos TCO (Total Cost of Ownership) e Fuel Intelligence. Backend `AnalyticsModule` com 2 endpoints REST (`/analytics/tco/:vehicleId`, `/analytics/fuel-trend/:vehicleId`) chamando RPCs PostgreSQL. Frontend com 4 componentes de visualizacao (KPI cards, breakdown chart, fuel trend chart). Cache HTTP de 1h (R-ANA-06). (SPEC-20260622-001)
- **FinesModule:** CRUD completo de multas com ledger unificado — criacao de multa gera automaticamente expense vinculada (`source_type = 'fine'`). Grafo de transicoes de status (`pending -> paid/appealing/cancelled`). Frontend `/fines` com listagem, KPIs e formulario. (SPEC-20260607-001)
- **RecurringCostsModule:** CRUD de custos recorrentes (IPVA, CRLV, Seguro) com expense vinculada ao marcar como pago. Constraint de unicidade `(vehicle_id, cost_type, year)`. Frontend `/recurring-costs`. (SPEC-20260609-001)
- **Ledger financeiro unificado:** campos `source_type`, `source_id`, `is_readonly` na tabela `expenses`; despesas vinculadas sao readonly (R-LED-01). Metodos `createFromSource()` e `softDeleteBySource()` no `ExpensesService`. (EPIC-FIN-001, ADR-006)
- **Central Financeira reestruturada:** tabs Todas/Proximas/Em atraso/Por veiculo em `/expenses`. KPI cards (total mes com delta, proximos 30 dias, total acumulado). RPC `get_upcoming_costs` para proximas despesas. Badge no sidebar para custos vencendo em 7 dias.
- **Enriquecimento de abastecimento:** pre-preenchimento de `fuel_type` baseado no ultimo abastecimento, delta de odometro no hint, autocomplete de fornecedor com historico, calculo cruzado valor/litros/preco por litro.
- **Mascaras monetarias:** `CurrencyInput` e `OdometerInput` com acumulador ATM-style para BRL.
- **Hard-block de odometro (R-ODO-01):** server actions de expenses rejeitam odometro fora de ordem cronologica.
- **Formulario de despesas:** campo Ano editavel, `full_tank` tri-state, limite de valor ate R$ 100M, limite de odometro 7 digitos.
- **Preferencias de exibicao do veiculo:** campos configuraveis no chip de contexto (placa, marca, modelo, apelido); persistido em `user_preferences`.
- **Edicao de despesas:** pagina `/expenses/[id]/edit`, acoes inline por linha, modo edicao no `ExpenseForm`.
- **Edicao de nome no perfil:** componente `ProfileNameSection` com edicao inline.
- Pagina `/dashboard/monitor`: audit log visual das ultimas 100 operacoes do usuario autenticado.
- Helper `lib/actions/audit.ts`: escrita universal em `audit_logs` a partir de Server Actions web.
- Tabela `user_preferences` com RLS owner-only (vehicle_chip_fields, theme, notifications_config).
- Coluna `liters numeric(8,3)` na tabela `expenses`.
- Coluna `odometer_km integer` na tabela `expenses` com indice parcial.
- Tabela `user_categories` com RLS owner-only e modulo `CategoriesModule`.
- Tabela `vehicle_recurring_costs` com RLS owner-only.
- Exportacao CSV consolidada com coluna `Origem`.

### Changed

- Chip de contexto de veiculo movido do subheader para o header superior.
- `ChipSettingsPopover` removido — configuracao de campos do chip exclusiva em Perfil.
- Ordem padrao do chip alterada de `['make','model','plate']` para `['make','plate','model']`.
- Server Actions refatoradas para usar helpers centralizados `revalidate.ts` e `audit.ts`.
- Enum de status de manutencao corrigido de `scheduled` para `pending` em todo o stack.
- `ExpenseForm`: campo `vehicle_id` reativo ao contexto global enquanto `isInherited === true`.

### Fixed

- Conflito `middleware.ts` vs `proxy.ts` resolvido — Next.js 15 usa `proxy.ts` como convenção; `middleware.ts` duplicado removido.
- `as any` removido de `expenses.service.ts` — substituido por tipo explicito `CreateExpenseInput & { user_id: string }`.
- `console.log` removidos de `VehicleDocumentActions.tsx` (2 instancias).
- Campos `Select` exibindo raw value (UUID ou chave em ingles) — corrigido com render function.
- Placeholders ausentes em dropdowns de todos os formularios.
- `QuickVehicleRegister`: transicao imediata apos cadastro do primeiro veiculo.
- Bug de deteccao de mudanca de grupo no `useVehicleContextField`.

---

## [1.1.0] - 2026-03-10

### Changed

- Escopo atualizado para incluir foco total em **Mobile-First e PWA** (+5 dias no cronograma).
- Ajustados artefatos do projeto (`PRD-v1.0.md` e `PRD-v1.0.json`, mantendo versão base com updates iterativos).

### Added

- Documentação de UX Mobile requirements (touch targets, Lighthouse > 90).
- Suporte offline e manifesto PWA.

## [1.0.0] - 2026-03-10

### Added

- Documentação inicial consolidada do PRD v1.0.
- Requisitos funcionais e não-funcionais (Segurança, Performance, LGPD).
- Escopo IN/OUT definido.
- KPIs de Sucesso definidos.
- Roadmap do MVP estabelecido.
