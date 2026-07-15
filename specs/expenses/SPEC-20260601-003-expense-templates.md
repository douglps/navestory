---
id: SPEC-20260601-003
title: Sistema de Modelos Rápidos de Despesas
status: approved
date: 2026-06-01
author: douglps
rules: [R3, R6]
security: [S1, S2]
camadas: [backend, frontend, database]
---

# SPEC-20260601-003: Sistema de Modelos Rápidos de Despesas

**Versão:** 1.0
**Status:** Aprovada
**Autor:** douglps
**Data:** 2026-06-01
**Reviewers:** —

---

## 1. Resumo

Uma tray horizontal de cartões no topo de `/expenses/new` exibe os modelos rápidos salvos pelo usuário. Com um clique em um cartão, o formulário é pré-preenchido com os dados do modelo — exceto `date` (mantém a data de hoje) e `odometer_km` (mantém em branco). Modelos são persistidos na tabela `expense_templates` no Supabase, com RLS owner-only e limite de 20 por usuário. A criação pode ocorrer a partir de uma despesa existente ("salvar como modelo") ou inline no próprio formulário de nova despesa. Os modelos são ordenados por uso mais recente via campo `last_used_at`.

---

## 2. Contexto e Motivação

**Problema:**
O formulário de criação de despesas (`/expenses/new`) exige que o usuário preencha todos os campos a cada novo lançamento, mesmo quando o lançamento é recorrente — por exemplo, o mesmo abastecimento parcial semanal no mesmo posto, sempre com o mesmo veículo, categoria e valor aproximado. Não existe atalho para reusar configurações de despesas anteriores.

**Evidências:**
- O perfil de usuário principal (motorista autônomo ou gestor de frota pequena) realiza lançamentos altamente repetitivos: abastecimentos frequentes, pedágio diário, lavagem semanal, seguro mensal.
- O `useFormDraftGuard` já persiste rascunhos temporários em sessionStorage para recuperação após idle/timeout de sessão, mas não cobre o caso de modelos reutilizáveis intencionais.
- A abertura rápida via PWA mobile-first amplifica a dor: cada tap a mais em um teclado virtual em ambiente de atenção dividida (posto de combustível, estacionamento) é fricção real.

**Por que agora:**
O redesign do dashboard (SPEC-20260531-001) e o formulário de despesas revisado com validação de odômetro (SPEC-20260601-001) e detecção de duplicata (SPEC-20260601-002) consolidam o fluxo de lançamento como núcleo do produto. Modelos rápidos são a evolução natural desse fluxo, reduzindo o tempo de lançamento de ~45 segundos para ~10 segundos nos casos recorrentes.

---

## 3. Goals (Objetivos)

- [ ] G-01: O usuário pode salvar um conjunto de campos de despesa como modelo nomeado, seja a partir de uma despesa existente ou inline no formulário de nova despesa.
- [ ] G-02: A tray de modelos é exibida no topo de `/expenses/new` e pré-preenche o formulário com um único clique, sem recarregar a página.
- [ ] G-03: `date` e `odometer_km` nunca são copiados de um modelo — esses campos são sempre definidos pelo usuário no momento do lançamento.
- [ ] G-04: O usuário pode renomear e excluir seus modelos.
- [ ] G-05: O limite de 20 modelos por usuário é aplicado tanto na API quanto no frontend.

**Métricas de sucesso:**

| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| Tempo médio de lançamento de despesa recorrente | ~45 s (estimado) | < 15 s com modelo aplicado | Na entrega da feature |
| Modelos criados por usuário ativo (primeiros 30 dias) | 0 (feature inexistente) | ≥ 1 por usuário ativo | 30 dias pós-lançamento |
| Taxa de uso da tray (cliques em modelo / total de aberturas de `/expenses/new`) | 0% | ≥ 30% nos usuários que têm ≥ 1 modelo | 60 dias pós-lançamento |

---

## 4. Non-Goals (Fora do Escopo)

