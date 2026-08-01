# Matriz de Impacto — navestory SaaS

> **AVISO DE CORRECAO — 2026-07-12 (rev. 21); atualizado 2026-07-14 (rev. 23 — IMPACTO-030 adicionado)**
> Esta matriz foi reescrita em 2026-07-12 para refletir o estado real do projeto.
> Versões anteriores (rev. 1 a rev. 20) misturavam análises genuínas de planejamento com
> entradas que afirmavam que mudanças haviam sido "implementadas" (com commits, datas de
> execução, status "Implementado") quando na verdade o repositório navestory é **greenfield** —
> nenhum código-fonte existe hoje (sem `apps/`, `packages/`, `src/`, `package.json`).
>
> **O que foi preservado:** os achados de risco, as análises de impacto e os mapeamentos de
> módulos afetados são genuinamente úteis para quando a implementação iniciar. Foram mantidos
> como "avaliação de planejamento pré-implementação".
>
> **O que foi corrigido:** referências a commits, afirmações de que migrations foram "Aplicadas",
> afirmações de que funcionalidades foram "Implementadas" e contagens de teste foram removidas
> ou reclassificadas. Achados de risco sobre lacunas arquiteturais foram mantidos como
> "riscos a observar na implementação futura", não como bugs já detectados em produção.
>
> A única exceção já correta antes desta revisão é IMPACTO-025 (odômetro + ciclos),
> que já estava marcado como "não iniciado — análise pré-implementação".

---

## Como usar

Antes de implementar qualquer mudança significativa, registrar aqui:

- Módulos afetados
- Nível de risco (Crítico / Alto / Médio / Baixo)
- Estratégia de mitigação

Ao concluir a implementação, atualizar o campo **Status** de
"Avaliação pré-implementação" para "Implementado" e acionar o agente `doc-keeper`
para sincronizar `matrices/rastreabilidade.md`.

---

## Mudanças Avaliadas

### IMPACTO-001 — Hardening de Segurança (SPEC-20260521-001)

| Campo           | Valor                                                    |
| --------------- | -------------------------------------------------------- |
| **Spec**        | SPEC-20260521-001                                        |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Crítico                                                  |

| #   | Mudança                                                                  | Módulos afetados               | Risco   | Mitigação                                                     |
| --- | ------------------------------------------------------------------------ | ------------------------------ | ------- | ------------------------------------------------------------- |
| 1   | `NEXT_PUBLIC_SUPABASE_URL` → `SUPABASE_URL` em auth.module               | `auth`                         | Crítico | Atualizar `.env` e `.env.example` simultaneamente             |
| 2   | Corrigir campos do `audit_logs` (`event`→`action`, `metadata`→`changes`) | `auth`                         | Crítico | Falhas silenciosas → agora capturadas e logadas               |
| 3   | `HttpExceptionFilter` global — ocultar stack trace em produção           | `common/filters`, `main.ts`    | Alto    | Testar com `NODE_ENV=production` antes de deploy              |
| 4   | Rate limit diferenciado em auth (5/15min register, 10/15min login)       | `auth.controller`              | Médio   | Ajustar testes E2E que fazem múltiplas chamadas               |
| 5   | Rollback scripts para as migrations                                      | `supabase/migrations/rollback` | Médio   | Testar down scripts em banco local antes de merge             |
| 6   | `SUPABASE_SERVICE_ROLE_KEY` obrigatório no Joi                           | `config/env.validation`        | Médio   | Todas as instâncias (dev, staging, prod) precisam da variável |
| 7   | Substituir `console.log` por `Logger` em main.ts                         | `main.ts`                      | Baixo   | Nenhum                                                        |

**Riscos a observar na implementação futura:**

- Startup falhará se `SUPABASE_SERVICE_ROLE_KEY` ausente no ambiente — intencional, detecta misconfiguration cedo
- `HttpExceptionFilter` alterará o shape de todos os responses de erro — frontend deve estar preparado para `{ statusCode, message, timestamp }`

---

### IMPACTO-002 — Alertas de Manutenção por Email (SPEC-20260521-002)

| Campo           | Valor                                                    |
| --------------- | -------------------------------------------------------- |
| **Spec**        | SPEC-20260521-002                                        |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Médio                                                    |

| #   | Mudança                                                   | Módulos afetados       | Risco | Mitigação                                                                   |
| --- | --------------------------------------------------------- | ---------------------- | ----- | --------------------------------------------------------------------------- |
| 1   | Nova Edge Function `send-maintenance-alerts`              | `supabase/functions/`  | Médio | Testar com Supabase CLI localmente antes de deploy                          |
| 2   | Nova migration `pg_cron_maintenance_alerts`               | `supabase/migrations/` | Médio | Rollback script incluído; pg_cron deve estar habilitado no projeto Supabase |
| 3   | Nova variável de ambiente `RESEND_API_KEY`                | Infraestrutura         | Baixo | Adicionar ao `.env.example` e documentar no README                          |
| 4   | Leitura de `auth.users` via service role para obter email | Segurança              | Alto  | Nunca logar o email do usuário; usar apenas para envio                      |
| 5   | `alert_sent = true` após envio bem-sucedido               | `maintenances` (DB)    | Baixo | Idempotente por design — reexecução não reenvia                             |

**Dependências externas:**

- Resend (resend.com) — serviço de email transacional; falha do serviço não derruba o sistema (job retenta no próximo ciclo)
- pg_cron habilitado no projeto Supabase — verificar antes de deploy

---

### IMPACTO-003 — Export CSV do Dashboard (SPEC-20260521-003)

| Campo           | Valor                                                    |
| --------------- | -------------------------------------------------------- |
| **Spec**        | SPEC-20260521-003                                        |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Baixo                                                    |

| #   | Mudança                                         | Módulos afetados                            | Risco | Mitigação                                                         |
| --- | ----------------------------------------------- | ------------------------------------------- | ----- | ----------------------------------------------------------------- |
| 1   | Novo endpoint `GET /dashboard/export`           | `dashboard.controller`, `dashboard.service` | Baixo | Isolado — não altera endpoints existentes                         |
| 2   | JOIN `expenses` + `vehicles` na query de export | `expenses`, `vehicles` (DB)                 | Baixo | Testar com período sem dados (deve retornar CSV com só cabeçalho) |
| 3   | Throttle dedicado no endpoint (10 req/5min)     | `dashboard.controller`                      | Baixo | Nenhum                                                            |
| 4   | BOM UTF-8 no response                           | Frontend                                    | Baixo | Testar abertura no Excel pt-BR                                    |
| 5   | Limite de 5.000 linhas por exportação           | Query                                       | Baixo | Documentar no Swagger; considerar paginação futura                |

---

### IMPACTO-004 — Admin Role e Operações LGPD (SPEC-20260521-004)

| Campo           | Valor                                                    |
| --------------- | -------------------------------------------------------- |
| **Spec**        | SPEC-20260521-004                                        |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Alto                                                     |

| #   | Mudança                                                                           | Módulos afetados                    | Risco | Mitigação                                                                                                         |
| --- | --------------------------------------------------------------------------------- | ----------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | `AdminSupabaseService` com `SERVICE_ROLE_KEY` — bypass de RLS                     | `admin`, segurança                  | Alto  | Módulo admin nunca importado em contextos de usuário; isolamento garantido por módulo NestJS                      |
| 2   | `DELETE /users/me` — auto-exclusão de conta                                       | `users.controller`, `users.service` | Alto  | Exige `{ confirm: true }` no body; operação irreversível após execução                                            |
| 3   | Revogação de JWT via `auth.admin.deleteUser`                                      | `auth`, Supabase                    | Alto  | Testar fluxo completo: token revogado deve retornar 401 imediatamente                                             |
| 4   | `AdminGuard` verifica role no JWT                                                 | `admin/guards`                      | Alto  | Fallback seguro: qualquer dúvida no token → 403                                                                   |
| 5   | Trigger `soft_delete_profile()` — verificar se `CREATE TRIGGER` está na migration | DB                                  | Médio | **Risco a observar na implementação:** inspecionar migration antes de aplicar para confirmar que o trigger existe |
| 6   | `GET /admin/users` e `GET /admin/audit-logs` expõem dados de qualquer usuário     | Segurança / LGPD                    | Alto  | Exclusivo para admins; toda operação auditada em `audit_logs` com `user_id` do admin                              |

**Atenção LGPD:**

- Direito ao esquecimento (Art. 18): `DELETE /users/me` deve anonimizar dados imediatamente
- Toda operação admin que acessa/altera dados de terceiros deve ser registrada em `audit_logs`
- `SERVICE_ROLE_KEY` jamais exposto em responses ou logs INFO/WARN

---

### IMPACTO-005 — OpenAPI / Swagger (SPEC-20260521-005)

| Campo           | Valor                                                    |
| --------------- | -------------------------------------------------------- |
| **Spec**        | SPEC-20260521-005                                        |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Baixo                                                    |

| #   | Mudança                                                | Módulos afetados        | Risco | Mitigação                                                 |
| --- | ------------------------------------------------------ | ----------------------- | ----- | --------------------------------------------------------- |
| 1   | Instalação de `@nestjs/swagger` + `swagger-ui-express` | `apps/api/package.json` | Baixo | Dependências de desenvolvimento — sem impacto em produção |
| 2   | Plugin Swagger em `nest-cli.json`                      | Build                   | Baixo | Aumenta ligeiramente o tempo de build; testar no CI       |
| 3   | `SwaggerModule.setup` em `main.ts`                     | `main.ts`               | Baixo | Condicional por `NODE_ENV` — produção não é afetada       |
| 4   | Adição de `SWAGGER_ENABLED` ao Joi                     | `env.validation.ts`     | Baixo | Campo opcional com default `false`                        |
| 5   | Anotações `@ApiTags`, `@ApiOperation` nos controllers  | Todos os controllers    | Baixo | Puramente decorativo — sem alteração de comportamento     |

**Impacto em produção:** Nenhum, desde que `SWAGGER_ENABLED` não seja definido como `true` em produção.

---

### IMPACTO-006 — Hardening TDD: specs de repositório, infraestrutura e validators

| Campo           | Valor                                                          |
| --------------- | -------------------------------------------------------------- |
| **Spec**        | — (cobertura de specs já existentes; sem nova spec de produto) |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda       |
| **Risco geral** | Baixo                                                          |

| #   | Mudança                                                                                                           | Módulos afetados                      | Risco | Mitigação                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------- |
| 1   | `BusinessException`: status padrão implicitamente 422 (UNPROCESSABLE_ENTITY); spec documenta e fixa o contrato    | `common/exceptions`                   | Baixo | Comportamento pré-existente na spec; spec apenas o documenta formalmente                                       |
| 2   | `LoggingInterceptor`: tipagem explícita do request no `switchToHttp()`                                            | `common/interceptors`                 | Baixo | Melhora type-safety sem alterar comportamento de runtime                                                       |
| 3   | `SupabaseMaintenanceRepository.update`: incluir `alert_sent: false` quando `scheduled_date` é atualizado          | `maintenance`                         | Médio | Comportamento crítico para alertas de email — criar spec que verifique os dois ramos (com e sem reagendamento) |
| 4   | `SupabaseMaintenanceRepository.countPending`: nova query com `count: 'exact'` e filtro em `status`                | `maintenance`, `dashboard`            | Baixo | Cobrir todos os cenários incluindo vehicleId opcional e count null                                             |
| 5   | `SupabaseVehicleRepository.delete`: soft-delete em cascata (vehicles + expenses + maintenances) via `Promise.all` | `vehicles`, `expenses`, `maintenance` | Alto  | Verificar que as 3 tabelas recebem `deleted_at`; falha em qualquer tabela deve propagar o erro                 |
| 6   | `SupabaseExpenseRepository`: novos métodos `sumSince` e `findForExport` (join com vehicles)                       | `expenses`, `dashboard`               | Baixo | Cobrir filtros gte/lte, vehicleId opcional e cálculo de soma                                                   |
| 7   | `AuditService`: timestamp ISO injetado nos `changes` (sobrescreve qualquer timestamp externo)                     | `infrastructure/audit`                | Baixo | Comportamento defensivo — documentar explicitamente o overwrite                                                |
| 8   | `validators/vehicles.schema`: adição de campos `fuel_type`, `odometer`, `renavam`, `chassi`, `nickname`, `status` | `packages/validators`, `apps/web`     | Médio | Campos novos com `.optional()` — sem breaking change; cobrir todos os casos de borda                           |
| 9   | `validators/utils/patterns`: exposição de `PLATE_REGEX`, `CPF_REGEX` e `validateCPF` (Módulo 11)                  | `packages/validators`                 | Baixo | Funções puras; cobrir CPFs válidos, inválidos e todos-iguais                                                   |

**Riscos a observar na implementação futura:**

- Soft-delete em cascata de veículos tornará a operação `DELETE /vehicles/:id` mais pesada (3 updates paralelos). Em frotas grandes, monitorar latência.
- `alert_sent: false` no reagendamento reativará alertas de email — se Resend estiver ativo, usuário receberá novo aviso após qualquer mudança de `scheduled_date`.

---

### IMPACTO-007 — Revalidação Centralizada, Audit Log Universal e Monitor do Sistema

| Campo           | Valor                                                    |
| --------------- | -------------------------------------------------------- |
| **Spec**        | — (refatoração arquitetural; sem nova spec de produto)   |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Médio                                                    |

| #   | Mudança                                                                                                                                                           | Módulos afetados                                                           | Risco | Mitigação                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | Novo helper `lib/actions/revalidate.ts`: `revalidateVehicles()`, `revalidateExpenses()`, `revalidateMaintenances()` — ponto único de revalidação de cache Next.js | `apps/web/lib/actions`, todas as Server Actions                            | Baixo | Elimina chamadas `revalidatePath` dispersas; adicionar nova rota global apenas em `CORE_PATHS`                            |
| 2   | Novo helper `lib/actions/audit.ts`: `writeAuditLog(entry)` com tipos `AuditAction` e `AuditTable`                                                                 | `apps/web/lib/actions`, Server Actions de vehicles, expenses, maintenances | Médio | `writeAuditLog` nunca deve lançar exceção (try/catch silencioso) — falha de auditoria não interrompe a operação principal |
| 3   | Refatoração de Server Actions — 13 funções migradas para helpers centralizados                                                                                    | `apps/web/app/actions/*`                                                   | Médio | Comportamento externo deve ser idêntico; risco de regressão mitigado por testes antes do merge                            |
| 4   | `expense-actions.ts` e `maintenance-actions.ts`: audit log passará a ser escrito                                                                                  | `expenses`, `maintenances`, `audit_logs`                                   | Baixo | Comportamento aditivo — sem risco de breaking change; logs começarão a aparecer no monitor                                |
| 5   | Nova página `/dashboard/monitor` — Server Component com `force-dynamic`                                                                                           | `apps/web/app/(dashboard)/dashboard/monitor`                               | Baixo | Protegida por redirect `/login` caso `user` seja null; RLS de `audit_logs` garante isolamento no DB                       |
| 6   | Dashboard principal atualizado: card "Monitor" adicionado nas Ações Rápidas                                                                                       | `apps/web/app/(dashboard)/dashboard/page.tsx`                              | Baixo | Mudança puramente aditiva e visual                                                                                        |
| 7   | `QuickVehicleRegister.tsx`: após cadastro do 1º veículo, `router.refresh()` + `router.push('/dashboard')`                                                         | `apps/web/components/vehicles/QuickVehicleRegister.tsx`                    | Baixo | Corrige UX de estado vazio preso após primeiro cadastro                                                                   |

**Riscos a observar na implementação futura:**

- Despesas e manutenções passarão a escrever em `audit_logs` — volume da tabela crescerá proporcionalmente. Avaliar política de retenção/arquivamento.
- A página `/dashboard/monitor` com `force-dynamic` fará query sem cache — adicionar ISR ou cache manual se o acesso for intenso.

---

### IMPACTO-008 — Bug Fix: SelectValue exibindo raw value (UUID/inglês) após seleção

| Campo           | Valor                                                    |
| --------------- | -------------------------------------------------------- |
| **Spec**        | — (bug fix de UI; sem nova spec)                         |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Baixo                                                    |

| #   | Mudança                                                                                                                                         | Módulos afetados                  | Risco | Mitigação                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ----- | ----------------------------------------------------------------------------- |
| 1   | `packages/ui/src/components/select.tsx`: prop `label` deve ser repassada ao `<SelectPrimitive.Item>` — corrige typeahead por teclado no Base UI | `packages/ui`                     | Baixo | Correção de comportamento omitido; sem alteração de API pública do componente |
| 2   | `maintenance-form.tsx`: campos Veículo e Status devem usar render function em `<SelectValue>`                                                   | `apps/web/components/maintenance` | Baixo | Nenhum                                                                        |
| 3   | `expense-form.tsx`: campos Veículo e Categoria devem usar render function em `<SelectValue>`                                                    | `apps/web/components/expenses`    | Baixo | Nenhum                                                                        |
| 4   | `expense-filters.tsx`: filtros Veículo, Mês e Categoria devem usar render function                                                              | `apps/web/components/expenses`    | Baixo | Nenhum                                                                        |
| 5   | `vehicle-select.tsx`: filtro do dashboard deve usar render function                                                                             | `apps/web/components/dashboard`   | Baixo | Nenhum                                                                        |

**Causa raiz (documentada para orientar a implementação):** O `Select.Value` do Base UI (`@base-ui/react`) exibe o raw `value` via `serializeValue()` quando nenhum `children` é fornecido como render function. Padrão correto: sempre que `value !== texto visível`, passar `children` como `(value) => ReactNode`.

---

### IMPACTO-009 — Migration: Campo `odometer_km` em `expenses` (SPEC-20260601-001)

| Campo           | Valor                                                    |
| --------------- | -------------------------------------------------------- |
| **Spec**        | SPEC-20260601-001                                        |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Baixo                                                    |

| #   | Mudança                                                                                                                                          | Módulos afetados                                                                         | Risco | Mitigação                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------ |
| 1   | `ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS odometer_km INTEGER` — coluna nullable, sem default                                        | `expenses` (DB), `ExpenseRepositoryPort`, `SupabaseExpenseRepository`, `ExpensesService` | Baixo | Coluna nullable — sem breaking change em registros existentes; `IF NOT EXISTS` torna a migration idempotente |
| 2   | Índice `idx_expenses_vehicle_odometer ON expenses (vehicle_id, date DESC, created_at DESC) WHERE odometer_km IS NOT NULL AND deleted_at IS NULL` | `expenses` (DB)                                                                          | Baixo | Índice parcial — impacto mínimo em espaço em disco                                                           |
| 3   | Tipos gerados em `packages/database/src/types/database.types.ts` — campo `odometer_km` passará a constar                                         | `packages/database`                                                                      | Baixo | Regeneração via `supabase gen types typescript` — arquivos consumidores devem recompilar                     |
| 4   | Novo método `findMaxOdometerByVehicle(vehicleId, userId, excludeExpenseId?)` no `ExpenseRepositoryPort`                                          | `apps/api/src/modules/expenses`                                                          | Baixo | Adição de método ao port — sem remoção de método existente                                                   |
| 5   | Lógica de comparação de odômetro em `ExpensesService.create()` e `ExpensesService.update()`                                                      | `apps/api/src/modules/expenses`                                                          | Baixo | Campos adicionais na resposta — sem breaking change; degradação graciosa em caso de falha da query de máximo |

**Riscos a observar na implementação futura:**

- Endpoint `POST /expenses` executará uma query adicional após o insert quando `odometer_km` estiver presente.
- Tipos TypeScript do pacote `database` devem ser importados novamente em todos os consumers após a regeneração.

---

### IMPACTO-010 — Migration: Tabela `user_categories` com RLS owner-only (SPEC-20260602-004)

| Campo           | Valor                                                    |
| --------------- | -------------------------------------------------------- |
| **Spec**        | SPEC-20260602-004                                        |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Médio                                                    |

| #   | Mudança                                                                                                                               | Módulos afetados | Risco | Mitigação                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----- | -------------------------------------------------------------------------------------------------- |
| 1   | Nova tabela `public.user_categories` com `id UUID PK`, `user_id UUID FK → profiles(id) ON DELETE CASCADE`, `value TEXT`, `label TEXT` | DB               | Médio | FK com `ON DELETE CASCADE` garante que exclusão do perfil remove as categorias (alinhado com LGPD) |
| 2   | Constraint `UNIQUE (user_id, value)` — impede categoria duplicada por slug                                                            | DB               | Baixo | Conflito retorna erro 409 na API — implementação deve tratar `PG_UNIQUE_VIOLATION` (código 23505)  |
| 3   | Constraints de formato em `value` (1–50 chars, regex slug) e `label` (1–100 chars)                                                    | DB               | Baixo | Validação duplicada no schema Zod — banco é camada de segurança secundária                         |
| 4   | RLS habilitado com política única `FOR ALL USING (auth.uid() = user_id)` — owner-only                                                 | Segurança, DB    | Médio | Política `FOR ALL` cobre SELECT, INSERT, UPDATE e DELETE; sem exceção para leitura pública         |
| 5   | Índice `idx_user_categories_user_id ON user_categories (user_id)`                                                                     | DB               | Baixo | Nenhum                                                                                             |
| 6   | Módulo `apps/api/src/modules/categories/` criado para servir a nova tabela                                                            | `apps/api`       | Médio | Módulo novo — requer registro em `app.module.ts`                                                   |

**Riscos a observar na implementação futura:**

- A tabela `expense_categories` existente (dados de referência globais) convive com `user_categories` (dados de usuário). A camada de serviço deve combinar as duas fontes ao popular seletores de categoria.
- `AdminSupabaseService` (SERVICE_ROLE_KEY) bypassa o RLS da nova tabela — garantir que endpoints admin estejam devidamente protegidos pelo `AdminGuard`.

---

### IMPACTO-011 — Sistema Em Foco: Contexto de Veículo Global (SPEC-20260602-001)

| Campo           | Valor                                                    |
| --------------- | -------------------------------------------------------- |
| **Spec**        | SPEC-20260602-001                                        |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Médio                                                    |

