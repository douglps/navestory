---
id: SPEC-20260612-001
title: "Melhorias de UX no Formulário de Despesas e Hub Financeiro"
status: approved
date: 2026-06-12
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-ODO-01, R-CTX-06, R-FUEL-03, R-LED-01]
security: [S1, S2]
camadas: [frontend, backend, database]
---

# SPEC-20260612-001: Melhorias de UX no Formulário de Despesas e Hub Financeiro

## 1. Resumo

Conjunto de correções e melhorias identificadas na análise de UX do módulo `/expenses` (relatório de 2026-06-12): correção do KPI/tab "Próximos 30 dias", herança reativa do veículo em foco no formulário de Nova Despesa, máscaras numéricas pt-BR reutilizáveis (moeda e odômetro), campo editável de preço por litro com cálculo cruzado, validação rígida (hard block) de regressão de odômetro e melhoria das mensagens de erro ao atualizar despesas.

## 2. Contexto e Motivação

A análise de UX identificou 6 problemas concretos no fluxo de `/expenses` e `/expenses/new`. Esta spec consolida as correções como um único incremento (Sprint 5 — Expenses UX Fixes), pois compartilham o mesmo formulário/página e são entregues juntas.

---

## 3. RF-01 — Correção do KPI "Próximos 30 dias" e tab "Próximas"

**Problema:**
1. `kpiUpcoming` (página `/expenses`) só é calculado quando `tab === 'todas'` ou `tab === 'proximas'`. Nas abas "Em atraso" e "Por veículo", o KPI "Próximos 30 dias" exibe sempre `R$ 0,00` / "nenhum gasto previsto", mesmo havendo itens futuros.
2. A RPC `get_upcoming_costs` cobre apenas `maintenances`, `fines` e `vehicle_recurring_costs` — despesas manuais (`expenses`, `source_type IS NULL`) com `date` futura não entram no cálculo de "próximos gastos", mesmo sendo lançamentos relevantes para o planejamento financeiro.

**RF-01.1** — O cálculo de `kpiUpcoming` deve ser executado em **todas as abas**, não apenas `todas`/`proximas`.

**RF-01.2** — A RPC `get_upcoming_costs` recebe uma 4ª fonte: despesas manuais (`source_type IS NULL`, `deleted_at IS NULL`, `date > CURRENT_DATE`, dentro do horizonte) com `source_type = 'expense'`, `is_estimated = false`.

**Critério de aceite:** com uma despesa manual de categoria qualquer, `date` = hoje + 5 dias, o item aparece na tab "Próximas" e é somado ao KPI "Próximos 30 dias", independentemente da aba ativa.

---

## 4. RF-02 — Reatividade do veículo global no formulário de Nova Despesa

**Decisão (revoga parcialmente R-CTX-06 para o campo Veículo do `ExpenseForm`):** o campo `vehicle_id` do formulário passa a escutar continuamente o store global (`useDashboardStore`), não apenas no mount. Toda vez que o veículo em foco (`activeVehicleId`, modo `single`) mudar, o campo `vehicle_id` é atualizado automaticamente para o novo veículo — **a menos que o usuário já tenha selecionado manualmente outro veículo no formulário** (`ctx.isInherited === false`).

Como `selectedVehicleId` já é a fonte de todos os efeitos dependentes (hint de odômetro, prefill de `fuel_type`, sugestões de fornecedor), atualizar `vehicle_id` automaticamente propaga "imediatamente" para essas features — sem necessidade de lógica adicional.

**RF-02.1** — Enquanto `ctx.isInherited === true`, mudanças em `useDashboardStore().activeVehicleId` (modo `single`) atualizam `form.setValue('vehicle_id', novoId)`.

**RF-02.2** — Após seleção manual do usuário (`ctx.onManualSelect()`), o formulário para de escutar o store — comportamento R-CTX-06 original retorna a valer para esse formulário.

**RF-02.3** — O aviso "O veículo em foco foi alterado..." (RF-14 / `contextChangedSinceMount`) deixa de ser exibido para o campo Veículo quando `isInherited === true`, pois agora a mudança é aplicada automaticamente (não há mais nada para avisar). O aviso permanece para o caso `isInherited === false` (informativo, sem ação).