- **NG-01:** Compartilhamento de modelos entre usuários — cada modelo é estritamente pessoal.
- **NG-02:** Modelos de manutenção (`maintenances`) — apenas despesas nesta spec.
- **NG-03:** Edição inline dos campos do modelo diretamente na tray — edição ocorre via modal dedicado.
- **NG-04:** Importação ou exportação de modelos em lote (CSV/JSON).
- **NG-05:** Ordenação manual (drag-and-drop) pelos usuários — a ordenação é automática por `last_used_at DESC`.
- **NG-06:** Modelos com campos calculados ou fórmulas (ex: valor = custo/litro × litros) — os valores são estáticos.
- **NG-07:** Sincronização de modelos entre dispositivos em tempo real (real-time subscription) — a leitura é feita no carregamento da página.
- **NG-08:** Notificações ou sugestões automáticas de "criar modelo" baseadas em padrões de uso.

---

## 5. Usuários e Personas

**Usuário primário:** Motorista autônomo (P-001) que abastece o mesmo veículo semanalmente e registra os lançamentos pelo celular, geralmente no próprio posto.

**Usuário secundário:** Gestor de frota pequena (P-002) que registra despesas recorrentes (pedágio, lavagem, revisão mensal) para múltiplos veículos.

**Jornada atual (sem a feature):**
1. Usuário abre `/expenses/new` no PWA.
2. Seleciona o veículo (tap + scroll).
3. Seleciona a categoria (tap + scroll).
4. Digita o valor.
5. Confirma a data (hoje).
6. Deixa `odometer_km` em branco ou digita.
7. Submete. Total: ~45 s.

**Jornada futura (com a feature):**
1. Usuário abre `/expenses/new` no PWA.
2. Visualiza a tray de modelos no topo — vê o cartão "Abastecimento Semanal".
3. Toca no cartão. Formulário é preenchido instantaneamente com veículo, categoria, valor e litros.
4. Confirma ou ajusta o valor se necessário.
5. Submete. Total: ~10 s.

---

## 6. Modelo de Dados

### 6.1 Tabela `expense_templates`

```sql
-- Migration: 005_expense_templates.sql
CREATE TABLE IF NOT EXISTS public.expense_templates (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT          NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  vehicle_id    UUID          NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  category      TEXT          NOT NULL,
  amount        NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  description   TEXT          CHECK (char_length(description) <= 255),
  liters        NUMERIC(6,2)  CHECK (liters > 0),
  last_used_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);
```

**Campos ausentes intencionalmente:** `date` e `odometer_km` — conforme RF-07, esses campos nunca fazem parte de um modelo.

**Índices:**

```sql
-- Ordena a tray por uso mais recente (consulta principal)
CREATE INDEX idx_expense_templates_user_last_used
  ON public.expense_templates (user_id, last_used_at DESC);

-- FK para veículos (suporte a queries de integridade)
CREATE INDEX idx_expense_templates_vehicle_id
  ON public.expense_templates (vehicle_id);
```

**Constraint de limite por usuário (enforcement no banco):**

```sql
-- Função + trigger para limitar a 20 modelos por usuário
CREATE OR REPLACE FUNCTION enforce_expense_templates_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.expense_templates WHERE user_id = NEW.user_id) >= 20 THEN
    RAISE EXCEPTION 'Limite de 20 modelos de despesa por usuário atingido.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_expense_templates_limit
  BEFORE INSERT ON public.expense_templates
  FOR EACH ROW EXECUTE FUNCTION enforce_expense_templates_limit();
```

### 6.2 Row Level Security (RLS)

```sql
ALTER TABLE public.expense_templates ENABLE ROW LEVEL SECURITY;

-- Leitura: apenas os próprios modelos
CREATE POLICY "templates_select_own"
  ON public.expense_templates FOR SELECT
  USING (auth.uid() = user_id);

-- Inserção: apenas para si mesmo
CREATE POLICY "templates_insert_own"
  ON public.expense_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Atualização: apenas os próprios modelos
CREATE POLICY "templates_update_own"
  ON public.expense_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Exclusão: apenas os próprios modelos
CREATE POLICY "templates_delete_own"
  ON public.expense_templates FOR DELETE
  USING (auth.uid() = user_id);
```

### 6.3 Tipos TypeScript (`database.types.ts`)

Após a migration, regenerar via `supabase gen types typescript`. O tipo gerado deve incluir:

