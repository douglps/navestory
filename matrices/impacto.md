# Matriz de Impacto — Nave SaaS

> **AVISO DE CORRECAO — 2026-07-12 (rev. 21); atualizado 2026-07-14 (rev. 23 — IMPACTO-030 adicionado)**
> Esta matriz foi reescrita em 2026-07-12 para refletir o estado real do projeto.
> Versões anteriores (rev. 1 a rev. 20) misturavam análises genuínas de planejamento com
> entradas que afirmavam que mudanças haviam sido "implementadas" (com commits, datas de
> execução, status "Implementado") quando na verdade o repositório Nave é **greenfield** —
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

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260521-001 |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Crítico |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | `NEXT_PUBLIC_SUPABASE_URL` → `SUPABASE_URL` em auth.module | `auth` | Crítico | Atualizar `.env` e `.env.example` simultaneamente |
| 2 | Corrigir campos do `audit_logs` (`event`→`action`, `metadata`→`changes`) | `auth` | Crítico | Falhas silenciosas → agora capturadas e logadas |
| 3 | `HttpExceptionFilter` global — ocultar stack trace em produção | `common/filters`, `main.ts` | Alto | Testar com `NODE_ENV=production` antes de deploy |
| 4 | Rate limit diferenciado em auth (5/15min register, 10/15min login) | `auth.controller` | Médio | Ajustar testes E2E que fazem múltiplas chamadas |
| 5 | Rollback scripts para as migrations | `supabase/migrations/rollback` | Médio | Testar down scripts em banco local antes de merge |
| 6 | `SUPABASE_SERVICE_ROLE_KEY` obrigatório no Joi | `config/env.validation` | Médio | Todas as instâncias (dev, staging, prod) precisam da variável |
| 7 | Substituir `console.log` por `Logger` em main.ts | `main.ts` | Baixo | Nenhum |

**Riscos a observar na implementação futura:**
- Startup falhará se `SUPABASE_SERVICE_ROLE_KEY` ausente no ambiente — intencional, detecta misconfiguration cedo
- `HttpExceptionFilter` alterará o shape de todos os responses de erro — frontend deve estar preparado para `{ statusCode, message, timestamp }`

---

### IMPACTO-002 — Alertas de Manutenção por Email (SPEC-20260521-002)

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260521-002 |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Médio |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | Nova Edge Function `send-maintenance-alerts` | `supabase/functions/` | Médio | Testar com Supabase CLI localmente antes de deploy |
| 2 | Nova migration `pg_cron_maintenance_alerts` | `supabase/migrations/` | Médio | Rollback script incluído; pg_cron deve estar habilitado no projeto Supabase |
| 3 | Nova variável de ambiente `RESEND_API_KEY` | Infraestrutura | Baixo | Adicionar ao `.env.example` e documentar no README |
| 4 | Leitura de `auth.users` via service role para obter email | Segurança | Alto | Nunca logar o email do usuário; usar apenas para envio |
| 5 | `alert_sent = true` após envio bem-sucedido | `maintenances` (DB) | Baixo | Idempotente por design — reexecução não reenvia |

**Dependências externas:**
- Resend (resend.com) — serviço de email transacional; falha do serviço não derruba o sistema (job retenta no próximo ciclo)
- pg_cron habilitado no projeto Supabase — verificar antes de deploy

---

### IMPACTO-003 — Export CSV do Dashboard (SPEC-20260521-003)

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260521-003 |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Baixo |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | Novo endpoint `GET /dashboard/export` | `dashboard.controller`, `dashboard.service` | Baixo | Isolado — não altera endpoints existentes |
| 2 | JOIN `expenses` + `vehicles` na query de export | `expenses`, `vehicles` (DB) | Baixo | Testar com período sem dados (deve retornar CSV com só cabeçalho) |
| 3 | Throttle dedicado no endpoint (10 req/5min) | `dashboard.controller` | Baixo | Nenhum |
| 4 | BOM UTF-8 no response | Frontend | Baixo | Testar abertura no Excel pt-BR |
| 5 | Limite de 5.000 linhas por exportação | Query | Baixo | Documentar no Swagger; considerar paginação futura |

---

### IMPACTO-004 — Admin Role e Operações LGPD (SPEC-20260521-004)

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260521-004 |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Alto |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | `AdminSupabaseService` com `SERVICE_ROLE_KEY` — bypass de RLS | `admin`, segurança | Alto | Módulo admin nunca importado em contextos de usuário; isolamento garantido por módulo NestJS |
| 2 | `DELETE /users/me` — auto-exclusão de conta | `users.controller`, `users.service` | Alto | Exige `{ confirm: true }` no body; operação irreversível após execução |
| 3 | Revogação de JWT via `auth.admin.deleteUser` | `auth`, Supabase | Alto | Testar fluxo completo: token revogado deve retornar 401 imediatamente |
| 4 | `AdminGuard` verifica role no JWT | `admin/guards` | Alto | Fallback seguro: qualquer dúvida no token → 403 |
| 5 | Trigger `soft_delete_profile()` — verificar se `CREATE TRIGGER` está na migration | DB | Médio | **Risco a observar na implementação:** inspecionar migration antes de aplicar para confirmar que o trigger existe |
| 6 | `GET /admin/users` e `GET /admin/audit-logs` expõem dados de qualquer usuário | Segurança / LGPD | Alto | Exclusivo para admins; toda operação auditada em `audit_logs` com `user_id` do admin |

**Atenção LGPD:**
- Direito ao esquecimento (Art. 18): `DELETE /users/me` deve anonimizar dados imediatamente
- Toda operação admin que acessa/altera dados de terceiros deve ser registrada em `audit_logs`
- `SERVICE_ROLE_KEY` jamais exposto em responses ou logs INFO/WARN

---

### IMPACTO-005 — OpenAPI / Swagger (SPEC-20260521-005)

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260521-005 |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Baixo |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | Instalação de `@nestjs/swagger` + `swagger-ui-express` | `apps/api/package.json` | Baixo | Dependências de desenvolvimento — sem impacto em produção |
| 2 | Plugin Swagger em `nest-cli.json` | Build | Baixo | Aumenta ligeiramente o tempo de build; testar no CI |
| 3 | `SwaggerModule.setup` em `main.ts` | `main.ts` | Baixo | Condicional por `NODE_ENV` — produção não é afetada |
| 4 | Adição de `SWAGGER_ENABLED` ao Joi | `env.validation.ts` | Baixo | Campo opcional com default `false` |
| 5 | Anotações `@ApiTags`, `@ApiOperation` nos controllers | Todos os controllers | Baixo | Puramente decorativo — sem alteração de comportamento |

**Impacto em produção:** Nenhum, desde que `SWAGGER_ENABLED` não seja definido como `true` em produção.

---

### IMPACTO-006 — Hardening TDD: specs de repositório, infraestrutura e validators

| Campo | Valor |
|-------|-------|
| **Spec** | — (cobertura de specs já existentes; sem nova spec de produto) |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Baixo |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | `BusinessException`: status padrão implicitamente 422 (UNPROCESSABLE_ENTITY); spec documenta e fixa o contrato | `common/exceptions` | Baixo | Comportamento pré-existente na spec; spec apenas o documenta formalmente |
| 2 | `LoggingInterceptor`: tipagem explícita do request no `switchToHttp()` | `common/interceptors` | Baixo | Melhora type-safety sem alterar comportamento de runtime |
| 3 | `SupabaseMaintenanceRepository.update`: incluir `alert_sent: false` quando `scheduled_date` é atualizado | `maintenance` | Médio | Comportamento crítico para alertas de email — criar spec que verifique os dois ramos (com e sem reagendamento) |
| 4 | `SupabaseMaintenanceRepository.countPending`: nova query com `count: 'exact'` e filtro em `status` | `maintenance`, `dashboard` | Baixo | Cobrir todos os cenários incluindo vehicleId opcional e count null |
| 5 | `SupabaseVehicleRepository.delete`: soft-delete em cascata (vehicles + expenses + maintenances) via `Promise.all` | `vehicles`, `expenses`, `maintenance` | Alto | Verificar que as 3 tabelas recebem `deleted_at`; falha em qualquer tabela deve propagar o erro |
| 6 | `SupabaseExpenseRepository`: novos métodos `sumSince` e `findForExport` (join com vehicles) | `expenses`, `dashboard` | Baixo | Cobrir filtros gte/lte, vehicleId opcional e cálculo de soma |
| 7 | `AuditService`: timestamp ISO injetado nos `changes` (sobrescreve qualquer timestamp externo) | `infrastructure/audit` | Baixo | Comportamento defensivo — documentar explicitamente o overwrite |
| 8 | `validators/vehicles.schema`: adição de campos `fuel_type`, `odometer`, `renavam`, `chassi`, `nickname`, `status` | `packages/validators`, `apps/web` | Médio | Campos novos com `.optional()` — sem breaking change; cobrir todos os casos de borda |
| 9 | `validators/utils/patterns`: exposição de `PLATE_REGEX`, `CPF_REGEX` e `validateCPF` (Módulo 11) | `packages/validators` | Baixo | Funções puras; cobrir CPFs válidos, inválidos e todos-iguais |