| #   | Mudança                                                                                                                                                                                  | Módulos afetados                                                            | Risco | Mitigação                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------- |
| 1   | `use-dashboard-store.ts`: adição de `activeVehicleData`, `activeGroupData` (com `memberIds`), novos setters; persistência `single`/`group` em localStorage, `multi`/`attribute` efêmeros | `apps/web/stores`                                                           | Médio | Campos novos não conflitam com campos existentes                                             |
| 2   | `focus-slot.tsx`: novo componente inserido no `Sidebar` entre cabeçalho e nav — presente em todas as páginas autenticadas                                                                | `apps/web/components/layout`                                                | Baixo | Slot lê apenas o store Zustand (síncrono); sem request de rede; CLS = 0 pelo design síncrono |
| 3   | `fleet-aside.tsx`: passa a popular `activeVehicleData` e `activeGroupData` no store e detecta staleness                                                                                  | `apps/web/components/layout`                                                | Médio | Reutiliza o fetch de listagem já existente; 0 requests extras                                |
| 4   | `expense-form.tsx` e `maintenance-form.tsx`: herança de contexto via `useVehicleContextField`; visual âmbar; dicas por modo                                                              | `apps/web/components/expenses`, `apps/web/components/maintenance`           | Médio | Herança só ocorre no mount (R-CTX-06)                                                        |
| 5   | `expenses/page.tsx` e `maintenance/page.tsx`: suporte a `vehicleIds` e `ContextFilterSync`                                                                                               | `apps/web/app/(dashboard)/expenses`, `apps/web/app/(dashboard)/maintenance` | Baixo | Mudança aditiva — comportamento sem contexto deve ser idêntico ao anterior                   |
| 6   | `sidebar.tsx`: `clearAllSelection()` chamado antes do submit de logout (RF-19)                                                                                                           | `apps/web/components/layout`                                                | Baixo | Garante que `activeVehicleId`/`activeGroupId` não persistam entre sessões no mesmo browser   |
| 7   | `context-filter-sync.tsx`: deve ser o único componente (além de `VehicleActivator`) a fazer a ponte store↔URL                                                                            | `apps/web/components/layout`                                                | Médio | Monitorar se outros componentes forem adicionados que façam o mesmo (viola R-CTX-04)         |

**Riscos a observar na implementação futura:**

- O slot "Em Foco" aparecerá em todas as páginas autenticadas dentro do layout do Sidebar. Se o layout for alterado (ex: nova página sem Sidebar), o slot some automaticamente.
- Filtro por grupo nas listagens executa uma sub-query extra em `vehicle_group_members` — para grupos grandes, avaliar paginação de memberIds.

---

### IMPACTO-012 — Preferências de Exibição do Veículo no Chip (SPEC-20260603-003)

| Campo           | Valor                                                    |
| --------------- | -------------------------------------------------------- |
| **Spec**        | SPEC-20260603-003                                        |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Médio                                                    |

| #   | Mudança                                                                                                | Módulos afetados                                       | Risco | Mitigação                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Nova tabela `user_preferences` com coluna `vehicle_chip_fields text[]` e RLS owner-only                | DB (Supabase)                                          | Médio | Política `auth.uid() = user_id` cobre SELECT, INSERT, UPDATE e DELETE; FK `ON DELETE CASCADE` garante remoção ao excluir conta (LGPD) |
| 2   | `ALTER TABLE vehicles ADD COLUMN nickname text CHECK (char_length(nickname) <= 30)`                    | DB, `vehicles` (API + frontend)                        | Baixo | Coluna nullable sem default — sem breaking change                                                                                     |
| 3   | Novos DTOs e entidade de veículo incluem `nickname` (opcional, max 30 chars)                           | `apps/api/src/modules/vehicles/entities`, `dto/`       | Baixo | Campo opcional com `.optional()` — sem breaking change na API                                                                         |
| 4   | Novo schema Zod `chipFieldsSchema` em `packages/validators`                                            | `packages/validators`                                  | Baixo | Schema puro sem efeitos colaterais                                                                                                    |
| 5   | Server Actions `getChipFields` / `updateChipFields` leem/escrevem `user_preferences` via Supabase      | `apps/web/app/actions/user-preferences.ts`             | Baixo | `getChipFields` deve retornar fallback `['make','model','plate']` em caso de erro de leitura                                          |
| 6   | `use-dashboard-store.ts`: adição de `chipFields` + `setChipFields` + `nickname` em `activeVehicleData` | `apps/web/stores`                                      | Médio | Campos novos não conflitam com o estado existente; fallback para usuários sem preferência salva                                       |
| 7   | `VehicleContextChip`: renderização dinâmica por `chipFields`; lógica de fallback `nickname → model`    | `apps/web/components/layout/vehicle-context-chip.tsx`  | Médio | Fallback evita tela em branco (RF-04); max-width `260px` com `truncate` previne overflow                                              |
| 8   | `ChipSettingsPopover`: novo componente inline no chip — interação direta no subheader                  | `apps/web/components/layout/chip-settings-popover.tsx` | Baixo | Popover usa Radix UI — gerenciamento de foco e Esc nativo                                                                             |

**Riscos a observar na implementação futura:**

- O campo `nickname` passará a ser enviado e recebido nas chamadas `GET /vehicles` e `POST /vehicles`.
- `user_preferences` é uma segunda tabela de preferências de usuário (a primeira sendo `profiles.preferences` JSONB). Em revisão futura, avaliar unificação.

---

### IMPACTO-013 — Migration `user_preferences` e `liters`; Bugfix Enum `pending`; Edição de Perfil e Despesas

| Campo           | Valor                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Spec**        | SPEC-20260603-004 (user_preferences); SPEC-20260521-002 (bugfix enum); sem spec para liters e edição de perfil/despesas |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda                                                                |
| **Risco geral** | Médio                                                                                                                   |

| #   | Mudança                                                                                                                                                         | Módulos afetados                                                                             | Risco | Mitigação                                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Migration `20260604000000_user_preferences.sql`: tabela `user_preferences` com `user_id` (PK FK), `vehicle_chip_fields JSONB`, `updated_at`; RLS owner-only     | DB, `apps/web/app/actions/user-preferences.ts`                                               | Médio | RLS ativo desde a criação; FK `ON DELETE CASCADE` garante conformidade LGPD (C1)                                                                                                                |
| 2   | Migration `20260604000001_add_liters_to_expenses.sql`: `liters numeric(8,3) null` em `expenses`                                                                 | DB, `packages/database`                                                                      | Baixo | Coluna nullable sem default — sem breaking change                                                                                                                                               |
| 3   | Bugfix enum de status de manutenção: `scheduled` → `pending` em `maintenance.schema.ts`, entidade, DTO, `maintenance-form.tsx`, `maintenance-status-filter.tsx` | `packages/validators`, `apps/api/src/modules/maintenance`, `apps/web/components/maintenance` | Médio | **Risco a observar:** registros existentes com `status = 'scheduled'` no Supabase devem ser migrados para `pending` via `UPDATE maintenances SET status = 'pending' WHERE status = 'scheduled'` |
| 4   | `ProfileNameSection`: novo componente de edição inline de nome com `supabase.auth.updateUser`                                                                   | `apps/web/components/profile`, `apps/web/app/(dashboard)/profile/page.tsx`                   | Baixo | Componente isolado na página de perfil                                                                                                                                                          |
| 5   | `ExpenseRowActions` + `/expenses/[id]/edit` + `ExpenseForm` modo edição                                                                                         | `apps/web/components/expenses`, `apps/web/app/(dashboard)/expenses`                          | Baixo | `ExpenseForm` deve manter compatibilidade retroativa — props `expenseId` e `initialValues` são opcionais                                                                                        |

**Riscos a observar na implementação futura:**

- Registros existentes com `status = 'scheduled'` em `maintenances` são incompatíveis com o enum corrigido — aplicar migration de dados.
- `ProfileNameSection` chamará `supabase.auth.updateUser` diretamente do cliente — verificar se o token da sessão não expirou em sessões longas.

---

### IMPACTO-014 — Enriquecimento de Abastecimento: Pré-preenchimento, Delta de Odômetro, Autocomplete de Fornecedor

| Campo           | Valor                                                           |
| --------------- | --------------------------------------------------------------- |
| **Spec**        | SPEC-20260606-001 RF-04, RF-06, RF-07 e SPEC-20260606-002 RF-02 |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda        |
| **Risco geral** | Baixo                                                           |

| #   | Mudança                                                                                                             | Módulos afetados                                | Risco | Mitigação                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| 1   | `getLastFuelTypeAction(vehicleId)`: nova server action read-only; query por histórico de combustível                | `apps/web/app/actions/expense-actions.ts`       | Baixo | Query usa filtros indexados; sem escrita em banco; falha silenciosa não interrompe o formulário |
| 2   | `ExpenseForm`: `useEffect` de pré-preenchimento de `fuel_type` apenas em modo criação                               | `apps/web/components/expenses/expense-form.tsx` | Baixo | Lógica condicional isolada; sem impacto no modo edição                                          |
| 3   | `ExpenseForm`: delta no hint de odômetro — lógica condicional no JSX                                                | `apps/web/components/expenses/expense-form.tsx` | Baixo | Puramente visual; sem alteração de validação ou persistência                                    |
| 4   | `ExpenseForm`: mensagem de fallback "Consumo aparece após o 2º abastecimento completo"                              | `apps/web/components/expenses/expense-form.tsx` | Baixo | Puramente visual                                                                                |
| 5   | `getSupplierSuggestionsAction()`: nova server action read-only; busca 50 registros, deduplica em JS, retorna top 10 | `apps/web/app/actions/expense-actions.ts`       | Baixo | Uma chamada por sessão do form (fetch-on-focus); sem escrita                                    |
| 6   | `ExpenseForm`: campo `supplier` substituído por autocomplete inline com Popover                                     | `apps/web/components/expenses/expense-form.tsx` | Baixo | Campo deve continuar aceitando texto livre (RF-04 da spec)                                      |

**Pendente nas mesmas specs:** RF-01 e RF-02 (persistência de `fuel_type` e `full_tank` no backend), RF-03 (campo `computed` na resposta da API), RF-05 (toggle "Abastecimento parcial?"), RF-08 (preço/litro em tempo real) — requerem migration e alterações no `ExpensesService`.

---

### IMPACTO-015 — Correção de Placeholders em Dropdowns (UX)

| Campo           | Valor                                                             |
| --------------- | ----------------------------------------------------------------- |
| **Spec**        | — (correção de UX; extensão do padrão documentado em IMPACTO-008) |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda          |
| **Risco geral** | Baixo                                                             |

| #   | Mudança                                                                                                            | Módulos afetados                                          | Risco | Mitigação                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ----- | -------------------------------------------------------------- |
| 1   | `expense-form.tsx`: placeholders para campos Veículo, Categoria e Combustível via render function do `SelectValue` | `apps/web/components/expenses/expense-form.tsx`           | Baixo | Puramente visual                                               |
| 2   | `expense-template-modal.tsx`: placeholders de Veículo e Categoria com a mesma correção                             | `apps/web/components/expenses/expense-template-modal.tsx` | Baixo | Idem                                                           |
| 3   | `maintenance-form.tsx`: placeholder "Selecione o status" via render function                                       | `apps/web/components/maintenance/maintenance-form.tsx`    | Baixo | Idem                                                           |
| 4   | `VehicleForm.tsx` e `QuickVehicleRegister.tsx`: placeholders via prop `placeholder` simples                        | `apps/web/components/vehicles/`                           | Baixo | Idem                                                           |
| 5   | `editable-info-row.tsx`: prop `placeholder?: string` adicionada com default `'Selecione...'`                       | `apps/web/components/fleet/editable-info-row.tsx`         | Baixo | Mudança compatível retroativamente — prop opcional com default |

**Padrão Base UI a aplicar:**

- Se `value !== texto visível`: usar render function em `SelectValue`; placeholder como caso `!value` dentro dela.
- Se `value === label` (sem render function): usar a prop `placeholder` diretamente no `SelectValue`.

---

### IMPACTO-016 — Ledger Unificado + FinesModule + RecurringCostsModule (EPIC-FIN-001)

| Campo           | Valor                                                                                   |
| --------------- | --------------------------------------------------------------------------------------- |
| **Spec**        | EPIC-FIN-001; SPEC-20260607-001 (FinesModule); SPEC-20260609-001 (RecurringCostsModule) |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda                                |
| **Risco geral** | Alto                                                                                    |

| #   | Mudança                                                                                                                                                          | Módulos afetados                                                      | Risco | Mitigação                                                                                                                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Migration `20260608000000_unified_ledger.sql`: campos `source_type TEXT NULL`, `source_id UUID NULL`, `is_readonly BOOLEAN NOT NULL DEFAULT FALSE` em `expenses` | `expenses` (DB, API, frontend), `packages/database`                   | Alto  | Colunas nullable sem default — sem breaking change; `DEFAULT FALSE` garante que despesas pré-existentes continuam editáveis                                                                                                                        |
| 2   | `CONSTRAINT expenses_source_coherence_check`: garante que `source_type` e `source_id` são sempre preenchidos juntos ou nulos juntos (R-LED-04)                   | `expenses` (DB)                                                       | Médio | Constraint DB é camada de segurança secundária; a primária é a validação do schema Zod                                                                                                                                                             |
| 3   | `UNIQUE INDEX uq_expenses_source ON expenses (source_type, source_id) WHERE deleted_at IS NULL`: idempotência do ledger (R-HUB-02)                               | `expenses` (DB)                                                       | Médio | Índice parcial — soft-delete libera o slot para nova criação futura                                                                                                                                                                                |
| 4   | `ExpensesService.createFromSource()` e `softDeleteBySource()`: métodos novos                                                                                     | `expenses`, `fines`, `recurring-costs`                                | Alto  | **Risco a observar:** evitar dependência circular — `FinesModule → ExpensesModule` e `RecurringCostsModule → ExpensesModule` (nunca o inverso)                                                                                                     |
| 5   | `ExpensesService.update()` e `remove()`: 403 quando `is_readonly = true` (R-LED-01)                                                                              | `expenses` (API)                                                      | Alto  | Frontend deve ocultar ações de edição/exclusão para despesas readonly; a API é a barreira de segurança                                                                                                                                             |
| 6   | Nova tabela `vehicle_recurring_costs` com RLS owner-only                                                                                                         | DB                                                                    | Médio | **Risco a observar:** `CONSTRAINT uq_vehicle_recurring_cost UNIQUE (vehicle_id, cost_type, year)` não inclui `deleted_at` — um registro soft-deleted bloqueia novos registros para o mesmo par/ano; considerar índice parcial em vez de constraint |
| 7   | RPC `get_upcoming_costs(p_user_id UUID)`: nova função SQL                                                                                                        | DB                                                                    | Baixo | Função read-only; falha na RPC não afeta outras operações                                                                                                                                                                                          |
| 8   | `FinesModule` + `RecurringCostsModule` registrados em `AppModule`: dois novos controladores REST                                                                 | `apps/api/src/app.module.ts`                                          | Médio | Módulos novos não alterarão rotas existentes                                                                                                                                                                                                       |
| 9   | Frontend `/fines/` e reestruturação de `/expenses/` com tabs e `LinkedExpenseDrawer`                                                                             | `apps/web/app/(dashboard)/fines`, `apps/web/app/(dashboard)/expenses` | Médio | Mudanças aditivas na navegação — nenhum endpoint existente será removido                                                                                                                                                                      |
| 10  | Validadores Zod de multas e custos recorrentes exportados via `index.ts` do pacote `validators`                                                                  | `packages/validators`                                                 | Baixo | Exports aditivos — sem remoção de exports existentes                                                                                                                                                                                               |

**Riscos a observar na implementação futura:**

- `UNIQUE INDEX uq_expenses_source` exige que despesas com `source_type IS NOT NULL` e `deleted_at IS NULL` sejam únicas por origem. Fluxos de reativação devem respeitar essa ordem.
- O campo `is_readonly` não terá política RLS específica — a proteção contra edição direta ficará exclusivamente na camada de serviço NestJS.
- Os módulos `FinesModule` e `RecurringCostsModule` precisarão de `AuditService.log()` nas operações de criação/atualização/remoção.

---

### IMPACTO-017 — Melhorias de UX do Formulário/Hub de Despesas (SPEC-20260612-001)

| Campo           | Valor                                                    |
| --------------- | -------------------------------------------------------- |
| **Spec**        | SPEC-20260612-001                                        |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Alto                                                     |

| #   | Mudança                                                                                                                                                      | Módulos afetados                                                                               | Risco    | Mitigação                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | RPC `get_upcoming_costs` passa a considerar `expenses` (despesas manuais com `due_date`) como 4ª fonte (RF-01)                                               | `supabase/migrations/20260612000001_rpc_upcoming_costs_expenses.sql`                           | Médio    | Função read-only adicional via `UNION`; falha não afeta outras fontes                                                                                                                                           |
| 2   | Campo `vehicle_id` do `ExpenseForm` revoga R-CTX-06 (mount-only) e passa a reagir a mudanças do contexto global enquanto `isInherited === true` (RF-02)      | `apps/web/hooks/use-vehicle-context-field.ts`, `apps/web/components/expenses/expense-form.tsx` | Médio    | Reatividade restrita a este campo específico; seleção manual do usuário desliga a sincronização                                                                                                                 |
| 3   | Novos componentes `CurrencyInput`/`OdometerInput` com máscara pt-BR (RF-03)                                                                                  | `packages/ui`, `apps/web/components/expenses/expense-form.tsx`                                 | Baixo    | Componentes novos e aditivos                                                                                                                                                                                    |
| 4   | Campo "Valor por litro" editável com cálculo cruzado `amount ⇄ liters ⇄ price_per_liter`; nunca persistido (R-FUEL-03) (RF-05)                               | `apps/web/components/expenses/expense-form.tsx`                                                | Médio    | Campo puramente client-side (estado React, não integra `react-hook-form`/payload)                                                                                                                               |
| 5   | **Hard-block de regressão de odômetro (R-ODO-01)**: `createExpenseAction`/`updateExpenseAction` rejeitam `odometer_km` que viola a ordem cronológica (RF-04) | `apps/web/app/actions/expense-actions.ts`                                                      | **Alto** | Supersede R1 apenas no fluxo web; `apps/api` (NestJS) mantém a validação antiga (warning, não bloqueia). Usuários que dependiam de correções retroativas via web precisarão editar na ordem cronológica correta |
| 6   | `updateExpenseInputSchema` recebe o mesmo `superRefine` de `createExpenseInputSchema` (RF-06.1)                                                              | `packages/validators/src/expenses.schema.ts`                                                   | Médio    | `ExpenseForm` deve sempre enviar o payload completo (`category` + `odometer_km`) em updates                                                                                                                     |
| 7   | `updateExpenseAction` busca a despesa existente e bloqueia edição quando `source_type IS NOT NULL` (RF-06.2)                                                 | `apps/web/app/actions/expense-actions.ts`                                                      | Médio    | Adiciona 1 SELECT extra por update                                                                                                                                                                              |
| 8   | Erros do Supabase diferenciam `PGRST116` de erro genérico via `mapMutationError` (RF-06.3)                                                                   | `apps/web/app/actions/expense-actions.ts`                                                      | Baixo    | Apenas a mensagem exibida ao usuário muda                                                                                                                                                                       |

**Riscos a observar na implementação futura:**

- O item 5 (R-ODO-01) é o de maior risco: qualquer fluxo de "correção retroativa de odômetro" via formulário web passará a ser bloqueado se violar a ordem cronológica — os usuários precisarão corrigir na ordem cronológica correta (mais antigo → mais recente).

---

### IMPACTO-018 — Ajustes de Campos e Layout do Formulário de Despesas (SPEC-20260612-002)

| Campo           | Valor                                                    |
| --------------- | -------------------------------------------------------- |
| **Spec**        | SPEC-20260612-002                                        |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Baixo                                                    |

| #   | Mudança                                                                                                                 | Módulos afetados                                                                            | Risco | Mitigação                                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `amount` aceita até R$ 100.000.000,00 (era R$ 999.999,99); `CurrencyInput` aceita até 11 dígitos (R-EXP-01, RF-01)      | `packages/validators/src/expenses.schema.ts`, `packages/ui/src/components/masked-input.tsx` | Baixo | Mudança apenas amplia o limite superior                                                                                                                         |
| 2   | Novo campo "Ano" (4 dígitos) ao lado da Data; data resultante inválida ajustada para o último dia válido do mês (RF-02) | `apps/web/components/expenses/expense-form.tsx`                                             | Baixo | Campo client-side derivado de `date`; não altera o schema nem o payload                                                                                         |
| 3   | `full_tank` passa de binário (default `true`) para tri-state (default `null`) — R-FUEL-06 (RF-03)                       | `apps/web/components/expenses/expense-form.tsx`                                             | Médio | **Risco a observar:** mudança de default (`null` em vez de `true`) significa que `km/L` não aparece automaticamente em novas despesas até confirmação explícita |
| 4   | `odometer_km` limitado a 9.999.999 (7 dígitos) no `expenseBaseSchema` — R-ODO-02 (RF-04)                                | `packages/validators/src/expenses.schema.ts`                                                | Baixo | Limite já era respeitado na UI                                                                                                                                  |
| 5   | Reorganização do layout: Odômetro movido para logo após Data/Ano quando `category = fuel` (RF-05)                       | `apps/web/components/expenses/expense-form.tsx`                                             | Baixo | Mudança puramente de posição no JSX                                                                                                                             |

---

### IMPACTO-019 — Reposicionamento do Chip de Contexto (SPEC-20260603-001 / SPEC-20260603-003)

| Campo           | Valor                                                                             |
| --------------- | --------------------------------------------------------------------------------- |
| **Spec**        | SPEC-20260603-001 (nota de atualização); SPEC-20260603-003 (ordem padrão do chip) |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda                          |
| **Risco geral** | Baixo                                                                             |

| #   | Mudança                                                                                                                         | Módulos afetados                                                                                              | Risco | Mitigação                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------- |
| 1   | `VehicleContextChip` deve ser movido do subheader para o header superior, à esquerda, após o logo/toggle de menu mobile         | `apps/web/components/layout/header.tsx`, `apps/web/components/layout/fleet-subheader.tsx`                     | Baixo | Mesmo componente, mesma lógica de `resolveMode()`                                      |
| 2   | Remoção do array `NAV_TABS` e da `<nav>` correspondente do header superior                                                      | `apps/web/components/layout/header.tsx`                                                                       | Baixo | navegação principal continuará existindo na sidebar via `NAV_ITEMS`               |
| 3   | Componente `ChipSettingsPopover` a ser descartado; configuração de campos do chip ficará exclusivamente em Perfil               | `apps/web/components/layout/chip-settings-popover.tsx`, `apps/web/components/layout/vehicle-context-chip.tsx` | Baixo | Configuração continua acessível em Perfil → Preferências                               |
| 4   | `DEFAULT_CHIP_FIELDS` em `display-preferences.schema.ts` alterado de `['make','model','plate']` para `['make','plate','model']` | `packages/validators/src/display-preferences.schema.ts`                                                       | Baixo | Mudança de valor default apenas — usuários com preferência já salva não serão afetados |

---

### IMPACTO-020 — Business Strategy Stories: Modelo de Monetização, Roles e Consolidação (SPEC-20260620-001)

| Campo           | Valor                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------- |
| **Spec**        | SPEC-20260620-001                                                                           |
| **Status**      | Avaliação de planejamento pré-implementação — spec em draft; nenhuma implementação iniciada |
| **Risco geral** | Alto                                                                                        |