```typescript
// Gerado automaticamente — não editar manualmente
expense_templates: {
  Row: {
    id: string;
    user_id: string;
    name: string;
    vehicle_id: string;
    category: string;
    amount: number;
    description: string | null;
    liters: number | null;
    last_used_at: string;
    created_at: string;
    updated_at: string;
  };
  Insert: Omit<Row, 'id' | 'created_at' | 'updated_at'> & { last_used_at?: string };
  Update: Partial<Insert>;
}
```

---

## 7. Requisitos Funcionais

### 7.1 Requisitos Principais

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF-01 | O sistema deve exibir uma tray horizontal de cartões de modelos no topo do formulário em `/expenses/new`, acima de todos os campos do formulário. | Alta |
| RF-02 | A tray deve exibir até 3 cartões visíveis simultaneamente no mobile (320px–768px); em desktop (>768px), até 4. O scroll horizontal deve ser possível quando há mais cartões. | Alta |
| RF-03 | Ao tocar/clicar em um cartão de modelo, os campos `vehicle_id`, `category`, `amount`, `description` e `liters` do formulário devem ser preenchidos com os valores do modelo. | Alta |
| RF-04 | Os campos `date` e `odometer_km` não devem ser afetados pela aplicação de um modelo. `date` permanece com o valor atual (hoje); `odometer_km` permanece vazio. | Alta |
| RF-05 | A tray deve incluir um botão "+" ao final da lista que abre o modal de criação inline de novo modelo. | Alta |
| RF-06 | O usuário pode criar um modelo a partir de uma despesa existente via botão "Salvar como modelo" na tela de detalhe da despesa (`/expenses/[id]`). Os campos salvos são: `vehicle_id`, `category`, `amount`, `description`, `liters`. | Alta |
| RF-07 | Ao criar um modelo, o sistema deve rejeitar a operação se o usuário já possuir 20 modelos cadastrados, retornando HTTP 422 com mensagem "Limite de 20 modelos atingido. Exclua um modelo antes de criar outro." | Alta |
| RF-08 | Ao aplicar um modelo (clique no cartão), o campo `last_used_at` do modelo deve ser atualizado para `now()` no banco de dados. | Alta |
| RF-09 | O usuário pode renomear um modelo via menu de contexto (três pontos) no cartão, abrindo um modal com campo de texto (máx. 60 caracteres). | Média |
| RF-10 | O usuário pode excluir um modelo via menu de contexto (três pontos) no cartão, após confirmação em modal. A exclusão é permanente (hard delete — sem soft delete nesta tabela). | Média |
| RF-11 | A tray deve exibir um estado vazio com mensagem "Nenhum modelo ainda. Toque em + para criar." quando o usuário não possui modelos. | Média |
| RF-12 | O `useFormDraftGuard` existente não deve ser perturbado pela aplicação de um modelo — o preenchimento via modelo é tratado como entrada do usuário e o rascunho é atualizado normalmente. | Alta |
| RF-13 | Se o veículo salvo no modelo foi excluído (soft-delete em `vehicles`), o cartão deve exibir um aviso visual (ícone de alerta âmbar) e a aplicação do modelo deve abrir o formulário com os demais campos preenchidos e o `vehicle_id` em branco, com mensagem inline "Veículo deste modelo não está mais disponível." | Média |

### 7.2 Fluxo Principal — Aplicar Modelo (Happy Path)

1. Usuário abre `/expenses/new`.
2. Next.js Server Component carrega os modelos do usuário via `GET /expense-templates` (ordenados por `last_used_at DESC`).
3. Tray renderiza até 3 cartões visíveis + scroll horizontal + botão "+".
4. Usuário toca no cartão "Abastecimento Semanal".
5. Client Component chama `applyTemplate(template)`: preenche `vehicle_id`, `category`, `amount`, `description`, `liters` no estado do formulário (`react-hook-form`).
6. `PATCH /expense-templates/:id` atualiza `last_used_at = now()` no banco (fire-and-forget, não bloqueia UX).
7. Campos `date` e `odometer_km` permanecem inalterados.
8. Usuário revisa, ajusta se necessário, e submete.

### 7.3 Fluxo Alternativo A — Criar Modelo Inline