**Riscos a observar na implementação futura:**
- Soft-delete em cascata de veículos tornará a operação `DELETE /vehicles/:id` mais pesada (3 updates paralelos). Em frotas grandes, monitorar latência.
- `alert_sent: false` no reagendamento reativará alertas de email — se Resend estiver ativo, usuário receberá novo aviso após qualquer mudança de `scheduled_date`.

---

### IMPACTO-007 — Revalidação Centralizada, Audit Log Universal e Monitor do Sistema

| Campo | Valor |
|-------|-------|
| **Spec** | — (refatoração arquitetural; sem nova spec de produto) |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Médio |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | Novo helper `lib/actions/revalidate.ts`: `revalidateVehicles()`, `revalidateExpenses()`, `revalidateMaintenances()` — ponto único de revalidação de cache Next.js | `apps/web/lib/actions`, todas as Server Actions | Baixo | Elimina chamadas `revalidatePath` dispersas; adicionar nova rota global apenas em `CORE_PATHS` |
| 2 | Novo helper `lib/actions/audit.ts`: `writeAuditLog(entry)` com tipos `AuditAction` e `AuditTable` | `apps/web/lib/actions`, Server Actions de vehicles, expenses, maintenances | Médio | `writeAuditLog` nunca deve lançar exceção (try/catch silencioso) — falha de auditoria não interrompe a operação principal |
| 3 | Refatoração de Server Actions — 13 funções migradas para helpers centralizados | `apps/web/app/actions/*` | Médio | Comportamento externo deve ser idêntico; risco de regressão mitigado por testes antes do merge |
| 4 | `expense-actions.ts` e `maintenance-actions.ts`: audit log passará a ser escrito | `expenses`, `maintenances`, `audit_logs` | Baixo | Comportamento aditivo — sem risco de breaking change; logs começarão a aparecer no monitor |
| 5 | Nova página `/dashboard/monitor` — Server Component com `force-dynamic` | `apps/web/app/(dashboard)/dashboard/monitor` | Baixo | Protegida por redirect `/login` caso `user` seja null; RLS de `audit_logs` garante isolamento no DB |
| 6 | Dashboard principal atualizado: card "Monitor" adicionado nas Ações Rápidas | `apps/web/app/(dashboard)/dashboard/page.tsx` | Baixo | Mudança puramente aditiva e visual |
| 7 | `QuickVehicleRegister.tsx`: após cadastro do 1º veículo, `router.refresh()` + `router.push('/dashboard')` | `apps/web/components/vehicles/QuickVehicleRegister.tsx` | Baixo | Corrige UX de estado vazio preso após primeiro cadastro |

**Riscos a observar na implementação futura:**
- Despesas e manutenções passarão a escrever em `audit_logs` — volume da tabela crescerá proporcionalmente. Avaliar política de retenção/arquivamento.
- A página `/dashboard/monitor` com `force-dynamic` fará query sem cache — adicionar ISR ou cache manual se o acesso for intenso.

---

### IMPACTO-008 — Bug Fix: SelectValue exibindo raw value (UUID/inglês) após seleção

| Campo | Valor |
|-------|-------|
| **Spec** | — (bug fix de UI; sem nova spec) |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Baixo |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | `packages/ui/src/components/select.tsx`: prop `label` deve ser repassada ao `<SelectPrimitive.Item>` — corrige typeahead por teclado no Base UI | `packages/ui` | Baixo | Correção de comportamento omitido; sem alteração de API pública do componente |
| 2 | `maintenance-form.tsx`: campos Veículo e Status devem usar render function em `<SelectValue>` | `apps/web/components/maintenance` | Baixo | Nenhum |
| 3 | `expense-form.tsx`: campos Veículo e Categoria devem usar render function em `<SelectValue>` | `apps/web/components/expenses` | Baixo | Nenhum |
| 4 | `expense-filters.tsx`: filtros Veículo, Mês e Categoria devem usar render function | `apps/web/components/expenses` | Baixo | Nenhum |
| 5 | `vehicle-select.tsx`: filtro do dashboard deve usar render function | `apps/web/components/dashboard` | Baixo | Nenhum |

**Causa raiz (documentada para orientar a implementação):** O `Select.Value` do Base UI (`@base-ui/react`) exibe o raw `value` via `serializeValue()` quando nenhum `children` é fornecido como render function. Padrão correto: sempre que `value !== texto visível`, passar `children` como `(value) => ReactNode`.

---

### IMPACTO-009 — Migration: Campo `odometer_km` em `expenses` (SPEC-20260601-001)

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260601-001 |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Baixo |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | `ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS odometer_km INTEGER` — coluna nullable, sem default | `expenses` (DB), `ExpenseRepositoryPort`, `SupabaseExpenseRepository`, `ExpensesService` | Baixo | Coluna nullable — sem breaking change em registros existentes; `IF NOT EXISTS` torna a migration idempotente |
| 2 | Índice `idx_expenses_vehicle_odometer ON expenses (vehicle_id, date DESC, created_at DESC) WHERE odometer_km IS NOT NULL AND deleted_at IS NULL` | `expenses` (DB) | Baixo | Índice parcial — impacto mínimo em espaço em disco |
| 3 | Tipos gerados em `packages/database/src/types/database.types.ts` — campo `odometer_km` passará a constar | `packages/database` | Baixo | Regeneração via `supabase gen types typescript` — arquivos consumidores devem recompilar |
| 4 | Novo método `findMaxOdometerByVehicle(vehicleId, userId, excludeExpenseId?)` no `ExpenseRepositoryPort` | `apps/api/src/modules/expenses` | Baixo | Adição de método ao port — sem remoção de método existente |
| 5 | Lógica de comparação de odômetro em `ExpensesService.create()` e `ExpensesService.update()` | `apps/api/src/modules/expenses` | Baixo | Campos adicionais na resposta — sem breaking change; degradação graciosa em caso de falha da query de máximo |

**Riscos a observar na implementação futura:**
- Endpoint `POST /expenses` executará uma query adicional após o insert quando `odometer_km` estiver presente.
- Tipos TypeScript do pacote `database` devem ser importados novamente em todos os consumers após a regeneração.

---

### IMPACTO-010 — Migration: Tabela `user_categories` com RLS owner-only (SPEC-20260602-004)

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260602-004 |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Médio |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | Nova tabela `public.user_categories` com `id UUID PK`, `user_id UUID FK → profiles(id) ON DELETE CASCADE`, `value TEXT`, `label TEXT` | DB | Médio | FK com `ON DELETE CASCADE` garante que exclusão do perfil remove as categorias (alinhado com LGPD) |
| 2 | Constraint `UNIQUE (user_id, value)` — impede categoria duplicada por slug | DB | Baixo | Conflito retorna erro 409 na API — implementação deve tratar `PG_UNIQUE_VIOLATION` (código 23505) |
| 3 | Constraints de formato em `value` (1–50 chars, regex slug) e `label` (1–100 chars) | DB | Baixo | Validação duplicada no schema Zod — banco é camada de segurança secundária |
| 4 | RLS habilitado com política única `FOR ALL USING (auth.uid() = user_id)` — owner-only | Segurança, DB | Médio | Política `FOR ALL` cobre SELECT, INSERT, UPDATE e DELETE; sem exceção para leitura pública |
| 5 | Índice `idx_user_categories_user_id ON user_categories (user_id)` | DB | Baixo | Nenhum |
| 6 | Módulo `apps/api/src/modules/categories/` criado para servir a nova tabela | `apps/api` | Médio | Módulo novo — requer registro em `app.module.ts` |

**Riscos a observar na implementação futura:**
- A tabela `expense_categories` existente (dados de referência globais) convive com `user_categories` (dados de usuário). A camada de serviço deve combinar as duas fontes ao popular seletores de categoria.
- `AdminSupabaseService` (SERVICE_ROLE_KEY) bypassa o RLS da nova tabela — garantir que endpoints admin estejam devidamente protegidos pelo `AdminGuard`.

---

### IMPACTO-011 — Sistema Em Foco: Contexto de Veículo Global (SPEC-20260602-001)

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260602-001 |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Médio |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | `use-dashboard-store.ts`: adição de `activeVehicleData`, `activeGroupData` (com `memberIds`), novos setters; persistência `single`/`group` em localStorage, `multi`/`attribute` efêmeros | `apps/web/stores` | Médio | Campos novos não conflitam com campos existentes |
| 2 | `focus-slot.tsx`: novo componente inserido no `Sidebar` entre cabeçalho e nav — presente em todas as páginas autenticadas | `apps/web/components/layout` | Baixo | Slot lê apenas o store Zustand (síncrono); sem request de rede; CLS = 0 pelo design síncrono |
| 3 | `fleet-aside.tsx`: passa a popular `activeVehicleData` e `activeGroupData` no store e detecta staleness | `apps/web/components/layout` | Médio | Reutiliza o fetch de listagem já existente; 0 requests extras |
| 4 | `expense-form.tsx` e `maintenance-form.tsx`: herança de contexto via `useVehicleContextField`; visual âmbar; dicas por modo | `apps/web/components/expenses`, `apps/web/components/maintenance` | Médio | Herança só ocorre no mount (R-CTX-06) |
| 5 | `expenses/page.tsx` e `maintenance/page.tsx`: suporte a `vehicleIds` e `ContextFilterSync` | `apps/web/app/(dashboard)/expenses`, `apps/web/app/(dashboard)/maintenance` | Baixo | Mudança aditiva — comportamento sem contexto deve ser idêntico ao anterior |
| 6 | `sidebar.tsx`: `clearAllSelection()` chamado antes do submit de logout (RF-19) | `apps/web/components/layout` | Baixo | Garante que `activeVehicleId`/`activeGroupId` não persistam entre sessões no mesmo browser |
| 7 | `context-filter-sync.tsx`: deve ser o único componente (além de `VehicleActivator`) a fazer a ponte store↔URL | `apps/web/components/layout` | Médio | Monitorar se outros componentes forem adicionados que façam o mesmo (viola R-CTX-04) |