| #   | Mudança                                                                                                                                       | Módulos afetados                                             | Risco       | Mitigação                                                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Tabela `subscriptions` com `plan_type`, `status`, `expires_at`, `trial_ends_at`; integração com gateway de pagamento (Stripe ou Mercado Pago) | DB, novo módulo `subscriptions`, infraestrutura de pagamento | **Crítico** | Implementar em ambiente sandbox antes de produção; testes E2E com cenários de cobrança falha, upgrade, downgrade e cancelamento                           |
| 2   | Consolidação de dados: batch job que transforma registros detalhados em `monthly_summaries` após expiração do grace period                    | DB, novo módulo `consolidation`, cron/job scheduler          | **Alto**    | Consolidação é irreversível (R-BIZ-14) — exigir dry-run antes de execução; backup dos dados detalhados antes da primeira consolidação em produção         |
| 3   | Grace period proporcional (R-BIZ-11): fórmula com 3 faixas de mínimo                                                                          | `subscriptions`, `consolidation`                             | **Alto**    | Testes unitários exaustivos com tabela de referência da spec; edge cases: assinante com menos de 1 mês                                                    |
| 4   | Novos roles `workspace_owner` e `workspace_member` com tabelas `workspaces`, `workspace_members`, `workspace_vehicle_assignments`             | DB, novo módulo `workspaces`, RLS multi-tenant               | **Alto**    | Fase 4 — implementar após validação do modelo de negócio; RLS multi-tenant requer auditoria de segurança dedicada; ADR obrigatório antes da implementação |
| 5   | Rate limit de cadastro estendido: honeypot anti-bot, rejeição de emails descartáveis (BS-BLK-03, BS-BLK-04)                                   | `auth`, middleware                                           | **Médio**   | Lista de domínios descartáveis como dependência externa — manter atualizada                                                                               |
| 6   | Verificação de idade 18+ (BS-BLK-05)                                                                                                          | `auth`, formulário de cadastro                               | **Médio**   | Checkbox declaratório — avaliar implicação legal                                                                                                          |
| 7   | Email transacional: boas-vindas, nudge 48h, resumo mensal, win-back, alerta de vencimento, NPS                                                | Infraestrutura de email (Resend), cron jobs                  | **Médio**   | Reutilizar infraestrutura planejada em SPEC-20260521-002; opt-out obrigatório                                                                             |
| 8   | Onboarding wizard com consulta FIPE/DENATRAN para pre-fill de dados do veículo pela placa                                                     | Frontend, integração externa                                 | **Médio**   | API FIPE é gratuita mas sem SLA; fallback: formulário manual completo se consulta falhar                                                                  |
| 9   | Referral system com tabela `referrals` e benefício mútuo (R-BIZ-04)                                                                           | DB, novo módulo `referrals`                                  | **Baixo**   | Cap de 10 referrals ativos por conta (anti-abuso); implementar em Fase 3                                                                                  |
| 10  | Blog SEO em `/blog` com SSR (BS-GRW-05)                                                                                                       | Frontend, CMS ou MDX                                         | **Baixo**   | Implementar como rota estática (ISR)                                                                                                                      |

**Dependências críticas entre itens:**

- Itens 1, 2 e 3 são interdependentes — o modelo de assinatura (1) define quando a consolidação (2) ocorre.
- Item 4 (workspaces) depende de item 1 (subscriptions) para validar plano Frota.
- Item 7 (emails) depende da infraestrutura planejada em SPEC-20260521-002 (Resend + pg_cron).

**Efeitos colaterais potenciais:**

- A consolidação irreversível (R-BIZ-14) é a mudança de maior risco: dados detalhados são permanentemente reduzidos a resumos. Qualquer bug no processo pode resultar em perda de dados percebida pelo usuário.
- O modelo de roles multi-tenant requer revisão de todas as policies RLS existentes para garantir que `auth.uid() = user_id` continue correto em contextos de workspace.

---

### IMPACTO-021 — Revisão Crítica de Diff: 6 Achados de Qualidade Arquitetural

| Campo           | Valor                                                                                   |
| --------------- | --------------------------------------------------------------------------------------- |
| **Spec**        | — (revisão de gaps arquiteturais pré-implementação; sem spec associada)                 |
| **Status**      | Avaliação pré-implementação — achados documentados para orientar a implementação futura |
| **Risco geral** | Crítico (achado 1 é crítico para segurança de rotas)                                    |

| #   | Achado                                                                                                                                                                                                                                                                                                 | Módulos afetados                                              | Risco       | Mitigação na implementação                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Middleware SSR de auth ausente (risco a observar):** Next.js 15 usa `proxy.ts` em vez de `middleware.ts`. O arquivo correto de proteção de rotas SSR deve ser `proxy.ts` com export `proxy`, `config` matcher e `updateSession`. Não criar `middleware.ts` — isso causaria conflito de inicialização | `apps/web` (auth SSR, proteção de rotas)                      | **Crítico** | Ao iniciar o projeto, criar apenas `apps/web/proxy.ts` como ponto de proteção de rotas; nunca criar `middleware.ts` junto com `proxy.ts` |
| 2   | **`bodySizeLimit` para Server Actions:** configurar `bodySizeLimit` em `next.config.mjs` adequadamente (ex: `'4mb'`) para rotas de Server Action que aceitam upload de imagens de veículos                                                                                                             | `apps/web/next.config.mjs`, Server Actions de upload          | **Alto**    | Verificar e testar upload de fotos antes de deploy                                                                                       |
| 3   | **`deleteDraft` com timing errado + redirect em action:** garantir que `deleteDraft()` seja chamado apenas após `result.success === true`; em actions de create, chamar `redirect()` após todas as operações side-effect (revalidate, audit)                                                           | `apps/web/hooks/use-form-draft.ts`, Server Actions de criação | **Médio**   | Seguir este padrão desde o início na implementação de todas as actions de criação                                                        |
| 4   | **`as any` no `typedResolver`:** verificar compatibilidade entre versões de `@hookform/resolvers` e `react-hook-form`; se o cast `as Resolver<TFieldValues>` for necessário, manter o wrapper centralizado com comentário justificando                                                                 | `apps/web/lib/typed-resolver.ts`, 11 formulários              | **Médio**   | Verificar compatibilidade antes de adotar o wrapper; documentar o motivo do cast se necessário                                           |
| 5   | **`as any` em `.update()` do Supabase:** evitar `as any` nos métodos do Supabase; gerar `database.types.ts` via `supabase gen types typescript` e resolver os casts com tipagem correta desde o início                                                                                                 | Server Actions, repositórios                                  | **Médio**   | Gerar tipos corretamente antes de escrever código que os consuma                                                                         |
| 6   | **`console.log` / `console.warn` residuais:** usar `Logger` do NestJS no backend; condicionar `console.log` a `process.env.NODE_ENV !== 'production'` no frontend; evitar logar dados de formulário                                                                                                    | `apps/web/components/vehicles/`, `apps/api/`                  | **Baixo**   | Estabelecer ESLint rules para `no-console` desde o início do projeto                                                                     |

---

### IMPACTO-022 — Analytics Engine Fase 1: TCO e Fuel Trend (SPEC-20260622-001)

| Campo           | Valor                                                    |
| --------------- | -------------------------------------------------------- |
| **Spec**        | SPEC-20260622-001                                        |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Médio                                                    |

| #   | Mudança                                                                                                                                                | Módulos afetados                                                        | Risco | Mitigação                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Novo módulo `AnalyticsModule` registrado em `AppModule` com 2 endpoints REST: `GET /analytics/tco/:vehicleId` e `GET /analytics/fuel-trend/:vehicleId` | `apps/api/src/modules/analytics/`, `apps/api/src/app.module.ts`         | Médio | Módulo isolado — não altera endpoints existentes; `SupabaseAuthGuard` protege ambos os endpoints              |
| 2   | RPCs PostgreSQL `calculate_vehicle_tco` e `fuel_consumption_trend` chamadas via Supabase client autenticado                                            | DB (Supabase RPCs)                                                      | Médio | RPCs são read-only; falha na RPC retorna 404 (veículo não encontrado); RLS isola dados por usuário            |
| 3   | `SupabaseAnalyticsRepository` cria client Supabase ad-hoc por request com token do usuário (não reutiliza singleton)                                   | `apps/api/src/modules/analytics/repositories/`                          | Médio | Padrão necessário para garantir isolamento RLS por token; avaliar risco de resource leak em alta concorrência |
| 4   | Cache HTTP `Cache-Control: private, max-age=3600, stale-while-revalidate=600` em ambos os endpoints                                                    | `apps/api/src/modules/analytics/analytics.controller.ts`                | Baixo | Cache de 1h reduz carga no DB; `private` garante que proxies não cacheiam dados de outros usuários (R-ANA-06) |
| 5   | Frontend: página `/analytics` com Server Component, seleção de veículo e 4 componentes de visualização                                                 | `apps/web/app/(dashboard)/analytics/`, `apps/web/components/analytics/` | Baixo | Página nova e isolada; sem impacto em rotas existentes                                                        |

**Riscos a observar na implementação futura:**

- As RPCs `calculate_vehicle_tco` e `fuel_consumption_trend` devem existir no banco Supabase antes do deploy do módulo. Se ausentes, os endpoints retornarão erro 500.
- O módulo não possuirá suite de testes inicialmente — criar `analytics.service.spec.ts` e `analytics.controller.spec.ts` antes de avançar para Fases 2-3.
- A criação de client Supabase por request em `SupabaseAnalyticsRepository` difere do padrão singleton dos demais repositórios. Avaliar se há risco de resource leak em cenários de alta concorrência.

---

### IMPACTO-023 — Preferência de Rascunho Automático (SPEC-20260612-003)

| Campo           | Valor                                                    |
| --------------- | -------------------------------------------------------- |
| **Spec**        | SPEC-20260612-003                                        |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Baixo                                                    |

| #   | Mudança                                                                                                                                            | Módulos afetados                                                                                     | Risco | Mitigação                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------- |
| 1   | Migration `20260623000000_add_auto_draft_enabled.sql`: `ALTER TABLE user_preferences ADD COLUMN auto_draft_enabled BOOLEAN NOT NULL DEFAULT FALSE` | DB (`user_preferences`)                                                                              | Baixo | Coluna `NOT NULL DEFAULT FALSE` — sem breaking change; registros existentes receberão `false` automaticamente   |
| 2   | Schema `display-preferences.schema.ts`: campo `auto_draft_enabled` e constante `DEFAULT_AUTO_DRAFT_ENABLED`                                        | `packages/validators`                                                                                | Baixo | Export aditivo — sem remoção de exports existentes                                                              |
| 3   | Server Actions `getAutoDraftPreference()` e `updateAutoDraftPreference()`                                                                          | `apps/web/app/actions/user-preferences.ts`                                                           | Baixo | `getAutoDraftPreference` deve retornar `false` como fallback seguro (R-PREF-01); upsert idempotente             |
| 4   | Componente `AutoDraftPreference` com toggle na página de perfil (seção "Formulários")                                                              | `apps/web/components/profile/auto-draft-preference.tsx`, `apps/web/app/(dashboard)/profile/page.tsx` | Baixo | Componente isolado; sem impacto em outras rotas                                                                 |
| 5   | `ExpenseForm`: prop `autoDraftEnabled` condiciona o hook `useFormDraft`                                                                            | `apps/web/components/expenses/expense-form.tsx`                                                      | Baixo | Default `false` significa que novos usuários terão draft desabilitado — comportamento intencional conforme spec |

**Riscos a observar na implementação futura:**

- Usuários que esperarem o rascunho automático incondicional precisarão ativá-lo em Perfil → Preferências → Formulários. O default `false` é intencional.

---

### IMPACTO-024 — Bug Fix: Prioridade de Recálculo de Combustível com Pilha de Edição

| Campo           | Valor                                                                       |
| --------------- | --------------------------------------------------------------------------- |
| **Spec**        | SPEC-20260612-001 (RF-05.2); SPEC-20260619-001 (R-FUEL-08)                  |
| **Status**      | Avaliação pré-implementação — bug documentado para orientar a implementação |
| **Risco geral** | Baixo                                                                       |

| #   | Mudança                                                                                                                                                                                     | Módulos afetados                                | Risco | Mitigação                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------- |
| 1   | Substituição do guard único `priceManuallyEdited` (`useRef<boolean>`) pela pilha `fuelEditOrder` (`useRef<FuelField[]>`) — registra a ordem de edição manual dos três campos de combustível | `apps/web/components/expenses/expense-form.tsx` | Baixo | Mudança puramente client-side                                                                            |
| 2   | Funções `markFuelFieldEdited` e `isFuelFieldManuallyEdited` encapsulam a lógica da pilha; `recalcFuelFields` usa a pilha para decidir qual campo recalcular                                 | `apps/web/components/expenses/expense-form.tsx` | Baixo | Comportamento legado (pareamento fixo) mantido como fallback quando nenhum campo foi editado manualmente |
| 3   | `handleSupplierSelect` deve verificar `isFuelFieldManuallyEdited('amount')` antes de sobrescrever o campo Valor no autofill por fornecedor                                                  | `apps/web/components/expenses/expense-form.tsx` | Baixo | Mudança defensiva; autofill continua funcionando normalmente quando o usuário ainda não digitou o Valor  |

**Causa raiz documentada:** O guard único `priceManuallyEdited` rastreia apenas se o campo `price_per_liter` foi editado manualmente, mas não guarda a ordem relativa entre os três campos. Ao corrigir o Valor (`amount`) depois de ter digitado Litros e Preço/Litro manualmente, o recálculo sobrescreve o Preço/Litro sem aviso.

---

### IMPACTO-025 — Odômetro Obrigatório em Manutenção + Ciclos de Odômetro (pré-implementação) (2026-07-11)

| Campo           | Valor                                                                     |
| --------------- | ------------------------------------------------------------------------- |
| **Spec**        | SPEC-20260711-001 (Ciclos de Odômetro — fecha NG-04 de SPEC-20260601-001) |
| **Status**      | Avaliação pré-implementação — nenhum código existe ainda                  |
| **Risco geral** | **Alto**                                                                  |

| #   | Mudança                                                                                                                                                                                               | Módulos afetados                                                                                            | Risco     | Mitigação                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------- |
| 1   | Nova tabela `vehicle_odometer_cycles`; RLS owner-only; ciclo 1 implícito (sem linha)                                                                                                                  | DB `supabase/migrations/`, novo módulo backend                                                              | **Alto**  | Migration isolada; RLS ativo; FK ON DELETE CASCADE garante LGPD (C1)                              |
| 2   | `fuel_consumption_trend` usa `LAG(odometer_km)` sem filtro de ciclo: após reset, `prev_odo` cruza ciclos, gerando km absurdo. Adicionar filtro `WHERE e.date >= get_active_cycle_start(p_vehicle_id)` | `supabase/migrations/20260622000000_analytics_tco_fuel_trend.sql`                                           | **Alto**  | **Ordem crítica:** atualizar ANTES de qualquer UI de ciclos; `CREATE OR REPLACE` não é destrutivo |
| 3   | `calculate_vehicle_tco` usa `MIN/MAX(odometer_km)` sobre todas as despesas: `total_km` mistura ciclos. Adicionar mesmo filtro de data                                                                 | `supabase/migrations/20260622000000_analytics_tco_fuel_trend.sql`                                           | **Alto**  | Atualizar na mesma migration de item 2                                                            |
| 4   | `calculate_vehicle_health` e `calculate_fleet_health` usam `vehicles.odometer` (snapshot estático) — sem regressão, mas snapshot desatualizado é débito técnico                                       | `supabase/migrations/20260615000000_vehicle_health_score_fn.sql`, `20260610000000_fleet_health_bulk_fn.sql` | **Médio** | Ortogonal; débito técnico a resolver em sprint futura                                             |
| 5   | `maintenance.schema.ts`: `odometer_km` está como `optional().nullable()` — precisa de `superRefine` em `updateMaintenanceInputSchema` obrigatório quando `status=completed`                           | `packages/validators`                                                                                       | **Médio** | Registrar R-ODO-03 em RULES.md antes de codificar                                                 |
| 6   | `MaintenanceRepositoryPort` e `SupabaseMaintenanceRepository`: novo método `findMaxOdometerByVehicle(vehicleId, userId, sinceDate?, excludeId?)`                                                      | `apps/api/src/modules/maintenance`                                                                          | **Médio** | Reutilizar padrão do repositório de expenses                                                      |
| 7   | `MaintenanceService`: adicionar warnings de odômetro com `ExpenseWarningException` + `confirmed:true` (ADR-001 D2 preservado)                                                                         | `apps/api/src/modules/maintenance`                                                                          | **Médio** | Reutilizar padrão `collectWarnings()` do `ExpensesService`                                        |
| 8   | `ExpenseRepositoryPort` e `SupabaseExpenseRepository`: parâmetro `sinceDate?: string` em `findMaxOdometerByVehicle`                                                                                   | `apps/api/src/modules/expenses`                                                                             | **Médio** | Parâmetro opcional sem breaking change                                                            |
| 9   | Novo módulo `OdometerCyclesModule`: controller `POST /vehicles/:id/odometer-cycles`; `cycle_number` via `ROW_NUMBER()`                                                                                | `apps/api/src/modules/`                                                                                     | **Médio** | Registrar em `AppModule`; `SupabaseAuthGuard`                                                     |
| 10  | `maintenance-actions.ts`: `createMaintenanceAction` nunca persiste `odometer_km` — bug pré-existente a corrigir na mesma PR                                                                           | `apps/web/app/actions/maintenance-actions.ts`                                                               | **Médio** | Usar padrão do `expense-actions.ts` como referência                                               |
| 11  | `maintenance-form.tsx`: campo `odometer_km` obrigatório na conclusão; modal retroativo; atalho "iniciar novo ciclo"                                                                                   | `apps/web/components/maintenance`                                                                           | **Médio** | Reutilizar `OdometerInput` e `AlertDialog` (R-FORM-05)                                            |
| 12  | Nova tela Configurações para ciclos; badge de ciclo no chip a partir do ciclo 2                                                                                                                       | `apps/web/app/(dashboard)/settings` ou `vehicles/[id]`                                                      | **Baixo** | Tela isolada; badge aditivo                                                                       |

**Ambiguidades a resolver na spec antes da implementação:**

| ID   | Questão                                                                                    | Recomendação                    |
| ---- | ------------------------------------------------------------------------------------------ | ------------------------------- |
| A-01 | `odometer_km` em manutenção: obrigatório no create ou apenas no update `status=completed`? | Apenas na conclusão             |
| A-02 | Quem busca o ciclo ativo para `sinceDate`: service ou repositório?                         | Service — repositório stateless |
| A-03 | `cycle_number` armazenado ou calculado?                                                    | Calculado via `ROW_NUMBER()`    |

**Estimativa de esforço:**

| Camada           | Escopo                                                                   | Esforço        |
| ---------------- | ------------------------------------------------------------------------ | -------------- |
| Migration DB     | 1 tabela + `get_active_cycle_start` + 2 funções analíticas               | 1 dia          |
| Backend NestJS   | `OdometerCyclesModule` TDD + `MaintenanceService` odômetro + `sinceDate` | 4-5 dias       |
| Frontend Next.js | `maintenance-form`, `maintenance-actions`, tela ciclos, badge            | 3-4 dias       |
| Testes           | ~50 novos cenários                                                       | 2-3 dias       |
| Docs             | ADR + spec + RULES.md R-ODO-03/R-ODO-04                                  | 1 dia          |
| **Total**        |                                                                          | **11-14 dias** |

**Efeitos colaterais potenciais:**

- Veículos sem linha em `vehicle_odometer_cycles` manterão o comportamento atual — zero regressão.
- `fuel_consumption_trend` e `calculate_vehicle_tco` podem corromper dados se um reset for criado antes das funções SQL serem atualizadas. **Ordem obrigatória:** funções SQL primeiro.
- Bug pré-existente: `createMaintenanceAction` nunca persistiu `odometer_km` — corrigir na mesma PR.

---

### IMPACTO-026 — Diagnóstico DBA do Banco Real NaveSaaS (Supabase) — Achados Críticos de Segurança e Integridade

| Campo           | Valor                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spec**        | — (diagnóstico direto do banco de produção pelo agente `dba`, via ferramentas MCP do Supabase; sem spec associada)                                                                                                                                                                                                                                                                      |
| **Status**      | Diagnóstico confirmado no banco real (`project_id uetaprnvukgqtxlbfedk`, NaveSaaS) em 2026-07-12. **Diverge da premissa "greenfield, nenhum código existe" desta matriz:** o banco Supabase tem 33 migrations aplicadas desde 2026-03-10 e dados reais (profiles, vehicles, expenses, audit_logs etc.), evoluindo independentemente do estado documentado do repositório de código |
| **Risco geral** | Crítico                                                                                                                                                                                                                                                                                                                                                                                 |

| #   | Achado                                                                                                                                                                                                                                                                                                                                                                      | Módulos afetados                                                                 | Risco       | Mitigação                                                                                                                                                                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | RPCs `calculate_vehicle_health`, `calculate_fleet_health`, `get_upcoming_costs`, `get_vehicle_cost_per_km` são `SECURITY DEFINER` e executáveis pelo role `anon` (sem autenticação). Se não validam `auth.uid()` internamente, permitem consultar dados de veículo/frota de terceiros passando um UUID arbitrário — banco já tem 6 veículos e 12 despesas reais cadastrados | DB (functions), Supabase Auth/RLS                                                | **Crítico** | Adicionar validação de `auth.uid()` no corpo de cada função; revogar `EXECUTE` de `anon`; reavaliar `SECURITY DEFINER` vs `INVOKER`. Registrado como [S7](../specs/RULES.md)                          |
| 2   | Bucket de Storage `vehicles` tem policy `"Public access to vehicle photos"` que permite **listar** todos os arquivos, não só acessá-los por URL direta — enumera fotos de veículos de todos os usuários                                                                                                                                                                     | Supabase Storage                                                                 | **Crítico** | Restringir a policy a acesso por path completo; remover permissão de `LIST` do bucket. Registrado como [S8](../specs/RULES.md)                                                                        |
| 3   | Tabela `vehicle_odometer_cycles`, função `get_active_cycle_start()` e o filtro de ciclo nas funções analíticas (ADR-007, SPEC-20260711-001, já mapeados em IMPACTO-025) estão documentados mas **não existem no banco real** — nenhuma migration correspondente foi aplicada (última migration real é `20260608004708_fleet_health_bulk_fn`)                                | DB, `fuel_consumption_trend`, `get_vehicle_cost_per_km`, `calculate_vehicle_tco` | **Crítico** | Aplicar a migration antes de qualquer desenvolvimento que dependa da feature; manter ordem obrigatória já registrada em IMPACTO-025 (funções analíticas atualizadas antes da UI de reset)             |
| 4   | CHECK constraint de R-LED-04 (`source_type` e `source_id` sempre definidos juntos) **não existe** no banco — as colunas são nullable independentes em `expenses`                                                                                                                                                                                                            | DB (`expenses`)                                                                  | **Crítico** | Migration com `CHECK ((source_type IS NULL AND source_id IS NULL) OR (source_type IS NOT NULL AND source_id IS NOT NULL))` antes do desenvolvimento do `ExpensesService`. Nota adicionada em R-LED-04 |
| 5   | Extensão `pg_cron` está disponível mas **não instalada** no projeto Supabase — qualquer feature que dependa dela (alertas de manutenção por email, IMPACTO-002) falhará silenciosamente até ser habilitada manualmente                                                                                                                                                      | Infraestrutura Supabase                                                          | **Crítico** | Habilitar `pg_cron` no dashboard Supabase antes de aplicar qualquer migration que use `cron.schedule()`; documentar a dependência em `docs/operations/`                                               |
| 6   | 6 functions (`update_expense_templates_updated_at`, `enforce_expense_templates_limit`, `set_updated_at`, `soft_delete_profile`, `update_updated_at_column`, `set_vehicle_soft_delete`) sem `search_path` fixo — risco de sequestro via schema em functions `SECURITY DEFINER`                                                                                               | DB (functions)                                                                   | **Alto**    | `ALTER FUNCTION ... SET search_path = ''` em todas; usar nomes qualificados no corpo. Registrado como [S9](../specs/RULES.md)                                                                         |