---

## 5. RF-03 — Máscaras numéricas pt-BR reutilizáveis (`@nave/ui`)

Módulo `packages/ui/src/components/masked-input.tsx`, exportando:

- **Máscara progressiva ("caixa eletrônico")**: o estado interno é um
  acumulador de dígitos puros. Cada dígito digitado entra **pela direita**,
  empurrando os dígitos já presentes para a esquerda (preenchendo primeiro as
  casas decimais e depois os grupos de milhar). Backspace remove o último
  dígito do acumulador. Caracteres não numéricos (`,` e `.`) digitados são
  **ignorados** (não alteram o valor nem o display).
  - Exemplos (`CurrencyInput`, dígitos digitados em sequência): `"1"` → `0,01`;
    `"1","2"` → `0,12`; `"1","2","3"` → `1,23`; `"1","2","3","4","5","0","0"`
    → `1.234,50`.
  - Exemplos (`OdometerInput`): `"5"` → `5`; `"5","8","4","2","0"` → `58.420`.
- `digitsToCurrencyDisplay(digits: string): string` — formata dígitos puros
  (centavos) como `"1.234,56"`.
- `digitsToOdometerDisplay(digits: string): string` — formata dígitos puros
  como `"58.420"` (separador de milhar, sem decimais).
- `currencyDigitsToValue`/`valueToCurrencyDigits` e
  `odometerDigitsToValue`/`valueToOdometerDigits` — conversões entre dígitos
  puros e o valor numérico (`number | undefined`).
- `CurrencyInput` — componente controlado (`value?: number`,
  `onChange(value: number | undefined)`), prefixo `R$` por padrão
  (`prefix={null}` oculta).
- `OdometerInput` — componente controlado (`value?: number`,
  `onChange(value: number | undefined)`), sem casas decimais.

**RF-03.1** — `ExpenseForm` substitui a lógica inline de `amount` por `CurrencyInput`.
**RF-03.2** — `ExpenseForm` substitui o `<input type="number">` de `odometer_km` por `OdometerInput`.
**RF-03.3** — `liters` e o novo campo `price_per_liter` (RF-05) usam `CurrencyInput` (sem prefixo `R$` para litros — prop `prefix` opcional).

---

## 6. RF-04 — Validação rígida (hard block) de regressão de odômetro

**Decisão:** supersede o comportamento "soft warning" de `SPEC-20260601-001`/R1 **no fluxo web** (server actions em `apps/web/app/actions/expense-actions.ts`, único caminho usado pelo `ExpenseForm`). Nova regra **R-ODO-01** (ver `specs/RULES.md`).

**RF-04.1** — Ao criar ou atualizar uma despesa com `odometer_km` informado:
- Buscar o maior `odometer_km` de despesas ativas (`deleted_at IS NULL`) do mesmo veículo com `date <= date` da despesa atual (excluindo o próprio registro em update). Se `odometer_km` informado for **menor** que esse máximo → **rejeitar** com erro: `"Odômetro inválido: o último valor registrado para este veículo foi {max} km em {data}. Informe um valor igual ou maior."`
- Buscar o menor `odometer_km` de despesas ativas do mesmo veículo com `date > date` da despesa atual. Se `odometer_km` informado for **maior** que esse mínimo → **rejeitar** com erro: `"Odômetro inválido: existe um registro de {min} km em {data}, posterior a esta despesa. Informe um valor igual ou menor."`
- Se nenhum dos dois casos ocorrer, a operação prossegue normalmente.

**RF-04.2** — Quando `odometer_km` é `null`/ausente, nenhuma verificação é feita (mantém RF-01/G-03 de `SPEC-20260601-001`).

**RF-04.3** — O hint "Último: X km · Y dias atrás" (já implementado, `getOdometerHintAction`) é mantido e passa a ser a fonte da mensagem de erro acima (mesmo dado, `findMaxOdometerByVehicle`-like, agora considerando data).