1. Usuário toca no botão "+" na tray.
2. Modal de criação abre com campos: `name` (obrigatório), `vehicle_id` (obrigatório), `category` (obrigatório), `amount` (obrigatório), `description` (opcional), `liters` (opcional, visível apenas quando `category === "fuel"`).
3. Se o formulário já estiver parcialmente preenchido, os campos do formulário pré-preenchem o modal.
4. Usuário submete. `POST /expense-templates` cria o registro.
5. Tray atualiza sem recarregar a página (otimistic update + revalidação).

### 7.4 Fluxo Alternativo B — Criar Modelo a Partir de Despesa Existente

1. Usuário acessa `/expenses/[id]` (tela de detalhe ou listagem com ação contextual).
2. Toca em "Salvar como modelo".
3. Modal abre com `name` vazio (obrigatório preencher) e demais campos pré-preenchidos com os dados da despesa.
4. Usuário nomeia e confirma. `POST /expense-templates` cria o registro.
5. Toast de confirmação: "Modelo '{name}' criado com sucesso."

### 7.5 Fluxo Alternativo C — Limite Atingido

1. Usuário tenta criar um novo modelo (inline ou via despesa existente) já possuindo 20 modelos.
2. Frontend verifica o count localmente e exibe aviso antes de chamar a API: "Você atingiu o limite de 20 modelos. Exclua um para criar outro."
3. Botão "+" fica desabilitado visualmente (opacidade 40%, `cursor-not-allowed`) quando o count de modelos for 20.
4. Se por alguma condição de corrida a API for chamada mesmo assim, o endpoint retorna HTTP 422 com `{ message: "Limite de 20 modelos atingido. Exclua um modelo antes de criar outro." }`.

---

## 8. Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | Performance — carregamento inicial da tray | Modelos carregados e renderizados em < 300 ms (P95) no LAN. Query indexada por `(user_id, last_used_at DESC)`. |
| RNF-02 | Performance — aplicação de modelo | Preenchimento do formulário deve ocorrer em < 50 ms (operação puramente client-side, sem round-trip de rede). |
| RNF-03 | Performance — atualização de `last_used_at` | Fire-and-forget: `PATCH /expense-templates/:id` não bloqueia a interação do usuário. Tolerância de falha silenciosa (sem impacto na UX). |
| RNF-04 | Segurança — isolamento multi-tenant | RLS Supabase garante que `SELECT`, `INSERT`, `UPDATE` e `DELETE` em `expense_templates` são restritos ao `auth.uid()` do token JWT. |
| RNF-05 | Segurança — autenticação | Todos os endpoints `/expense-templates` protegidos pelo `SupabaseAuthGuard` existente (JWT obrigatório). |
| RNF-06 | Limite de modelos — enforcement duplo | Trigger no banco (segunda camada) e validação no service NestJS (primeira camada). A trigger é o guard final. |
| RNF-07 | Acessibilidade | Cartões da tray devem ter `role="button"`, `aria-label="Aplicar modelo {name}"` e resposta a `Enter`/`Space`. Scroll horizontal deve ser acessível via teclado (`Tab` entre cartões). |
| RNF-08 | Design System | Cartões seguem o tema Classic Cars: fundo `bg-amber-50 dark:bg-espresso-900`, borda `border-amber-200`, corner 8px (`rounded-lg`), texto âmbar escuro. Botão "+" com estilo `ghost` âmbar. |

---

## 9. Critérios de Aceite