**Achados adicionais não-críticos (relatório completo do agente `dba`, sessão 2026-07-12):**

- 35 policies RLS reavaliando `auth.uid()` por linha em vez de `(SELECT auth.uid())`, em 15 tabelas — registrado como [P4](../specs/RULES.md)
- 18 ocorrências de policies duplicadas (`multiple_permissive_policies`) concentradas na tabela `user_preferences`
- 3 foreign keys sem índice de cobertura: `documents.user_id`, `drivers.user_id`, `vehicle_recurring_costs.expense_id`
- 28 tabelas descobríveis via introspecção GraphQL pelos roles `anon`/`authenticated`, incluindo `audit_logs`
- Proteção contra senha vazada (HaveIBeenPwned) desabilitada no Supabase Auth
- 5 tabelas reais no banco (`drivers`, `vehicle_drivers`, `documents`, `user_categories`, `user_preferences`) não documentadas em `docs/architecture/entities.md`
- `vehicles.health_score` (`numeric`) sem `CHECK` de range 0–100
- `expense_templates.user_id` referencia `auth.users(id)` em vez de `profiles(id)`, inconsistente com o padrão das demais tabelas

**Riscos a observar:**

- Os achados 1 e 2 são os únicos com potencial de exposição ativa de dado real — o banco já tem usuários, veículos e despesas cadastrados, não é um ambiente vazio.
- Esta matriz (rev. 21) assume repositório greenfield sem código; o banco Supabase real contradiz essa premissa (33 migrations aplicadas, dados reais). Recomenda-se acionar o `doc-keeper` para reconciliar o estado documentado com o estado real do banco antes da próxima revisão desta matriz.
- `docs/architecture/entities.md` precisa de atualização: documentar as 5 tabelas ausentes e corrigir o tipo de `vehicles.fipe_updated_at` (a doc diz `TEXT`, o banco real já usa `TIMESTAMPTZ` — divergência inversa, doc desatualizada).

---

### IMPACTO-027 — Criação do Projeto navestory: Schema Higienizado e Fechamento dos Achados do IMPACTO-026

| Campo           | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spec**        | — (ação corretiva direta em infraestrutura, sem spec associada; decorre integralmente do diagnóstico do IMPACTO-026)                                                                                                                                                                                                                                                                                                                           |
| **Status**      | **Implementado em ambiente novo** — schema aplicado diretamente via MCP do Supabase em 2026-07-12; zero achados de segurança confirmados via `get_advisors` no projeto `navestory` (`sfkefpoanmoiagwxbwld`). Nota: esta entrada é exceção ao padrão desta matriz (que assume "avaliação pré-implementação, nenhum código existe ainda") porque trata de ação de infraestrutura real já concluída, não de planejamento de feature de aplicação. |
| **Risco geral** | Médio (mitigação de um Crítico anterior via isolamento em projeto novo; NaveSaaS legado ainda com achados abertos; decisão sobre migração de dados em aberto)                                                                                                                                                                                                                                                                             |
| **Precursor**   | IMPACTO-026 (diagnóstico DBA do NaveSaaS, 2026-07-12)                                                                                                                                                                                                                                                                                                                                                                                     |

| #   | Mudança / Correção aplicada                                                                                                                                                                                                                                                                                                                                                                      | Módulos afetados              | Risco             | Mitigação                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | ----------------- | -------------------------------------------------------------------------------------- |
| 1   | Todas as funções `SECURITY DEFINER` e trigger-only receberam `SET search_path = ''` fixo, fechando o risco S9                                                                                                                                                                                                                                                                                    | DB (functions)                | Crítico → fechado | Verificado via `get_advisors`                                                          |
| 2   | `REVOKE EXECUTE` de `anon`/`public` em todas as RPCs sensíveis (`calculate_vehicle_health`, `calculate_fleet_health`, `get_upcoming_costs`, `get_vehicle_cost_per_km`, `fuel_consumption_trend`, `calculate_vehicle_tco`, `get_active_cycle_start`) e em funções trigger-only (`handle_new_user`, `soft_delete_profile`); `GRANT EXECUTE` apenas para `authenticated` nas RPCs de app — fecha S7 | DB (functions), Supabase Auth | Crítico → fechado | Verificado via `get_advisors`                                                          |
| 3   | As 6 RPCs de analytics (`calculate_vehicle_health`, `calculate_fleet_health`, `get_upcoming_costs`, `get_vehicle_cost_per_km`, `fuel_consumption_trend`, `calculate_vehicle_tco`) trocadas de `SECURITY DEFINER` para `SECURITY INVOKER` — o RLS já garante isolamento por posse; elimina aviso do advisor sem perda funcional                                                                   | DB (functions)                | Alto → fechado    | RLS cobre a restrição equivalente                                                      |
| 4   | `REVOKE ALL ... FROM anon` em todas as tabelas do schema public — a aplicação inteira exige login; fecha exposição via introspecção GraphQL                                                                                                                                                                                                                                                      | DB (RLS / grants)             | Alto → fechado    | Verificado via `get_advisors`                                                          |
| 5   | CHECK constraint `expenses_source_coherence_check` criado de fato via DDL — fecha R-LED-04 (S7 no contexto do ledger)                                                                                                                                                                                                                                                                            | DB (`expenses`)               | Crítico → fechado | Constraint verificada no schema                                                        |
| 6   | Bucket de Storage `vehicles` criado como público, mas **sem** policy de SELECT/listagem para `anon` ou `authenticated`; acesso a foto apenas por URL direta; policies de INSERT/UPDATE/DELETE escopadas por pasta (`auth.uid()` como primeiro segmento do path) — fecha S8                                                                                                                       | Supabase Storage              | Crítico → fechado | Sem policy de LIST no bucket                                                           |
| 7   | 18 índices de cobertura de FK adicionados, incluindo os 3 apontados pelo IMPACTO-026 (`documents.user_id`, `drivers.user_id`, `vehicle_recurring_costs.expense_id`) e índice para `vehicle_odometer_cycles.created_by`                                                                                                                                                                           | DB (índices)                  | Médio → fechado   | P4 mitigado                                                                            |
| 8   | Todas as políticas RLS novas usam `(select auth.uid())` em vez de `auth.uid()` cru (otimização P4); sem políticas duplicadas em nenhuma tabela (NaveSaaS tinha duplicação em `user_preferences`)                                                                                                                                                                                            | DB (RLS)                      | Médio → fechado   | Verificado via `get_advisors`                                                          |
| 9   | `vehicle_odometer_cycles` aplicada de fato pela primeira vez (antes só existia documentada); funções `fuel_consumption_trend`, `calculate_vehicle_tco` com filtro de ciclo ativo via `get_active_cycle_start()` também aplicadas — fecha achado 3 do IMPACTO-026                                                                                                                                 | DB, analytics                 | Crítico → fechado | Tabela e funções confirmadas no schema                                                 |
| 10  | `vehicles.health_score` ganhou `CHECK (health_score >= 0 AND health_score <= 100)` — ausente no NaveSaaS                                                                                                                                                                                                                                                                                    | DB (`vehicles`)               | Baixo → fechado   | Constraint DDL aplicada                                                                |
| 11  | `expense_templates.user_id` corrigido para referenciar `profiles(id)` em vez de `auth.users(id)` — consistência com demais tabelas                                                                                                                                                                                                                                                               | DB (`expense_templates`)      | Baixo → fechado   | FK corrigida no schema                                                                 |
| 12  | 5 tabelas antes não documentadas (`drivers`, `vehicle_drivers`, `documents`, `user_categories`, `user_preferences`) agora documentadas em `docs/architecture/entities.md`                                                                                                                                                                                                                        | Documentação                  | Baixo → fechado   | Documentação atualizada em 2026-07-12                                                  |
| 13  | **PENDENTE — não corrigível via SQL/schema:** proteção de senha vazada (HaveIBeenPwned) do Supabase Auth continua desabilitada — é configuração de dashboard/Management API. Requer ação manual no painel do projeto navestory                                                                                                                                                                   | Supabase Auth                 | Médio             | Acessar Dashboard → Auth → Security → habilitar "Password Strength" / "HaveIBeenPwned" |

**Estado dos dois projetos Supabase após esta ação:**

| Projeto                    | ID                     | Situação                                                                                                                                                                                                                                                                                               |
| -------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **navestory** (novo)       | `sfkefpoanmoiagwxbwld` | Schema de referência limpo, `get_advisors` sem achados, sem dados de usuário, sem migrations locais (schema aplicado diretamente via MCP)                                                                                                                                                              |
| **NaveSaaS** (legado) | `uetaprnvukgqtxlbfedk` | **Permanece intocado** — 33 migrations aplicadas, dados reais (6 veículos, 12 despesas etc.), todos os achados do IMPACTO-026 ainda presentes. Não há plano de migração de dados definido. Não há prazo ou decisão de descomissionamento. Estas são decisões em aberto a serem tomadas posteriormente. |

---

### IMPACTO-028 — Bug de Produção: `handle_new_user()` quebrava 100% dos cadastros (corrigido) (2026-07-13)

| Campo              | Valor                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **Spec**           | SPEC-20260524-001 (auth register), SPEC-20260521-001 (hardening S9)                                                |
| **Status**         | **Corrigido em 2026-07-13** via migration `supabase/migrations/20260713200000_fix_handle_new_user_search_path.sql` |
| **Risco geral**    | Crítico → fechado                                                                                                  |
| **Descoberto por** | Testes de integração reais contra Supabase local (`apps/api/test/integration/auth.int-spec.ts`, CT-006)            |

**Descrição do bug:**

A migration de hardening S9 (IMPACTO-027, item 1) adicionou `SET search_path = ''` a todas as funções `SECURITY DEFINER`, incluindo a trigger function `handle_new_user()` (em `supabase/migrations/20260712171941_trigger_functions.sql`). Esta função é disparada pelo trigger `on_auth_user_created` sempre que um novo usuário é criado no Supabase Auth.

Com `search_path = ''`, todas as referências de tipo devem ser totalmente qualificadas com o schema. O código da função fazia cast `::profile_type` sem qualificar o schema, causando o erro Postgres:

```
ERROR: type "profile_type" does not exist (SQLSTATE 42704)
```

O GoTrue reportava esse erro silenciosamente como HTTP 500 genérico, impedindo **100% dos cadastros novos** — qualquer chamada a `POST /auth/register` falhava na etapa de criação do perfil.

| #   | Mudança                                                                                                                                                                                     | Módulos afetados                                                   | Risco             | Status                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------- | ---------------------- |
| 1   | `supabase/migrations/20260713200000_fix_handle_new_user_search_path.sql`: `CREATE OR REPLACE FUNCTION handle_new_user()` com cast corrigido para `public.profile_type` (schema qualificado) | DB (trigger `on_auth_user_created`), `profiles`, fluxo de registro | Crítico → fechado | Aplicado em 2026-07-13 |

**Causa raiz:** Regra S9 (hardening de `search_path`) foi aplicada corretamente em IMPACTO-027, mas o corpo da função `handle_new_user()` não foi revisado para qualificar todos os tipos com schema explícito. A combinação `SET search_path = '' + cast não qualificado` é um padrão de risco documentado no PostgreSQL — qualquer função com `SECURITY DEFINER` e `search_path = ''` deve usar nomes totalmente qualificados no corpo.

**Lição:** Ao aplicar `SET search_path = ''` em funções existentes, revisar todos os casts de tipo e referências de tabela/função no corpo para garantir qualificação completa de schema.

---

### IMPACTO-029 — Trigger `soft_delete_profile()` com efeito nulo no fluxo de exclusão de conta (2026-07-13)

| Campo           | Valor                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------- |
| **Spec**        | SPEC-20260521-004 RF-02                                                                            |
| **Status**      | Observação documentada — nenhuma ação corretiva urgente; decisão de remoção ou reatribuição adiada |
| **Risco geral** | Baixo (comportamento correto; trigger apenas não tem efeito no fluxo atual)                        |

**Descrição:**

O `DELETE /users/me` foi implementado na Fase 1 usando exclusão física via `auth.admin.deleteUser(userId)`, que deleta o registro em `auth.users`. A FK `auth.users → profiles` com `ON DELETE CASCADE` então remove `profiles` automaticamente, o que por sua vez cascateia para as demais tabelas filhas.

A trigger `soft_delete_profile()` (em `supabase/migrations/`) está declarada para disparar em `BEFORE DELETE ON profiles`. No entanto, a exclusão do perfil ocorre via cascade de FK disparada pela deleção em `auth.users` — não via `DELETE` direto na tabela `profiles`. O comportamento de triggers em cascatas de FK é definido pelo PostgreSQL: a trigger **dispara normalmente** em deletes por cascade (FK), mas como a exclusão já vem de `auth.admin.deleteUser` que remove `auth.users`, o cascade remove `profiles` e a trigger `soft_delete_profile()` dispara — porém neste contexto ela executaria um soft-delete em uma linha que está prestes a ser deletada de qualquer forma.

**Efeito prático:** A anonimização que `soft_delete_profile()` faz (limpar nome, preferences etc.) pode ocorrer antes do cascade DELETE, mas o resultado final é que a linha em `profiles` é deletada de qualquer forma. A trigger não tem efeito útil no fluxo de `DELETE /users/me` via `auth.admin.deleteUser`.

**Impacto:** A regra C1 (LGPD — exclusão completa via cascata) é satisfeita pela exclusão física. A anonimização de `soft_delete_profile()` torna-se irrelevante quando a linha é deletada. Qualquer fluxo futuro que dependa de `profiles.deleted_at` ou de campos anonimizados deve ser revisado para verificar se a trigger adiciona valor real.

**Decisão adiada:** Remover, manter (com documentação clara de efeito nulo) ou reatribuir a trigger para outro propósito. Registrar como débito técnico a ser resolvido antes da Fase 2.

---

### IMPACTO-030 — Decisão de Padrão de Soft Warnings: response-field vs. exception-based (2026-07-14)

| Campo           | Valor                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------- |
| **Spec**        | SPEC-20260601-001 (T3.2 — odômetro), SPEC-20260601-002 (T3.3 — duplicata, ainda não implementada) |
| **Status**      | Decidido e implementado em T3.2 — response-field                                                  |
| **Risco geral** | Baixo (com a opção escolhida)                                                                     |

| #   | Dimensão                            | Option A: response-field (escolhida)                                                                                                                                 | Option B: exception-based (descartada)                                                                                                                              |
| --- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Backend — service                   | Queries inline em `ExpensesService.create()`/`update()`, retornando objeto enriquecido. Sem nova classe de exception.                                                | Exigiria `ExpenseWarningException`; service lançaria exceção em vez de retornar; DTOs ganhariam flag `confirmed`.                                                   |
| 2   | Backend — controller                | Zero alterações (`ExpensesController` já embrulha em `{ data: expense }`).                                                                                           | Exigiria capturar a exceção ou delegar ao filter; mudança na assinatura de resposta.                                                                                |
| 3   | Backend — `HttpExceptionFilter`     | Zero alterações — o filtro atual (`@Catch()`) retorna apenas `{ statusCode, message, timestamp }`, compatível com Option A.                                          | Exigiria modificar o filtro global para expor dados de warning em respostas de erro, impactando o contrato de TODOS os erros do projeto.                            |
| 4   | Frontend — `expenses/new/page.tsx`  | Ler `odometer_warning`/`odometer_previous_max_km` no `onSuccess`.                                                                                                    | Exigiria detectar warning no `onError`, guardar payload pendente, exibir diálogo de confirmação, reenviar com `confirmed: true` — máquina de estados mais complexa. |
| 5   | Frontend — `expenses/[id]/page.tsx` | Idem, no `onSuccess` do `updateMutation`.                                                                                                                            | Mesma máquina de estados de confirmação aplicada ao fluxo de PATCH.                                                                                                 |
| 6   | Consistência T3.2 × T3.3            | Alinhado: SPEC-20260601-002 (T3.3) especifica explicitamente response-field (RF-03: HTTP 201 com `duplicate_warning`). Zero retrabalho quando T3.3 for implementada. | Conflito: SPEC-20260601-002 nunca menciona exception-based. Exigiria emenda de spec aprovada ou dois padrões diferentes no mesmo endpoint `POST /expenses`.         |
| 7   | Risco de reversão futura            | A → B: criar exception class, modificar filtro global, refatorar service, reescrever fluxo frontend, emendar specs. Custo alto.                                      | B → A: remover exception class e lógica de confirmação. Custo médio, mas o filtro global já teria sido alterado, deixando rastro.                                   |

**Decisão:** Option A (response-field) foi confirmada com o usuário após pesquisa de UX (agente `design-system`: diálogo de confirmação é fricção desproporcional para validação soft; HTTP 409 é semanticamente incorreto para condição não-bloqueante) e análise de impacto técnico (agente `impact-analyzer`, esta entrada). A seção 15 D6 da SPEC-20260601-001 continha premissa incorreta ("padrão já implementado em SPEC-20260601-002" — que nunca usou exception-based) e foi corrigida via changelog da spec antes da implementação de T3.2. Frontend (itens 4/5) não foi implementado nesta tarefa — NG-05 da spec exclui exibição do warning no frontend deste escopo.

---

### IMPACTO-031 — Estudo Pré-Implementação: Redesign do Dashboard (SPEC-20260531-001) (2026-07-15)

| Campo           | Valor                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spec**        | SPEC-20260531-001 (rascunho), com sobreposição direta a SPEC-20260602-001 (contexto global, approved)                                         |
| **Status**      | Avaliação pré-implementação — spec revisada e corrigida nesta rodada (ver changelog da própria spec); nenhum código do dashboard existe ainda |
| **Risco geral** | Alto (antes da correção da spec) → Médio (após correção, condicionado à ordem de implementação)                                               |
| **Insumos**     | Agente `Explore` (raio-x de código), agente `impact-analyzer`, agente `design-system` (produto/UX), análise de personas P-001/P-002           |

| #   | Achado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Módulos/specs afetados                                                | Risco                                                                                | Mitigação aplicada                                                                                                                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | RF-BD-01 (colunas `ipva_due_date`/`insurance_expires_at`/`crlv_expires_at` em `vehicles`) já está implementado desde `20260712171830_core_tables.sql` — a spec pedia para criá-las de novo                                                                                                                                                                                                                                                                                                                            | `supabase/migrations`                                                 | Médio (migration duplicada/erro `relation already exists` se executado como escrito) | Requisito reescrito na spec para "pré-condição já satisfeita"; critério de aceite convertido em verificação de sanidade                                                                                                                                                                  |
| 2   | RF-BD-02/03 (tabela `fines` + RLS) já implementados desde `SPEC-20260607-001` (approved), com schema mais rico que o proposto (`auto_number`, `infraction_code`, `amount_with_discount`, etc.) e `FinesModule` REST completo                                                                                                                                                                                                                                                                                          | `apps/api/src/modules/fines`, `supabase/migrations`                   | Médio                                                                                | Requisitos removidos da spec; substituídos por referência a SPEC-20260607-001                                                                                                                                                                                                            |
| 3   | RF-SH-01/02 propunham recalcular o score de saúde no frontend com pesos próprios, divergentes dos já implementados e persistidos pela RPC `calculate_vehicle_health`/`calculate_fleet_health` (`20260712172020_analytics_functions.sql`). Teste de mesa: mesmo veículo dá 75 (verde) pela RPC e 50 (amarelo) pelos pesos da spec — fonte de verdade duplicada e divergente                                                                                                                                            | `apps/web` (a criar), RPC Postgres                                    | Alto                                                                                 | RF-SH-01/02 reescritos para consumir a RPC existente (`score`/`flags` já prontos) em vez de recalcular; seção "Fora de Escopo" corrigida (o cálculo não é "frontend-only", já existe como RPC PostgreSQL, não NestJS)                                                                    |
| 4   | Seção 12.1 e RF-ST-02/03 propunham que o próprio `DashboardPage` sincronizasse URL↔store, violando `R-CTX-04` (só `VehicleActivator` pode fazer essa ponte, regra já aprovada em SPEC-20260602-001)                                                                                                                                                                                                                                                                                                                   | `apps/web/src/app/dashboard`, componente `VehicleActivator` (a criar) | Alto                                                                                 | Seção 12.1 reescrita para delegar a sincronização ao `VehicleActivator`; `DashboardPage` apenas chama `setActiveVehicleId`                                                                                                                                                               |
| 5   | RF-ST-01 propunha criar/expandir um `useDashboardStore` isolado para `activeVehicleId`, ignorando que SPEC-20260602-001 (approved) já define esse campo dentro de um store com 5 modos de contexto (`single`/`group`/`multi`/`attribute`/`none`)                                                                                                                                                                                                                                                                      | `apps/web` store global                                               | Alto (dois stores disputando a mesma fonte de verdade)                               | RF-ST-01 reescrito para apenas adicionar `dockOpen`/`setDockOpen` ao store já especificado por SPEC-20260602-001 — não recriar `activeVehicleId`                                                                                                                                         |
| 6   | RF-DB-01 ("chip sticky... Analisando: [veículo] ×") duplica o conceito de "Em Foco" já definido como termo canônico obrigatório por SPEC-20260602-001, introduzindo um terceiro termo não previsto na tabela de nomenclatura canônica daquela spec                                                                                                                                                                                                                                                                    | `apps/web` UI                                                         | Médio (inconsistência de nomenclatura visível ao usuário)                            | RF-DB-01 corrigido para reusar a nomenclatura "Em Foco" e referenciar o `VehicleContextSlot`/chip já especificado                                                                                                                                                                        |
| 7   | Seção 9 (Componentes Afetados) e seção 10 (Dependências) usavam caminhos de arquivo inexistentes (`apps/web/app/(dashboard)/...`, `apps/web/components/layout/...`) — a árvore real é `apps/web/src/app/...`; nenhum shell de layout (Sidebar, Header, FleetAside, footer) existe fisicamente no código ainda                                                                                                                                                                                                         | Toda a seção 9/10 da spec                                             | Médio                                                                                | Caminhos corrigidos para `apps/web/src/...`; componentes "a alterar" reclassificados como "a criar" onde aplicável                                                                                                                                                                       |
| 8   | Tensão arquitetural não endereçada: `vehicle_recurring_costs` (implementada, com `paid_at`) e os campos soltos de vencimento em `vehicles` cobrem parcialmente o mesmo conceito ("documentos"/vencimentos) sem regra de reconciliação — risco de um IPVA já pago aparecer como vencido se a fonte errada for lida                                                                                                                                                                                                     | RF-DA-01, RF-DB-06                                                    | Médio-Alto                                                                           | Fonte de verdade declarada explicitamente na spec revisada (ver nota na spec); reconciliação com `vehicle_recurring_costs.paid_at` documentada                                                                                                                                           |
| 9   | Ausência de dependência formal a SPEC-20260602-001 na seção 10 da spec, apesar de toda a arquitetura de estado do dashboard depender dela                                                                                                                                                                                                                                                                                                                                                                             | Seção 10 da spec                                                      | Alto                                                                                 | Adicionada como dependência arquitetural bloqueante, com decisão explícita do usuário: **Sistema Em Foco (SPEC-20260602-001) deve ser implementado antes de qualquer componente do dashboard que leia/escreva `activeVehicleId`**                                                        |
| 10  | Lacunas de produto identificadas para as personas: falta auto-seleção de veículo único (Carlos), Zona B não suporta comparação multi-veículo apesar de ser a necessidade principal declarada de Ana, dock de 6 ações mistura frequências incompatíveis (Abastecer semanal vs. Multa 0-2x/ano vs. IA navestory conversacional), falta empty state para usuário com zero veículos, critério de "urgente" contraditório entre RF-DA-01 e RF-DA-03, escopo do KPI "Próxima manutenção" indefinido para múltiplos veículos | RF-DA-03, RF-DC-02, RF-DB-08, seção 4 (Personas)                      | Médio                                                                                | Requisitos novos adicionados à spec (auto-seleção, empty state de zero veículos, dock reduzido a 4 ações, critério de urgência unificado); comparação multi-veículo documentada como melhoria futura (depende do modo `group`/`multi` de SPEC-20260602-001, fora do escopo desta rodada) |