**Edge cases:**
- Primeiro lançamento do veículo (sem histórico): sem verificação, sempre aceito.
- `odometer_km` igual ao máximo/mínimo: aceito (`>=`/`<=`).
- Duas despesas no mesmo dia: comparação usa `date <= / date >` — desempates por data igual não geram bloqueio cruzado entre si na mesma operação (apenas contra registros já persistidos).

---

## 7. RF-05 — Campo "Valor por Litro" editável com cálculo cruzado

**Problema:** `price_per_liter` (R$/L) e `km_per_liter` são hoje apenas badges de leitura, calculados a partir de `amount` e `liters`. Falta um campo editável de R$/L que permita ao usuário informar o preço da bomba e o sistema calcular o total.

**RF-05.1** — Novo campo `price_per_liter` (não persistido — `R-FUEL-03` permanece válido: nunca salvo em `expenses`), exibido na seção de combustível como `CurrencyInput`.

**RF-05.2** — Relação: `amount = liters × price_per_liter`. Os três campos (`amount`, `liters`, `price_per_liter`) são interdependentes. O sistema mantém uma pilha de ordem de edição manual (do mais recente para o mais antigo) e, a cada edição, recalcula o campo-alvo pela seguinte prioridade:
- Se nenhum dos outros dois campos foi editado manualmente ainda (formulário do zero) → usa o pareamento padrão: editar `liters` ou `price_per_liter` → recalcula `amount`; editar `amount` → recalcula `price_per_liter` (ou `liters`, se `price_per_liter` já presente e `liters` ausente).
- Se só um dos outros dois já foi editado manualmente → recalcula o que **não** foi editado.
- Se **ambos** já foram editados manualmente → recalcula o que foi editado manualmente **há mais tempo**, preservando sempre o campo editado mais recentemente.

Isso garante que os três valores permaneçam sempre consistentes entre si (nunca há um estado "travado" ou matematicamente inconsistente) e que nenhuma edição sobrescreve silenciosamente o campo que o usuário acabou de preencher por último. (Revisão 2026-07-04: a formulação original — "o último campo editado não é recalculado, os outros dois ajustam-se" — permitia que o recálculo incondicional sobrescrevesse um campo preenchido manualmente momentos antes; ver [SPEC-20260619-001](../forms/SPEC-20260619-001-form-standard.md) R-FUEL-08 para o mecanismo compartilhado com o pre-fill de fornecedor.)

**RF-05.3** — Linha de exemplo: abaixo dos três campos, exibir um resumo somente-leitura no formato:
`"{liters} L × R$ {price_per_liter}/L = R$ {amount}"` — sempre que os três valores estiverem presentes e consistentes (tolerância de R$ 0,01 por arredondamento).

---

## 8. RF-06 — Mensagens de erro reais ao atualizar despesa

**Problemas (P1–P4, ver análise de UX):**
- `updateExpenseInputSchema` não valida `category === 'fuel' ⇒ odometer_km` obrigatório (só `createExpenseInputSchema` valida).
- `updateExpenseAction` não verifica `source_type`/`is_readonly` antes do update — uma despesa automática poderia, em tese, ser atualizada via chamada direta da action (a UI já bloqueia, mas a action não).
- Erros do Supabase retornam sempre `"Erro ao atualizar despesa."`, sem diferenciar causa.

**RF-06.1** — `updateExpenseInputSchema` recebe o mesmo `superRefine` de `createExpenseInputSchema` (categoria `fuel` ⇒ `odometer_km` obrigatório quando `category` é alterado para `fuel` ou já é `fuel`).

**RF-06.2** — `updateExpenseAction` busca a despesa existente antes de atualizar; se `source_type IS NOT NULL` (`is_readonly`), retorna erro: `"Esta despesa foi gerada automaticamente e não pode ser editada."` (valida R-LED-01 também no fluxo web).

**RF-06.3** — Erros do Supabase em update/delete/create passam a incluir o código (`error.code`) no log do servidor; a mensagem ao usuário diferencia pelo menos: despesa não encontrada/sem permissão (`PGRST116`/0 rows) vs. erro genérico de banco.

---

## 9. Regras Atualizadas (specs/RULES.md)