- [ ] CA-01: Dado um usuário com 3 modelos cadastrados, ao abrir `/expenses/new`, a tray exibe 3 cartões com os nomes dos modelos ordenados por `last_used_at DESC`.
- [ ] CA-02: Dado um usuário sem modelos, a tray exibe o estado vazio "Nenhum modelo ainda. Toque em + para criar."
- [ ] CA-03: Ao clicar em um cartão, os campos `vehicle_id`, `category`, `amount`, `description` e `liters` do formulário são preenchidos com os dados do modelo; `date` e `odometer_km` permanecem inalterados.
- [ ] CA-04: Após clicar em um cartão, um `PATCH /expense-templates/:id` com `{ last_used_at: now() }` é disparado; o modelo clicado sobe para o topo da tray na próxima abertura da página.
- [ ] CA-05: Ao clicar em "+" e preencher o modal, `POST /expense-templates` cria o registro e o cartão aparece na tray sem recarregar a página.
- [ ] CA-06: Ao tentar criar o 21º modelo, o botão "+" está desabilitado e o modal exibe "Você atingiu o limite de 20 modelos."
- [ ] CA-07: Se a API retornar HTTP 422 na criação (condição de corrida), o frontend exibe o toast de erro sem travar o formulário.
- [ ] CA-08: Via menu de contexto (três pontos) → "Excluir" → confirmação, o modelo é removido do banco e desaparece da tray.
- [ ] CA-09: Via menu de contexto (três pontos) → "Renomear" → novo nome, o modelo é atualizado e o cartão exibe o novo nome.
- [ ] CA-10: Em `/expenses/[id]`, ao clicar "Salvar como modelo", o modal abre com os campos pré-preenchidos; após nomear e confirmar, um toast exibe "Modelo '{name}' criado com sucesso."
- [ ] CA-11: Um modelo cujo `vehicle_id` referencia um veículo com soft-delete exibe ícone de alerta âmbar no cartão; ao clicar, o formulário é preenchido com `vehicle_id` em branco e os demais campos preenchidos.
- [ ] CA-12: Dois usuários distintos não veem os modelos um do outro (verificar via RLS com dois JWTs distintos).
- [ ] CA-13: O schema Zod de criação (`createExpenseTemplateSchema`) rejeita `name` vazio, `amount` negativo ou zero, e `liters` negativo ou zero.
- [ ] CA-14: A tray é scrollável horizontalmente em viewport 375px com 5 modelos cadastrados, sem quebra de layout.

---

## 10. Fora de Escopo

- Modelos de manutenção ou outros domínios além de despesas.
- Compartilhamento de modelos entre usuários.
- Edição inline dos campos do modelo diretamente na tray.
- Drag-and-drop para reordenação manual.
- Sugestões automáticas de criação de modelos por IA ou padrão de uso.
- Import/export de modelos em arquivo.

---

## 11. Arquitetura e Componentes Afetados

### 11.1 Backend (NestJS — `apps/api`)

| Camada | Arquivo | Mudança |
|--------|---------|---------|
| Módulo | `apps/api/src/modules/expense-templates/expense-templates.module.ts` | Novo módulo NestJS |
| Controller | `apps/api/src/modules/expense-templates/expense-templates.controller.ts` | `GET /`, `POST /`, `PATCH /:id`, `DELETE /:id` |
| Service | `apps/api/src/modules/expense-templates/expense-templates.service.ts` | CRUD + validação de limite 20 + atualização de `last_used_at` |
| Repository Port | `apps/api/src/modules/expense-templates/repositories/expense-template.repository.port.ts` | Interface abstrata |
| Repository Impl | `apps/api/src/modules/expense-templates/repositories/supabase-expense-template.repository.ts` | Implementação Supabase |
| DTOs | `apps/api/src/modules/expense-templates/dto/` | `CreateExpenseTemplateDto`, `UpdateExpenseTemplateDto`, `ApplyTemplateDto` |
| App Module | `apps/api/src/app.module.ts` | Registrar `ExpenseTemplatesModule` |

