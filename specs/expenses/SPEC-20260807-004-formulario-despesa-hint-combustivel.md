---
id: SPEC-20260807-004
title: "Formulário de Despesa: Hint de Odômetro e Pré-preenchimento de Combustível"
status: draft
date: 2026-08-07
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R-FUEL-07, R-FUEL-09, R-ODO-07, R-FORM-01, R-FORM-02, R4]
security: [S1, S2]
camadas: [frontend, backend]
---

# SPEC-20260807-004: Formulário de Despesa: Hint de Odômetro e Pré-preenchimento de Combustível

## Contexto

A auditoria de UX comparativa (2026-08-07) identificou duas lacunas de usabilidade no formulário de nova despesa (`/expenses/new`) que aumentam a taxa de erro de digitação e a fricção repetitiva para os dois fluxos mais frequentes: abastecimento e manutenção.

**Lacuna 1 — Odômetro sem referência**: O campo `odometer_km` (obrigatório para categoria `fuel`, conforme R4) não exibe o último valor registrado para o veículo selecionado. O motorista precisa sair do formulário, acessar o histórico do veículo, anotar o valor e voltar — ou digitar de memória, aumentando a chance de erros que violam R1 (odômetro não retroage).

**Lacuna 2 — Tipo de combustível sem pré-preenchimento**: A regra R-FUEL-07 já define a prioridade de pré-preenchimento (`vehicles.favorite_fuel_type` > último abastecimento > vazio), mas a implementação atual em `/expenses/new/page.tsx` não aplica essa lógica. O motorista seleciona o mesmo tipo de combustível manualmente a cada abastecimento.

**Referência de implementação**: O projeto Nave-SaaS-main (em `C:\Dev\Antigravity\Nave-SaaS-main\apps\web\components\expenses\expense-form.tsx`) implementa ambas as features via `getOdometerHintAction` e `getFavoriteFuelTypeAction`, validando que a abordagem é viável e testada.

---

## Objetivo

Implementar no formulário de nova despesa do navestory: (1) hint textual de último odômetro registrado para o veículo selecionado, como referência de preenchimento; (2) pré-preenchimento automático do tipo de combustível favorito do veículo, conforme R-FUEL-07 já definida.

---

## Decisão de Escopo

Itens 5 e 6 da auditoria são consolidados nesta spec porque:

- Ambos tocam exclusivamente o formulário de nova despesa (`ExpenseForm` / `/expenses/new`)
- Ambos dependem de server actions que consultam dados do veículo selecionado
- A implementação de ambos compartilha o mesmo padrão de "buscar dado do veículo ao selecionar vehicle_id"
- O ciclo de implementação é o mesmo

Item 6 da auditoria original (exibição de todos os erros de validação) é coberto por SPEC-20260807-003 (R-FORM-08), que define a regra de forma transversal a todos os formulários, incluindo o de despesas.

---

## Histórias de Usuário e Critérios de Aceitação

### US-01: Hint de último odômetro registrado

**Como** motorista registrando uma despesa, **quero** ver o último odômetro registrado para o veículo selecionado como referência no campo, **para** não precisar sair do formulário para verificar o valor anterior e reduzir erros de digitação que violam R1.

- **Dado que** seleciono um veículo que tem despesas com `odometer_km` registrado, **quando** o campo Odômetro é exibido, **então** uma dica textual exibe "Último registrado: 45.230 km" abaixo ou ao lado do campo.
- **Dado que** seleciono um veículo sem nenhum registro de odômetro anterior, **quando** o campo Odômetro é exibido, **então** nenhuma dica é exibida (campo limpo, sem texto extra).
- **Dado que** troco o veículo selecionado no dropdown, **quando** o novo veículo é carregado, **então** a dica de odômetro é atualizada com o último valor do novo veículo (ou removida se não houver).
- **Dado que** o servidor retorna erro ao buscar o hint (timeout, falha de rede), **quando** a chamada falha, **então** o campo exibe sem hint — o erro não bloqueia o formulário nem é exibido ao usuário (fire-and-forget).
- **Dado que** o hint exibe "45.230 km", **quando** o usuário digita um valor menor que 45.230 no campo, **então** a validação R1 é aplicada normalmente ao submeter (o hint é referência, não bloqueio imediato de digitação).

### US-02: Pré-preenchimento de tipo de combustível favorito

**Como** motorista registrando um abastecimento, **quero** que o tipo de combustível do meu veículo seja pré-preenchido automaticamente, **para** não selecionar o mesmo combustível manualmente a cada registro.