**Riscos a observar na implementação futura:**
- O slot "Em Foco" aparecerá em todas as páginas autenticadas dentro do layout do Sidebar. Se o layout for alterado (ex: nova página sem Sidebar), o slot some automaticamente.
- Filtro por grupo nas listagens executa uma sub-query extra em `vehicle_group_members` — para grupos grandes, avaliar paginação de memberIds.

---

### IMPACTO-012 — Preferências de Exibição do Veículo no Chip (SPEC-20260603-003)

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260603-003 |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Médio |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | Nova tabela `user_preferences` com coluna `vehicle_chip_fields text[]` e RLS owner-only | DB (Supabase) | Médio | Política `auth.uid() = user_id` cobre SELECT, INSERT, UPDATE e DELETE; FK `ON DELETE CASCADE` garante remoção ao excluir conta (LGPD) |
| 2 | `ALTER TABLE vehicles ADD COLUMN nickname text CHECK (char_length(nickname) <= 30)` | DB, `vehicles` (API + frontend) | Baixo | Coluna nullable sem default — sem breaking change |
| 3 | Novos DTOs e entidade de veículo incluem `nickname` (opcional, max 30 chars) | `apps/api/src/modules/vehicles/entities`, `dto/` | Baixo | Campo opcional com `.optional()` — sem breaking change na API |
| 4 | Novo schema Zod `chipFieldsSchema` em `packages/validators` | `packages/validators` | Baixo | Schema puro sem efeitos colaterais |
| 5 | Server Actions `getChipFields` / `updateChipFields` leem/escrevem `user_preferences` via Supabase | `apps/web/app/actions/user-preferences.ts` | Baixo | `getChipFields` deve retornar fallback `['make','model','plate']` em caso de erro de leitura |
| 6 | `use-dashboard-store.ts`: adição de `chipFields` + `setChipFields` + `nickname` em `activeVehicleData` | `apps/web/stores` | Médio | Campos novos não conflitam com o estado existente; fallback para usuários sem preferência salva |
| 7 | `VehicleContextChip`: renderização dinâmica por `chipFields`; lógica de fallback `nickname → model` | `apps/web/components/layout/vehicle-context-chip.tsx` | Médio | Fallback evita tela em branco (RF-04); max-width `260px` com `truncate` previne overflow |
| 8 | `ChipSettingsPopover`: novo componente inline no chip — interação direta no subheader | `apps/web/components/layout/chip-settings-popover.tsx` | Baixo | Popover usa Radix UI — gerenciamento de foco e Esc nativo |

**Riscos a observar na implementação futura:**
- O campo `nickname` passará a ser enviado e recebido nas chamadas `GET /vehicles` e `POST /vehicles`.
- `user_preferences` é uma segunda tabela de preferências de usuário (a primeira sendo `profiles.preferences` JSONB). Em revisão futura, avaliar unificação.

---

### IMPACTO-013 — Migration `user_preferences` e `liters`; Bugfix Enum `pending`; Edição de Perfil e Despesas

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260603-004 (user_preferences); SPEC-20260521-002 (bugfix enum); sem spec para liters e edição de perfil/despesas |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Médio |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | Migration `20260604000000_user_preferences.sql`: tabela `user_preferences` com `user_id` (PK FK), `vehicle_chip_fields JSONB`, `updated_at`; RLS owner-only | DB, `apps/web/app/actions/user-preferences.ts` | Médio | RLS ativo desde a criação; FK `ON DELETE CASCADE` garante conformidade LGPD (C1) |
| 2 | Migration `20260604000001_add_liters_to_expenses.sql`: `liters numeric(8,3) null` em `expenses` | DB, `packages/database` | Baixo | Coluna nullable sem default — sem breaking change |
| 3 | Bugfix enum de status de manutenção: `scheduled` → `pending` em `maintenance.schema.ts`, entidade, DTO, `maintenance-form.tsx`, `maintenance-status-filter.tsx` | `packages/validators`, `apps/api/src/modules/maintenance`, `apps/web/components/maintenance` | Médio | **Risco a observar:** registros existentes com `status = 'scheduled'` no Supabase devem ser migrados para `pending` via `UPDATE maintenances SET status = 'pending' WHERE status = 'scheduled'` |
| 4 | `ProfileNameSection`: novo componente de edição inline de nome com `supabase.auth.updateUser` | `apps/web/components/profile`, `apps/web/app/(dashboard)/profile/page.tsx` | Baixo | Componente isolado na página de perfil |
| 5 | `ExpenseRowActions` + `/expenses/[id]/edit` + `ExpenseForm` modo edição | `apps/web/components/expenses`, `apps/web/app/(dashboard)/expenses` | Baixo | `ExpenseForm` deve manter compatibilidade retroativa — props `expenseId` e `initialValues` são opcionais |

**Riscos a observar na implementação futura:**
- Registros existentes com `status = 'scheduled'` em `maintenances` são incompatíveis com o enum corrigido — aplicar migration de dados.
- `ProfileNameSection` chamará `supabase.auth.updateUser` diretamente do cliente — verificar se o token da sessão não expirou em sessões longas.

---

### IMPACTO-014 — Enriquecimento de Abastecimento: Pré-preenchimento, Delta de Odômetro, Autocomplete de Fornecedor

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260606-001 RF-04, RF-06, RF-07 e SPEC-20260606-002 RF-02 |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Baixo |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | `getLastFuelTypeAction(vehicleId)`: nova server action read-only; query por histórico de combustível | `apps/web/app/actions/expense-actions.ts` | Baixo | Query usa filtros indexados; sem escrita em banco; falha silenciosa não interrompe o formulário |
| 2 | `ExpenseForm`: `useEffect` de pré-preenchimento de `fuel_type` apenas em modo criação | `apps/web/components/expenses/expense-form.tsx` | Baixo | Lógica condicional isolada; sem impacto no modo edição |
| 3 | `ExpenseForm`: delta no hint de odômetro — lógica condicional no JSX | `apps/web/components/expenses/expense-form.tsx` | Baixo | Puramente visual; sem alteração de validação ou persistência |
| 4 | `ExpenseForm`: mensagem de fallback "Consumo aparece após o 2º abastecimento completo" | `apps/web/components/expenses/expense-form.tsx` | Baixo | Puramente visual |
| 5 | `getSupplierSuggestionsAction()`: nova server action read-only; busca 50 registros, deduplica em JS, retorna top 10 | `apps/web/app/actions/expense-actions.ts` | Baixo | Uma chamada por sessão do form (fetch-on-focus); sem escrita |
| 6 | `ExpenseForm`: campo `supplier` substituído por autocomplete inline com Popover | `apps/web/components/expenses/expense-form.tsx` | Baixo | Campo deve continuar aceitando texto livre (RF-04 da spec) |

**Pendente nas mesmas specs:** RF-01 e RF-02 (persistência de `fuel_type` e `full_tank` no backend), RF-03 (campo `computed` na resposta da API), RF-05 (toggle "Abastecimento parcial?"), RF-08 (preço/litro em tempo real) — requerem migration e alterações no `ExpensesService`.

---

### IMPACTO-015 — Correção de Placeholders em Dropdowns (UX)

| Campo | Valor |
|-------|-------|
| **Spec** | — (correção de UX; extensão do padrão documentado em IMPACTO-008) |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Baixo |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | `expense-form.tsx`: placeholders para campos Veículo, Categoria e Combustível via render function do `SelectValue` | `apps/web/components/expenses/expense-form.tsx` | Baixo | Puramente visual |
| 2 | `expense-template-modal.tsx`: placeholders de Veículo e Categoria com a mesma correção | `apps/web/components/expenses/expense-template-modal.tsx` | Baixo | Idem |
| 3 | `maintenance-form.tsx`: placeholder "Selecione o status" via render function | `apps/web/components/maintenance/maintenance-form.tsx` | Baixo | Idem |
| 4 | `VehicleForm.tsx` e `QuickVehicleRegister.tsx`: placeholders via prop `placeholder` simples | `apps/web/components/vehicles/` | Baixo | Idem |
| 5 | `editable-info-row.tsx`: prop `placeholder?: string` adicionada com default `'Selecione...'` | `apps/web/components/fleet/editable-info-row.tsx` | Baixo | Mudança compatível retroativamente — prop opcional com default |

**Padrão Base UI a aplicar:**
- Se `value !== texto visível`: usar render function em `SelectValue`; placeholder como caso `!value` dentro dela.
- Se `value === label` (sem render function): usar a prop `placeholder` diretamente no `SelectValue`.

---

### IMPACTO-016 — Ledger Unificado + FinesModule + RecurringCostsModule (EPIC-FIN-001)