**Endpoints:**

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/expense-templates` | Lista modelos do usuário autenticado, ordenados por `last_used_at DESC` |
| `POST` | `/expense-templates` | Cria novo modelo (valida limite de 20) |
| `PATCH` | `/expense-templates/:id` | Atualiza nome, campos editáveis ou `last_used_at` |
| `DELETE` | `/expense-templates/:id` | Exclui modelo (hard delete) |

### 11.2 Validators (`packages/validators`)

| Arquivo | Mudança |
|---------|---------|
| `packages/validators/src/expense-templates.schema.ts` | Novo schema Zod: `createExpenseTemplateSchema`, `updateExpenseTemplateSchema` |
| `packages/validators/src/index.ts` | Exportar os novos schemas |

**Schema Zod principal:**

```typescript
// createExpenseTemplateSchema
{
  name: z.string().min(1).max(60),
  vehicle_id: z.string().uuid(),
  category: z.string().min(1),
  amount: z.coerce.number().positive(),
  description: z.string().max(255).optional().nullable(),
  liters: z.coerce.number().positive().optional().nullable(),
}
```

### 11.3 Frontend (Next.js — `apps/web`)

| Arquivo | Mudança |
|---------|---------|
| `apps/web/components/expenses/expense-templates-tray.tsx` | Novo Client Component: tray horizontal com scroll, cartões, botão "+", estado vazio |
| `apps/web/components/expenses/expense-template-card.tsx` | Novo Client Component: cartão individual com menu de contexto (três pontos) |
| `apps/web/components/expenses/expense-template-modal.tsx` | Novo Client Component: modal compartilhado para criar/renomear modelo |
| `apps/web/components/expenses/expense-form.tsx` | Integrar `<ExpenseTemplatesTray>` no topo; adicionar prop `onTemplateApply` |
| `apps/web/app/actions/expense-template-actions.ts` | Server Actions: `createTemplate`, `updateTemplate`, `deleteTemplate`, `updateLastUsed` |
| `apps/web/app/(dashboard)/expenses/[id]/page.tsx` | Adicionar botão "Salvar como modelo" no detalhe da despesa |

### 11.4 Banco de dados

| Arquivo | Mudança |
|---------|---------|
| `packages/database/src/supabase/migrations/005_expense_templates.sql` | Criação da tabela, índices, trigger de limite e políticas RLS |
| `packages/database/src/types/database.types.ts` | Regenerar via `supabase gen types typescript` após migration |

---

## 12. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: Veículo do modelo excluído | `vehicle_id` referencia registro com `deleted_at IS NOT NULL` | Cartão exibe ícone de alerta âmbar; ao aplicar, `vehicle_id` fica em branco com mensagem inline "Veículo deste modelo não está mais disponível." |
| EC-02: Categoria do modelo não existe mais em `allCategories` | Categoria removida do enum/lista | Cartão exibe categoria como texto puro (sem badge colorido). Aplicação preenche o campo com o valor salvo; se inválido para o schema Zod, formulário não submete e exibe erro de validação. |
| EC-03: Limite de 20 atingido ao tentar criar via concorrência | Dois dispositivos do mesmo usuário criando o 20º modelo simultaneamente | Trigger de banco lança exceção; API retorna HTTP 422; frontend exibe toast de erro. |
| EC-04: Falha na atualização de `last_used_at` | Timeout ou erro na chamada `PATCH /expense-templates/:id` após aplicar modelo | Fire-and-forget: falha silenciosa logada no servidor. A ordenação da tray pode ficar momentaneamente desatualizada — sem impacto funcional. |
| EC-05: Usuário aplica modelo e o formulário já tem rascunho salvo pelo `useFormDraftGuard` | sessionStorage tem rascunho parcial; usuário clica em modelo | Os campos do modelo sobrescrevem os valores correspondentes no rascunho. Campos não cobertos pelo modelo (ex: `odometer_km`) mantêm o valor do rascunho. |
| EC-06: `liters` preenchido no modelo mas `category !== "fuel"` | Inconsistência de dados herdados (ex: categoria alterada após salvar o modelo) | `liters` é ignorado na aplicação (campo só é exibido/preenchido quando `category === "fuel"`). O dado permanece no banco sem ser exposto na UI. |
| EC-07: Nome do modelo com 60 caracteres exibido em cartão estreito (mobile) | Texto muito longo para o cartão de ~120px de largura | Texto truncado com `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`. Tooltip com nome completo ao passar o cursor (desktop) / ao manter pressionado (mobile). |
| EC-08: Exclusão de veículo que é referenciado em modelos | `ON DELETE CASCADE` na FK `vehicle_id → vehicles(id)` | Os modelos referenciando o veículo são excluídos automaticamente pelo banco. |
| EC-09: Usuário sem modelos abre a tray | Array vazio retornado pela API | Estado vazio renderizado: "Nenhum modelo ainda. Toque em + para criar." com botão "+" habilitado. |

---

## 13. Segurança e Privacidade

- **Autenticação:** Todos os endpoints de `/expense-templates` são protegidos pelo `SupabaseAuthGuard` (padrão existente). Requisições sem JWT válido retornam HTTP 401.
- **Autorização:** RLS Supabase (`auth.uid() = user_id`) é a segunda camada de proteção. Mesmo que o `user_id` seja manipulado no payload, o Supabase rejeitará a operação.
- **Isolamento de dados:** O service NestJS injeta `userId` do JWT (via `@UserId()` decorator existente) em todas as queries — nunca confia no `user_id` do body.
- **Dados sensíveis:** `amount` é dado financeiro mas não é PII. Nenhuma informação de terceiros é exposta.
- **Hard delete intencional:** A tabela `expense_templates` não usa soft delete — modelos excluídos são removidos permanentemente, sem acúmulo de dados pessoais históricos desnecessários (alinhamento com LGPD Art. 15 — término do tratamento quando os dados não são mais necessários).

---

## 14. Plano de Rollout

- **Estratégia:** Feature flag via variável de ambiente `NEXT_PUBLIC_EXPENSE_TEMPLATES_ENABLED=true`. A tray é renderizada condicionalmente com base nessa flag.
- **Rollout progressivo:** Habilitar para 10% dos usuários na primeira semana, monitorar métricas, expandir gradualmente.
- **Como reverter (rollback):** Definir `NEXT_PUBLIC_EXPENSE_TEMPLATES_ENABLED=false`. A tabela no banco permanece sem impacto nos outros módulos. O módulo NestJS pode ser removido do `AppModule` se necessário.
- **Monitoramento pós-deploy:**
  - Count de `expense_templates` criados por dia (esperado crescimento gradual).
  - Taxa de HTTP 422 no `POST /expense-templates` (deve ser < 1% — indica que usuários estão atingindo o limite).
  - Erros no EC-04 (`last_used_at` update falhando) nos logs do NestJS.
  - Latência de `GET /expense-templates` no P95 (deve ser < 300 ms).

---

## 15. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | O limite de 20 modelos por usuário é adequado? Usuários com frotas de 10+ veículos e 5+ categorias frequentes podem precisar de mais. Alternativa: limite de 50, ou limite por veículo (5 por veículo). | Médio | douglps | Antes da implementação |
| OQ-02 | A atualização de `last_used_at` deve ser fire-and-forget (especificado) ou deve aguardar confirmação para garantir que a reordenação da tray seja imediata na próxima visita? Fire-and-forget é mais rápido mas a reordenação pode falhar silenciosamente. | Baixo | douglps | Antes da implementação |
| OQ-03 | O botão "Salvar como modelo" deve aparecer apenas na tela de detalhe (`/expenses/[id]`) ou também na listagem (`/expenses`) via menu de contexto por item? Menu na listagem aumenta a descoberta da feature mas adiciona complexidade de UI. | Médio | douglps | Antes da implementação |
| OQ-04 | O `useFormDraftGuard` deve ser desativado temporariamente ao aplicar um modelo, para evitar que o rascunho anterior interfira com os valores do modelo? Ou os valores do modelo devem simplesmente sobrescrever o rascunho? | Baixo | douglps | Antes da implementação |

---

## 16. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| Hard delete em `expense_templates` | Soft delete com `deleted_at` | Modelos são dados de preferência do usuário, não dados financeiros auditáveis. Hard delete alinha com LGPD (sem acúmulo de dados desnecessários) e simplifica a lógica de limite (COUNT(*) reflete sempre o estado real). |
| `last_used_at` como critério de ordenação | Ordem de criação (`created_at DESC`), ordem manual (posição numérica) | `last_used_at` coloca automaticamente na frente os modelos mais relevantes para o usuário sem exigir ação explícita de reordenação. Simples de implementar e intuitivo. |
| Campos ausentes no modelo: `date` e `odometer_km` | Incluir todos os campos e deixar o usuário decidir quais preencher ao aplicar | `date` quase sempre é "hoje" — salvar uma data específica geraria confusão ao aplicar dias depois. `odometer_km` é sequencial e nunca repetível — salvar um valor fixo causaria warning de odômetro (SPEC-20260601-001) em quase toda aplicação. |
| Limite de 20 por trigger no banco + validação no service | Apenas constraint no banco, ou apenas validação no service | Defense in depth: o service valida primeiro (boa UX, mensagem amigável); o trigger é o guard final que não pode ser contornado por bugs no service ou chamadas diretas ao banco. |
| Feature flag via env var | Sem feature flag (entrega direta) | Permite rollout progressivo e rollback instantâneo sem redeploy de código. Importante dado que a feature toca o formulário principal de lançamento de despesas. |
| Fire-and-forget para `last_used_at` | Aguardar confirmação do `PATCH` antes de liberar a UI | A atualização de `last_used_at` é informativa (afeta apenas ordenação da tray). Aguardar o round-trip bloquearia a UX principal (preenchimento do formulário) por uma operação de baixa criticidade. |
| Tray como Client Component, dados carregados no Server Component pai | Tray como Server Component (sem interatividade) | A tray precisa de interatividade (clique para preencher formulário, scroll, modal). O Server Component pai carrega os dados via `GET /expense-templates` e os passa como props para a tray — aproveitando o modelo de streaming do Next.js 15 App Router. |

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec | SPEC-20260601-001 | Validação de odômetro — `odometer_km` é intencionalmente excluído dos modelos para evitar warnings automáticos ao aplicar |
| Spec | SPEC-20260601-002 | Detecção de duplicata — ao aplicar um modelo, o lançamento subsequente passa pela verificação de duplicata normalmente |
| Spec | SPEC-20260524-001 | Autenticação — `SupabaseAuthGuard` e `@UserId()` decorator reutilizados |
| Biblioteca | `react-hook-form` | Já em uso no `expense-form.tsx` — `setValue()` usado para aplicar valores do modelo |
| Biblioteca | `zod` | Já em uso em `packages/validators` — novo schema `expense-templates.schema.ts` |
| Infraestrutura | Supabase RLS | Políticas RLS owner-only na tabela `expense_templates` |
| Infraestrutura | Supabase Triggers | Trigger `trg_expense_templates_limit` para enforcement de limite no banco |
| Componente | `apps/web/components/expenses/expense-form.tsx` | Integração da tray no topo do formulário existente |
| Componente | `apps/web/components/form-draft-guard.tsx` | Comportamento de rascunho deve ser compatível com aplicação de modelos (EC-05) |

---

## Apêndice

### Referências

- `apps/web/components/expenses/expense-form.tsx` — formulário atual com campos `vehicle_id`, `category`, `amount`, `date`, `description`, `odometer_km`, `liters`
- `apps/web/components/form-draft-guard.tsx` — guard de rascunho em sessionStorage (EC-05)
- `apps/api/src/modules/expenses/` — padrão de módulo NestJS a ser replicado
- `apps/api/src/modules/categories/` — módulo recente sem spec formal; padrão de estrutura a seguir
- `packages/validators/src/expenses.schema.ts` — schema Zod de referência para o novo schema de modelos
- `packages/database/src/supabase/migrations/003_user_categories.sql` — migration de referência com RLS owner-only a seguir como padrão

### Histórico de Revisões

| Versão | Data | Autor | Mudanças |
|--------|------|-------|---------|
| 1.0 | 2026-06-01 | douglps | Criação inicial |
| — | 2026-07-14 | douglps (via T3.4) | **Implementação com desvios de escopo documentados** (mudança pequena, sem alterar requisitos): tabela/índices/trigger/RLS já existiam desde T0.2, nenhuma migration nova. RF-05 (modal) implementado como formulário inline — projeto não tem componente de modal. RF-08 (bump de `last_used_at`) implementado como rota dedicada `PATCH /expense-templates/:id/touch` em vez de reaproveitar `PATCH /:id`, pois `last_used_at` não é campo do DTO de update validado publicamente (RF-09). Feature flag (Seção 14) não implementada — nenhuma outra feature do projeto usa flag de ambiente; entra direto atrás de autenticação, como T3.0–T3.3. RF-09 (renomear via menu de contexto), RF-02 (contagem responsiva exata) e o ícone de alerta âmbar de RF-13/EC-01 ficam ⏳ (endpoint de RF-09 existe; UI não construída). Detalhe completo em `matrices/rastreabilidade.md`. |