**Decisão de sequenciamento (usuário, 2026-07-15):** SPEC-20260602-001 (Sistema Em Foco) deve estar implementada — `VehicleActivator`, store com os 5 modos, slot "Em Foco" — antes de qualquer código do dashboard que toque `activeVehicleId` ou `?vehicleId=`. Shell de layout (Sidebar/Header sem lógica de negócio) pode ser construído em paralelo. Implementar o dashboard sem essa base, ou em paralelo sem contrato de store travado, foi descartado por gerar retrabalho garantido (violação de R-CTX-04 seguida de refatoração).

**Riscos a observar na implementação futura:**

- `calculate_fleet_health` chama `calculate_vehicle_health` duas vezes por veículo no loop (bug de performance, não desta spec) — ao consumir via `calculate_fleet_health` para a Zona A, uma frota de N veículos gera 2N updates em `vehicles.health_score` por carregamento. Considerar corrigir o bug antes de expor a Zona A em produção, ou chamar `calculate_vehicle_health` individualmente por veículo.
- S7 (RULES.md): confirmar que `calculate_vehicle_health`/`calculate_fleet_health` não são mais executáveis por `anon` antes de expor a Zona A (IMPACTO-027 já fechou esse achado, mas vale reverificação no ambiente de produção antes do lançamento da Fase 5).

---

### IMPACTO-032 — Execução de T5.3 (SPEC-20260602-001): divisão em sub-tarefas e app shell (2026-07-15)

| Campo           | Valor                                                                             |
| --------------- | --------------------------------------------------------------------------------- |
| **Spec**        | SPEC-20260602-001                                                                 |
| **Status**      | T5.3a, T5.3b, T5.3c e T5.3d concluídas — SPEC-20260602-001 encerrada nesta rodada |
| **Risco geral** | Baixo                                                                             |

Confirmado na prática o achado #7 de IMPACTO-031: a spec presume `Sidebar`/`FleetAside` já existentes, mas nenhum app shell existia (`layout.tsx` era só `QueryProvider`; cada página um `<main>` solto). O changelog v1.0/1.1/1.2 da própria SPEC-20260602-001, que descreve "implementação concluída", é resíduo de outro ciclo/projeto — não reflete este repositório (auditoria de código confirma zero arquivos `focus-slot`, `context-filter-sync`, `use-dashboard-store` etc.).

T5.3 foi dividida em sub-tarefas, conforme já autorizado pela decisão de sequenciamento de IMPACTO-031 ("shell de layout pode ser construído em paralelo"):

- **T5.3a (concluída):** route group `apps/web/src/app/(app)/` (páginas autenticadas movidas de `app/*` para `app/(app)/*`, sem mudança de URL) + `components/layout/sidebar.tsx` com navegação básica.
- **T5.3b (concluída):** `use-dashboard-store.ts` (5 modos de contexto) + `focus-slot.tsx` (RF-01–06).
- **T5.3c (concluída):** `VehicleActivator`/`ContextFilterSync` (RF-15, RF-17.1, R-CTX-04) + staleness no `FleetAside` (RF-16).
- **T5.3d (concluída):** `use-vehicle-context-field.ts` + `vehicle-recency.ts`, integrados em `expenses/new` e `maintenance/new` (RF-07–14).

**Achado à parte — corrigido em 2026-07-15 a pedido do usuário, antes do commit:** `npx next build` falhava ao pré-renderizar `/expenses` — `useSearchParams()` sem `Suspense` boundary (erro pré-existente, confirmado via `git stash` que reproduzia o mesmo erro na árvore antes de T5.3). Corrigido isolando a lógica em `ExpensesPageContent` e envolvendo em `<Suspense>` no export default de `apps/web/src/app/(app)/expenses/page.tsx`, conforme https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout.

Corrigir esse achado expôs um segundo bug real, também corrigido: `useDashboardStore.persist` (criado por T5.3b) é `undefined` durante SSR/prerender — `createJSONStorage(() => localStorage)` referencia um global inexistente no Node e o middleware `persist` do Zustand nunca anexa `.persist` à store quando isso acontece (comportamento documentado do próprio Zustand 5, não um bug da lib). `focus-slot.tsx` chamava `useDashboardStore.persist.hasHydrated()` sem guarda, quebrando o prerender de `/expenses/new` (e de qualquer página que renderize o `Sidebar`). Corrigido com optional chaining (`useDashboardStore.persist?.hasHydrated() ?? false`) em `apps/web/src/components/layout/focus-slot.tsx`. `npx next build` completa as 17 páginas com sucesso após as duas correções; suíte de 165 testes, lint e type-check permanecem verdes.

**Achado adicional (T5.3c):** RF-19 (logout limpa o contexto) expôs que o frontend não tinha nenhum mecanismo de logout — o endpoint `POST /auth/logout` já existia no backend (Fase 1/T1.1) mas nenhuma página/componente o chamava. Criado `apps/web/src/lib/auth/logout.ts` (chama o endpoint, limpa o store, redireciona para `/login`, resiliente a falha de rede) e um botão "Sair" no `Sidebar`. Escopo mínimo necessário para RF-19 ser testável — não é uma tela de perfil/conta completa.

**Desvios de escopo (T5.3d):** RF-09 (lista de veículos pré-filtrada pelos membros do grupo em foco) não filtra de fato a lista — implementar exigiria um novo endpoint `GET /vehicle-groups/:id/members` (hoje só existe `PUT` replace-all); a dica textual com o nome do grupo foi implementada, a filtragem ficou pendente. RF-11 (dropdown filtrado por atributo) foi implementado apenas client-side sobre a lista de veículos já carregada — aceitável na escala atual (dezenas de veículos por usuário, não milhares) e porque o modo `attribute` ainda não tem nenhum seletor de UI que o acione (só via API/store direto). Ambos os gaps são baixo risco e ficam documentados em `matrices/rastreabilidade.md` para reavaliação se o volume de dados crescer ou um seletor de atributo for construído.

---

### IMPACTO-033 — Estudo Pré-Implementação: T5.1 (Redesign do Dashboard, SPEC-20260531-001) (2026-07-15)

| Campo           | Valor                                                                                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Spec**        | SPEC-20260531-001                                                                                                                                                                                                                    |
| **Status**      | **T5.1 totalmente concluída em 2026-07-18** — Sprint 1 (Zona A + ActionDock) implementada em 2026-07-15 (ver IMPACTO-035). Sprint 2/3 (Zona B + Vehicle Spotlight) **concluídas em 2026-07-18** (ver IMPACTO-036). Feature completa. |
| **Risco geral** | Baixo                                                                                                                                                                                                                                |

Com T5.3 (SPEC-20260602-001) concluída (IMPACTO-032), rodado um segundo estudo pré-implementação para T5.1, cruzando o texto da spec com o estado real do código pós-T5.3 via agente `Explore` (a spec havia sido revisada em 2026-07-15 _antes_ da execução de T5.3, então parte do texto já nasceu potencialmente desatualizada em relação ao que seria de fato entregue).

**Achados — 3 divergências corrigidas na spec (v1.2, sem mudança de status):**

1. RF-ST-02/seção 9.1 diziam que `FleetAside` "não existe ainda, criar do zero". Falso — T5.3c já entregou `apps/web/src/components/layout/fleet-aside.tsx` subscrevendo o store global corretamente, com teste. Risco mitigado antes de virar código: sem a correção, a implementação de T5.1 poderia reescrever/quebrar um componente já funcional.
2. RF-SH-04 alertava sobre bug de dupla chamada em `calculate_fleet_health` como pendente. Já corrigido por `supabase/migrations/20260712172220_fix_fleet_health_double_call.sql`, três dias antes da própria revisão v1.1 da spec.
3. Caminho de arquivo do dashboard citado incorretamente (`apps/web/src/app/dashboard/page.tsx` em vez de `apps/web/src/app/(app)/dashboard/page.tsx`, route group `(app)` introduzido pelo app shell de T5.3a). Nome real do setter do store também corrigido (`setActiveVehicle`, não `setActiveVehicleId`).

**Decisão de escopo tomada com o usuário (não é correção de erro, é trade-off explícito):** a spec depende de `KpiCard`/`Tabs`/`EmptyState`/`Alert` (SPEC-20260525-001, T8.1, Fase 8, ainda `draft` — não iniciada). Duas opções avaliadas: (A) implementar versões mínimas inline em T5.1, mesmo padrão já validado em T3.9/T3.10, migrando quando a Fase 8 evoluir os componentes compartilhados; (B) antecipar um recorte de T8.1 agora (promover SPEC-20260525-001 e construir só os 4 componentes em `packages/ui` antes do dashboard). Escolhida a opção A por consistência com decisões já tomadas nas Fases 2/3 — registrado no changelog v1.2 da spec, sem necessidade de nova spec ou ADR (não é mudança de padrão arquitetural, é reincidência do padrão já adotado).

**Pendências não bloqueantes, já registradas na própria spec (seção 14) e reafirmadas aqui:** layout desktop master-detail (vs. zonas empilhadas) e comparação multi-veículo na Zona B seguem fora de escopo desta entrega, avaliação futura.

---

### IMPACTO-034 — Avaliacao de Upgrade: TypeScript 5.x -> 7.0 (2026-07-15)

| Campo           | Valor                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Spec**        | -- (mudanca de toolchain; sem spec de produto associada)                                                                        |
| **Status**      | Upgrade para TS7 adiado (risco Alto, bloqueado por dependencias externas); preparacao de baixo risco implementada em 2026-07-15 |
| **Risco geral** | Alto (upgrade completo) / Baixo (preparacao ja aplicada)                                                                        |

Analise conduzida antes de qualquer mudanca no repositorio. O TypeScript 7.0 reescreve o compilador em Go (8x-12x mais rapido) e introduz quatro breaking changes relevantes para este monorepo. A Microsoft recomenda passar pelo TypeScript 6.0 antes de migrar para 7.0, e frameworks como Next.js/NestJS devem aguardar a API estavel do 7.1.

**Inventario de tsconfigs do projeto (excluindo node_modules):**

| Arquivo                             | rootDir                           | types        | moduleResolution    | Observacao             |
| ----------------------------------- | --------------------------------- | ------------ | ------------------- | ---------------------- |
| `tsconfig.base.json`                | nao definido (base compartilhado) | nao definido | `Bundler`           | Base herdado por todos |
| `apps/api/tsconfig.json`            | `src` (explicito)                 | nao definido | `Node` (legacy)     | NestJS; usa decorators |
| `apps/web/tsconfig.json`            | nao definido                      | nao definido | `Bundler` (herdado) | Next.js; noEmit: true  |
| `packages/types/tsconfig.json`      | `src` (explicito)                 | nao definido | `Bundler` (herdado) | --                     |
| `packages/database/tsconfig.json`   | `src` (explicito)                 | nao definido | `Bundler` (herdado) | --                     |
| `packages/validators/tsconfig.json` | `src` (explicito)                 | nao definido | `Node` (legacy)     | Build dual: tsc direto |
| `packages/ui/tsconfig.json`         | `src` (explicito)                 | nao definido | `Bundler` (herdado) | --                     |

| #   | Mudanca                                                                                                                                                                                                                                                                                                                                                                                                                                    | Modulos afetados                                     | Risco  | Mitigacao                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **`types` agora default `[]`**: nenhum tsconfig do monorepo declara `types` explicitamente -- todos os pacotes `@types/*` resolvidos automaticamente hoje deixarao de ser incluidos automaticamente, causando erros de tipo em cascata em todos os 7 pacotes/apps. Pacotes afetados: `@types/node`, `@types/react`, `@types/react-dom`, `@types/jest`, `@types/express`, `@types/cookie-parser`, `@types/passport-jwt`, `@types/supertest` | Todos os tsconfigs (7 arquivos)                      | Alto   | Declarar `types` explicitamente em cada tsconfig antes do upgrade; inventario por pacote necessario                                                           |
| 2   | **`rootDir` agora default `./`**: `apps/web/tsconfig.json` nao declara `rootDir`; com `noEmit: true` o impacto direto na emissao e nulo, mas o compilador ancora o rootDir em `./` de forma explicita -- comportamento diferente do atual (inferido a partir dos arquivos de entrada)                                                                                                                                                      | `apps/web`                                           | Baixo  | Adicionar `"rootDir": "."` ao tsconfig do web explicitamente                                                                                                  |
| 3   | **`moduleResolution: "Node"` (legacy)**: usado em `apps/api/tsconfig.json` e `packages/validators/tsconfig.json`; o TS7 pressiona migracao para `NodeNext`/`Bundler`; o `Node` legacy (equivalente ao antigo `node10`) e zona cinzenta -- pode ser mantido como alias de compatibilidade, mas sem garantia formal no TS7                                                                                                                   | `apps/api`, `packages/validators`                    | Medio  | Migrar para `moduleResolution: "NodeNext"` com `module: "CommonJS"` (padrao NestJS moderno); testar imports internos do NestJS antes de confirmar             |
| 4   | **`emitDecoratorMetadata: true` + compilador Go**: o NestJS depende de `emitDecoratorMetadata` e `experimentalDecorators` para injecao de dependencia; o compilador Go do TS7 processa arquivos em paralelo -- `emitDecoratorMetadata` requer informacao de tipo cross-arquivo para emitir metadados corretos, o que e potencialmente incompativel com parsing isolado paralelo; compatibilidade do NestJS com TS7 ainda incerta           | `apps/api` (NestJS inteiro)                          | Alto   | Aguardar declaracao oficial de suporte do NestJS ao TS7 antes de avancar                                                                                      |
| 5   | **`typescript-eslint ^8.19.0` incompativel com TS7**: o typescript-eslint usa as APIs publicas do compilador TypeScript como peer dependency; o compilador Go expoe APIs diferentes -- a versao 8.x nao suporta TS7; a cadeia de lint em `eslint.config.mjs` quebrara completamente no upgrade                                                                                                                                             | Lint de todo o monorepo                              | Alto   | Aguardar typescript-eslint com suporte declarado ao TS7 (provavelmente v9+); upgrade de TS esta bloqueado por esta dependencia                                |
| 6   | **`ts-jest ^29.2.5` incompativel com TS7**: `apps/api` usa `ts-jest` como transform do Jest (`jest.config.js`); ts-jest 29.x usa APIs internas do compilador TypeScript JS que nao existem no compilador Go                                                                                                                                                                                                                                | `apps/api` (suite de testes Jest -- 100% dos testes) | Alto   | Aguardar versao do ts-jest compativel com TS7; alternativa: migrar `apps/api` de Jest+ts-jest para Vitest (ja usado nos outros pacotes) como parte do upgrade |
| 7   | **`baseUrl` removido**: nenhum tsconfig do projeto usa `baseUrl` standalone; o alias `"@/*"` em `apps/web/tsconfig.json` e implementado via `paths` (que continua suportado no TS7)                                                                                                                                                                                                                                                        | Nenhum                                               | Nenhum | Nenhuma acao necessaria                                                                                                                                       |
| 8   | **`target: es5` removido**: todos os tsconfigs usam `target: "ES2022"`                                                                                                                                                                                                                                                                                                                                                                     | Nenhum                                               | Nenhum | Nenhuma acao necessaria                                                                                                                                       |

**Cobertura de testes existente sobre a area de toolchain:**

- `apps/api`: Jest + ts-jest; threshold de 88% obrigatorio -- o upgrade quebra a execucao dos testes antes de qualquer validacao funcional
- `apps/web`, `packages/validators`, `packages/ui`: Vitest (nao depende do compilador TS para transpilacao) -- execucao dos testes nao e afetada; o script `tsc --noEmit` (type-check em CI) e o ponto de impacto
- Script raiz `type-check` via Turbo executa `tsc --noEmit` em todos os pacotes -- quebrara com os itens 1 e 2 no primeiro `pnpm type-check`

**Blocantes externos (fora do controle do projeto):**

- Suporte do NestJS ao TS7 (item 4)
- Versao do typescript-eslint compativel com TS7 (item 5)
- Versao do ts-jest compativel com TS7, ou migracao para Vitest no `apps/api` (item 6)

**Nota sobre ADR:** esta mudanca atende aos criterios de obrigatoriedade de ADR (mudanca de padrao arquitetural de toolchain -- troca de compilador JS para Go com breaking changes de configuracao). Recomenda-se criar um ADR em `docs/architecture/decisions/` antes de iniciar a migracao, documentando a motivacao, alternativas avaliadas e a decisao tomada. **Decisao (2026-07-15):** upgrade para TS7 adiado; ADR nao criado -- reavaliar quando os tres blocantes externos (itens 4, 5, 6) tiverem suporte declarado.

**Preparacao de baixo risco implementada em 2026-07-15** (itens 1 e 3 do upgrade, adiantados de forma independente por nao quebrarem nada em TS 5.x):

- **Item 1 (`types` explicito):** adicionado `"types": []` em `tsconfig.base.json` como default, com override por pacote: `apps/api` -> `["node", "express", "cookie-parser", "passport-jwt", "jest", "supertest"]`; `apps/web` -> `["node", "react", "react-dom"]`; `packages/ui` -> `["react", "react-dom"]`; `packages/types` e `packages/database` -> `[]` (sem uso de APIs Node no `src`). Validado com `pnpm type-check` (7/7 pacotes) sem erros.
- **Item 2 (`rootDir` no web):** adicionado `"rootDir": "."` em `apps/web/tsconfig.json`.
- **Item 3 (`moduleResolution: NodeNext`):** aplicado em `packages/validators/tsconfig.json` (module + moduleResolution `NodeNext`) -- validado com `type-check` e `vitest run` (126 testes, sem avisos). **Nao aplicado em `apps/api`**: a mudanca fez o `ts-jest` emitir o aviso `TS151002` em todas as suites, pedindo `isolatedModules: true`, que esta explicitamente `false` no tsconfig do NestJS. Como o `apps/api` e CommonJS puro (sem uso de ESM) e o ganho seria so cosmetico, revertido para `moduleResolution: "Node"` / `module: "CommonJS"` para nao introduzir ruido em CI. Revisitar junto com a decisao do item 6 (ts-jest vs migracao para Vitest).

Resultado: `pnpm type-check` e `pnpm lint` passam em todos os 7 pacotes; suite completa do `apps/api` (37 suites, 280 testes) e do `packages/validators` (11 suites, 126 testes) passam sem regressao. Nenhuma das mudancas acima antecipa o upgrade para TS7 em si -- os tres blocantes externos (itens 4, 5, 6) continuam de pe.

---

### IMPACTO-035 — Execução de T5.1 (SPEC-20260531-001, Sprint 1): Dashboard Zona A + ActionDock (2026-07-15)

| Campo           | Valor                                  |
| --------------- | -------------------------------------- |
| **Spec**        | SPEC-20260531-001                      |
| **Status**      | T5.1 concluída — Sprint 1 implementada |
| **Risco geral** | Baixo                                  |

Sprint 1 do redesign do dashboard implementada sobre a base do SPEC-20260602-001 (T5.3). Nenhum risco crítico materializado. Desvios e decisões registrados no changelog v1.2 da spec e na seção SPEC-20260531-001 de `matrices/rastreabilidade.md`.