| Campo | Valor |
|-------|-------|
| **Spec** | EPIC-FIN-001; SPEC-20260607-001 (FinesModule); SPEC-20260609-001 (RecurringCostsModule) |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Alto |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | Migration `20260608000000_unified_ledger.sql`: campos `source_type TEXT NULL`, `source_id UUID NULL`, `is_readonly BOOLEAN NOT NULL DEFAULT FALSE` em `expenses` | `expenses` (DB, API, frontend), `packages/database` | Alto | Colunas nullable sem default — sem breaking change; `DEFAULT FALSE` garante que despesas pré-existentes continuam editáveis |
| 2 | `CONSTRAINT expenses_source_coherence_check`: garante que `source_type` e `source_id` são sempre preenchidos juntos ou nulos juntos (R-LED-04) | `expenses` (DB) | Médio | Constraint DB é camada de segurança secundária; a primária é a validação do schema Zod |
| 3 | `UNIQUE INDEX uq_expenses_source ON expenses (source_type, source_id) WHERE deleted_at IS NULL`: idempotência do ledger (R-HUB-02) | `expenses` (DB) | Médio | Índice parcial — soft-delete libera o slot para nova criação futura |
| 4 | `ExpensesService.createFromSource()` e `softDeleteBySource()`: métodos novos | `expenses`, `fines`, `recurring-costs` | Alto | **Risco a observar:** evitar dependência circular — `FinesModule → ExpensesModule` e `RecurringCostsModule → ExpensesModule` (nunca o inverso) |
| 5 | `ExpensesService.update()` e `remove()`: 403 quando `is_readonly = true` (R-LED-01) | `expenses` (API) | Alto | Frontend deve ocultar ações de edição/exclusão para despesas readonly; a API é a barreira de segurança |
| 6 | Nova tabela `vehicle_recurring_costs` com RLS owner-only | DB | Médio | **Risco a observar:** `CONSTRAINT uq_vehicle_recurring_cost UNIQUE (vehicle_id, cost_type, year)` não inclui `deleted_at` — um registro soft-deleted bloqueia novos registros para o mesmo par/ano; considerar índice parcial em vez de constraint |
| 7 | RPC `get_upcoming_costs(p_user_id UUID)`: nova função SQL | DB | Baixo | Função read-only; falha na RPC não afeta outras operações |
| 8 | `FinesModule` + `RecurringCostsModule` registrados em `AppModule`: dois novos controladores REST | `apps/api/src/app.module.ts` | Médio | Módulos novos não alterarão rotas existentes |
| 9 | Frontend `/fines/` e reestruturação de `/expenses/` com tabs e `LinkedExpenseDrawer` | `apps/web/app/(dashboard)/fines`, `apps/web/app/(dashboard)/expenses` | Médio | Mudanças aditivas na navegação — nenhum endpoint existente será removido |
| 10 | Validadores Zod de multas e custos recorrentes exportados via `index.ts` do pacote `validators` | `packages/validators` | Baixo | Exports aditivos — sem remoção de exports existentes |

**Riscos a observar na implementação futura:**
- `UNIQUE INDEX uq_expenses_source` exige que despesas com `source_type IS NOT NULL` e `deleted_at IS NULL` sejam únicas por origem. Fluxos de reativação devem respeitar essa ordem.
- O campo `is_readonly` não terá política RLS específica — a proteção contra edição direta ficará exclusivamente na camada de serviço NestJS.
- Os módulos `FinesModule` e `RecurringCostsModule` precisarão de `AuditService.log()` nas operações de criação/atualização/remoção.

---

### IMPACTO-017 — Melhorias de UX do Formulário/Hub de Despesas (SPEC-20260612-001)

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260612-001 |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Alto |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | RPC `get_upcoming_costs` passa a considerar `expenses` (despesas manuais com `due_date`) como 4ª fonte (RF-01) | `supabase/migrations/20260612000001_rpc_upcoming_costs_expenses.sql` | Médio | Função read-only adicional via `UNION`; falha não afeta outras fontes |
| 2 | Campo `vehicle_id` do `ExpenseForm` revoga R-CTX-06 (mount-only) e passa a reagir a mudanças do contexto global enquanto `isInherited === true` (RF-02) | `apps/web/hooks/use-vehicle-context-field.ts`, `apps/web/components/expenses/expense-form.tsx` | Médio | Reatividade restrita a este campo específico; seleção manual do usuário desliga a sincronização |
| 3 | Novos componentes `CurrencyInput`/`OdometerInput` com máscara pt-BR (RF-03) | `packages/ui`, `apps/web/components/expenses/expense-form.tsx` | Baixo | Componentes novos e aditivos |
| 4 | Campo "Valor por litro" editável com cálculo cruzado `amount ⇄ liters ⇄ price_per_liter`; nunca persistido (R-FUEL-03) (RF-05) | `apps/web/components/expenses/expense-form.tsx` | Médio | Campo puramente client-side (estado React, não integra `react-hook-form`/payload) |
| 5 | **Hard-block de regressão de odômetro (R-ODO-01)**: `createExpenseAction`/`updateExpenseAction` rejeitam `odometer_km` que viola a ordem cronológica (RF-04) | `apps/web/app/actions/expense-actions.ts` | **Alto** | Supersede R1 apenas no fluxo web; `apps/api` (NestJS) mantém a validação antiga (warning, não bloqueia). Usuários que dependiam de correções retroativas via web precisarão editar na ordem cronológica correta |
| 6 | `updateExpenseInputSchema` recebe o mesmo `superRefine` de `createExpenseInputSchema` (RF-06.1) | `packages/validators/src/expenses.schema.ts` | Médio | `ExpenseForm` deve sempre enviar o payload completo (`category` + `odometer_km`) em updates |
| 7 | `updateExpenseAction` busca a despesa existente e bloqueia edição quando `source_type IS NOT NULL` (RF-06.2) | `apps/web/app/actions/expense-actions.ts` | Médio | Adiciona 1 SELECT extra por update |
| 8 | Erros do Supabase diferenciam `PGRST116` de erro genérico via `mapMutationError` (RF-06.3) | `apps/web/app/actions/expense-actions.ts` | Baixo | Apenas a mensagem exibida ao usuário muda |

**Riscos a observar na implementação futura:**
- O item 5 (R-ODO-01) é o de maior risco: qualquer fluxo de "correção retroativa de odômetro" via formulário web passará a ser bloqueado se violar a ordem cronológica — os usuários precisarão corrigir na ordem cronológica correta (mais antigo → mais recente).

---

### IMPACTO-018 — Ajustes de Campos e Layout do Formulário de Despesas (SPEC-20260612-002)

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260612-002 |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Baixo |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | `amount` aceita até R$ 100.000.000,00 (era R$ 999.999,99); `CurrencyInput` aceita até 11 dígitos (R-EXP-01, RF-01) | `packages/validators/src/expenses.schema.ts`, `packages/ui/src/components/masked-input.tsx` | Baixo | Mudança apenas amplia o limite superior |
| 2 | Novo campo "Ano" (4 dígitos) ao lado da Data; data resultante inválida ajustada para o último dia válido do mês (RF-02) | `apps/web/components/expenses/expense-form.tsx` | Baixo | Campo client-side derivado de `date`; não altera o schema nem o payload |
| 3 | `full_tank` passa de binário (default `true`) para tri-state (default `null`) — R-FUEL-06 (RF-03) | `apps/web/components/expenses/expense-form.tsx` | Médio | **Risco a observar:** mudança de default (`null` em vez de `true`) significa que `km/L` não aparece automaticamente em novas despesas até confirmação explícita |
| 4 | `odometer_km` limitado a 9.999.999 (7 dígitos) no `expenseBaseSchema` — R-ODO-02 (RF-04) | `packages/validators/src/expenses.schema.ts` | Baixo | Limite já era respeitado na UI |
| 5 | Reorganização do layout: Odômetro movido para logo após Data/Ano quando `category = fuel` (RF-05) | `apps/web/components/expenses/expense-form.tsx` | Baixo | Mudança puramente de posição no JSX |

---

### IMPACTO-019 — Reposicionamento do Chip de Contexto (SPEC-20260603-001 / SPEC-20260603-003)

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260603-001 (nota de atualização); SPEC-20260603-003 (ordem padrão do chip) |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Baixo |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | `VehicleContextChip` deve ser movido do subheader para o header superior, à esquerda, após o logo/toggle de menu mobile | `apps/web/components/layout/header.tsx`, `apps/web/components/layout/fleet-subheader.tsx` | Baixo | Mesmo componente, mesma lógica de `resolveMode()` |
| 2 | Remoção do array `NAV_TABS` e da `<nav>` correspondente do header superior | `apps/web/components/layout/header.tsx` | Baixo | Navegação principal continuará existindo na sidebar via `NAV_ITEMS` |
| 3 | Componente `ChipSettingsPopover` a ser descartado; configuração de campos do chip ficará exclusivamente em Perfil | `apps/web/components/layout/chip-settings-popover.tsx`, `apps/web/components/layout/vehicle-context-chip.tsx` | Baixo | Configuração continua acessível em Perfil → Preferências |
| 4 | `DEFAULT_CHIP_FIELDS` em `display-preferences.schema.ts` alterado de `['make','model','plate']` para `['make','plate','model']` | `packages/validators/src/display-preferences.schema.ts` | Baixo | Mudança de valor default apenas — usuários com preferência já salva não serão afetados |

