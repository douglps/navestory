---
id: SPEC-20260612-002
title: "Ajustes de Campos e Layout do Formulário de Despesas"
status: approved
date: 2026-06-12
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-EXP-01, R-ODO-02, R-FUEL-06]
security: []
camadas: [frontend, backend]
---

# SPEC-20260612-002: Ajustes de Campos e Layout do Formulário de Despesas

## 1. Resumo

Conjunto de ajustes pontuais no `ExpenseForm` (`/expenses/new` e edição): aumento do limite máximo do campo Valor para R$ 100.000.000,00, campo auxiliar para edição direta do ano na Data, mudança do campo "Tipo de Abastecimento" para "Tanque cheio?" com default neutro (tri-state), confirmação do limite de 7 dígitos no Odômetro (incluindo validação de schema) e reorganização do layout agrupando os campos obrigatórios no início do formulário.

## 2. Contexto e Motivação

Pedido do usuário (2026-06-12), consolidando 5 ajustes incrementais no mesmo formulário (`apps/web/components/expenses/expense-form.tsx`) e no schema compartilhado (`packages/validators/src/expenses.schema.ts`). A remoção do rascunho automático e sua migração para preferências é tratada separadamente em [SPEC-20260612-003](../preferences/SPEC-20260612-003-auto-draft-preference.md), pois afeta `user_preferences` e a tela de Preferências, não apenas este formulário.

---

## 3. RF-01 — Valor máximo da despesa: R$ 100.000.000,00

**Estado atual:**

- `packages/validators/src/expenses.schema.ts` (`amount`): `.max(999999.99, 'Valor muito alto.')`.
- `packages/ui/src/components/masked-input.tsx`: `CURRENCY_MAX_DIGITS = 10` (permite digitar até R$ 99.999.999,99).

**RF-01.1** — `amount` passa a aceitar valores de `0,01` até `100.000.000,00` (inclusive). Schema: `.max(100000000, 'Valor muito alto (máx. R$ 100.000.000,00).')`.

**RF-01.2** — `CURRENCY_MAX_DIGITS` em `masked-input.tsx` passa de `10` para `11`, permitindo digitar até `999.999.999,99` no `CurrencyInput`. A validação de negócio (R-EXP-01) continua sendo o `.max()` do Zod no submit — o limite de dígitos da máscara é apenas folga de digitação, não o limite de negócio.

**Critério de aceite:** digitar `10000000000` (11 dígitos) no campo Valor exibe `100.000.000,00` e o formulário submete com sucesso; digitar um dígito adicional mantém `999.999.999,99` na máscara, mas o submit é rejeitado pela mensagem de RF-01.1 caso o valor exceda R$ 100.000.000,00.

---

## 4. RF-02 — Campo de Ano editável próximo à Data

**Problema:** o `DatePicker` (`@navestory/ui`) exige navegação mês a mês (ou abertura do seletor de ano do calendário) para alterar o ano de uma data distante (ex.: lançar uma despesa retroativa de anos anteriores).

**RF-02.1** — Adicionar, ao lado do `DatePicker` no campo "Data da Despesa", um `OdometerInput`-like (input numérico simples, 4 dígitos, sem máscara de milhar) rotulado "Ano", exibindo o ano da `date` atual do formulário.

**RF-02.2** — Editar o campo "Ano" atualiza apenas o componente de ano da `date` do formulário (mantém mês e dia), via `field.onChange(format(new Date ajustada, 'yyyy-MM-dd'))`. Edição do `DatePicker` continua atualizando `date` por completo (e portanto reflete no campo "Ano").

**RF-02.3** — Validação: o campo "Ano" aceita 4 dígitos numéricos. Anos resultantes em data inválida (ex.: 29/02 em ano não bissexto) ajustam o dia para o último dia válido do mês (comportamento padrão de `date-fns`/`Date`, sem mensagem de erro adicional).

**Critério de aceite:** com `date = 2026-06-12`, alterar o campo "Ano" para `2023` resulta em `date = 2023-06-12`; o `DatePicker` reflete a nova data.

---

## 5. RF-03 — "Tipo de Abastecimento" → "Tanque cheio?" (tri-state, default nenhum)

**Estado atual:**

- Campo `full_tank` (`boolean | null`), label "Tipo de Abastecimento", toggle binário "Cheio" / "Parcial".
- Default em criação: `full_tank: true` (`expense-form.tsx` linha 153) — e também restaurado para `true` ao sair da categoria combustível (linha 288).
- `kmPerLiter` só é calculado quando `watchedFullTank === true` (R-FUEL-02, inalterado).

**RF-03.1** — Renomear o label do campo para **"Tanque cheio?"**.

**RF-03.2** — Default passa de `true` para `null` ("nenhum") tanto no `defaultValues` do formulário (criação) quanto no reset ao sair da categoria combustível (linha 288).

**RF-03.3** — O controle passa a ser tri-state: dois botões **"Sim"** / **"Não"**, nenhum ativo quando `field.value === null`/`undefined`. Clicar no botão já ativo desmarca (volta para `null`). Estilo visual segue o padrão atual (`cn()` com classes ativa/inativa), com terceiro estado = nenhum botão destacado.

**RF-03.4** — `R-FUEL-02` (cálculo de `km/L`) permanece **inalterada** na regra (`full_tank = true` + histórico + `liters > 0`), mas como o default agora é `null`, o `km/L` só aparece após o usuário confirmar explicitamente "Sim".