| #   | Mudança                                                                                                                               | Módulos afetados                                 | Risco | Observação                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `DashboardService` — 4 novos métodos: `getFleetHealth`, `getAlerts`, `getFleetKpis`, `getVehicleCards`                                | `apps/api/src/modules/dashboard/`                | Baixo | Cada KPI isolado via `Promise.allSettled` — falha não derruba os demais (CA-S1-05.1)                                                 |
| 2   | `DashboardController` — 4 novos endpoints: `GET /dashboard/fleet-health`, `/alerts`, `/fleet-kpis`, `/vehicle-cards`                  | `apps/api/src/modules/dashboard/`                | Baixo | Todos protegidos por `SupabaseAuthGuard` (S1); RPC `calculate_fleet_health` requer S7 revisado antes de produção                     |
| 3   | `packages/validators/src/dashboard.schemas.ts` — tipos e schemas de runtime do dashboard                                              | `packages/validators`                            | Baixo | Importado por `DashboardService` e frontend; tipos puros sem side-effects                                                            |
| 4   | `use-dashboard-store.ts` — adição de `dockOpen`/`setDockOpen` (RF-ST-01) ao store de SPEC-20260602-001; sem recriar `activeVehicleId` | `apps/web/src/lib/stores/`                       | Baixo | Segue R-CTX-04; alteração aditiva, sem breaking change no store                                                                      |
| 5   | Componentes novos: `FleetAlertBar`, `FleetKpis`, `VehicleHealthCard`                                                                  | `apps/web/src/components/dashboard/`             | Baixo | Versões inline (sem `@navestory/ui` formal, padrão já estabelecido em T3.9); migração para Fase 8                                    |
| 6   | `ActionDock` — dock fixo mobile + botões inline desktop                                                                               | `apps/web/src/components/layout/action-dock.tsx` | Baixo | Sem "Multa"/"IA navestory"/"Novo Veículo" (RF-DC-02.1/RF-DC-03); fecha ao navegar (RF-DC-06)                                    |
| 7   | `DashboardPage` reescrita — Zona A + ExportControls preservados                                                                       | `apps/web/src/app/(app)/dashboard/page.tsx`      | Baixo | Zona B (Vehicle Spotlight) entregue na Sprint 2/3 (ver IMPACTO-036)                                                                  |
| 8   | Rota `/vehicles/[id]/odometer` criada (gap identificado durante implementação)                                                        | `apps/web/src/app/(app)/vehicles/[id]/odometer/` | Baixo | Reutiliza `PATCH /vehicles/:id` (campo `odometer`); sem spec própria — coberta como sub-item de T5.1; ver nota em rastreabilidade.md |
| 9   | `vehicles.service.ts` — `VEHICLE_COLUMNS` passa a incluir `insurance_expires_at`/`crlv_expires_at`                                    | `apps/api/src/modules/vehicles/`                 | Baixo | Corrige lacuna pré-existente desde T0.2; afeta `GET /vehicles` e o dashboard                                                         |
| 10  | Bug de fuso horário corrigido em `daysUntil` (`dashboard.service.ts`)                                                                 | `apps/api/src/modules/dashboard/`                | Baixo | Unificado para UTC; limitação residual documentada em SPEC-20260715-002 (draft)                                                      |
| 11  | Suporte a `?category=` em `/expenses/new`                                                                                             | `apps/web/src/app/(app)/expenses/new/page.tsx`   | Baixo | Gap identificado em RF-DC-02 item 1; `useSearchParams()` dentro de `<Suspense>` conforme padrão T5.3                                 |

**Sprint 2/3 concluída em 2026-07-18 (IMPACTO-036):** Vehicle Spotlight (Zona B), gráficos reais (`TcoBreakdownChart`/`FuelTrendChart`), reconciliação de documentos com `vehicle_recurring_costs`, alertas de IPVA/Seguro/CRLV na `FleetAlertBar`, tooltip de flags detalhados (RF-SH-03) — todos implementados. Ver IMPACTO-036 para o detalhamento.

---

### IMPACTO-036 — Execução de T5.1 Sprints 2 e 3 (SPEC-20260531-001): Vehicle Spotlight + Alertas de Documentos + Histórico (2026-07-18)

| Campo           | Valor                                                                 |
| --------------- | --------------------------------------------------------------------- |
| **Spec**        | SPEC-20260531-001                                                     |
| **Status**      | T5.1 totalmente concluída — Sprints 2 e 3 implementadas em 2026-07-18 |
| **Risco geral** | Baixo                                                                 |

Sprints 2 e 3 do redesign do dashboard implementadas sobre a base de T5.1 Sprint 1 (IMPACTO-035). Estudo pré-implementação com agentes `impact-analyzer` e `design-system` resultou na revisão v1.3 da spec (changelog de 2026-07-18). Nenhum risco crítico materializado.

**Decisões técnicas registradas na revisão v1.3 da spec:**

- RF-DB-04/RF-DB-05: reaproveitam `GET /analytics/tco/:vehicleId` e `GET /analytics/fuel-trend/:vehicleId` (T6.1) em vez de nova RPC — elimina duplicação de código e SQL, componentes `TcoBreakdownChart`/`FuelTrendChart` extraídos de `analytics/page.tsx` para `apps/web/src/components/charts/` e reutilizados em ambas as páginas.
- TCO breakdown por ciclo de odômetro ativo: reaproveitado sem filtro de período de calendário — filtro de período fica fora de escopo desta rodada, registrado na seção 14 da spec.
- RF-SH-03 (tooltip de flags do semáforo): promovido de prioridade Baixa para esta rodada.

| #   | Mudança                                                                                                                                                                                           | Módulos afetados                     | Risco | Observação                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `DashboardService` — 3 novos métodos: `getDocumentOverdueAlerts`, `getPaidDocumentsCurrentYear`, `getVehicleHistory`                                                                              | `apps/api/src/modules/dashboard/`    | Baixo | `getDocumentOverdueAlerts` reconcilia IPVA/Seguro/CRLV com `vehicle_recurring_costs.paid_at` do ano corrente (CA-S3-02, RF-DB-06)                                 |
| 2   | `DashboardController` — 1 novo endpoint: `GET /dashboard/vehicle-history?vehicle_id=`                                                                                                             | `apps/api/src/modules/dashboard/`    | Baixo | Combina últimas 20 despesas + manutenções via `ExpensesService`/`MaintenancesService.findAll`; reaproveitamento sem código novo no backend para RF-DB-04/RF-DB-05 |
| 3   | `packages/validators/src/dashboard.schemas.ts` — extensões: `FleetAlertType` com `"document_overdue"`, `vehicleHistoryQuerySchema`/`VehicleHistoryItem`, `VehicleCard.last_fuel_odometer_missing` | `packages/validators`                | Baixo | Tipos puros; sem breaking change nos schemas existentes                                                                                                           |
| 4   | `apps/web/src/components/dashboard/VehicleSpotlight.tsx` — componente completo da Zona B: `StickyFocusChip`, tabs/grid responsivos, 4 seções (Despesas, Consumo, Docs, Histórico), `EmptyState`   | `apps/web/src/components/dashboard/` | Baixo | `StickyFocusChip` chama `clearAllSelection` do store global; chip segue nomenclatura canônica de SPEC-20260602-001                                                |
| 5   | `apps/web/src/components/charts/tco-breakdown-chart.tsx` e `fuel-trend-chart.tsx` extraídos de `analytics/page.tsx`                                                                               | `apps/web/src/components/charts/`    | Baixo | Eliminam duplicação: `/analytics` e `VehicleSpotlight` compartilham os mesmos componentes `recharts` sem cópia                                                    |
| 6   | `apps/web/src/components/dashboard/VehicleHealthCard.tsx` — extensão: tooltip de flags (RF-SH-03) + badge `last_fuel_odometer_missing` (CA-S3-03)                                                 | `apps/web/src/components/dashboard/` | Baixo | Sem mudança de interface pública do componente; adição de props opcionais                                                                                         |
| 7   | `apps/web/src/components/dashboard/FleetAlertBar.tsx` — extensão: suporte a tipo `"document_overdue"`                                                                                             | `apps/web/src/components/dashboard/` | Baixo | Sem mudança de lógica de estilo — já baseada em `days_until_due`                                                                                                  |
| 8   | `dashboard/page.tsx` — extensão: scroll suave até Zona B em `handleSelectVehicle` + `spotlightRef` (RF-DA-05)                                                                                     | `apps/web/src/app/(app)/dashboard/`  | Baixo | Comportamento puramente client-side; sem chamada de rede nova                                                                                                     |

**Fora de escopo desta rodada (documentado no changelog v1.3 da spec e seção 14):** filtro de período de calendário no gráfico de Despesas por Categoria; layout master-detail horizontal em desktop; comparação multi-veículo na Zona B.

---

### IMPACTO-037 — Adoção de PWA/Offline com Serwist: Service Worker, Cache Client-Side e Store de Conectividade (SPEC-20260712-001) (2026-07-18)

| Campo           | Valor                              |
| --------------- | ---------------------------------- |
| **Spec**        | SPEC-20260712-001 (approved, v0.5) |
| **Status**      | Implementado em 2026-07-18 (T7.1)  |
| **Risco geral** | Médio                              |

Introdução da primeira camada de cache client-side do projeto, via `@serwist/turbopack` v9 sobre Next.js 16 App Router com Turbopack. Inclui Service Worker, Web App Manifest, store de conectividade compartilhado (Zustand), indicador de status offline e limpeza de cache no logout.

| #   | Mudança                                                                                                                                                                                                                                                                                                                      | Módulos afetados                                                                                                                   | Risco | Mitigação                                                                                                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `@serwist/next` (v8, webpack) descartado em favor de `@serwist/turbopack` (v9): build com Turbopack não executa plugins de webpack — o SW simplesmente não era gerado com a lib original. Compilado via route handler `src/app/serwist/[path]/route.ts`                                                                      | `apps/web/next.config.ts`, `apps/web/pnpm-lock.yaml`, `apps/web/src/app/serwist/`                                                  | Médio | Verificado com `pnpm build && pnpm start && curl /serwist/sw.js` → 200 com precache entries; nomes de cache (`navestory-pages`/`navestory-api-data`) e estratégias por RF mantidos como especificado                                                  |
| 2   | `apps/web/middleware.ts` estendido: `/serwist`, `/manifest.webmanifest`, `/icons` e `/offline` marcados como rotas públicas (excluídas do redirecionamento do guard de autenticação)                                                                                                                                         | `apps/web/middleware.ts`                                                                                                           | Alto  | Sem esse ajuste, o middleware de auth redirecionava todas essas rotas para `/login`, impedindo o registro do Service Worker pelo navegador — bug descoberto durante verificação end-to-end                                                       |
| 3   | `apps/web/src/app/manifest.ts`: Web App Manifest dinâmico via API nativa do Next.js App Router (RF-01/RF-02)                                                                                                                                                                                                                 | `apps/web/src/app/`                                                                                                                | Baixo | Ícones 192×192 e 512×512 em variantes `any` e `maskable` disponíveis em `apps/web/public/icons/`                                                                                                                                                      |
| 4   | `apps/web/src/app/sw.ts`: entry point do Service Worker com estratégias diferenciadas por tipo de recurso — `CacheFirst` (assets), `NetworkFirst` (navegação, timeout 3s), `StaleWhileRevalidate` (GET /api/), `NetworkOnly` (mutações) (RF-05–RF-10)                                                                   | `apps/web/src/app/sw.ts`                                                                                                           | Médio | Plugin `api-cache-retention-plugin.ts` garante que entradas além de 30 dias (R-PWA-06) só são removidas quando há conexão disponível — nunca corta exibição offline (RF-10/D9)                                                                        |
| 5   | `useConnectivityStore` (Zustand): store compartilhado entre `useOnlineStatus` (UI) e `api-client.ts` (requisições). Falhas de rede reais com `navigator.onLine === true` chamam `markOffline()` diretamente via `api-client.ts` (RF-11.1/R-PWA-08/EC-08)                                                                     | `apps/web/src/lib/pwa/connectivity-store.ts`, `apps/web/src/lib/http/api-client.ts`, `apps/web/src/lib/hooks/use-online-status.ts` | Médio | Padrão de fonte única de verdade para conectividade — evita dessincronização entre a UI e a camada HTTP                                                                                                                                               |
| 6   | Limpeza de cache no logout via `apps/web/src/lib/auth/logout.ts` em vez de `supabase.auth.onAuthStateChange` — este projeto não usa Supabase Auth Client no browser (sessão via cookie httpOnly + JWT) (RF-16/RF-17/S6)                                                                                                      | `apps/web/src/lib/auth/logout.ts`, `apps/web/src/lib/pwa/clear-api-cache.ts`                                                       | Alto  | EC-03 (troca de usuário sem logout explícito) ficou ⏸️ adiado: o backend não expõe `user_id` ao client, tornando a detecção de troca impossível sem endpoint novo (`/auth/me` ou `/auth/login` retornando `user_id`); retomar quando essa API existir |
| 7   | Indicador `ConnectivityIndicator` no Header com guard `mounted` (useState + useEffect) para evitar hydration mismatch: primeiro render do client idêntico ao SSR, sem ler `navigator.onLine` antes da hidratação (RF-13)                                                                                                     | `apps/web/src/components/pwa/connectivity-indicator.tsx`, `apps/web/src/components/layout/header.tsx`                              | Baixo | Bug de hydration mismatch corrigido via guard — o componente retorna `null` tanto no SSR quanto no primeiro render do client; apenas após `setMounted(true)` passa a refletir o estado real de conectividade                                          |
| 8   | Novos componentes PWA: `install-prompt-banner.tsx` (RF-03), `ios-install-banner.tsx` (RF-04), `service-worker-update-toast.tsx` (RF-14/RF-15), `offline-write-blocked-toast.tsx` (RF-11/RF-11.1/RF-12) — todos integram o `ui-store` (Zustand) existente; sem dependências novas (`Sonner`/`lucide-react` descartadas — D10) | `apps/web/src/components/pwa/`, `apps/web/src/lib/stores/ui-store.ts`                                                              | Baixo | Reaproveitam o padrão de toast já estabelecido em T5.4 (`ContextStaleToast`/`ui-store`)                                                                                                                                                               |

**Riscos a observar:**

- EC-03 (troca de usuário sem logout explícito) permanece ⏸️ aberto — risco de exibir dados residuais do usuário A para o usuário B em dispositivo compartilhado, caso a troca ocorra sem logout. Mitigação parcial: o TTL de 30 dias (R-PWA-06) eventualmente remove entradas; mas a proteção primária (limpeza imediata no `SIGNED_IN` de user_id diferente) depende de endpoint backend ainda não existente.
- O Service Worker em cache no browser dos usuários tem lifecycle independente do deploy — rollback de emergência do frontend demora até a próxima atualização normal ser detectada pelo navegador do usuário (RF-14/RF-15).
- `platform-detection.ts` usa `navigator.userAgent` para detecção de iOS/Safari — sujeito a user-agent spoofing; limitação conhecida e documentada (RF-04/EC-07), aceitável para esta fase.

**Pendência: ADR não criado** — a spec (§16/Q3) decidiu explicitamente não formalizar ADR agora, pois o cache client-side ainda não é um padrão replicado em outras partes do app. Registrado aqui para consulta futura: criar ADR se o padrão de Service Worker/cache for estendido a outros domínios do projeto.

---

### IMPACTO-038 — Estudo Pré-Implementação: T8.1 (Design System, SPEC-20260525-001) (2026-07-19)

| Campo           | Valor                                                       |
| --------------- | ----------------------------------------------------------- |
| **Spec**        | SPEC-20260525-001 (draft → revisão v0.2 nesta rodada)       |
| **Status**      | Estudo concluído; spec revisada; implementação não iniciada |
| **Risco geral** | Médio                                                       |

Mesmo padrão de estudo pré-implementação já usado em T3.9/T5.1/T5.4/T7.1: antes de promover a spec e iniciar T8.1, acionados os agentes `Explore` (inventário do código real) e `design-system` (padrões de mercado 2026), seguidos de 4 decisões tomadas com o usuário. Achados e decisões:

| #   | Achado/Decisão                                                                                                                                                                                                                                                                                                                                                                                                                                      | Módulos afetados                                                                                     | Risco | Mitigação/Nota                                                                                                                                                                                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | §1 da spec (Contexto) afirmava que `packages/ui` já possuía `Button`/`Input`/`StatsCard`/`Card`/`Table` "bem estruturados". Falso: `packages/ui/src/components/` só contém `masked-input.tsx`. Mesmo padrão de resíduo de outro contexto já visto em `SPEC-20260602-001` (IMPACTO-032)                                                                                                                                                              | `specs/design-system/SPEC-20260525-001.md` §1/§4.1                                                   | Alto  | `Button`/`Card`/`Table` promovidos a pré-requisito de T8.1 (novo grupo "Base"), construídos antes/junto dos 11 componentes originais                                                                                                                                                                                                                |
| 2   | 5 dos 11 componentes originais já têm implementação inline duplicada em produção: `KpiCard` (`FleetKpis.tsx` + `expenses/page.tsx`), `EmptyState` (6 locais: expenses/maintenance/analytics/dashboard/atividades/VehicleSpotlight), `Alert` (padrão `className` ad hoc em ~30 arquivos), `Tabs` (`expenses/page.tsx` sem ARIA + `VehicleSpotlight.tsx` com `role="tab"` correto), `Toast` (3 componentes dedicados com campo próprio no `ui-store`) | `apps/web/src/` (múltiplos)                                                                          | Médio | Ordem de implementação (spec §10) passa a distinguir migração (risco de regressão em tela já funcionando) de greenfield; `Combobox`/`DateRangePicker`/`FileUpload`/`Steps`/`Breadcrumb`/`ChartWrapper` (parcial) confirmados como 100% inexistentes, sem risco de regressão                                                                         |
| 3   | `@base-ui/react`, `class-variance-authority`, `sonner`, `lucide-react` — nenhuma instalada no monorepo; Storybook sem nenhuma dependência apesar de script órfão em `packages/ui/package.json`                                                                                                                                                                                                                                                      | `apps/web/package.json`, `packages/ui/package.json`                                                  | Médio | Decisão: `@base-ui/react` descartado (ficar 100% Radix, evita 3ª API de composição junto de `@radix-ui/react-dialog`/`vaul`); CVA adotado (única dependência nova); `sonner` descartado; Storybook removido do escopo                                                                                                                               |
| 4   | `icon: LucideIcon` tipado em 7 interfaces da spec original, mas `lucide-react` nunca foi instalado — contradiz a decisão de ícones emoji já tomada em T5.4 (IMPACTO-036/037, D10). Os próprios mockups ASCII da spec já usavam emoji, evidenciando autoinconsistência                                                                                                                                                                               | `specs/design-system/SPEC-20260525-001.md` (KpiCard/Tabs/Alert/EmptyState/Breadcrumb/Steps/Combobox) | Médio | Pesquisa de mercado + WCAG SC 1.1.1/H86: abordagem híbrida — `icon?: React.ReactNode` (emoji) nos componentes decorativos; SVG fixo embutido (sem lib nova) só nos 2 pontos semânticos (variante de `Alert`, indicador de estado de `Steps`), com `aria-hidden`/`role` conforme H86                                                                 |
| 5   | `Toast` da spec original propunha `sonner`/`@base-ui/react/toast` (hook imperativo genérico) sobre um padrão já em produção de 3 toasts ad hoc com campo dedicado no `ui-store` — código-fonte dos 3 já documenta explicitamente a decisão de não unificar (D10, "sem introduzir lib de toast nova")                                                                                                                                                | `apps/web/src/lib/stores/ui-store.ts`, `apps/web/src/components/pwa/*-toast.tsx`                     | Alto  | Decisão revertida: generalizar em fila única (`toasts: ToastItem[]`) no `ui-store` existente, mantendo ADR-008 sem exceção; migração dos 3 toasts existentes entra no escopo de T8.1, tocando indiretamente `SPEC-20260602-001`/`SPEC-20260712-001` (specs `approved`) — verificação de paridade visual/comportamental obrigatória na implementação |
| 6   | `Combobox` da spec original citava `@base-ui/react/select` OU `Popover`+`Command` (shadcn)                                                                                                                                                                                                                                                                                                                                                          | `specs/design-system/SPEC-20260525-001.md` §7.2                                                      | Baixo | Fixado: `@radix-ui/react-popover` + `cmdk`, coerente com a decisão #3                                                                                                                                                                                                                                                                               |

**Decisões de escopo tomadas com o usuário** (via `AskUserQuestion`, não é correção de erro — são 4 trade-offs explícitos): (1) ampliar T8.1 para incluir `Button`/`Card`/`Table`; (2) ícones híbridos (emoji decorativo + SVG fixo semântico), após pesquisa dedicada de acessibilidade a pedido do usuário; (3) generalizar os 3 toasts existentes em fila única, aceitando o risco de migração; (4) ficar 100% em Radix, sem somar `@base-ui/react`. Registradas no changelog v0.2 da spec (`Histórico de Revisões`).

**Numeração de seções corrigida:** a v1.0 da spec tinha duas seções `## 7.` simultâneas (`Padrões de Listagem` e `Ordem de Implementação Sugerida`) — corrigido na v0.2 (agora §9 e §10). Seção obrigatória "Histórias de Usuário e Critérios de Aceitação" (ausente na v1.0) adicionada como §3.

**Pendência:** spec ainda em `status: draft`. Gate de sincronia (matriz de rastreabilidade) já satisfeito nesta rodada — ver linha `SPEC-20260525-001` em `matrices/rastreabilidade.md`, atualizada com as 14 linhas (3 base + 11 originais) e a distinção migração/greenfield. Promoção a `approved` e início da implementação (T8.1) ficam para decisão/rodada seguinte.

**Adendo v0.3 (2026-07-19, mesmo dia):** usuário trouxe uma proposta externa de estruturação do design system (`packages/design-tokens` separado, Radix+CVA, shadcn como referência, Storybook, Atomic Design, Chromatic/regressão visual, validação de variantes via Zod, `jest-axe`) para avaliação contra o que já havia sido decidido nesta rodada. Avaliação:

| Ponto da proposta                                                                     | Veredito                                              | Motivo                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Radix + CVA, shadcn como referência (não dependência), Atomic Design como mentalidade | Confirmado — já era a decisão tomada                  | Sem conflito                                                                                                                                                                                                                            |
| **Auditoria de tokens reais em uso antes de codar**                                   | **Aceito e ampliou o escopo**                         | Verificação motivada pela proposta revelou um 2º achado crítico não pego na v0.2 (ver abaixo)                                                                                                                                           |
| `jest-axe`/`@axe-core` como critério de aceite                                        | Aceito, incorporado à spec (§4.4)                     | Gap real — nenhuma cobertura de a11y automatizada hoje (`TESTS_SPEC.md`/`RULES.md` não mencionam)                                                                                                                                       |
| Storybook / Chromatic / regressão visual                                              | Rejeitado, reafirma decisão v0.2                      | Storybook já descartado por ser projeto solo; a própria proposta cita "essencial quando o time crescer além de você" como justificativa — inconsistente com listar como próximo passo agora; Chromatic tipicamente depende de Storybook |
| `packages/design-tokens` como pacote separado                                         | Rejeitado — tokens ficam em `packages/ui/src/tokens/` | Sem 2º consumidor real hoje (mobile/PDF são hipotéticos, fora de roadmap) — pacote próprio é complexidade adiantada, contra o princípio de não abstrair para requisito hipotético futuro                                                |
| "Validar variantes com Zod em tempo de build"                                         | Rejeitado — imprecisão técnica                        | Zod é validação em runtime, não build-time; CVA + TypeScript já garantem segurança de tipo em compile-time para variantes; Zod só se justificaria se a variante viesse de fonte externa não confiável, o que não é o caso               |