---

### IMPACTO-020 — Business Strategy Stories: Modelo de Monetização, Roles e Consolidação (SPEC-20260620-001)

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260620-001 |
| **Status** | Avaliação de planejamento pré-implementação — spec em draft; nenhuma implementação iniciada |
| **Risco geral** | Alto |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | Tabela `subscriptions` com `plan_type`, `status`, `expires_at`, `trial_ends_at`; integração com gateway de pagamento (Stripe ou Mercado Pago) | DB, novo módulo `subscriptions`, infraestrutura de pagamento | **Crítico** | Implementar em ambiente sandbox antes de produção; testes E2E com cenários de cobrança falha, upgrade, downgrade e cancelamento |
| 2 | Consolidação de dados: batch job que transforma registros detalhados em `monthly_summaries` após expiração do grace period | DB, novo módulo `consolidation`, cron/job scheduler | **Alto** | Consolidação é irreversível (R-BIZ-14) — exigir dry-run antes de execução; backup dos dados detalhados antes da primeira consolidação em produção |
| 3 | Grace period proporcional (R-BIZ-11): fórmula com 3 faixas de mínimo | `subscriptions`, `consolidation` | **Alto** | Testes unitários exaustivos com tabela de referência da spec; edge cases: assinante com menos de 1 mês |
| 4 | Novos roles `workspace_owner` e `workspace_member` com tabelas `workspaces`, `workspace_members`, `workspace_vehicle_assignments` | DB, novo módulo `workspaces`, RLS multi-tenant | **Alto** | Fase 4 — implementar após validação do modelo de negócio; RLS multi-tenant requer auditoria de segurança dedicada; ADR obrigatório antes da implementação |
| 5 | Rate limit de cadastro estendido: honeypot anti-bot, rejeição de emails descartáveis (BS-BLK-03, BS-BLK-04) | `auth`, middleware | **Médio** | Lista de domínios descartáveis como dependência externa — manter atualizada |
| 6 | Verificação de idade 18+ (BS-BLK-05) | `auth`, formulário de cadastro | **Médio** | Checkbox declaratório — avaliar implicação legal |
| 7 | Email transacional: boas-vindas, nudge 48h, resumo mensal, win-back, alerta de vencimento, NPS | Infraestrutura de email (Resend), cron jobs | **Médio** | Reutilizar infraestrutura planejada em SPEC-20260521-002; opt-out obrigatório |
| 8 | Onboarding wizard com consulta FIPE/DENATRAN para pre-fill de dados do veículo pela placa | Frontend, integração externa | **Médio** | API FIPE é gratuita mas sem SLA; fallback: formulário manual completo se consulta falhar |
| 9 | Referral system com tabela `referrals` e benefício mútuo (R-BIZ-04) | DB, novo módulo `referrals` | **Baixo** | Cap de 10 referrals ativos por conta (anti-abuso); implementar em Fase 3 |
| 10 | Blog SEO em `/blog` com SSR (BS-GRW-05) | Frontend, CMS ou MDX | **Baixo** | Implementar como rota estática (ISR) |

**Dependências críticas entre itens:**
- Itens 1, 2 e 3 são interdependentes — o modelo de assinatura (1) define quando a consolidação (2) ocorre.
- Item 4 (workspaces) depende de item 1 (subscriptions) para validar plano Frota.
- Item 7 (emails) depende da infraestrutura planejada em SPEC-20260521-002 (Resend + pg_cron).

**Efeitos colaterais potenciais:**
- A consolidação irreversível (R-BIZ-14) é a mudança de maior risco: dados detalhados são permanentemente reduzidos a resumos. Qualquer bug no processo pode resultar em perda de dados percebida pelo usuário.
- O modelo de roles multi-tenant requer revisão de todas as policies RLS existentes para garantir que `auth.uid() = user_id` continue correto em contextos de workspace.

---

### IMPACTO-021 — Revisão Crítica de Diff: 6 Achados de Qualidade Arquitetural

| Campo | Valor |
|-------|-------|
| **Spec** | — (revisão de gaps arquiteturais pré-implementação; sem spec associada) |
| **Status** | Avaliação pré-implementação — achados documentados para orientar a implementação futura |
| **Risco geral** | Crítico (achado 1 é crítico para segurança de rotas) |

| # | Achado | Módulos afetados | Risco | Mitigação na implementação |
|---|--------|-----------------|-------|---------------------------|
| 1 | **Middleware SSR de auth ausente (risco a observar):** Next.js 15 usa `proxy.ts` em vez de `middleware.ts`. O arquivo correto de proteção de rotas SSR deve ser `proxy.ts` com export `proxy`, `config` matcher e `updateSession`. Não criar `middleware.ts` — isso causaria conflito de inicialização | `apps/web` (auth SSR, proteção de rotas) | **Crítico** | Ao iniciar o projeto, criar apenas `apps/web/proxy.ts` como ponto de proteção de rotas; nunca criar `middleware.ts` junto com `proxy.ts` |
| 2 | **`bodySizeLimit` para Server Actions:** configurar `bodySizeLimit` em `next.config.mjs` adequadamente (ex: `'4mb'`) para rotas de Server Action que aceitam upload de imagens de veículos | `apps/web/next.config.mjs`, Server Actions de upload | **Alto** | Verificar e testar upload de fotos antes de deploy |
| 3 | **`deleteDraft` com timing errado + redirect em action:** garantir que `deleteDraft()` seja chamado apenas após `result.success === true`; em actions de create, chamar `redirect()` após todas as operações side-effect (revalidate, audit) | `apps/web/hooks/use-form-draft.ts`, Server Actions de criação | **Médio** | Seguir este padrão desde o início na implementação de todas as actions de criação |
| 4 | **`as any` no `typedResolver`:** verificar compatibilidade entre versões de `@hookform/resolvers` e `react-hook-form`; se o cast `as Resolver<TFieldValues>` for necessário, manter o wrapper centralizado com comentário justificando | `apps/web/lib/typed-resolver.ts`, 11 formulários | **Médio** | Verificar compatibilidade antes de adotar o wrapper; documentar o motivo do cast se necessário |
| 5 | **`as any` em `.update()` do Supabase:** evitar `as any` nos métodos do Supabase; gerar `database.types.ts` via `supabase gen types typescript` e resolver os casts com tipagem correta desde o início | Server Actions, repositórios | **Médio** | Gerar tipos corretamente antes de escrever código que os consuma |
| 6 | **`console.log` / `console.warn` residuais:** usar `Logger` do NestJS no backend; condicionar `console.log` a `process.env.NODE_ENV !== 'production'` no frontend; evitar logar dados de formulário | `apps/web/components/vehicles/`, `apps/api/` | **Baixo** | Estabelecer ESLint rules para `no-console` desde o início do projeto |

---

### IMPACTO-022 — Analytics Engine Fase 1: TCO e Fuel Trend (SPEC-20260622-001)

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260622-001 |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Médio |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | Novo módulo `AnalyticsModule` registrado em `AppModule` com 2 endpoints REST: `GET /analytics/tco/:vehicleId` e `GET /analytics/fuel-trend/:vehicleId` | `apps/api/src/modules/analytics/`, `apps/api/src/app.module.ts` | Médio | Módulo isolado — não altera endpoints existentes; `SupabaseAuthGuard` protege ambos os endpoints |
| 2 | RPCs PostgreSQL `calculate_vehicle_tco` e `fuel_consumption_trend` chamadas via Supabase client autenticado | DB (Supabase RPCs) | Médio | RPCs são read-only; falha na RPC retorna 404 (veículo não encontrado); RLS isola dados por usuário |
| 3 | `SupabaseAnalyticsRepository` cria client Supabase ad-hoc por request com token do usuário (não reutiliza singleton) | `apps/api/src/modules/analytics/repositories/` | Médio | Padrão necessário para garantir isolamento RLS por token; avaliar risco de resource leak em alta concorrência |
| 4 | Cache HTTP `Cache-Control: private, max-age=3600, stale-while-revalidate=600` em ambos os endpoints | `apps/api/src/modules/analytics/analytics.controller.ts` | Baixo | Cache de 1h reduz carga no DB; `private` garante que proxies não cacheiam dados de outros usuários (R-ANA-06) |
| 5 | Frontend: página `/analytics` com Server Component, seleção de veículo e 4 componentes de visualização | `apps/web/app/(dashboard)/analytics/`, `apps/web/components/analytics/` | Baixo | Página nova e isolada; sem impacto em rotas existentes |

**Riscos a observar na implementação futura:**
- As RPCs `calculate_vehicle_tco` e `fuel_consumption_trend` devem existir no banco Supabase antes do deploy do módulo. Se ausentes, os endpoints retornarão erro 500.
- O módulo não possuirá suite de testes inicialmente — criar `analytics.service.spec.ts` e `analytics.controller.spec.ts` antes de avançar para Fases 2-3.
- A criação de client Supabase por request em `SupabaseAnalyticsRepository` difere do padrão singleton dos demais repositórios. Avaliar se há risco de resource leak em cenários de alta concorrência.

---