- **Dado que** seleciono um veículo com `vehicles.favorite_fuel_type = 'ethanol'`, **quando** o formulário de abastecimento carrega ou o veículo é selecionado, **então** o campo Tipo de Combustível já exibe "Etanol" selecionado.
- **Dado que** seleciono um veículo sem `favorite_fuel_type` definido, **quando** o formulário carrega, **então** o campo Tipo de Combustível começa vazio (sem seleção).
- **Dado que** o campo foi pré-preenchido com "Etanol" pelo sistema, **quando** o usuário seleciona manualmente "Gasolina", **então** o valor do usuário ("Gasolina") prevalece — o pré-preenchimento é sugestão, não imposição (R-FUEL-07).
- **Dado que** troco o veículo selecionado durante o preenchimento, **quando** o novo veículo é carregado, **então** o campo Tipo de Combustível é atualizado com o `favorite_fuel_type` do novo veículo (ou zerado se não houver) — mas somente se o usuário ainda não tiver editado manualmente o campo.
- **Dado que** a categoria selecionada é diferente de `fuel`, **quando** o formulário renderiza, **então** o campo Tipo de Combustível não é exibido e nenhuma busca de `favorite_fuel_type` é disparada.

---

## Requisitos Funcionais

| ID    | Requisito | Prioridade | História relacionada |
|-------|-----------|------------|----------------------|
| RF-01 | Implementar server action `getOdometerHintAction(vehicleId: string): Promise<number \| null>` que retorna o maior `odometer_km` registrado para o veículo nas tabelas `expenses` e `maintenances` (filtrando por `deleted_at IS NULL` e pelo `user_id` autenticado) | Alta | US-01 |
| RF-02 | Ao selecionar um veículo no formulário de despesa, chamar `getOdometerHintAction` e exibir o resultado como hint textual abaixo do campo `odometer_km` no formato "Último registrado: N.NNN km"; exibir o número formatado com separador de milhar brasileiro | Alta | US-01 |
| RF-03 | O campo `odometer_km` permanece vazio por padrão — o hint é referência visual e não deve ser usado como valor inicial do campo (pre-fill automático causaria violações de R1 ao submeter sem editar) | Alta | US-01 |
| RF-04 | A busca do hint é disparada toda vez que o `vehicle_id` selecionado muda; se o veículo for desmarcado (nenhum selecionado), o hint some | Alta | US-01 |
| RF-05 | Implementar server action `getFavoriteFuelTypeAction(vehicleId: string): Promise<FuelType \| null>` que retorna `vehicles.favorite_fuel_type` para o veículo informado (campo já existente no schema — verificar coluna real na tabela `vehicles`) | Alta | US-02 |
| RF-06 | Ao selecionar um veículo no formulário de despesa com `category = 'fuel'`, chamar `getFavoriteFuelTypeAction` e pré-preencher o campo Tipo de Combustível com o valor retornado; se `null`, deixar vazio | Alta | US-02 |
| RF-07 | O pré-preenchimento de Tipo de Combustível respeita a regra de prioridade de R-FUEL-07: `favorite_fuel_type` do veículo tem prioridade máxima; se `null`, campo vazio — o segundo nível de fallback ("último abastecimento") definido em R-FUEL-07 não é implementado neste ciclo (ver Fora de Escopo) | Alta | US-02 |
| RF-08 | O pré-preenchimento NÃO sobrescreve edição manual do usuário: se o usuário já alterou o campo Tipo de Combustível antes de trocar o veículo, a troca de veículo não deve resetar a edição manual (R-FUEL-09) | Alta | US-02 |
| RF-09 | Ambas as server actions (`getOdometerHintAction`, `getFavoriteFuelTypeAction`) são fire-and-forget: erros de execução (timeout, DB error) são silenciados no cliente e não bloqueiam o formulário | Média | US-01, US-02 |

---

## Requisitos Não-Funcionais

| ID     | Requisito   | Métrica de Aceite |
|--------|-------------|------------------|
| RNF-01 | Performance | `getOdometerHintAction` em p95 < 150 ms (query simples de MAX em tabelas já indexadas por `vehicle_id`) |
| RNF-02 | Performance | `getFavoriteFuelTypeAction` em p95 < 100 ms (SELECT de uma coluna por PK de veículo) |
| RNF-03 | Segurança   | Ambas as server actions validam que `vehicleId` pertence ao usuário autenticado (S1 + S2) antes de retornar qualquer dado; tentativa de consultar veículo de outro usuário retorna `null` sem erro |
| RNF-04 | UX          | O hint de odômetro exibe com formatação de número brasileiro (ponto como separador de milhar, ex: "45.230 km"); nunca exibir o número em formato técnico (45230) |
| RNF-05 | UX          | Enquanto a server action está em execução, o campo de hint exibe um skeleton ou estado de loading; não deixar o campo em estado vazio sem indicação de que uma busca está em andamento |

---

## Fora de Escopo

