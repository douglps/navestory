---
id: SPEC-20260612-003
title: "Preferência de Rascunho Automático em Formulários"
status: approved
date: 2026-06-12
author: douglps
rules: [R-PREF-01, R-PREF-02]
security: [S2]
---

# SPEC-20260612-003: Preferência de Rascunho Automático em Formulários

## 1. Resumo

Remove o comportamento atual de **rascunho automático sempre ativo** no `ExpenseForm` (salvo em `sessionStorage` ao fechar a aba/expirar a sessão) e o transforma em uma **preferência opcional do usuário**, configurável na tela de Preferências, com **default desativado** ("sem rascunho").

## 2. Contexto e Motivação

Pedido do usuário (2026-06-12): o rascunho automático (`useFormDraftGuard`/`FormDraftGuard`, `apps/web/components/form-draft-guard.tsx`) hoje é incondicional para `ExpenseForm` em modo de criação (`expense-form.tsx` linha 296 e 377). Parte dos usuários prefere que o formulário sempre comece vazio. A preferência segue o padrão já estabelecido por `vehicle_chip_fields` em `user_preferences` ([SPEC-20260603-004](SPEC-20260603-004-user-preferences-migration.md), R-PREF-01: toda preferência tem default seguro e ausência de registro não causa erro).

---

## 3. RF-01 — Nova preferência `auto_draft_enabled`

**RF-01.1** — Nova coluna em `user_preferences`:
```sql
alter table public.user_preferences
  add column auto_draft_enabled boolean not null default false;
```
Migração nova em `supabase/migrations/`, seguindo o padrão de `20260604000000_user_preferences.sql` (RLS já cobre a tabela — sem novas policies).

**RF-01.2** — `packages/validators/src/display-preferences.schema.ts` recebe novo campo:
```ts
export const displayPreferencesSchema = z.object({
  vehicle_chip_fields: chipFieldsSchema,
  auto_draft_enabled: z.boolean(),
});
export const DEFAULT_AUTO_DRAFT_ENABLED = false;
```

**RF-01.3** — `apps/web/app/actions/user-preferences.ts` recebe `getAutoDraftPreference()` e `updateAutoDraftPreference(enabled: boolean)`, seguindo exatamente o padrão de `getChipFields`/`updateChipFields` (busca por `user_id`, fallback para `DEFAULT_AUTO_DRAFT_ENABLED` quando ausente ou usuário não autenticado).

---

## 4. RF-02 — Toggle em Preferências

**RF-02.1** — Na tela de Preferências (mesma área de `vehicle-display-preferences.tsx` ou seção equivalente), adicionar um toggle **"Rascunho automático"** com descrição curta (ex.: "Salva automaticamente os dados não enviados de formulários ao fechar a aba ou expirar a sessão"). Default visual: desativado.

**RF-02.2** — Segue o padrão de UI já usado em `vehicle-display-preferences.tsx`: estado local + `isDirty`, `safeParse` do schema, `startTransition` com feedback "Salvando…"/"✓ Salvo", botões Salvar/Cancelar.

---

## 5. RF-03 — `ExpenseForm` respeita a preferência

**Estado atual:** `useFormDraftGuard(form)` e `<FormDraftGuard wasRestored={wasRestored} />` são chamados incondicionalmente em modo de criação (`expense-form.tsx` linhas 296, 377).

**RF-03.1** — `ExpenseForm` recebe a preferência `auto_draft_enabled` (via prop, carregada pelo server component/page que renderiza o formulário, mesmo padrão de `customCategories`/`templates`).

**RF-03.2** — Quando `auto_draft_enabled === false` (default):
- `useFormDraftGuard` não é chamado (ou é chamado em modo no-op) — nenhum listener de `beforeunload`/`nave:session-expiring` é registrado, nenhuma leitura/escrita em `sessionStorage`.
- `<FormDraftGuard wasRestored={...} />` não é renderizado.

**RF-03.3** — Quando `auto_draft_enabled === true`, o comportamento atual (restaurar/salvar rascunho em `sessionStorage`) é mantido sem alterações.

**RF-03.4** — `clearDraft()` (chamado em `onSubmit` e no botão "Cancelar") continua sendo seguro de chamar mesmo com a preferência desativada (no-op se nunca houve rascunho).

**Critério de aceite:**
- Preferência desativada (default): preencher parcialmente o formulário de Nova Despesa e recarregar a página → formulário aparece vazio, nenhuma chave `nave_form_draft_*` é criada em `sessionStorage`.
- Preferência ativada: mesmo cenário restaura os dados preenchidos (comportamento atual).

---

## 6. Regras Novas (specs/RULES.md)

| ID | Regra | Mudança |
|----|-------|---------|
| **R-PREF-02** (novo) | `auto_draft_enabled` controla se formulários (iniciando por `ExpenseForm`) persistem rascunho em `sessionStorage`; default `false` (sem rascunho). Aplica R-PREF-01 (default seguro, ausência de registro não causa erro) | Novo |

---

## 7. Arquivos Afetados (referência de implementação)

- `supabase/migrations/` — nova migration, coluna `auto_draft_enabled` em `user_preferences` (RF-01.1)
- `packages/validators/src/display-preferences.schema.ts` — RF-01.2
- `apps/web/app/actions/user-preferences.ts` — RF-01.3
- `apps/web/components/profile/vehicle-display-preferences.tsx` (ou novo componente irmão) — RF-02
- `apps/web/components/expenses/expense-form.tsx` — RF-03 (prop `autoDraftEnabled`, condiciona `useFormDraftGuard`/`FormDraftGuard`)
- Página que renderiza `ExpenseForm` (`apps/web/app/(dashboard)/expenses/new/...` ou equivalente) — passa a preferência carregada via `getAutoDraftPreference()`
- `specs/RULES.md` — R-PREF-02

---

## Histórico de Revisões
| Versão | Data | Autor | Mudanças |
|--------|------|-------|---------|
| 1.0 | 2026-06-12 | douglps | Criação inicial |