### IMPACTO-023 — Preferência de Rascunho Automático (SPEC-20260612-003)

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260612-003 |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | Baixo |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | Migration `20260623000000_add_auto_draft_enabled.sql`: `ALTER TABLE user_preferences ADD COLUMN auto_draft_enabled BOOLEAN NOT NULL DEFAULT FALSE` | DB (`user_preferences`) | Baixo | Coluna `NOT NULL DEFAULT FALSE` — sem breaking change; registros existentes receberão `false` automaticamente |
| 2 | Schema `display-preferences.schema.ts`: campo `auto_draft_enabled` e constante `DEFAULT_AUTO_DRAFT_ENABLED` | `packages/validators` | Baixo | Export aditivo — sem remoção de exports existentes |
| 3 | Server Actions `getAutoDraftPreference()` e `updateAutoDraftPreference()` | `apps/web/app/actions/user-preferences.ts` | Baixo | `getAutoDraftPreference` deve retornar `false` como fallback seguro (R-PREF-01); upsert idempotente |
| 4 | Componente `AutoDraftPreference` com toggle na página de perfil (seção "Formulários") | `apps/web/components/profile/auto-draft-preference.tsx`, `apps/web/app/(dashboard)/profile/page.tsx` | Baixo | Componente isolado; sem impacto em outras rotas |
| 5 | `ExpenseForm`: prop `autoDraftEnabled` condiciona o hook `useFormDraft` | `apps/web/components/expenses/expense-form.tsx` | Baixo | Default `false` significa que novos usuários terão draft desabilitado — comportamento intencional conforme spec |

**Riscos a observar na implementação futura:**
- Usuários que esperarem o rascunho automático incondicional precisarão ativá-lo em Perfil → Preferências → Formulários. O default `false` é intencional.

---

### IMPACTO-024 — Bug Fix: Prioridade de Recálculo de Combustível com Pilha de Edição

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260612-001 (RF-05.2); SPEC-20260619-001 (R-FUEL-08) |
| **Status** | Avaliação pré-implementação — bug documentado para orientar a implementação |
| **Risco geral** | Baixo |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | Substituição do guard único `priceManuallyEdited` (`useRef<boolean>`) pela pilha `fuelEditOrder` (`useRef<FuelField[]>`) — registra a ordem de edição manual dos três campos de combustível | `apps/web/components/expenses/expense-form.tsx` | Baixo | Mudança puramente client-side |
| 2 | Funções `markFuelFieldEdited` e `isFuelFieldManuallyEdited` encapsulam a lógica da pilha; `recalcFuelFields` usa a pilha para decidir qual campo recalcular | `apps/web/components/expenses/expense-form.tsx` | Baixo | Comportamento legado (pareamento fixo) mantido como fallback quando nenhum campo foi editado manualmente |
| 3 | `handleSupplierSelect` deve verificar `isFuelFieldManuallyEdited('amount')` antes de sobrescrever o campo Valor no autofill por fornecedor | `apps/web/components/expenses/expense-form.tsx` | Baixo | Mudança defensiva; autofill continua funcionando normalmente quando o usuário ainda não digitou o Valor |

**Causa raiz documentada:** O guard único `priceManuallyEdited` rastreia apenas se o campo `price_per_liter` foi editado manualmente, mas não guarda a ordem relativa entre os três campos. Ao corrigir o Valor (`amount`) depois de ter digitado Litros e Preço/Litro manualmente, o recálculo sobrescreve o Preço/Litro sem aviso.

---

### IMPACTO-025 — Odômetro Obrigatório em Manutenção + Ciclos de Odômetro (pré-implementação) (2026-07-11)

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260711-001 (Ciclos de Odômetro — fecha NG-04 de SPEC-20260601-001) |
| **Status** | Avaliação pré-implementação — nenhum código existe ainda |
| **Risco geral** | **Alto** |

| # | Mudança | Módulos afetados | Risco | Mitigação |
|---|---------|-----------------|-------|-----------|
| 1 | Nova tabela `vehicle_odometer_cycles`; RLS owner-only; ciclo 1 implícito (sem linha) | DB `supabase/migrations/`, novo módulo backend | **Alto** | Migration isolada; RLS ativo; FK ON DELETE CASCADE garante LGPD (C1) |
| 2 | `fuel_consumption_trend` usa `LAG(odometer_km)` sem filtro de ciclo: após reset, `prev_odo` cruza ciclos, gerando km absurdo. Adicionar filtro `WHERE e.date >= get_active_cycle_start(p_vehicle_id)` | `supabase/migrations/20260622000000_analytics_tco_fuel_trend.sql` | **Alto** | **Ordem crítica:** atualizar ANTES de qualquer UI de ciclos; `CREATE OR REPLACE` não é destrutivo |
| 3 | `calculate_vehicle_tco` usa `MIN/MAX(odometer_km)` sobre todas as despesas: `total_km` mistura ciclos. Adicionar mesmo filtro de data | `supabase/migrations/20260622000000_analytics_tco_fuel_trend.sql` | **Alto** | Atualizar na mesma migration de item 2 |
| 4 | `calculate_vehicle_health` e `calculate_fleet_health` usam `vehicles.odometer` (snapshot estático) — sem regressão, mas snapshot desatualizado é débito técnico | `supabase/migrations/20260615000000_vehicle_health_score_fn.sql`, `20260610000000_fleet_health_bulk_fn.sql` | **Médio** | Ortogonal; débito técnico a resolver em sprint futura |
| 5 | `maintenance.schema.ts`: `odometer_km` está como `optional().nullable()` — precisa de `superRefine` em `updateMaintenanceInputSchema` obrigatório quando `status=completed` | `packages/validators` | **Médio** | Registrar R-ODO-03 em RULES.md antes de codificar |
| 6 | `MaintenanceRepositoryPort` e `SupabaseMaintenanceRepository`: novo método `findMaxOdometerByVehicle(vehicleId, userId, sinceDate?, excludeId?)` | `apps/api/src/modules/maintenance` | **Médio** | Reutilizar padrão do repositório de expenses |
| 7 | `MaintenanceService`: adicionar warnings de odômetro com `ExpenseWarningException` + `confirmed:true` (ADR-001 D2 preservado) | `apps/api/src/modules/maintenance` | **Médio** | Reutilizar padrão `collectWarnings()` do `ExpensesService` |
| 8 | `ExpenseRepositoryPort` e `SupabaseExpenseRepository`: parâmetro `sinceDate?: string` em `findMaxOdometerByVehicle` | `apps/api/src/modules/expenses` | **Médio** | Parâmetro opcional sem breaking change |
| 9 | Novo módulo `OdometerCyclesModule`: controller `POST /vehicles/:id/odometer-cycles`; `cycle_number` via `ROW_NUMBER()` | `apps/api/src/modules/` | **Médio** | Registrar em `AppModule`; `SupabaseAuthGuard` |
| 10 | `maintenance-actions.ts`: `createMaintenanceAction` nunca persiste `odometer_km` — bug pré-existente a corrigir na mesma PR | `apps/web/app/actions/maintenance-actions.ts` | **Médio** | Usar padrão do `expense-actions.ts` como referência |
| 11 | `maintenance-form.tsx`: campo `odometer_km` obrigatório na conclusão; modal retroativo; atalho "iniciar novo ciclo" | `apps/web/components/maintenance` | **Médio** | Reutilizar `OdometerInput` e `AlertDialog` (R-FORM-05) |
| 12 | Nova tela Configurações para ciclos; badge de ciclo no chip a partir do ciclo 2 | `apps/web/app/(dashboard)/settings` ou `vehicles/[id]` | **Baixo** | Tela isolada; badge aditivo |

**Ambiguidades a resolver na spec antes da implementação:**

| ID | Questão | Recomendação |
|----|---------|-------------|
| A-01 | `odometer_km` em manutenção: obrigatório no create ou apenas no update `status=completed`? | Apenas na conclusão |
| A-02 | Quem busca o ciclo ativo para `sinceDate`: service ou repositório? | Service — repositório stateless |
| A-03 | `cycle_number` armazenado ou calculado? | Calculado via `ROW_NUMBER()` |

**Estimativa de esforço:**

| Camada | Escopo | Esforço |
|--------|--------|---------|
| Migration DB | 1 tabela + `get_active_cycle_start` + 2 funções analíticas | 1 dia |
| Backend NestJS | `OdometerCyclesModule` TDD + `MaintenanceService` odômetro + `sinceDate` | 4-5 dias |
| Frontend Next.js | `maintenance-form`, `maintenance-actions`, tela ciclos, badge | 3-4 dias |
| Testes | ~50 novos cenários | 2-3 dias |
| Docs | ADR + spec + RULES.md R-ODO-03/R-ODO-04 | 1 dia |
| **Total** | | **11-14 dias** |

**Efeitos colaterais potenciais:**
- Veículos sem linha em `vehicle_odometer_cycles` manterão o comportamento atual — zero regressão.
- `fuel_consumption_trend` e `calculate_vehicle_tco` podem corromper dados se um reset for criado antes das funções SQL serem atualizadas. **Ordem obrigatória:** funções SQL primeiro.
- Bug pré-existente: `createMaintenanceAction` nunca persistiu `odometer_km` — corrigir na mesma PR.

---

### IMPACTO-026 — Diagnóstico DBA do Banco Real NaveSaaS (Supabase) — Achados Críticos de Segurança e Integridade