- Pre-fill automático do valor do campo `odometer_km` com o último odômetro registrado — esta spec define apenas hint textual, não pre-fill de valor (pre-fill automático causaria violações silenciosas de R1).
- Segundo nível de fallback de R-FUEL-07 ("último abastecimento"): RF-05/06/07 implementam apenas o primeiro nível de prioridade — `favorite_fuel_type`; o fallback de "último abastecimento" de R-FUEL-07 fica fora deste ciclo e pode ser adicionado em spec futura.
- Edição do campo `favorite_fuel_type` direto no formulário de despesa — a preferência é configurada nas configurações do veículo, não aqui.
- Hint de preço por litro baseado no último abastecimento do mesmo fornecedor — coberto por R-FUEL-08 (já definido em SPEC-20260619-001) e não incluído nesta spec.
- Pré-preenchimento de outros campos além de `fuel_type` (ex: fornecedor, litros) — fora do escopo do ciclo imediato.
- Persistência de `favorite_fuel_type` no cadastro de veículo — o campo já existe; esta spec apenas consome o valor existente.

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec | SPEC-20260601-001 | Validação de Odômetro — R1, R4 permanecem aplicados; o hint não altera a regra de validação |
| Spec | SPEC-20260606-001 | Combustível e Cálculo de Consumo — R-FUEL-01, R-FUEL-02, R-FUEL-07 implementados aqui |
| Spec | SPEC-20260612-001 | Melhorias de UX no Formulário de Despesas — `getOdometerHintAction` é novo; verificar se já existe versão prévia |
| Spec | SPEC-20260619-001 | Padrão de Formulário — R-FORM-01, R-FORM-02 aplicados; R-FUEL-09 (pre-fill de fuel_type não sobrescreve edição manual) |
| Schema | `vehicles.favorite_fuel_type` | Coluna confirmada na tabela `vehicles` (migration `20260712171830_core_tables.sql`, linha 30) |
| Referência | `Nave-SaaS-main/expense-form.tsx` | Implementação de referência em `C:\Dev\Antigravity\Nave-SaaS-main\apps\web\components\expenses\expense-form.tsx` |

---

## Notas Técnicas

### `getOdometerHintAction`

A query deve retornar o maior `odometer_km` entre `expenses` e `maintenances` para o `vehicle_id` informado:

```sql
-- @spec SPEC-20260807-004 RF-01
SELECT MAX(odometer_km)
FROM (
  SELECT odometer_km FROM expenses
    WHERE vehicle_id = $1 AND user_id = auth.uid() AND deleted_at IS NULL AND odometer_km IS NOT NULL
  UNION ALL
  SELECT odometer_km FROM maintenances
    WHERE vehicle_id = $1 AND user_id = auth.uid() AND deleted_at IS NULL AND odometer_km IS NOT NULL
) AS combined
```

Alternativamente, se a tabela `vehicle_odometer_cycles` tiver o último valor, usar como fonte (verificar SPEC-20260711-001). A implementação de referência no Nave-SaaS-main usa a abordagem de UNION nas duas tabelas.

**Desvio intencional de R-ODO-04 (v1):** a query acima não filtra por ciclo ativo de odômetro (`date >= started_at` do ciclo mais recente em `vehicle_odometer_cycles`), como exige R-ODO-04. Isso é deliberado nesta v1: o hint é referência visual para orientar o digitador e não bloqueia nem valida o formulário. Exibir um valor de ciclo anterior após um reset não causa inconsistência de dados — apenas apresenta um contexto potencialmente defasado, o que é aceitável para um campo informativo. A aderência completa a R-ODO-04 pode ser adicionada em iteração futura se o custo de uma falsa referência se mostrar relevante.

### Controle de pre-fill sem sobrescrever edição manual (R-FUEL-09)

Usar um ref booleano `fuelTypeUserEdited` inicializado em `false`. O campo Tipo de Combustível registra `onChange` do usuário via `onValueChange` e seta `fuelTypeUserEdited = true`. A lógica de pré-preenchimento ao trocar veículo executa `setValue('fuel_type', ...)` somente se `!fuelTypeUserEdited`. O ref é resetado para `false` se o usuário clicar em "Limpar formulário" ou montar um novo formulário.

### Coluna `favorite_fuel_type`

A coluna `vehicles.favorite_fuel_type` existe no schema do banco — confirmada na migration `20260712171830_core_tables.sql`, linha 30. Implementar RF-05 diretamente usando esse nome de coluna, sem necessidade de verificação adicional.

### Formato de hint de odômetro

O hint deve usar `Intl.NumberFormat('pt-BR').format(value)` para garantir formatação brasileira consistente. Exemplo: `45230` → `"Último registrado: 45.230 km"`. O hint é texto estático (não input), renderizado como `<p className="text-xs text-muted-foreground">` ou equivalente usando os tokens do design system.

---

## Changelog (pós-aprovação)

| Data | O que mudou | Por quê |
|------|-------------|---------|
| 2026-08-13 | Corrigido conflito RF-07 x R-FUEL-07 (segundo nível de fallback alinhado à regra vigente — "último abastecimento", não template; fallback declarado fora de escopo deste ciclo); criada R-FUEL-09 em RULES.md para justificar RF-08 (citação corrigida de R-FUEL-08 para R-FUEL-09); removida incerteza sobre coluna `favorite_fuel_type` (existência confirmada em migration `20260712171830_core_tables.sql` linha 30); documentado desvio intencional de R-ODO-04 no hint de odômetro — resolução do gate técnico do tech-lead | Bloqueios de aprovação apontados pelo tech-lead antes da transição para `approved` |