**2º achado crítico (motivado pela auditoria sugerida pela proposta):** a v0.2 desta spec (achado #1 desta mesma entrada) já havia corrigido a afirmação falsa sobre `Button`/`Card`/`Table` existirem, mas manteve sem verificar a frase "Tailwind CSS + variáveis OKLCH do `globals.css`" herdada da v1.0 — mesmo padrão de erro, não pego na primeira passada. Auditoria confirma: `apps/web/tailwind.config.ts` tem `theme.extend: {}` vazio; `apps/web/src/app/globals.css` tem só as 3 diretivas `@tailwind base/components/utilities`, sem nenhum `:root {}`/variável CSS; projeto em Tailwind v3.4.17 (não v4). **Classes já em uso em produção não têm efeito:** `bg-muted`, `text-primary`, `border-l-primary`, `bg-muted-foreground/30` aparecem em `sidebar.tsx`, `analytics/page.tsx`, `atividades/page.tsx`, `expenses/page.tsx` e outros, mas como esses nomes de cor não existem no tema, o compilador JIT do Tailwind não gera CSS para eles — são classes mortas, sem efeito visual, silenciosamente, hoje em produção.

**Decisão:** nova §4.1 "Tokens de Design" na spec, como pré-requisito 0 (bloqueia até `Button`/`Card`/`Table`, §4.2). Tokens formalizados em `packages/ui/src/tokens/*.ts`, aplicados via `tailwind.config.ts` (`theme.extend`) + `globals.css` (`@layer base { :root {...} }`) — fonte de verdade é o TS (Tailwind v3, sem `@theme` CSS-first do v4). Primeiro passo da implementação de tokens é auditar os nomes semânticos já referenciados no código (`primary`/`muted`/`success`/`danger`/`warning`/`info`) para não redefinir sem considerar a intenção original.

**Adendo — fechamento de T8.1, rodada 1 (2026-07-19):** escopo desta rodada combinado com o usuário via `AskUserQuestion` — prioridades 0–1 (tokens + `Button`/`Card`/`Table`), deixando os 11 componentes originais (incluindo a migração de `Toast`, que toca `SPEC-20260602-001`/`SPEC-20260712-001` `approved`) para rodada seguinte, por serem maior escopo/risco.

| #   | Achado/Decisão                                                                                                                                                                                                                                                                                                                                                    | Módulos afetados                   | Risco | Mitigação/Nota                                                                                                                                                                                                                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7   | Auditoria de tokens (agente `Explore`) achou paleta oklch já documentada em `.agents/navestory-ui-pwa/SKILL.md` (primary/secondary/accent/success/warning/error/info + background/foreground/card), nunca aplicada ao Tailwind; `#3b70ca` (≈ primary) já hardcoded em `manifest.ts`, `layout.tsx`, `service-worker-update-toast.tsx`, `install-prompt-banner.tsx` | `packages/ui/src/tokens/colors.ts` | Baixo | Adotada como fonte dos tokens `primary`/`secondary`/`accent`/`background`/`foreground`/`card` — mesmo matiz, sem reinventar. Migração dos hex hardcoded para os novos tokens fica para quando os arquivos que os usam forem tocados por outra tarefa, fora do escopo mínimo de T8.1 rodada 1                                                                               |
| 8   | `success`/`warning`/`danger`/`info` **não existem** como classe Tailwind em produção hoje — status/alerta usam cores literais (`red-*`, `amber-*`/`yellow-*`, `green-*`/`emerald-*`, `blue-*`) espalhadas em `atividades/page.tsx`, `expenses/page.tsx`, `VehicleHealthCard.tsx`, `maintenance/page.tsx`, `sidebar.tsx`                                           | `packages/ui/src/tokens/colors.ts` | Baixo | Tokens novos (não migração): tom "pastel" (L=0.92) do `SKILL.md` mantido para fundo; tom "solid" (ícone/borda/texto, L 0.55–0.75 conforme legibilidade por matiz) é derivação nova desta implementação, mesmo H do pastel. Migrar os hex/Tailwind-literal existentes para os tokens novos é trabalho futuro (não regride nada hoje, classes antigas continuam funcionando) |
| 9   | `.agents/navestory-ui-pwa/SKILL.md` também instrui `lucide-react` e componentes `shadcn/ui` prontos — contradiz a decisão já `approved` da spec (§1/§4.3: sem `lucide-react`, ícones híbridos emoji+SVG fixo; Radix headless com visual shadcn só como referência, sem instalar o pacote)                                                                         | —                                  | Baixo | Conflito não resolvido nesta rodada, só sinalizado: a spec `approved` prevalece por ser a decisão mais recente e explicitamente revisada (v0.2/v0.3); o `SKILL.md` parece resíduo de orientação anterior à spec. Recomendação para o usuário: atualizar `SKILL.md` para não divergir da spec approved, evitando que um agente futuro siga a instrução desatualizada        |

**Resultado:** tokens (`packages/ui/src/tokens/{colors,spacing,radius}.ts`) aplicados em `apps/web/tailwind.config.ts`/`globals.css`; `Button`/`Card`/`Table` implementados em `packages/ui/src/components/` com CVA, cada um com `[nome].test.tsx` cobrindo interação + `jest-axe` (25 testes, 100% cobertura em `packages/ui`); `pnpm lint`/`type-check`/`test`/`build` (`apps/web`) verdes. Matriz de rastreabilidade atualizada (`SPEC-20260525-001`, 4 linhas `⏳`→`✅`).

---

### IMPACTO-039 — Correções de Bugs e Mudança de Ambiente de Dev — Sessão de Testes Manuais (2026-07-19)

| Campo           | Valor                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| **Spec**        | SPEC-20260521-001 (S1 — autenticação); sem spec nova — são bugfixes restaurando o comportamento pretendido |
| **Status**      | Implementado em 2026-07-19/2026-07-20                                                                      |
| **Risco geral** | Alto (Bug #1 — autenticação quebrada) / Baixo (demais)                                                     |

Achados identificados durante sessão de testes manuais end-to-end. Relatório completo de QA em `docs/qa/2026-07-19-teste-cadastro-local.md`. Nenhum requisito novo — apenas correções que restauram o comportamento especificado pelas specs já aprovadas.

| #   | Mudança                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Módulos afetados                                                       | Risco | Mitigação                                                                                                                                                                                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Bug #1 — Validação de JWT assimétrico (S1):** `apps/api/src/common/guards/supabase-auth.guard.ts` validava o token localmente via `SUPABASE_JWT_SECRET` (HS256 estático), incompatível com o algoritmo real do projeto Supabase `navestory` (ES256/JWKS). Toda rota autenticada retornava 401 com token válido. Corrigido para usar `auth.getUser(token)` do SDK oficial Supabase — robusto a qualquer algoritmo e sem depender de secret local. O guard também passou a aceitar o token tanto via header `Authorization` quanto via cookie httpOnly (antes só header, o que quebraria o fluxo real do navegador)                                                                                                                                                                       | `apps/api/src/common/guards/supabase-auth.guard.ts`                    | Alto  | Corrigido; coberto por `supabase-auth.guard.spec.ts` (mock de `auth.getUser`). `apps/api/src/modules/auth/jwt.strategy.ts` foi simplificado para manter apenas o tipo `JwtPayload` (a `PassportStrategy` passport-jwt foi removida junto com o registro em `auth.module.ts`, pois a validação migrou para o guard) |
| 2   | **Bug #2 — `ZodValidationPipe` validando parâmetro errado (2 rodadas):** `apps/api/src/common/pipes/zod-validation.pipe.ts`, usado tanto via `@UsePipes` (valida `@Body()`) quanto via `@Query(pipe)`, era aplicado pelo Nest a TODOS os parâmetros decorados do handler (incluindo `@UserId()` e `@Param("id")`), gerando 400 "Expected object, received string" em toda mutação real. Primeira correção (filtrar por `metadata.type !== 'body'`) quebrou os defaults de paginação de todos os endpoints de listagem (`GET /expenses`, `/fines`, `/maintenances` etc.). Segunda correção (final): o pipe usa `metadata.data` como sinal — pula quando é extração de chave específica (`@Query("strict")`, `@Param("id")`), valida quando é o objeto inteiro (`@Body()`, `@Query()` sem chave) | `apps/api/src/common/pipes/zod-validation.pipe.ts`                     | Alto  | Corrigido; coberto por `zod-validation.pipe.spec.ts`. O bug não aparecia em testes unitários porque eles chamam o controller diretamente, sem passar pelo pipeline de pipes do Nest                                                                                                                                |
| 3   | **Bug #3 — Erro de sintaxe SQL em migration:** `supabase/migrations/20260716130000_analytics_anomalies_benchmark.sql` usava `FILTER (WHERE ...)` sobre `(max(...) - min(...))` — construção inválida no Postgres (`FILTER` só aceita agregação isolada, não expressão). Quebraria a aplicação da migration em CI, staging e produção. Corrigido removendo o `FILTER` (que era redundante — `max()`/`min()` já ignoram NULL)                                                                                                                                                                                                                                                                                                                                                                    | `supabase/migrations/20260716130000_analytics_anomalies_benchmark.sql` | Alto  | Corrigido; migration verificada e aplicada via `supabase db push` ao remoto após a correção                                                                                                                                                                                                                        |
| 4   | **Hardening de frontend — charts e error boundary:** `apps/web/src/components/charts/tco-breakdown-chart.tsx` e `fuel-trend-chart.tsx` passaram a tratar `breakdown`/`points` ausente como estado vazio em vez de lançar `Object.keys(undefined)`. Novo `apps/web/src/app/(app)/error.tsx` — error boundary do App Router cobrindo toda a área autenticada, usando `Alert` do design system (`@navestory/ui`) com botão "Tentar novamente" e `Sentry.captureException`                                                                                                                                                                                                                                                                                                                         | `apps/web/src/components/charts/`, `apps/web/src/app/(app)/error.tsx`  | Baixo | Defensivo; não altera lógica de negócio                                                                                                                                                                                                                                                                            |
| 5   | **Mudança de ambiente de dev (decisão explícita do usuário, 2026-07-19):** `apps/api/.env` passou a apontar para o projeto Supabase remoto real `navestory` (`sfkefpoanmoiagwxbwld`) em vez do Supabase local via Docker. Eliminado o drift de migrations e o problema de "dados temporários difíceis de reproduzir". `scripts/lab.mjs` atualizado para só rodar `supabase start` quando `SUPABASE_URL` aponta para localhost/127.0.0.1 — senão pula. Implicação conhecida e aceita pelo usuário: dados de teste estão misturados no banco remoto até a limpeza pré-lançamento (ver item 6)                                                                                                                                                                                                    | `apps/api/.env`, `scripts/lab.mjs`                                     | Médio | Implicação rastreada: TRUNCATE obrigatório antes de abrir para usuários reais (registrado em `important/PENDENCIAS-E-PROCESSOS.md`, Bloco 1)                                                                                                                                                                       |
| 6   | **Remoção de `SUPABASE_JWT_SECRET`:** após o Bug #1, a variável ficou morta (nenhum arquivo lê). Removida de `apps/api/.env`, `.env.test`, `.env.example`, `apps/api/src/common/config/env.validation.ts` (Joi schema), `.github/workflows/ci.yml`, `docs/reference/environment-variables.md` e `docs/operations/disaster-recovery.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `apps/api` (infra/config)                                              | Baixo | Mudança de limpeza; docs atualizados com nota explicativa                                                                                                                                                                                                                                                          |
| 7   | **Realinhamento de migrations remotas:** o projeto Supabase remoto `navestory` tinha 4 migrations aplicadas sob timestamps diferentes dos arquivos locais (mesmo conteúdo, renomeados localmente em ciclo anterior). Realinhado via `supabase migration repair` (bookkeeping puro, sem re-executar SQL); as 3 migrations de analytics (incluindo a do Bug #3, já corrigida) aplicadas via `supabase db push`. Remoto agora 100% sincronizado com `supabase/migrations/`                                                                                                                                                                                                                                                                                                                        | `supabase/migrations/`                                                 | Baixo | Operação de reparo apenas; nenhum SQL de dados foi executado                                                                                                                                                                                                                                                       |

**Riscos a observar:**

- O banco remoto `navestory` (que será produção) contém dados de teste misturados com dados reais de desenvolvimento. Um TRUNCATE controlado das tabelas de dados de usuário (`expenses`, `maintenances`, `fines`, `vehicle_recurring_costs`, `vehicles`, `profiles`, `audit_logs`) é **pré-requisito obrigatório antes de abrir o acesso a usuários reais**. Não existe staging separado ainda (pendência conhecida registrada em `important/PENDENCIAS-E-PROCESSOS.md`).
- A remoção da estratégia passport-jwt em `auth.module.ts` torna o módulo incompatível com qualquer `@UseGuards(AuthGuard('jwt'))` remanescente — confirmar via `grep` que nenhum controller usa esse guard (todos devem usar `SupabaseAuthGuard`).

---

### IMPACTO-040 — Análise Pré-Implementação: Dashboard v2 (SPEC-20260721-002) (2026-07-21)

| Campo           | Valor                                                               |
| --------------- | ------------------------------------------------------------------- |
| **Spec**        | SPEC-20260721-002 (draft)                                           |
| **Status**      | Avaliação pré-implementação — nenhum código desta spec existe ainda |
| **Risco geral** | Alto (RF-01 e RF-07 têm dependências não documentadas na spec)      |

Análise realizada pelo agente `impact-analyzer` em 2026-07-21, antes da implementação dos 9
RFs do Dashboard v2. RF-08 e RF-09 excluídos da análise profunda — ambos bloqueados por
confirmação de backend/banco (ver spec).

| #   | Mudança                                                                                                                                                                                                                                  | Módulos afetados                                                                                                                                                                                                                                                                                                                             | Risco | Mitigação                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **RF-04** — Novos tokens CSS em `globals.css` (`--surface`, `--surface-elevated`, `--on-surface`, `--on-surface-muted`, `--on-surface-subtle`, `--chart-1..5`, `--chart-grid`, `--finance-outgoing`) + classes `.glass-card` e `.kicker` | `apps/web/src/app/globals.css` (arquivo global de todo o app); `apps/web/tailwind.config.ts` (se tokens de superfície precisarem de classes Tailwind)                                                                                                                                                                                        | Médio | Mudança aditiva — verificar que nenhum token novo colide com token existente; garantir par light/dark para cada token (RNF-03); atualizar `tailwind.config.ts` para mapeamento das variáveis CSS aos tokens Tailwind se os componentes consumidores usarem classes (`bg-surface`, etc.)                                                                                                                                      |
| 2   | **RF-03** — Substituição de cores hardcoded (`bg-red-50`, `text-red-800`, `bg-amber-500`, `bg-green-500` etc.) por tokens semânticos em `FleetAlertBar.tsx` e `VehicleHealthCard.tsx`                                                    | `apps/web/src/components/dashboard/FleetAlertBar.tsx`, `apps/web/src/components/dashboard/VehicleHealthCard.tsx`, `apps/web/src/components/dashboard/VehicleHealthCard.spec.tsx`                                                                                                                                                             | Médio | 3 testes de `VehicleHealthCard.spec.tsx` verificam as classes literais que serão removidas (`bg-green-500`/`bg-amber-500`/`bg-red-500`) — devem ser atualizados para as novas classes de token junto do PR                                                                                                                                                                                                                   |
| 3   | **RF-02** — Novo componente `VehicleHealthScore` (SVG circular progress ring) em `packages/ui`; substituição do "dot" em `VehicleHealthCard.tsx`                                                                                         | `packages/ui/src/components/vehicle-health-score.tsx` (novo), `packages/ui/src/index.ts`, `apps/web/src/components/dashboard/VehicleHealthCard.tsx`, `apps/web/src/components/dashboard/VehicleHealthCard.spec.tsx`                                                                                                                          | Baixo | Mudança aditiva em `packages/ui` — nenhum dos 16 consumidores atuais de `@navestory/ui` quebra; novo teste `vehicle-health-score.test.tsx` obrigatório; prop `size` recomendada para suportar cards estreitos pós-RF-06                                                                                                                                                                                                      |
| 4   | **RF-06** — Mudança de grid de veículos de 3 colunas para 4 colunas (mobile: 1→2, sm: 2→3, lg: 3→4)                                                                                                                                      | `apps/web/src/app/(app)/dashboard/page.tsx`                                                                                                                                                                                                                                                                                                  | Médio | Cards em viewport 360px ficarão com ≈142px de largura — validação visual obrigatória antes do merge; depende de RF-02 (VehicleHealthScore com prop de tamanho flexível)                                                                                                                                                                                                                                                      |
| 5   | **RF-07** — Substituição do H1 "Dashboard" por saudação personalizada com nome do usuário, período do dia e data                                                                                                                         | `apps/web/src/app/(app)/dashboard/page.tsx`                                                                                                                                                                                                                                                                                                  | Alto  | **Gap identificado:** o nome do usuário NÃO está disponível client-side sem API call — o projeto usa cookie httpOnly, sem `createBrowserClient` nem hook de sessão no frontend. Resolver via React Query cacheando `GET /profile` (ou equivalente) antes de implementar; a premissa da spec ("sem novo fetch") precisa ser revisada ou esclarecida                                                                           |
| 6   | **RF-01** — Migração de `FleetKpis`/`KpiTile` (local) para `KpiCard` de `packages/ui`, com sparkline de 6 pontos e delta de tendência                                                                                                    | `apps/web/src/components/dashboard/FleetKpis.tsx` (a ser deletado), `apps/web/src/app/(app)/dashboard/page.tsx`, `apps/api/src/modules/dashboard/dashboard.service.ts`, `apps/api/src/modules/dashboard/dashboard.controller.ts`, `packages/validators/src/dashboard.schemas.ts`, `apps/api/src/modules/dashboard/dashboard.service.spec.ts` | Alto  | **Gap identificado 1:** `GET /dashboard/fleet-kpis` não retorna dados históricos para sparkline nem delta percentual para trend — extensão do endpoint de backend é pré-requisito obrigatório. **Gap identificado 2:** `KpiCardProps` não tem `onClick` — adicionar como prop opcional (aditivo, sem breaking change) ou envolver em Link no nível do dashboard. Confirmar estratégia de navegação antes de implementar |
| 7   | **RF-05** — Reposicionamento de `ExportControls` para o final da página + estados de loading/erro/disabled                                                                                                                               | `apps/web/src/app/(app)/dashboard/page.tsx`                                                                                                                                                                                                                                                                                                  | Baixo | Troca de `<a download>` por `fetch + Blob` para loading state real; verificar disponibilidade do plano do usuário client-side para o estado "desabilitado para plano Grátis" (R-BIZ-12)                                                                                                                                                                                                                                      |

**Ordem de implementação recomendada (confirmada):** RF-04 → RF-03 (pode ser fundido com RF-02 numa PR) → RF-02 → RF-06 → RF-07 (após decisão sobre fonte do nome) → RF-01 (após extensão do backend) → RF-05.

**RF-08 e RF-09:** bloqueados — não iniciar sem confirmação de backend/banco (ver spec RF-08/RF-09). RF-09 requer verificação da RPC `get_upcoming_costs` via `SELECT * FROM pg_proc WHERE proname = 'get_upcoming_costs'` no Supabase antes de qualquer implementação.

**Riscos a observar na implementação:**

- RF-07 e RF-05 (plano do usuário) podem exigir a mesma fonte de dados de perfil — avaliar se uma query React Query compartilhada pode atender os dois ao invés de duas chamadas separadas.
- Ao deletar `FleetKpis.tsx`, confirmar que nenhuma outra rota o importa além de `dashboard/page.tsx` (busca por `FleetKpis` no monorepo antes do delete).
- A nota histórica em `FleetKpis.tsx` referencia IMPACTO-033 — ao concluir RF-01, sinalizar em IMPACTO-033 que a migração foi executada e o arquivo removido.

### IMPACTO-041 — Execução: Shell Mobile-First e Migração Tailwind v3 → v4 (SPEC-20260722-003) (2026-07-22)

| Campo           | Valor                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Spec**        | SPEC-20260722-003 (approved)                                                                                     |
| **Status**      | Implementado — código, testes unitários e build validados; E2E e auditoria axe-core ficam para SPEC-20260716-003 |
| **Risco geral** | Médio (migração de engine CSS é global, mas sem `@theme`/reescrita de tokens)                                    |

| #   | Mudança                                                                                                                                                                                       | Módulos afetados                                                                                | Risco | Mitigação                                                                                                                                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Bloco A** — `tailwindcss` v3→v4, `@tailwindcss/postcss` novo, `autoprefixer` removido, `postcss.config.js` e `globals.css` (`@import "tailwindcss"` + `@config "../../tailwind.config.ts"`) | `apps/web/package.json`, `apps/web/postcss.config.js`, `apps/web/src/app/globals.css`           | Médio | `tailwind.config.ts` mantido sem alteração (estratégia `@config` compat layer); `pnpm build` e `pnpm lint` validados sem erros após a migração                                                                                                                                                             |
| 2   | **RF-06 a RF-09** — Sidebar vira drawer/overlay em `< 768px`, com trap focus nativo, fechamento por Esc/backdrop/navegação                                                               | `apps/web/src/components/layout/sidebar.tsx`, `apps/web/src/components/layout/sidebar.spec.tsx` | Médio | z-index ajustado para a escala local (`z-[250]`/`z-[240]`, não `z-[4000]`/`z-[3999]` da spec) — ver nota de desvio em `matrices/rastreabilidade.md`; label/truncamento de texto do menu desacoplado do "collapsed" de desktop via `useMediaQuery` (evita drawer mobile herdar estado colapsado do desktop) |
| 3   | **RF-10, RF-11, RF-14** — Hamburger no header (SVG inline, sem nova dependência de ícones), chip/palette ocultos em `< 768px`                                                                 | `apps/web/src/components/layout/header.tsx`, `apps/web/src/components/layout/header.spec.tsx`   | Baixo | Elementos ocultos via `hidden md:flex` (permanecem no DOM), sem quebrar `header.spec.tsx` pré-existente que buscava o chip por texto                                                                                                                                                                       |
| 4   | **RF-12** — `pl-16`/`pl-64` fixo → `md:pl-16`/`md:pl-64` no layout do app shell                                                                                                               | `apps/web/src/app/(app)/layout.tsx`                                                             | Baixo | Mudança puramente responsiva; sem padding em mobile já que a sidebar deixa de ocupar espaço fixo                                                                                                                                                                                                           |

**Riscos a observar:**

- RNF-01 (sem regressão visual em desktop ≥ 768px) validado apenas por leitura de código e testes unitários — revisão visual manual/screenshot ainda pendente antes do merge.
- RF-09, RF-12, RF-13 têm cobertura de código mas teste automatizado (E2E/axe-core) fica para `SPEC-20260716-003`, conforme já previsto no "Fora de Escopo" da spec.

---

### IMPACTO-042 — Adoção da Direção Prata como Identidade de Marca (SPEC-20260729-001, ADR-009) (2026-07-29)

| Campo           | Valor                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Spec**        | SPEC-20260729-001 (approved)                                                                                                       |
| **Status**      | Implementado — tokens migrados, suítes `vitest` completas de `packages/ui` e `apps/web` passando sem alteração de asserção         |
| **Risco geral** | Médio (paleta de marca é consumida globalmente por `packages/ui`, mas mudança é só de valor de token, sem alteração de componente) |

| #   | Mudança                                                                                                                                                                                                                     | Módulos afetados                                                   | Risco  | Mitigação                                                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Paleta de marca ("Steel & Sapphire") substituída pela direção Prata: `background`/`foreground`/`card`/`border`/`muted`/`primary`/`secondary`/`gold`/`danger` (+`-foreground`/`-pastel`) remapeados para OKLCH, light e dark | `packages/ui/src/tokens/colors.ts`, `apps/web/src/app/globals.css` | Médio  | Valores convertidos diretamente do hex já validado no showcase (`contrastExpectations`); suíte `vitest` completa de ambos os pacotes (141 + 329 testes, incl. `jest-axe`) rodada após a mudança, sem regressão |
| 2   | Canvas quente do light mode (`SPEC-20260722-002`) revertido para canvas frio (azul-prata)                                                                                                                                   | `apps/web/src/app/globals.css` (`:root`)                           | Baixo  | Chroma trocado (H=80→248), luminosidade em faixa equivalente; `SPEC-20260722-002` marcada `deprecated`/`superseded_by`                                                                                         |
| 3   | `mutedForeground` (light) sobe de L=42% para L=50.4% em OKLCH — acima do teto documentado em `SPEC-20260721-001` RF-02                                                                                                      | `packages/ui/src/tokens/colors.ts`                                 | Baixo  | Requisito real (`C-DS-01`) é razão de contraste ≥4.5:1, não o valor de L em si — nova razão calculada em ~5.2:1 (light) / ~6.8:1 (dark), acima do mínimo; `jest-axe` sem violação                              |
| 4   | `R-DS-05` revisada v1→v2 (60-30-10); `R-DS-06` criada (terracota único tom de `danger`)                                                                                                                                     | `specs/RULES.md`                                                   | Baixo  | Regra de auditoria visual/revisão manual, não lint automatizado — sem risco de regressão de código                                                                                                             |
| 5   | `secondary`/`secondaryForeground` recebem valor derivado (mesma família de `primary`), sem parte literal da paleta Prata                                                                                                    | `packages/ui/src/tokens/colors.ts`                                 | Nenhum | Confirmado por grep: nenhum componente de `packages/ui` consome `secondary` hoje — zero superfície de regressão visual                                                                                         |

**Riscos a observar:**

- `primary` em dark mode fica com chroma bem mais baixa (0.038 vs. 0.22 anterior) — fiel à paleta Prata validada (calibrada para composição de gradiente), mas pode parecer menos "vibrante" como cor de ação isolada (botão/link) em uso real; observar em revisão visual e ajustar em spec futura se necessário. **Resolvido em IMPACTO-043** (chroma reforçada para 0.11, decisão explícita do usuário).
- `--surface`/`--on-surface*`/`--chart-*`/`--finance-outgoing` (tokens de `SPEC-20260721-002`, dashboard v2) não foram tocados — ficam temporariamente fora de alinhamento com a nova paleta até spec dedicada do dashboard os revisar. **Resolvido em IMPACTO-043**.
- Nenhuma varredura de cor hardcoded fora do sistema de tokens foi feita nesta rodada — fora de escopo desta spec (ver "Fora de Escopo"). **Resolvido em IMPACTO-043**.

---

### IMPACTO-043 — Prata Fase 2: Paleta Categórica, Escala de Urgência e Varredura de Cor Hardcoded (SPEC-20260729-002, ADR-010) (2026-07-29)

| Campo           | Valor                                                                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spec**        | SPEC-20260729-002 (approved)                                                                                                                                                 |
| **Status**      | Implementado — tokens, migração de componentes, governança e verificação (`tsc`/`vitest`/`pnpm build`) concluídos na mesma sessão                                            |
| **Risco geral** | Baixo (migração majoritariamente mecânica de classe Tailwind, sem mudança de lógica; dois tokens novos com racional de acessibilidade fundamentado por agente especializado) |

| #   | Mudança                                                                                                                          | Módulos afetados                                                                                                                                                                                                                                                                                           | Risco  | Mitigação                                                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `--surface*`/`--on-surface*` realinhados à família Prata; `--primary` dark ganha chroma reforçada (0.038→0.11)                   | `apps/web/src/app/globals.css`, `packages/ui/src/tokens/colors.ts`                                                                                                                                                                                                                                         | Baixo  | Decisão explícita do usuário (chroma); `UpcomingCostsWidget` (único consumidor de `.glass-card`/`.kicker`) sem regressão de teste                                                              |
| 2   | `--categorical-1..5` substitui `--chart-1..5`; util compartilhado `chart-colors.ts`; migração de 6 arquivos de gráfico/indicador | `FleetCharts.tsx`, `analytics/page.tsx`, `tco-breakdown-chart.tsx`, `fuel-trend-chart.tsx`, `vehicle-context-chip.tsx`, `sidebar.tsx`                                                                                                                                                                      | Médio  | Hues fundamentados em Okabe-Ito/ColorBrewer pelo agente `design-system` (distinguíveis sob deuteranopia/protanopia); `grep` confirmou zero consumidor órfão de `--chart-1..5` antes da remoção |
| 3   | Escada de urgência colapsada de 5 para 4 níveis; novo par `--urgency-hot`/`-pastel`; `--finance-outgoing` realinhado             | `apps/web/src/app/(app)/expenses/page.tsx`, `globals.css`                                                                                                                                                                                                                                                  | Baixo  | Fundamentado em ISO 11064-4 pelo agente `design-system`; label numérico preserva a granularidade que a cor deixou de carregar sozinha                                                          |
| 4   | Badges de status semântico (atividades/maintenance/fines/VehicleSpotlight) migrados 1:1; helper compartilhado para fines         | `atividades/page.tsx`, `maintenance/page.tsx`, `fines/page.tsx`, `fines/[id]/page.tsx`, `apps/web/src/lib/fines/status-badge.ts`, `VehicleSpotlight.tsx`                                                                                                                                                   | Baixo  | Mapeamento direto (mesma semântica, só troca de classe); nenhum teste com asserção de cor afetada                                                                                              |
| 5   | Chrome estrutural e PWA migrados para tokens; `offline/page.tsx` passou a usar `Button` de `@navestory/ui`                       | `vehicle-context-dialog.tsx`, `vehicle-context-sheet.tsx`, `vehicle-switcher-content.tsx`, `install-prompt-banner.tsx`, `ios-install-banner.tsx`, `connectivity-indicator.tsx`, `offline/page.tsx`, formulários "new" (hints de contexto), `register`/`recover-password`, `page.tsx`, `password-input.tsx` | Baixo  | Migração mecânica; `grep` confirmou nenhuma asserção de teste hardcoded antes da edição                                                                                                        |
| 6   | `manifest.ts`/`layout.tsx` recalculados para hex Prata; comentário de exceção do `gold` corrigido (2 protótipos, não 1)          | `manifest.ts`, `layout.tsx`, `packages/ui/src/tokens/colors.ts`                                                                                                                                                                                                                                            | Nenhum | Hex-fonte já documentado em `SPEC-20260729-001`, sem reconversão                                                                                                                               |

**Riscos a observar:**

- `sidebar.tsx` (dot passivo) perde a distinção visual entre modo `single` e `multi` (ambos `categorical-4`) — aceito porque o dot é indicador passivo secundário; o chip do header continua diferenciando via borda tracejada. Ver `ADR-010`, "Dificulta".
- Nenhuma revisão visual manual (screenshot) foi feita nesta rodada — validação ficou restrita a `tsc`/`vitest`/`pnpm build` e inspeção de código; recomenda-se conferência visual antes de considerar a paleta categórica definitiva.

---

### IMPACTO-044 — Fecho de Formulários: Input/Textarea/Checkbox/Switch e Migração de Consumidores (SPEC-20260729-003) (2026-07-30)

| Campo           | Valor                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| **Spec**        | SPEC-20260729-003 (approved)                                                                                 |
| **Status**      | Implementado — componentes novos em `packages/ui`, migração de consumidores restantes e R-DS-09 registrada   |
| **Risco geral** | Baixo (extensão aditiva do design system + migração mecânica de campos nativos para componentes já testados) |

| #   | Mudança                                                                                                                      | Módulos afetados                                                          | Risco  | Mitigação                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | Componentes `Input`/`Textarea`/`Checkbox`/`Switch` adicionados a `packages/ui` com testes próprios                           | `packages/ui/src/components/*.tsx` + `*.test.tsx`                         | Baixo  | Componentes novos, sem consumidor prévio quebrado; testes unitários incluídos no mesmo commit                           |
| 2   | Migração de campos nativos (`<input>`/`<textarea>`/checkbox HTML) para os componentes de `@navestory/ui` nas telas restantes | Telas de formulário listadas em `PLANO-MIGRACAO-CONSUMIDORES.md` Rodada 5 | Médio  | Migração mecânica 1:1 de markup, sem mudança de validação/lógica; regra R-DS-09 registrada para travar regressão futura |
| 3   | Nova regra R-DS-09 (uso obrigatório dos componentes de formulário) registrada em `RULES.md`                                  | `specs/RULES.md`                                                          | Nenhum | Exceções documentadas explicitamente na própria regra (`dashboard/concept/*`, controles de forma customizada)           |

**Riscos a observar:**

- Auditoria de teste (`specs/TEST_DECISIONS.md`) para a decisão sobre esta spec segue pendente de aprovação do Douglas.

---

### IMPACTO-045 — Padronização do Showcase Prata: Badge/Skeleton/Container/Tooltip (SPEC-20260730-001) (2026-07-30)

| Campo           | Valor                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------- |
| **Spec**        | SPEC-20260730-001 (approved)                                                                 |
| **Status**      | Implementado — componentes novos em `packages/ui`, showcase padronizado e R-DS-10 registrada |
| **Risco geral** | Baixo (extensão aditiva do design system + padronização de markup ad hoc já existente)       |

| #   | Mudança                                                                                                                                                   | Módulos afetados                                                                            | Risco  | Mitigação                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Componentes `Badge`/`Skeleton`/`Container`/`Tooltip` adicionados a `packages/ui` com testes próprios                                                      | `packages/ui/src/components/*.tsx` + `*.test.tsx`                                           | Baixo  | Componentes novos, testados no mesmo commit (inclusive `jest-axe` quando aplicável)                                                                                         |
| 2   | Migração do showcase (`design-system/`) e telas consumidoras de markup ad hoc (`animate-pulse`, pills manuais, `title=` nativo) para os componentes reais | `apps/web/src/app/(app)/design-system/`, telas com badges/skeletons/tooltips pré-existentes | Médio  | `PLANO-MIGRACAO-SHOWCASE-INFRA.md` documenta o checklist rodada a rodada; exceção documentada para indicadores de urgência que tingem linha/card inteiro (não pill isolado) |
| 3   | Nova regra R-DS-10 registrada em `RULES.md`                                                                                                               | `specs/RULES.md`                                                                            | Nenhum | Exceção de `UpcomingCostsWidget`/`FleetAlertBar`/urgência de `expenses/page.tsx` documentada explicitamente na regra                                                        |

**Riscos a observar:**

- Auditoria de teste (`specs/TEST_DECISIONS.md`) para a decisão sobre esta spec segue pendente de aprovação do Douglas.

---

### IMPACTO-046 — Migração de Emoji para Ícones Lucide em KPI Catalog e Feed de Atividades (2026-07-31)

| Campo           | Valor                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------ |
| **Spec**        | A criar — `spec-writer` a acionar após aprovação desta análise                             |
| **Status**      | Avaliação pré-implementação                                                                |
| **Risco geral** | Baixo (mudança puramente visual; sem lógica de negócio, API ou modelo de dados envolvidos) |

| #   | Mudança                                                                                                                                        | Módulos afetados                                         | Risco | Mitigação                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------- |
| 1   | `kpi-catalog.ts`: campo `icon: string` → `icon: LucideIcon`; substituição dos 8 valores emoji por referências de componente Lucide             | `apps/web/src/components/dashboard/kpi-catalog.ts`       | Baixo | Import type-only de `LucideIcon`; sem impacto em runtime; TypeScript aponta todos os locais a atualizar |
| 2   | `DashboardKpiGrid.tsx`: render de `meta.icon` de texto interpolado para instância de componente (`<meta.Icon size={16} />`)                    | `apps/web/src/components/dashboard/DashboardKpiGrid.tsx` | Baixo | `KpiCard.icon` já aceita `ReactNode` — sem mudança no contrato do componente de UI                      |
| 3   | `KpiPicker.tsx`: mesma atualização de render do campo `icon` na lista de checkboxes                                                            | `apps/web/src/components/dashboard/KpiPicker.tsx`        | Baixo | Render local em `<span aria-hidden>`; apenas troca conteúdo, não estrutura                              |
| 4   | `atividades/page.tsx`: `DOMAIN_LABELS.icon: string` → `LucideIcon`; `domainInfo()` retorno tipado; render de `domain.icon` no `<td>` da tabela | `apps/web/src/app/(app)/atividades/page.tsx`             | Baixo | Constante local ao arquivo; zero consumidores externos; nenhum teste verifica o emoji do domínio        |
| 5   | Decisão de mapeamento emoji → Lucide para 14 casos (8 KPIs + 6 domínios de atividades + 1 fallback)                                            | Design (decisão)                                         | Baixo | Mapeamento sugerido nas recomendações do relatório de impacto                                           |

**Riscos a observar:**

- `DashboardKpiGrid.tsx` linha 120 tem `<span aria-hidden>⚠</span>` hardcoded no estado "unavailable" — emoji fora do escopo desta mudança, mas inconsistência adjacente a observar.
- `atividades/page.tsx` também usa `<EmptyState icon="🛡️" ...>` — `EmptyState` aceita `ReactNode`; fora do escopo solicitado, mas vale migrar na mesma rodada para não deixar o arquivo parcialmente migrado.
- Nenhum teste existente (`dashboard/page.spec.tsx` ou `atividades/page.spec.tsx`) faz asserção de texto de emoji — confirmado por grep. Risco de quebra de teste = zero.

---

### IMPACTO-047 — RLS bloqueia soft-delete em 5 tabelas por falta de `WITH CHECK` explícito (2026-07-31)

| Campo           | Valor                                                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Spec**        | N/A — correção de bug de infraestrutura de banco, não feature nova                                                                                                                               |
| **Status**      | **Corrigido e confirmado por teste real em 2026-07-31** — ver atualização ao final do bloco (causa-raiz tinha uma segunda parte, além do `WITH CHECK` do `UPDATE`)                               |
| **Risco geral** | **Crítico** — soft-delete de despesas, veículos, manutenções, multas e custos recorrentes falha com 500 via qualquer cliente autenticado normal (anon key + JWT do usuário), não apenas em teste |

**Como foi encontrado:** durante investigação de falhas de E2E (`apps/web/e2e`), a limpeza (`afterEach`) de despesas de teste criadas por `expense-warnings.spec.ts` falhava silenciosamente (`.catch(() => undefined)`). Reproduzido manualmente com o token real do usuário de teste via `@supabase/supabase-js` (anon key + `Authorization: Bearer <jwt>`), fora do contexto de teste: `UPDATE expenses SET deleted_at = now() WHERE id = ...` retorna erro Postgres `42501` ("new row violates row-level security policy for table expenses").

**Causa raiz:** `supabase/migrations/20260712172047_rls_policies.sql` define `create policy X_update_own on public.X for update using (auth.uid() = user_id and deleted_at is null ...)` sem `with check` explícito. Em Postgres, uma policy de `UPDATE` sem `WITH CHECK` reaplica o mesmo predicado do `USING` à linha **resultante**. Como a operação de soft-delete faz exatamente `deleted_at = now()`, a linha pós-update nunca satisfaz `deleted_at is null` — a policy bloqueia a própria operação que deveria permitir.

| #   | Tabela afetada            | Endpoint(s) que quebram                   | Confirmado                                                                                                                                                                                         |
| --- | ------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `expenses`                | `DELETE /expenses/:id`                    | Sim — reproduzido diretamente                                                                                                                                                                      |
| 2   | `vehicles`                | `DELETE /vehicles/:id`                    | Mesma estrutura de policy — não testado ao vivo, mas idêntico padrão de código (`clientForUser(...).update({deleted_at})`)                                                                         |
| 3   | `maintenances`            | `DELETE /maintenance/:id`                 | Idem                                                                                                                                                                                               |
| 4   | `fines`                   | `DELETE /fines/:id`                       | Idem                                                                                                                                                                                               |
| 5   | `vehicle_recurring_costs` | `DELETE /recurring-costs/:id`             | Idem                                                                                                                                                                                               |
| —   | `profiles`                | Soft-delete de conta (`DELETE /users/me`) | A verificar — usa fluxo próprio (`SoftDeletedUserGuard`); pode usar `AdminSupabaseService` (service role, que bypassa RLS) em vez do client do usuário — checar antes de assumir que também quebra |

**Correção:** `WITH CHECK` explícito mantendo apenas a verificação de posse (`auth.uid() = user_id`/`id`), sem repetir `deleted_at is null`/`not is_readonly` — essas continuam válidas no `USING` (decidem quais linhas podem ser alvo do update), só não devem valer para o estado resultante.

**Resolvido (parcial):** migration `20260731192440_fix_soft_delete_rls_with_check.sql` aplicada diretamente ao banco remoto via MCP do Supabase em 2026-07-31, contornando a dessincronia do CLI local. Confirmado via `pg_policies` que o `WITH CHECK` ficou correto — mas o soft-delete **continuava falhando com 42501** ao testar de fato.

**Atualização 2026-07-31 — causa-raiz completa:** o `WITH CHECK` do `UPDATE` era necessário mas não suficiente. Em Postgres, para `UPDATE`, o `USING` da policy de **SELECT** da mesma tabela é combinado (AND) com o `WITH CHECK` da policy de `UPDATE` ao validar a linha resultante — e `expenses_select_own` (e as 5 policies equivalentes) ainda exigiam `deleted_at is null`, que a linha pós-soft-delete nunca satisfaz. Isolado via teste em SQL puro (transação com rollback, simulando o JWT real do usuário de teste): `UPDATE expenses SET description = ...` funcionava normalmente, `UPDATE expenses SET deleted_at = now()` falhava com o mesmo erro — provando que o bloqueio vinha da policy de SELECT, não da de UPDATE.

**Correção final:** removido `deleted_at is null` do `USING` das 6 policies de SELECT (`profiles_select_own`, `vehicles_select_own`, `expenses_select_own`, `maintenances_select_own`, `fines_select_own`, `recurring_costs_select_own`), via `migration 20260731204319_fix_soft_delete_select_policy_implicit_check.sql`. Seguro porque a aplicação já filtra `deleted_at is null` explicitamente em toda query de leitura (mais de 50 ocorrências nos services de `apps/api`) — a policy de SELECT não precisava repetir esse filtro, que é responsabilidade de query, não de RLS.

**Confirmado:** teste real de soft-delete (transação com rollback, sem alterar dados reais) — `UPDATE ... RETURNING` passou a retornar a linha com `deleted_at` preenchido, sem erro. Dessincronia de migrations locais x remoto também resolvida (arquivos renomeados para bater com os timestamps reais aplicados; arquivo faltante recriado a partir do SQL já em produção) — `supabase migration list` confirma sincronia total. Detalhe completo em `specs/RULES.md` (regra S13 v2) e `important/PENDENCIAS-E-PROCESSOS.md`.

---

### IMPACTO-048 — Painel de Administração: gestão de roles + primeira interface web `/admin` (SPEC-20260731-008) (2026-07-31)

| Campo           | Valor                                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spec**        | [SPEC-20260731-008](../specs/admin/SPEC-20260731-008-painel-admin-gestao-roles-ui.md) RF-01 a RF-16                                                                                   |
| **Status**      | Decidido e implementado — backend e frontend completos, spec aprovada no mesmo ciclo                                                                                                  |
| **Risco geral** | Alto (justificativa: escalonamento de privilégio é uma superfície sensível por natureza — um bug aqui permite um usuário comum virar admin ou trava o sistema sem nenhum admin ativo) |

**Descrição:** Endpoint novo `PATCH /admin/users/:id/role` (promoção/rebaixamento de
`app_metadata.role`, gravado exclusivamente via `AdminSupabaseService`/service role key — S3,
S12) e a primeira UI web em `/admin` (tabela de usuários, audit logs com filtros, exclusão de
conta, gestão de role), consumindo os endpoints do `AdminModule` já aprovados em
SPEC-20260521-004.

**Mitigação do risco de escalonamento:** S14 exige bloqueio de auto-rebaixamento (422 antes de
qualquer chamada ao Supabase, sem audit log) e auditoria obrigatória (`ADMIN_ROLE_GRANTED`/
`ADMIN_ROLE_REVOKED` com `role_before`/`role_after`) em toda alteração bem-sucedida — nenhuma
mudança de role ocorre sem rastro. A superfície de ataque real (gravação em `app_metadata`)
já é protegida desde SPEC-20260731-006 (RolesGuard lê `app_metadata`, nunca `user_metadata`);
esta spec só adiciona a via de escrita administrativa sobre a mesma garantia.

**Impacto:** `GET /admin/users` (já aprovado) foi estendido para juntar `profiles`
(`name`/`deleted_at`) — necessário para a UI exibir nome e status da conta (RF-10), campos que
não existem no objeto de usuário bruto do GoTrue. É um enriquecimento do mesmo endpoint, não uma
rota nova; sem mudança de contrato para os dois campos já existentes (`id`, agora também
`email`/`role`/`created_at` normalizados no mesmo objeto). Frontend introduz duas rotas novas
fora do grupo `(app)` (`/admin`, `/403`) e um novo helper `decodeJwtRole` (heurística de UX,
mesma família de `decodeJwtExp`) — sem alterar nenhuma rota ou componente existente de usuário
comum (RNF-04).

**Desvio da spec registrado no changelog dela:** RF-13/Dependências citam `AlertDialog` de
`@navestory/ui`, que não existe no pacote — o componente real usado para confirmação destrutiva no
repositório é `Dialog` (mesmo padrão de `DeleteAccountDialog`). Implementado com `Dialog`.

---

## Legenda de Risco

| Nível       | Critério                                                                  |
| ----------- | ------------------------------------------------------------------------- |
| **Crítico** | Pode causar falha de segurança, perda de dados ou indisponibilidade total |
| **Alto**    | Afeta múltiplos módulos, fluxo de autenticação ou dados de usuários       |
| **Médio**   | Afeta um módulo específico ou requer configuração de infraestrutura       |
| **Baixo**   | Mudança isolada, reversível, sem efeito colateral esperado                |