| ID | Mudança |
|----|---------|
| **R-ODO-01** (novo) | "No fluxo web (server actions de `expenses`), `odometer_km` informado é validado contra o histórico do veículo por data: não pode ser menor que o máximo registrado em data anterior/igual, nem maior que o mínimo registrado em data posterior. Violação rejeita a operação (hard block)." — Supersede R1 **apenas para o fluxo web**; R1/SPEC-20260601-001 permanece válida para `apps/api` (NestJS), usada por outros clientes. |
| **R-CTX-06** (atualizado) | Adicionar ressalva: "...exceto o campo `vehicle_id` do `ExpenseForm`, que permanece reativo ao store enquanto `isInherited === true` (ver SPEC-20260612-001 RF-02)." |

---

## 10. Arquivos Afetados (referência de implementação)

- `supabase/migrations/` — nova migration para 4ª fonte em `get_upcoming_costs` (RF-01.2)
- `apps/web/app/(dashboard)/expenses/page.tsx` — RF-01.1
- `apps/web/hooks/use-vehicle-context-field.ts` — RF-02
- `apps/web/components/expenses/expense-form.tsx` — RF-02, RF-03, RF-05
- `packages/ui/src/components/masked-input.tsx` (novo) + `packages/ui/src/index.ts` — RF-03
- `packages/validators/src/expenses.schema.ts` — RF-06.1
- `apps/web/app/actions/expense-actions.ts` — RF-04, RF-06.2, RF-06.3

---

## Histórico de Revisões
| Versão | Data | Autor | Mudanças |
|--------|------|-------|---------|
| 1.0 | 2026-06-12 | douglps | Criação inicial — consolida 6 itens da análise de UX de 2026-06-12 |
| 1.1 | 2026-06-12 | douglps | RF-03: corrige bug que limitava os campos Valor/Litros/$ por Litro a aceitar apenas um dígito. Substitui a máscara de "preenchimento à direita" (`formatCurrencyMask`/`formatOdometerMask`) por um acumulador de dígitos estilo caixa eletrônico (`digitsToCurrencyDisplay`/`digitsToOdometerDisplay` + helpers de conversão). API pública de `CurrencyInput`/`OdometerInput` inalterada. |
| 1.2 | 2026-07-14 | douglps | Implementação (T3.9). **Desvio de arquitetura decidido com o usuário**: esta spec e SPEC-20260619-001 pressupõem Next.js Server Actions + react-hook-form + `@nave/ui` (`FormField`/`DatePicker`/etc.), stack nunca construída neste projeto — todo o `apps/web` usa client components com `useState` + TanStack Query chamando `apps/api` (NestJS) via `apiClient`. Decisão: adaptar as regras de negócio à stack real, documentar o desvio, e adiar a stack-alvo para quando a Fase 8 evoluir os componentes de design system. Implementado: RF-01.1 (KPI "Próximos 30 dias" já era calculado em todas as abas nesta implementação, sem o bug descrito no RF original), RF-01.2 (4ª fonte `expense` na RPC `get_upcoming_costs`, migration `20260714220000`), RF-03 (`CurrencyInput`/`OdometerInput` como componentes React simples controlados em `packages/ui`, sem react-hook-form), RF-04 (hard-block de odômetro via `?strict=true`, opt-in — não existe uma "rota web" separada da API neste projeto, então o supersede de R1 vira uma flag explícita enviada só pelo `apps/web`, preservando o soft-warning como default para outros consumidores), RF-05 (cálculo cruzado via hook `useFuelCrossCalc`, mesma pilha `fuelEditOrder` da spec), RF-06.1 (`superRefine` compartilhado nos schemas de create/update), RF-06.2 (já coberto desde T3.0), RF-06.3 (mensagem do hard-block exibida via `ApiError.message` no formulário, sem a distinção `PGRST116` da spec original). **Deferido:** RF-02 (reatividade do campo veículo ao contexto global) — depende do `useDashboardStore`/"Em Foco" da Fase 5 (SPEC-20260602-001), ainda não implementado; sem esse store não há o que observar. Ver `matrices/rastreabilidade.md` para o detalhamento completo. |