**Critério de aceite:** ao abrir o formulário de uma nova despesa de combustível, nenhum dos botões "Sim"/"Não" está destacado e o `km/L` não é exibido mesmo havendo histórico de odômetro, até o usuário clicar em "Sim".

---

## 6. RF-04 — Odômetro até 7 dígitos: validação de schema

**Estado atual:** `OdometerInput` (UI) já limita a digitação a 7 dígitos (`ODOMETER_MAX_DIGITS = 7`, [SPEC-20260612-001](SPEC-20260612-001-expense-form-ux-improvements.md) RF-03), mas `odometer_km` em `expenses.schema.ts` não possui `.max()` — outros consumidores do schema (ex.: `apps/api`, scripts) não têm esse limite.

**RF-04.1** — `odometer_km` em `expenseBaseSchema` recebe `.max(9999999, 'Quilometragem muito alta (máx. 9.999.999 km).')`, alinhando o schema compartilhado ao limite já aplicado na UI.

**Critério de aceite:** `createExpenseInputSchema.parse({ ..., odometer_km: 10000000 })` lança erro de validação com a mensagem acima.

---

## 7. RF-05 — Reorganização do layout: campos obrigatórios agrupados no início

**Estado atual (ordem do formulário):**

1. Veículo \*
2. Categoria _ + Valor _ (lado a lado)
3. Data \*
4. _(se combustível)_ Tipo de Combustível + Tipo de Abastecimento (full_tank)
5. _(se combustível)_ Odômetro \* + Litros + Valor por Litro
6. _(se combustível)_ Fornecedor
7. Descrição (opcional)

**Problema:** o Odômetro — obrigatório quando `category = 'fuel'` — fica no meio da seção de combustível, distante dos demais campos obrigatórios (Veículo, Categoria, Valor, Data), dificultando a percepção do que é mandatório no formulário.

**RF-05.1** — Nova ordem:

1. Veículo \*
2. Categoria _ + Valor _ (lado a lado)
3. Data \* + Ano (lado a lado, RF-02)
4. _(se combustível)_ **Odômetro \*** — movido para imediatamente após Data/Ano, fora do agrupamento visual "Dados do Abastecimento"
5. _(se combustível)_ Card "Dados do Abastecimento" (opcional): Tipo de Combustível, Tanque cheio? (RF-03), Litros, Valor por Litro, Fornecedor
6. Descrição (opcional)

**RF-05.2** — Os indicadores visuais existentes (`*` no label, hint de odômetro, badges) são preservados na nova posição — apenas a posição no DOM/JSX muda, não o componente em si.

**Critério de aceite:** ao selecionar categoria "Combustível", o campo Odômetro (com `*` e hint) aparece imediatamente abaixo de Data/Ano e acima do card "Dados do Abastecimento"; todos os campos com `*` (Veículo, Categoria, Valor, Data, Odômetro-quando-combustível) ficam nas primeiras posições do formulário, antes de qualquer campo opcional.

---

## 8. Regras Novas/Atualizadas (specs/RULES.md)

| ID                   | Regra                                                                                                                                                                                     | Mudança |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **R-EXP-01** (novo)  | `amount` de uma despesa deve estar entre `0,01` e `100.000.000,00` (inclusive)                                                                                                            | Novo    |
| **R-ODO-02** (novo)  | `odometer_km`, quando informado, não pode exceder `9.999.999` (7 dígitos) — validado no schema compartilhado (`expenseBaseSchema`), além do limite já existente na UI (`OdometerInput`)   | Novo    |
| **R-FUEL-06** (novo) | `full_tank` é tri-state (`true` / `false` / `null`); default `null` ("Tanque cheio?" sem seleção). `R-FUEL-02` (cálculo de km/L exige `full_tank = true`) permanece válida sem alterações | Novo    |

---

## 9. Arquivos Afetados (referência de implementação)

- `packages/validators/src/expenses.schema.ts` — RF-01.1, RF-04.1
- `packages/ui/src/components/masked-input.tsx` — RF-01.2 (`CURRENCY_MAX_DIGITS = 11`)
- `apps/web/components/expenses/expense-form.tsx` — RF-02, RF-03, RF-05 (campo Ano, toggle "Tanque cheio?" tri-state, reordenação do JSX, defaults)
- `apps/web/components/expenses/expense-form.spec.tsx` — novos testes para RF-01..RF-05
- `specs/RULES.md` — R-EXP-01, R-ODO-02, R-FUEL-06

---

## Histórico de Revisões

| Versão | Data       | Autor   | Mudanças                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------ | ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0    | 2026-06-12 | douglps | Criação inicial                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 1.1    | 2026-06-12 | douglps | Implementação via TDD (RF-01..RF-05). Status: aprovada.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 1.2    | 2026-07-14 | douglps | Implementação real (T3.9) — a v1.1 registrava "implementado" mas o código não existia (matriz de rastreabilidade estava com todos os itens ⏳; corrigido nesta rodada). RF-01/RF-04 (`amount`/`odometer_km` max) já estavam corretos em `expenseBaseSchema` desde T3.0, coincidentemente. RF-02, RF-03 e RF-05 implementados em `apps/web/src/app/expenses/{new/page.tsx,[id]/page.tsx}` sobre a stack real do projeto (`useState`, sem react-hook-form) — ver changelog de SPEC-20260612-001 para o racional completo do desvio de arquitetura. |