| Campo | Valor |
|-------|-------|
| **Spec** | — (diagnóstico direto do banco de produção pelo agente `dba`, via ferramentas MCP do Supabase; sem spec associada) |
| **Status** | Diagnóstico confirmado no banco real (`project_id uetaprnvukgqtxlbfedk`, NaveSaaS) em 2026-07-12. **Diverge da premissa "greenfield, nenhum código existe" desta matriz:** o banco Supabase tem 33 migrations aplicadas desde 2026-03-10 e dados reais (profiles, vehicles, expenses, audit_logs etc.), evoluindo independentemente do estado documentado do repositório de código |
| **Risco geral** | Crítico |

| # | Achado | Módulos afetados | Risco | Mitigação |
|---|--------|-------------------|-------|-----------|
| 1 | RPCs `calculate_vehicle_health`, `calculate_fleet_health`, `get_upcoming_costs`, `get_vehicle_cost_per_km` são `SECURITY DEFINER` e executáveis pelo role `anon` (sem autenticação). Se não validam `auth.uid()` internamente, permitem consultar dados de veículo/frota de terceiros passando um UUID arbitrário — banco já tem 6 veículos e 12 despesas reais cadastrados | DB (functions), Supabase Auth/RLS | **Crítico** | Adicionar validação de `auth.uid()` no corpo de cada função; revogar `EXECUTE` de `anon`; reavaliar `SECURITY DEFINER` vs `INVOKER`. Registrado como [S7](../specs/RULES.md) |
| 2 | Bucket de Storage `vehicles` tem policy `"Public access to vehicle photos"` que permite **listar** todos os arquivos, não só acessá-los por URL direta — enumera fotos de veículos de todos os usuários | Supabase Storage | **Crítico** | Restringir a policy a acesso por path completo; remover permissão de `LIST` do bucket. Registrado como [S8](../specs/RULES.md) |
| 3 | Tabela `vehicle_odometer_cycles`, função `get_active_cycle_start()` e o filtro de ciclo nas funções analíticas (ADR-007, SPEC-20260711-001, já mapeados em IMPACTO-025) estão documentados mas **não existem no banco real** — nenhuma migration correspondente foi aplicada (última migration real é `20260608004708_fleet_health_bulk_fn`) | DB, `fuel_consumption_trend`, `get_vehicle_cost_per_km`, `calculate_vehicle_tco` | **Crítico** | Aplicar a migration antes de qualquer desenvolvimento que dependa da feature; manter ordem obrigatória já registrada em IMPACTO-025 (funções analíticas atualizadas antes da UI de reset) |
| 4 | CHECK constraint de R-LED-04 (`source_type` e `source_id` sempre definidos juntos) **não existe** no banco — as colunas são nullable independentes em `expenses` | DB (`expenses`) | **Crítico** | Migration com `CHECK ((source_type IS NULL AND source_id IS NULL) OR (source_type IS NOT NULL AND source_id IS NOT NULL))` antes do desenvolvimento do `ExpensesService`. Nota adicionada em R-LED-04 |
| 5 | Extensão `pg_cron` está disponível mas **não instalada** no projeto Supabase — qualquer feature que dependa dela (alertas de manutenção por email, IMPACTO-002) falhará silenciosamente até ser habilitada manualmente | Infraestrutura Supabase | **Crítico** | Habilitar `pg_cron` no dashboard Supabase antes de aplicar qualquer migration que use `cron.schedule()`; documentar a dependência em `docs/operations/` |
| 6 | 6 functions (`update_expense_templates_updated_at`, `enforce_expense_templates_limit`, `set_updated_at`, `soft_delete_profile`, `update_updated_at_column`, `set_vehicle_soft_delete`) sem `search_path` fixo — risco de sequestro via schema em functions `SECURITY DEFINER` | DB (functions) | **Alto** | `ALTER FUNCTION ... SET search_path = ''` em todas; usar nomes qualificados no corpo. Registrado como [S9](../specs/RULES.md) |

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

### IMPACTO-027 — Criação do Projeto Nave: Schema Higienizado e Fechamento dos Achados do IMPACTO-026

| Campo | Valor |
|-------|-------|
| **Spec** | — (ação corretiva direta em infraestrutura, sem spec associada; decorre integralmente do diagnóstico do IMPACTO-026) |
| **Status** | **Implementado em ambiente novo** — schema aplicado diretamente via MCP do Supabase em 2026-07-12; zero achados de segurança confirmados via `get_advisors` no projeto `Nave` (`sfkefpoanmoiagwxbwld`). Nota: esta entrada é exceção ao padrão desta matriz (que assume "avaliação pré-implementação, nenhum código existe ainda") porque trata de ação de infraestrutura real já concluída, não de planejamento de feature de aplicação. |
| **Risco geral** | Médio (mitigação de um Crítico anterior via isolamento em projeto novo; NaveSaaS legado ainda com achados abertos; decisão sobre migração de dados em aberto) |
| **Precursor** | IMPACTO-026 (diagnóstico DBA do NaveSaaS, 2026-07-12) |

| # | Mudança / Correção aplicada | Módulos afetados | Risco | Mitigação |
|---|----------------------------|-----------------|-------|-----------|
| 1 | Todas as funções `SECURITY DEFINER` e trigger-only receberam `SET search_path = ''` fixo, fechando o risco S9 | DB (functions) | Crítico → fechado | Verificado via `get_advisors` |
| 2 | `REVOKE EXECUTE` de `anon`/`public` em todas as RPCs sensíveis (`calculate_vehicle_health`, `calculate_fleet_health`, `get_upcoming_costs`, `get_vehicle_cost_per_km`, `fuel_consumption_trend`, `calculate_vehicle_tco`, `get_active_cycle_start`) e em funções trigger-only (`handle_new_user`, `soft_delete_profile`); `GRANT EXECUTE` apenas para `authenticated` nas RPCs de app — fecha S7 | DB (functions), Supabase Auth | Crítico → fechado | Verificado via `get_advisors` |
| 3 | As 6 RPCs de analytics (`calculate_vehicle_health`, `calculate_fleet_health`, `get_upcoming_costs`, `get_vehicle_cost_per_km`, `fuel_consumption_trend`, `calculate_vehicle_tco`) trocadas de `SECURITY DEFINER` para `SECURITY INVOKER` — o RLS já garante isolamento por posse; elimina aviso do advisor sem perda funcional | DB (functions) | Alto → fechado | RLS cobre a restrição equivalente |
| 4 | `REVOKE ALL ... FROM anon` em todas as tabelas do schema public — a aplicação inteira exige login; fecha exposição via introspecção GraphQL | DB (RLS / grants) | Alto → fechado | Verificado via `get_advisors` |
| 5 | CHECK constraint `expenses_source_coherence_check` criado de fato via DDL — fecha R-LED-04 (S7 no contexto do ledger) | DB (`expenses`) | Crítico → fechado | Constraint verificada no schema |
| 6 | Bucket de Storage `vehicles` criado como público, mas **sem** policy de SELECT/listagem para `anon` ou `authenticated`; acesso a foto apenas por URL direta; policies de INSERT/UPDATE/DELETE escopadas por pasta (`auth.uid()` como primeiro segmento do path) — fecha S8 | Supabase Storage | Crítico → fechado | Sem policy de LIST no bucket |
| 7 | 18 índices de cobertura de FK adicionados, incluindo os 3 apontados pelo IMPACTO-026 (`documents.user_id`, `drivers.user_id`, `vehicle_recurring_costs.expense_id`) e índice para `vehicle_odometer_cycles.created_by` | DB (índices) | Médio → fechado | P4 mitigado |
| 8 | Todas as políticas RLS novas usam `(select auth.uid())` em vez de `auth.uid()` cru (otimização P4); sem políticas duplicadas em nenhuma tabela (NaveSaaS tinha duplicação em `user_preferences`) | DB (RLS) | Médio → fechado | Verificado via `get_advisors` |
| 9 | `vehicle_odometer_cycles` aplicada de fato pela primeira vez (antes só existia documentada); funções `fuel_consumption_trend`, `calculate_vehicle_tco` com filtro de ciclo ativo via `get_active_cycle_start()` também aplicadas — fecha achado 3 do IMPACTO-026 | DB, analytics | Crítico → fechado | Tabela e funções confirmadas no schema |
| 10 | `vehicles.health_score` ganhou `CHECK (health_score >= 0 AND health_score <= 100)` — ausente no NaveSaaS | DB (`vehicles`) | Baixo → fechado | Constraint DDL aplicada |
| 11 | `expense_templates.user_id` corrigido para referenciar `profiles(id)` em vez de `auth.users(id)` — consistência com demais tabelas | DB (`expense_templates`) | Baixo → fechado | FK corrigida no schema |
| 12 | 5 tabelas antes não documentadas (`drivers`, `vehicle_drivers`, `documents`, `user_categories`, `user_preferences`) agora documentadas em `docs/architecture/entities.md` | Documentação | Baixo → fechado | Documentação atualizada em 2026-07-12 |
| 13 | **PENDENTE — não corrigível via SQL/schema:** proteção de senha vazada (HaveIBeenPwned) do Supabase Auth continua desabilitada — é configuração de dashboard/Management API. Requer ação manual no painel do projeto Nave | Supabase Auth | Médio | Acessar Dashboard → Auth → Security → habilitar "Password Strength" / "HaveIBeenPwned" |

**Estado dos dois projetos Supabase após esta ação:**

| Projeto | ID | Situação |
|---------|----|---------|
| **Nave** (novo) | `sfkefpoanmoiagwxbwld` | Schema de referência limpo, `get_advisors` sem achados, sem dados de usuário, sem migrations locais (schema aplicado diretamente via MCP) |
| **NaveSaaS** (legado) | `uetaprnvukgqtxlbfedk` | **Permanece intocado** — 33 migrations aplicadas, dados reais (6 veículos, 12 despesas etc.), todos os achados do IMPACTO-026 ainda presentes. Não há plano de migração de dados definido. Não há prazo ou decisão de descomissionamento. Estas são decisões em aberto a serem tomadas posteriormente. |

---

### IMPACTO-028 — Bug de Produção: `handle_new_user()` quebrava 100% dos cadastros (corrigido) (2026-07-13)

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260524-001 (auth register), SPEC-20260521-001 (hardening S9) |
| **Status** | **Corrigido em 2026-07-13** via migration `supabase/migrations/20260713200000_fix_handle_new_user_search_path.sql` |
| **Risco geral** | Crítico → fechado |
| **Descoberto por** | Testes de integração reais contra Supabase local (`apps/api/test/integration/auth.int-spec.ts`, CT-006) |

**Descrição do bug:**

A migration de hardening S9 (IMPACTO-027, item 1) adicionou `SET search_path = ''` a todas as funções `SECURITY DEFINER`, incluindo a trigger function `handle_new_user()` (em `supabase/migrations/20260712171941_trigger_functions.sql`). Esta função é disparada pelo trigger `on_auth_user_created` sempre que um novo usuário é criado no Supabase Auth.

Com `search_path = ''`, todas as referências de tipo devem ser totalmente qualificadas com o schema. O código da função fazia cast `::profile_type` sem qualificar o schema, causando o erro Postgres:

```
ERROR: type "profile_type" does not exist (SQLSTATE 42704)
```

O GoTrue reportava esse erro silenciosamente como HTTP 500 genérico, impedindo **100% dos cadastros novos** — qualquer chamada a `POST /auth/register` falhava na etapa de criação do perfil.

| # | Mudança | Módulos afetados | Risco | Status |
|---|---------|-----------------|-------|--------|
| 1 | `supabase/migrations/20260713200000_fix_handle_new_user_search_path.sql`: `CREATE OR REPLACE FUNCTION handle_new_user()` com cast corrigido para `public.profile_type` (schema qualificado) | DB (trigger `on_auth_user_created`), `profiles`, fluxo de registro | Crítico → fechado | Aplicado em 2026-07-13 |

**Causa raiz:** Regra S9 (hardening de `search_path`) foi aplicada corretamente em IMPACTO-027, mas o corpo da função `handle_new_user()` não foi revisado para qualificar todos os tipos com schema explícito. A combinação `SET search_path = '' + cast não qualificado` é um padrão de risco documentado no PostgreSQL — qualquer função com `SECURITY DEFINER` e `search_path = ''` deve usar nomes totalmente qualificados no corpo.

**Lição:** Ao aplicar `SET search_path = ''` em funções existentes, revisar todos os casts de tipo e referências de tabela/função no corpo para garantir qualificação completa de schema.

---

### IMPACTO-029 — Trigger `soft_delete_profile()` com efeito nulo no fluxo de exclusão de conta (2026-07-13)

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260521-004 RF-02 |
| **Status** | Observação documentada — nenhuma ação corretiva urgente; decisão de remoção ou reatribuição adiada |
| **Risco geral** | Baixo (comportamento correto; trigger apenas não tem efeito no fluxo atual) |

**Descrição:**

O `DELETE /users/me` foi implementado na Fase 1 usando exclusão física via `auth.admin.deleteUser(userId)`, que deleta o registro em `auth.users`. A FK `auth.users → profiles` com `ON DELETE CASCADE` então remove `profiles` automaticamente, o que por sua vez cascateia para as demais tabelas filhas.

A trigger `soft_delete_profile()` (em `supabase/migrations/`) está declarada para disparar em `BEFORE DELETE ON profiles`. No entanto, a exclusão do perfil ocorre via cascade de FK disparada pela deleção em `auth.users` — não via `DELETE` direto na tabela `profiles`. O comportamento de triggers em cascatas de FK é definido pelo PostgreSQL: a trigger **dispara normalmente** em deletes por cascade (FK), mas como a exclusão já vem de `auth.admin.deleteUser` que remove `auth.users`, o cascade remove `profiles` e a trigger `soft_delete_profile()` dispara — porém neste contexto ela executaria um soft-delete em uma linha que está prestes a ser deletada de qualquer forma.

**Efeito prático:** A anonimização que `soft_delete_profile()` faz (limpar nome, preferences etc.) pode ocorrer antes do cascade DELETE, mas o resultado final é que a linha em `profiles` é deletada de qualquer forma. A trigger não tem efeito útil no fluxo de `DELETE /users/me` via `auth.admin.deleteUser`.

**Impacto:** A regra C1 (LGPD — exclusão completa via cascata) é satisfeita pela exclusão física. A anonimização de `soft_delete_profile()` torna-se irrelevante quando a linha é deletada. Qualquer fluxo futuro que dependa de `profiles.deleted_at` ou de campos anonimizados deve ser revisado para verificar se a trigger adiciona valor real.

**Decisão adiada:** Remover, manter (com documentação clara de efeito nulo) ou reatribuir a trigger para outro propósito. Registrar como débito técnico a ser resolvido antes da Fase 2.

---

### IMPACTO-030 — Decisão de Padrão de Soft Warnings: response-field vs. exception-based (2026-07-14)

| Campo | Valor |
|-------|-------|
| **Spec** | SPEC-20260601-001 (T3.2 — odômetro), SPEC-20260601-002 (T3.3 — duplicata, ainda não implementada) |
| **Status** | Decidido e implementado em T3.2 — response-field |
| **Risco geral** | Baixo (com a opção escolhida) |

| # | Dimensão | Option A: response-field (escolhida) | Option B: exception-based (descartada) |
|---|----------|--------------------------|--------------------------|
| 1 | Backend — service | Queries inline em `ExpensesService.create()`/`update()`, retornando objeto enriquecido. Sem nova classe de exception. | Exigiria `ExpenseWarningException`; service lançaria exceção em vez de retornar; DTOs ganhariam flag `confirmed`. |
| 2 | Backend — controller | Zero alterações (`ExpensesController` já embrulha em `{ data: expense }`). | Exigiria capturar a exceção ou delegar ao filter; mudança na assinatura de resposta. |
| 3 | Backend — `HttpExceptionFilter` | Zero alterações — o filtro atual (`@Catch()`) retorna apenas `{ statusCode, message, timestamp }`, compatível com Option A. | Exigiria modificar o filtro global para expor dados de warning em respostas de erro, impactando o contrato de TODOS os erros do projeto. |
| 4 | Frontend — `expenses/new/page.tsx` | Ler `odometer_warning`/`odometer_previous_max_km` no `onSuccess`. | Exigiria detectar warning no `onError`, guardar payload pendente, exibir diálogo de confirmação, reenviar com `confirmed: true` — máquina de estados mais complexa. |
| 5 | Frontend — `expenses/[id]/page.tsx` | Idem, no `onSuccess` do `updateMutation`. | Mesma máquina de estados de confirmação aplicada ao fluxo de PATCH. |
| 6 | Consistência T3.2 × T3.3 | Alinhado: SPEC-20260601-002 (T3.3) especifica explicitamente response-field (RF-03: HTTP 201 com `duplicate_warning`). Zero retrabalho quando T3.3 for implementada. | Conflito: SPEC-20260601-002 nunca menciona exception-based. Exigiria emenda de spec aprovada ou dois padrões diferentes no mesmo endpoint `POST /expenses`. |
| 7 | Risco de reversão futura | A → B: criar exception class, modificar filtro global, refatorar service, reescrever fluxo frontend, emendar specs. Custo alto. | B → A: remover exception class e lógica de confirmação. Custo médio, mas o filtro global já teria sido alterado, deixando rastro. |

**Decisão:** Option A (response-field) foi confirmada com o usuário após pesquisa de UX (agente `design-system`: diálogo de confirmação é fricção desproporcional para validação soft; HTTP 409 é semanticamente incorreto para condição não-bloqueante) e análise de impacto técnico (agente `impact-analyzer`, esta entrada). A seção 15 D6 da SPEC-20260601-001 continha premissa incorreta ("padrão já implementado em SPEC-20260601-002" — que nunca usou exception-based) e foi corrigida via changelog da spec antes da implementação de T3.2. Frontend (itens 4/5) não foi implementado nesta tarefa — NG-05 da spec exclui exibição do warning no frontend deste escopo.

---

## Legenda de Risco

| Nível | Critério |
|-------|----------|
| **Crítico** | Pode causar falha de segurança, perda de dados ou indisponibilidade total |
| **Alto** | Afeta múltiplos módulos, fluxo de autenticação ou dados de usuários |
| **Médio** | Afeta um módulo específico ou requer configuração de infraestrutura |
| **Baixo** | Mudança isolada, reversível, sem efeito colateral esperado |
