---
id: SPEC-20260619-001
title: "Padrão de Comportamento de Formulários"
status: approved
date: 2026-06-19
author: douglps
rules: [R-CTX-03, R-CTX-06, R-PREF-02, R-FUEL-07, R-FUEL-08, R-FORM-01, R-FORM-02, R-FORM-03, R-FORM-04, R-FORM-05, R-FORM-06, R-FORM-07, R-SAN-01, R-SAN-02, R-SAN-03, R-SAN-04, R-SAN-05, R-SAN-06]
security: [S1, S2]
camadas: [frontend, backend]
---

# Padrão de Comportamento de Formulários

> Define o comportamento canônico que todo formulário do Nave SaaS deve seguir. Cada formulário existente (e futuro) deve aderir a este padrão ou documentar explicitamente a exceção.

---

## 1. Stack Técnica (não-negociável)

| Camada | Tecnologia | Pacote |
|--------|-----------|--------|
| Schemas de validação | **Zod** (compartilhado frontend + backend) | `@nave/validators` |
| Formulário React | **react-hook-form** + `@hookform/resolvers/zod` | `react-hook-form` |
| Componentes de campo | `FormField` + `FormControl` (Controller pattern) | `@nave/ui` |
| Inputs mascarados | `CurrencyInput`, `OdometerInput` (ATM-style) | `@nave/ui` |
| Submissão | **Server Actions** com `useTransition` | Next.js |
| Validação backend | `ZodValidationPipe` (NestJS) | `apps/api` |

> **Proibido:** `.register()` direto do RHF, `<input>` sem `FormField`, validação manual sem Zod, `fetch`/`axios` para submissão de forms.

---

## 2. Regras de Comportamento

### 2.1 Validação

| Regra | Padrão |
|-------|--------|
| **Timing de validação** | `mode: 'onBlur'` — valida ao sair do campo |
| **Revalidação** | `reValidateMode: 'onChange'` — após primeiro erro, revalida ao digitar |
| **Campos obrigatórios** | Label com sufixo ` *` (ex: "Veículo *") |
| **Campos opcionais** | Sem sufixo — o padrão é opcional |
| **Mensagem de erro** | Exibida via `<FormMessage />` abaixo do campo, em `text-destructive` |
| **Schema source** | Sempre importado de `@nave/validators` — nunca criar schema local |

### 2.2 Submissão

| Regra | Padrão |
|-------|--------|
| **Mecanismo** | `useTransition` + Server Action |
| **Loading state** | Botão submit: `disabled={isPending}`, ícone `<Loader2 className="animate-spin" />` |
| **Texto loading** | "Salvando..." (create/update), "Excluindo..." (delete) |
| **Texto padrão** | "Salvar" (create/update), "Excluir" (delete) |
| **Duplo clique** | Prevenido pelo `disabled={isPending}` |
| **Return type** | `ActionResult = { success: true; message: string } \| { success: false; error: string; fieldErrors?: Record<string, string[]> }` |

### 2.3 Feedback ao Usuário

| Situação | Comportamento |
|----------|--------------|
| **Sucesso (create)** | `redirect()` para a listagem do módulo |
| **Sucesso (update)** | `revalidate()` + fechar modal/drawer, sem redirect |
| **Sucesso (delete)** | `revalidate()` + fechar modal/drawer, sem redirect |
| **Erro de validação** | Erros exibidos inline nos campos via `form.setError()` |
| **Erro de servidor** | Alert inline no topo do form com `variant="destructive"` |
| **Warning (não-bloqueante)** | Alert inline com `variant="warning"` (ex: odômetro regressivo na API) |

### 2.4 Erro de Servidor — Exibição

```tsx
{serverError && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>{serverError}</AlertDescription>
  </Alert>
)}
```

> Classe padrão: `bg-destructive-pastel border border-destructive-pastel-foreground/10`. Nunca usar `bg-destructive/10`.

### 2.5 Create vs Edit

| Aspecto | Padrão |
|---------|--------|
| **Detecção de modo** | `const isEdit = Boolean(entityId)` |
| **Schema** | Mesmo schema Zod para ambos (quando possível) |
| **defaultValues** | Preenchidos via props no modo edit |
| **Action call** | `isEdit ? updateAction({id, ...values}) : createAction(values)` |
| **Título** | "Nova {entidade}" (create) / "Editar {entidade}" (edit) |
| **Botão submit** | "Salvar" em ambos os modos |

### 2.6 Contexto de Veículo (R-CTX-03, R-CTX-06)

| Aspecto | Padrão |
|---------|--------|
| **Hook** | `useVehicleContextField(vehicles)` |
| **Comportamento** | Pré-seleciona veículo do contexto ativo no mount |
| **Modos coletivos** | Filtra lista mas NÃO auto-seleciona |
| **Veículo único** | Auto-seleciona se só 1 veículo (com ou sem contexto) |
| **Badge** | Exibe chip "Herdado" quando `isInherited === true` |
| **Formulários que usam** | Todos os forms transacionais (Expense, Fine, Maintenance, RecurringCost) |

### 2.7 Draft / Rascunho (R-PREF-02)

| Aspecto | Padrão |
|---------|--------|
| **Ativação** | Condicional via `auto_draft_enabled` (default: `false`) |
| **Hook** | `useFormDraftGuard(form)` — somente quando habilitado |
| **Storage** | `sessionStorage` com chave `nave_form_draft_{pathname}` |
| **Restauração** | Alert success-pastel: "Seus dados foram restaurados do rascunho anterior." |
| **Limpeza** | Ao submeter com sucesso ou ao cancelar |

### 2.8 Cancelar / Sair

| Aspecto | Padrão |
|---------|--------|
| **Botão** | "Cancelar" com `variant="outline"` |
| **Form sujo** | Exibir `AlertDialog` de confirmação: "Descartar alterações?" |
| **Form limpo** | Navegar/fechar sem confirmação |
| **Dirty check** | `form.formState.isDirty` |

### 2.9 Sem Veículos

Quando `vehicles.length === 0`, exibir card de empty state em vez do formulário:

```
Nenhum veículo cadastrado
Cadastre um veículo para registrar {entidade no plural}.
[Cadastrar veículo →]
```

### 2.10 Layout

| Aspecto | Padrão |
|---------|--------|
| **Grid** | `grid-cols-1 md:grid-cols-2` para campos lado a lado |
| **Espaçamento** | `gap-4 md:gap-6` entre campos |
| **Seções** | `space-y-6`, separador visual entre grupos |
| **Campos obrigatórios primeiro** | Agrupar no topo; opcionais abaixo |
| **Touch targets** | Mínimo 44px (mobile) |
| **Mobile-first** | Stack vertical em `< md`, grid em `≥ md` |

### 2.11 Acessibilidade

| Aspecto | Padrão |
|---------|--------|
| **Labels** | Todo campo deve ter `<FormLabel>` — nunca usar placeholder como label |
| **Errors a11y** | `<FormControl>` auto-liga `aria-invalid` e `aria-describedby` ao erro |
| **Focus** | `:focus-visible` com ring 2px em primary |
| **Tab order** | Sequencial, top-to-bottom, left-to-right |
| **Submit** | Acessível via `Enter` no último campo ou click no botão |

### 2.12 DatePicker — Seleção de Mês e Ano

| Aspecto | Padrão |
|---------|--------|
| **captionLayout** | `"dropdown"` — padrão **global** para todos os DatePickers do sistema |
| **Comportamento** | Cabeçalho do calendário exibe dropdowns de mês e ano; usuário seleciona diretamente sem navegar mês a mês |
| **Componente** | Alteração em `packages/ui/src/components/calendar.tsx` — afeta todos os DatePickers |
| **Campo "Ano" separado** | **Removido** — a seleção de ano é feita exclusivamente via dropdown no calendário |
| **Range de anos** | Configurável via `startMonth` / `endMonth` no react-day-picker |

### 2.13 Sanitização de Entrada (R-SAN-01 a R-SAN-06)

| Regra | Padrão |
|-------|--------|
| **Trim** | Todo campo `z.string()` de texto livre aplica `.trim()` no schema — R-SAN-01 |
| **Unicode** | `.normalize('NFC')` em todos os campos de texto — R-SAN-02 |
| **Identificadores** | Placa, RENAVAM, Chassi: `.toUpperCase().replace(/[^A-Z0-9]/g, '')` — R-SAN-03 |
| **UUIDs** | Todo parâmetro de ID recebido por server actions ou controllers é validado como UUID antes de uso — R-SAN-04 |
| **Upload** | Tipo MIME validado contra allowlist (`image/jpeg`, `image/png`) e tamanho máximo (2 MB) no servidor — R-SAN-05 |
| **Erros de banco** | Mensagens internas do banco nunca são repassadas ao cliente; retornar mensagem genérica e logar detalhes no servidor — R-SAN-06 |
| **Camada de aplicação** | Sanitização ocorre exclusivamente no schema Zod (`@nave/validators`); server actions e API não duplicam transformações |
| **Helper** | `sanitizedString(maxLength?)` — helper em `packages/validators/src/helpers.ts` que aplica `.trim().normalize('NFC')` |
| **Campos numéricos** | `.coerce.number()` já aplicado — sem mudança |

---

## 3. Inventário de Formulários e Stories

> Cada formulário listado abaixo com todos os campos, regras e user stories.

---

### 3.1 Expense Form — Formulário de Despesas

**Componente:** `apps/web/components/expenses/expense-form.tsx`  
**Schema:** `packages/validators/src/expenses.schema.ts`  
**Actions:** `apps/web/app/actions/expense-actions.ts`  
**Specs relacionadas:** SPEC-20260612-001, SPEC-20260612-002, SPEC-20260606-001, SPEC-20260606-002

#### Campos

| # | Campo | Label | Tipo UI | Obrigatório | Default | Visibilidade | Validação Zod | Comportamento especial |
|---|-------|-------|---------|-------------|---------|-------------|---------------|----------------------|
| 1 | `vehicle_id` | Veículo * | Select | Sim | Herdado do contexto | Sempre | UUID, non-empty | Hook `useVehicleContextField`; reativo ao store quando `isInherited` |
| 2 | `category` | Categoria * | Select | Sim | `""` | Sempre | Non-empty string | Altera visibilidade da seção fuel; limpa campos fuel ao mudar |
| 3 | `amount` | Valor (R$) * | CurrencyInput | Sim | — | Sempre | `0.01 – 1.000.000.000` (R-EXP-01) | Interdependente com `liters` × `price_per_liter` |
| 4 | `date` | Data * | DatePicker | Sim | Hoje | Sempre | `yyyy-MM-dd` | Calendar com `captionLayout="dropdown"` — seletor de mês e ano integrado no cabeçalho |
| 5 | `description` | Descrição | Input | Não | `""` | Sempre | Max 500 chars | — |
| 6 | `odometer_km` | Odômetro (km) * | OdometerInput | Condicional | — | `category === 'fuel'` | `0 – 9.999.999` (R-ODO-02) | Hint: "Último: X km · Y dias"; hard block regressão (R-ODO-01) |
| 7 | `liters` | Litros | CurrencyInput | Não | — | `category === 'fuel'` | Positivo, max 9.999,999 | Interdependente com `amount` e `price_per_liter`; exibe FormDescription "Capacidade: {N} L" quando veículo tem `fuel_liters_capacity` cadastrado |
| 8 | `fuel_type` | Tipo de Combustível | Select | Não | Prioridade: favorito do veículo > último abastecimento > vazio | `category === 'fuel'` | Enum FuelType (R-FUEL-01, R-FUEL-07) | Pré-preenche no create mode (favorito > último); Select exibe badge "(favorito)" ou "(último)" ao lado da opção relevante; botão ☆ para salvar favorito |
| 9 | `full_tank` | Tanque cheio? | Toggle tri-state | Não | `null` | `category === 'fuel'` | `true \| false \| null` (R-FUEL-06) | Afeta cálculo km/L (R-FUEL-02) |
| 10 | `price_per_liter` | Valor por litro | CurrencyInput | Não | Pré-preenchido do último abastecimento no mesmo posto (se disponível); senão, calculado | `category === 'fuel'` | Positivo | Derivado (R-FUEL-03); editável; ao selecionar fornecedor, pré-preenche com preço do último abastecimento naquele posto (R-FUEL-08: somente se campo não estiver em `fuelEditOrder`, i.e. não foi editado manualmente) |
| 11 | `supplier` | Posto / Fornecedor | Input + autocomplete | Não | `""` | `category === 'fuel'` | Max 100 chars (R-FUEL-04) | Autocomplete com sugestões do backend |
| — | km/L | — | Display only | — | Calculado | `full_tank === true` + condições | — | `(odometer - last) / liters` |

#### Interdependências de Cálculo (Fuel)

```
amount ↔ liters ↔ price_per_liter

Pilha fuelEditOrder: ordem de edição manual dos 3 campos, do mais recente
para o mais antigo. Só entram campos digitados diretamente pelo usuário
(nunca os que foram só calculados). Ao editar um campo X, o alvo do
recálculo entre os outros dois (A, B) é escolhido assim:
- Nenhum dos dois em fuelEditOrder  → pareamento padrão (legado):
  editar amount → recalcula price; editar liters → recalcula amount;
  editar price  → recalcula amount
- Só um dos dois em fuelEditOrder   → recalcula o que NÃO está
- Ambos em fuelEditOrder            → recalcula o editado manualmente
  há mais tempo (mais embaixo na pilha), preservando o mais recente
- Campo recalculado sai da pilha (volta a ser "apenas calculado")

supplier → price_per_liter (pre-fill)
- Ao selecionar/confirmar fornecedor, busca último preço no mesmo posto
- Somente se price_per_liter não está em fuelEditOrder (R-FUEL-08)
- Se liters já preenchido e amount não está em fuelEditOrder:
  recalcula amount = liters × price_pre_fill
```

#### Dados Auxiliares do Veículo

A query de veículos na página `/expenses` deve incluir `fuel_liters_capacity` no select (campo já existe na tabela `vehicles`). O valor é exibido como hint no campo Litros, nunca como campo editável no Expense Form.

#### Preferência de Combustível por Veículo

| Aspecto | Detalhe |
|---------|---------|
| **Armazenamento** | Campo `favorite_fuel_type` na tabela `vehicles` (nullable, FuelType enum) |
| **Migration** | Adicionar `favorite_fuel_type text null` à tabela `vehicles` |
| **Server Actions** | `getFavoriteFuelTypeAction(vehicleId)` → `FuelType \| null` |
| | `saveFavoriteFuelTypeAction(vehicleId, fuelType)` → `ActionResult` |
| **Fluxo** | 1. Ao selecionar veículo (create mode), busca paralela de favorite + last |
| | 2. Favorito existe → pré-preenche + marca "(favorito)" |
| | 3. Senão → usa last + marca "(último)" |
| | 4. Botão ☆ ao lado do Select para salvar tipo atual como favorito |

#### Pré-preenchimento de Preço por Fornecedor

| Aspecto | Detalhe |
|---------|---------|
| **Server Action** | `getLastPriceAtSupplierAction(vehicleId, supplier)` → `number \| null` |
| **Query** | Último expense do veículo com supplier (case-insensitive), calcula `amount / liters` |
| **Trigger** | Ao selecionar/confirmar fornecedor no autocomplete |
| **Guard** | Não sobrescreve edição manual do usuário — verifica `fuelEditOrder` (R-FUEL-08) |

#### User Stories

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| US-EXP-01 | Como usuário, quero registrar uma despesa simples (não-fuel) preenchendo veículo, categoria, valor e data | Form submete com sucesso; redirect para `/expenses`; despesa aparece na listagem |
| US-EXP-02 | Como usuário, ao selecionar categoria "Abastecimento", quero ver os campos de combustível | Campos 6-11 aparecem; `odometer_km` torna-se obrigatório |
| US-EXP-03 | Como usuário, quero que o valor por litro seja calculado automaticamente ao preencher valor e litros | `price_per_liter = amount / liters`, exibido em tempo real |
| US-EXP-04 | Como usuário, quero ver o km/L calculado quando informo tanque cheio com odômetro e litros | Exibe `(odometer - last_odometer) / liters` quando `full_tank === true` |
| US-EXP-05 | Como usuário, quero ser bloqueado se informar odômetro menor que o último registro (por data) | Hard block: erro no campo, form não submete (R-ODO-01) |
| US-EXP-06 | Como usuário, quero ver a dica do último odômetro ao selecionar fuel | Hint abaixo do campo: "Último: 58.420 km · 15 dias atrás" |
| US-EXP-07 | Como usuário, quero que o tipo de combustível seja pré-preenchido com base no favorito do veículo ou, se não houver, do último abastecimento | No create mode, `fuel_type` auto-preenchido (favorito > último > vazio); editável |
| US-EXP-08 | Como usuário, quero sugestões de fornecedor ao digitar no campo Posto | Autocomplete dropdown com sugestões do backend; filtragem client-side |
| US-EXP-09 | Como usuário, quero que o veículo seja herdado do contexto ativo do dashboard | `vehicle_id` pré-selecionado; badge "Herdado"; reativo enquanto `isInherited` |
| US-EXP-10 | Como usuário, ao trocar a categoria para fora de "fuel", quero que os campos de combustível sejam limpos | Campos 6-11 voltam ao default; seção desaparece |
| US-EXP-11 | Como usuário, quero editar uma despesa existente com os dados pré-preenchidos | Form abre com `defaultValues`; submit chama `updateExpenseAction` |
| US-EXP-12 | Como usuário, não quero conseguir editar uma despesa com `is_readonly === true` | Form exibe aviso e desabilita campos (R-LED-01) |
| US-EXP-13 | Como usuário, quero selecionar mês e ano diretamente nos dropdowns do cabeçalho do calendário | DatePicker exibe dropdowns de mês/ano no header; campo "Ano" separado não existe |
| US-EXP-14 | Como usuário, ao preencher litros num abastecimento, quero ver a capacidade do tanque do veículo como referência | FormDescription abaixo do campo exibe "Capacidade: {N} L" quando veículo tem `fuel_liters_capacity` cadastrado; se não cadastrado, nada aparece |
| US-EXP-15 | Como usuário, quero ver qual tipo de combustível usei por último indicado no Select | A opção correspondente ao último `fuel_type` usado mostra badge "(último)" em texto secundário |
| US-EXP-16 | Como usuário, quero salvar um tipo de combustível favorito por veículo, que será pré-selecionado automaticamente | Preferência persistida em `vehicles.favorite_fuel_type`; no Select, opção favorita mostra badge "(favorito)"; pre-fill prioriza favorito sobre último |
| US-EXP-17 | Como usuário, ao selecionar um posto/fornecedor, quero que o valor por litro seja pré-preenchido com o preço da última vez que abasteci naquele posto | Ao confirmar fornecedor, se `price_per_liter` não foi editado manualmente, busca último preço naquele fornecedor para o veículo; pré-preenche e recalcula `amount` se `liters` preenchido |

---

### 3.2 Vehicle Form — Formulário de Veículos

**Componente:** `apps/web/components/vehicles/VehicleForm.tsx`  
**Schema:** `packages/validators/src/vehicles.schema.ts`  
**Actions:** `apps/web/app/actions/vehicles.ts`  
**Specs relacionadas:** SPEC-20260602-002

#### Campos

| # | Campo | Label | Tipo UI | Obrigatório | Default | Visibilidade | Validação Zod | Comportamento especial |
|---|-------|-------|---------|-------------|---------|-------------|---------------|----------------------|
| 1 | `photo_file` | Foto do Veículo | FileUpload | Não | `null` | Sempre | JPEG/PNG, max 2MB | Preview com framing dialog (zoom + position) |
| 2 | `photo_object_position` | — | Hidden | Não | `'center'` | Interno (framing dialog) | CSS position | Controlado pelo PhotoFramingDialog |
| 3 | `photo_zoom` | — | Hidden | Não | `1.0` | Interno (framing dialog) | `0.1 – 3.0` | Controlado pelo PhotoFramingDialog |
| 4 | `plate` | Placa * | Input | Sim | `""` | Sempre | 7 chars, BR/Mercosul (R-VEH-02) | Uppercase automático; mask `AAA-1234` |
| 5 | `nickname` | Apelido | Input | Não | `""` | Sempre | Max 50 chars | Nome amigável opcional |
| 6 | `vehicle_type` | Tipo * | Select | Sim | `""` | Sempre | Enum: Carro, Moto, Caminhão, Ônibus, Utilitário, Outro | Cascata: habilita `make` |
| 7 | `make` | Marca * | FipeCombobox | Sim | `""` | Sempre (disabled sem `vehicle_type`) | Min 2 chars, FIPE list | Busca via BrasilAPI; exibe ícone da marca |
| 8 | `model` | Modelo * | FipeCombobox | Sim | `""` | Sempre (disabled sem `make`) | Min 2 chars, FIPE list | Busca via BrasilAPI; auto-preenche `fuel_type` |
| 9 | `year` | Ano Fabricação * | Select | Sim | Ano atual | Sempre | `1950 – (ano atual + 1)` | — |
| 10 | `model_year` | Ano Modelo | Button group (2) | Não | `= year` | Sempre | `1950 – (ano atual + 2)` | Toggle entre `year` e `year + 1` |
| 11 | `color` | Cor | Select / Input | Não | `""` | Sempre | Preset ou custom text | Select com opção "Outra" → input livre |
| 12 | `fuel_type` | Combustível | Select | Não | Auto-preenchido do modelo | Sempre | Enum FuelType | Heurística baseada nos dados do modelo FIPE |
| 13 | `fuel_tank_capacity` | Capacidade Tanque (L) | Input number | Não | — | Sempre | Positivo | — |
| 14 | `odometer` | Odômetro (km) | Input number | Não | — | Sempre | Non-negative | — |
| 15 | `renavam` | RENAVAM | Input | Não | `""` | Sempre | 11 dígitos numéricos | — |
| 16 | `chassi` | Chassi | Input | Não | `""` | Sempre | 17 chars alfanuméricos (VIN) | — |
| 17 | `ipva_due_date` | IPVA Vencimento | DatePicker | Não | `""` | Sempre | `yyyy-MM-dd` | — |
| 18 | `engine_displacement_cc` | Cilindrada (cc) | Input number | Não | — | Sempre (seção Motor) | `0 – 10.000` | Exibe conversão em litros (ex: 999cc → 0.9L) |
| 19 | `engine_power_cv` | Potência (cv) | Input number | Não | — | Sempre (seção Motor) | `0 – 2.000` | — |
| 20 | `engine_torque_kgm` | Torque (kgfm) | Input number | Não | — | Sempre (seção Motor) | `0 – 200` | — |
| 21 | `is_turbo` | Aspiração | Toggle button | Não | `false` | Sempre (seção Motor) | Boolean | "✓ Turbo" / "Natural" |
| 22 | `engine_config` | Motor (descrição) | Input | Não | Auto-gerado | Sempre (seção Motor) | Max 100 chars | Auto-gera: `{L}L{Turbo?}{Fuel}`; editável |

#### Cascata FIPE

```
vehicle_type → make → model → fuel_type (auto-fill)

- Trocar vehicle_type limpa make e model
- Trocar make limpa model
- Trocar model auto-preenche fuel_type (heurística)
```

> **Nota:** O auto-fill de `fuel_type` a partir do modelo FIPE é o comportamento padrão e desejado. A heurística analisa o nome do modelo retornado pela API FIPE e infere o tipo de combustível (ex: modelos com "flex" → "Flex (Gasolina/Etanol)", modelos com "diesel" → "Diesel"). Em caso de ambiguidade, o campo permanece editável para correção manual. O usuário NÃO precisa selecionar manualmente na maioria dos casos.

#### User Stories

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| US-VEH-01 | Como usuário, quero cadastrar um veículo informando placa, tipo, marca, modelo e ano | Form submete com sucesso; veículo aparece na listagem |
| US-VEH-02 | Como usuário, quero que marca e modelo sejam carregados via tabela FIPE conforme meu tipo de veículo | Selects cascateiam: tipo → marca → modelo |
| US-VEH-03 | Como usuário, quero adicionar uma foto ao meu veículo com ajuste de enquadramento | Upload + preview; framing dialog com zoom e posição |
| US-VEH-04 | Como usuário, quero que a descrição do motor seja gerada automaticamente | Campo `engine_config` auto-preenche conforme cilindrada, turbo e combustível |
| US-VEH-05 | Como usuário, quero que a placa seja normalizada para maiúsculas sem hífen | Digitado "abc1d23" → salvo "ABC1D23" |
| US-VEH-06 | Como usuário, quero ser impedido de cadastrar placa duplicada | Erro no campo `plate`: "Esta placa já está cadastrada" |
| US-VEH-07 | Como usuário, quero editar um veículo existente | Form preenchido com dados atuais; submit chama `updateVehicle` |
| US-VEH-08 | Como usuário, quero excluir um veículo com confirmação digitando a placa | Modal de confirmação; soft-delete em cascata (R-VEH-01) |
| US-VEH-09 | Como usuário, quero salvar com Ctrl+S | Atalho de teclado submete o form |
| US-VEH-10 | Como usuário, ao descartar o form sujo quero ver confirmação | AlertDialog "Descartar alterações?" |
| US-VEH-11 | Como usuário, quero que o tipo de combustível seja preenchido automaticamente ao selecionar o modelo FIPE | `fuel_type` auto-preenchido com heurística do modelo; este é o comportamento padrão — o usuário não precisa selecionar manualmente na maioria dos casos |

---

### 3.3 Fine Form — Formulário de Multas

**Componente:** `apps/web/components/fines/fine-form.tsx`  
**Schema:** `packages/validators/src/fines.schema.ts`  
**Actions:** `apps/web/app/actions/fine-actions.ts`  
**Specs relacionadas:** EPIC-FIN-001

#### Campos

| # | Campo | Label | Tipo UI | Obrigatório | Default | Visibilidade | Validação Zod | Comportamento especial |
|---|-------|-------|---------|-------------|---------|-------------|---------------|----------------------|
| 1 | `vehicle_id` | Veículo * | Select | Sim | Herdado do contexto | Sempre | UUID | Hook `useVehicleContextField` |
| 2 | `description` | Descrição da infração * | Input | Sim | `""` | Sempre | Min 3, max 500 chars | — |
| 3 | `occurred_at` | Data da ocorrência * | DatePicker | Sim | Hoje | Sempre | `yyyy-MM-dd` | — |
| 4 | `amount` | Valor da multa (R$) * | CurrencyInput | Sim | — | Sempre | Positivo, max 999.999,99 | — |
| 5 | `amount_with_discount` | Valor c/ desconto (R$) | CurrencyInput | Não | — | Sempre | Positivo, max 999.999,99 | Usado para expense vinculada quando presente |
| 6 | `due_date` | Vencimento | DatePicker | Não | — | Sempre | `yyyy-MM-dd` | — |
| 7 | `appeal_deadline` | Prazo para recurso | DatePicker | Não | — | Sempre | `yyyy-MM-dd` | — |
| 8 | `auto_number` | Número do auto | Input | Não | `""` | Sempre | Max 100 chars | — |
| 9 | `infraction_code` | Código da infração | Input | Não | `""` | Sempre | Max 20 chars | — |
| 10 | `location` | Local da infração | Input | Não | `""` | Sempre | Max 255 chars | — |
| 11 | `driver_name` | Condutor identificado | Input | Não | `""` | Sempre | Max 200 chars | — |
| 12 | `notes` | Observações | Textarea | Não | `""` | Sempre | Max 500 chars | — |

#### Ledger (R-LED-01, R-LED-02)

- Create: cria multa + expense vinculada (`source_type: 'fine'`, `is_readonly: true`)
- Update status → `cancelled`: soft-deleta expense vinculada
- Delete: soft-delete multa + expense vinculada

#### User Stories

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| US-FIN-01 | Como usuário, quero registrar uma multa com descrição, valor e data | Form submete; redirect para `/fines`; multa + expense vinculada criadas |
| US-FIN-02 | Como usuário, quero informar o valor com desconto para pagamento antecipado | Campo `amount_with_discount` aceito; expense vinculada usa esse valor |
| US-FIN-03 | Como usuário, quero registrar dados do auto de infração (número, código, local) | Campos opcionais salvos com sucesso |
| US-FIN-04 | Como usuário, quero editar uma multa existente | Form preenchido; submit chama `updateFineAction` |
| US-FIN-05 | Como usuário, quero que o veículo seja herdado do contexto | `vehicle_id` pré-selecionado via `useVehicleContextField` |
| US-FIN-06 | Como usuário, quero ver aviso quando não tenho veículos cadastrados | Card empty state com CTA para cadastrar veículo |

---

### 3.4 Maintenance Form — Formulário de Manutenção

**Componente:** `apps/web/components/maintenance/maintenance-form.tsx`  
**Schema:** `packages/validators/src/maintenance.schema.ts`  
**Actions:** `apps/web/app/actions/maintenance-actions.ts`  
**Specs relacionadas:** SPEC-20260603-002

#### Campos

| # | Campo | Label | Tipo UI | Obrigatório | Default | Visibilidade | Validação Zod | Comportamento especial |
|---|-------|-------|---------|-------------|---------|-------------|---------------|----------------------|
| 1 | `vehicle_id` | Veículo * | Select | Sim | Herdado do contexto | Sempre | UUID | Hook `useVehicleContextField` |
| 2 | `description` | Descrição do serviço * | Input | Sim | `""` | Sempre | Min 3, max 500 chars | Placeholder: "Ex: Troca de óleo + filtros" |
| 3 | `status` | Status | ProgressBar segmentada | Não | `'pending'` | Sempre | Enum: pending, in_progress, completed, cancelled | Barra de progresso com 3 segmentos + botão cancelar lateral; altera visibilidade de `cost` e `completion_date` |
| 4 | `scheduled_date` | Data agendada * | DatePicker | Sim | Hoje | Sempre | `yyyy-MM-dd` | Permite datas futuras |
| 5 | `cost` | Custo (R$) | CurrencyInput | Não | — | `status !== 'pending'` | Non-negative, max 999.999,99 | Aparece quando manutenção não é "Agendada" |
| 6 | `completion_date` | Data de conclusão | DatePicker | Não | — | `status === 'completed'` | `yyyy-MM-dd` | Aparece somente quando "Concluída" |

#### Visibilidade condicional por Status

| Status | Campos visíveis |
|--------|----------------|
| `pending` (Agendada) | 1, 2, 3, 4 |
| `in_progress` (Em andamento) | 1, 2, 3, 4, 5 |
| `completed` (Concluída) | 1, 2, 3, 4, 5, 6 |
| `cancelled` (Cancelada) | 1, 2, 3, 4, 5 |

#### Transições (R7)

```
pending → in_progress | completed | cancelled
in_progress → completed | cancelled
completed → (terminal)
cancelled → (terminal)
```

#### UI de Status — Barra de Progresso Segmentada

```
Layout (3 segmentos + ação cancelar):

  ████████████░░░░░░░░░░░░░░░░░░░░░░░░
  Agendada ──── Em andamento ──── Concluída
                                          [✕ Cancelar]
```

| Aspecto | Detalhe |
|---------|---------|
| **Segmentos** | 3 segmentos de largura igual (1/3 cada); preenchimento esquerda → direita conforme status |
| **Clique** | Clique no segmento avança o status (respeitando transições R7) |
| **Cores** | `pending`: info (azul) · `in_progress`: warning (amarelo/âmbar) · `completed`: success (verde) |
| **Cancelar** | Botão separado `"✕ Cancelar"` fora da barra, `variant="outline"` destructive — cancelar não é progresso, é ação lateral |
| **Cancelled** | Barra inteira fica em destructive (vermelho), parada no ponto em que estava |
| **Edit mode** | Segmentos de transições inválidas ficam `disabled` (R7) |
| **Terminal** | `completed` e `cancelled`: barra fixa, não clicável |
| **Retrocesso** | `in_progress`: segmento "Agendada" fica disabled (não pode voltar) |
| **Mobile** | Barra ocupa 100% da largura; labels abaixo em texto menor; cada segmento mínimo 44px de altura |

#### User Stories

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| US-MNT-01 | Como usuário, quero agendar uma manutenção com veículo, descrição e data | Form submete; redirect para `/maintenance` |
| US-MNT-02 | Como usuário, ao mudar status para "Em andamento", quero ver o campo de custo | Campo `cost` aparece; `completion_date` não |
| US-MNT-03 | Como usuário, ao mudar status para "Concluída", quero informar custo e data de conclusão | Campos `cost` e `completion_date` aparecem |
| US-MNT-04 | Como usuário, ao concluir manutenção com custo, quero que uma expense vinculada seja criada | Expense com `source_type: 'maintenance'`, `is_readonly: true` |
| US-MNT-05 | Como usuário, quero editar uma manutenção existente | Form preenchido; submit chama `updateMaintenanceAction` |
| US-MNT-06 | Como usuário, quero que o veículo seja herdado do contexto | `vehicle_id` pré-selecionado via `useVehicleContextField` |
| US-MNT-07 | Como usuário, quero ver o progresso da manutenção numa barra visual e avançar clicando no segmento | Barra segmentada com 3 fases preenchidas conforme status; cores por status; clique avança respeitando R7; cancelar é botão separado |

---

### 3.5 Recurring Cost Form — Formulário de Custos Recorrentes

**Componente:** `apps/web/components/recurring-costs/recurring-cost-form.tsx`  
**Schema:** `packages/validators/src/recurring-costs.schema.ts`  
**Actions:** `apps/web/app/actions/recurring-cost-actions.ts`  
**Specs relacionadas:** EPIC-FIN-001

#### Campos

| # | Campo | Label | Tipo UI | Obrigatório | Default | Visibilidade | Validação Zod | Comportamento especial |
|---|-------|-------|---------|-------------|---------|-------------|---------------|----------------------|
| 1 | `vehicle_id` | Veículo * | Select | Sim | Herdado do contexto | Sempre | UUID | Hook `useVehicleContextField` |
| 2 | `cost_type` | Tipo * | Select | Sim | `'ipva'` | Sempre | Enum: ipva, crlv, insurance, other | — |
| 3 | `year` | Ano * | Input number | Sim | Ano atual | Sempre | `2000 – 2100` | — |
| 4 | `amount` | Valor (R$) * | CurrencyInput | Sim | — | Sempre | Positivo, max 9.999.999,99 | — |
| 5 | `due_date` | Vencimento * | DatePicker | Sim | — | Sempre | `yyyy-MM-dd` | — |
| 6 | `paid_at` | Pago em | DatePicker | Não | `null` | Sempre | `yyyy-MM-dd` ou null | Helper: "Preencha somente se já pagou" |
| 7 | `notes` | Observações | Textarea | Não | `null` | Sempre | Max 500 chars | 2 rows |

#### Ledger (R-LED-05, R-REC-01)

- Create com `paid_at`: cria expense vinculada (`source_type: 'recurring_cost'`)
- Update `paid_at: null → date`: cria expense vinculada
- Unicidade: max 1 registro por `(vehicle_id, cost_type, year)` (R-REC-01)

#### User Stories

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| US-REC-01 | Como usuário, quero registrar um custo recorrente (IPVA, seguro, CRLV) | Form submete com sucesso; custo aparece na listagem |
| US-REC-02 | Como usuário, ao marcar como pago, quero que uma expense seja criada automaticamente | Expense vinculada com `is_readonly: true` |
| US-REC-03 | Como usuário, não quero duplicar o mesmo tipo de custo para o mesmo veículo e ano | Erro: "Já existe um registro de {tipo} para este veículo em {ano}" |
| US-REC-04 | Como usuário, quero editar um custo recorrente existente | Form preenchido; submit chama `updateRecurringCostAction` |
| US-REC-05 | Como usuário, quero que o veículo seja herdado do contexto | `vehicle_id` pré-selecionado via `useVehicleContextField` |

---

### 3.6 Register Form — Formulário de Cadastro

**Componente:** `apps/web/components/forms/register-form.tsx`  
**Schema:** `packages/validators/src/auth.schema.ts`  
**Actions:** Supabase Auth direto (não Server Action padrão)

#### Campos

| # | Campo | Label | Tipo UI | Obrigatório | Default | Visibilidade | Validação Zod | Comportamento especial |
|---|-------|-------|---------|-------------|---------|-------------|---------------|----------------------|
| 1 | `full_name` | Nome Completo * | Input | Sim | `""` | Sempre | Min 2, max 100 chars | — |
| 2 | `email` | Email * | Input email | Sim | `""` | Sempre | Email válido; lowercase | Transform: `.toLowerCase()` |
| 3 | `password` | Senha * | PasswordInput | Sim | `""` | Sempre | Min 6, 1 letra, 1 número, 1 especial | Regex: `/[a-zA-Z]/`, `/\d/`, `/[^a-zA-Z0-9]/` |
| 4 | `confirmPassword` | Confirmar Senha * | PasswordInput | Sim | `""` | Sempre | Deve igualar `password` | `.refine()` cross-field |

#### User Stories

| ID | Story | Critério de aceite |
|----|-------|--------------------|
| US-REG-01 | Como visitante, quero criar uma conta informando nome, email e senha | Conta criada; redirect para dashboard |
| US-REG-02 | Como visitante, quero ver erros claros se a senha não atender os requisitos | Mensagem específica: "Mínimo 6 caracteres, 1 letra, 1 número, 1 caractere especial" |
| US-REG-03 | Como visitante, quero ser avisado se o email já está cadastrado | Alert warning com links para login e recuperação de senha |
| US-REG-04 | Como visitante, quero que confirmar senha valide em tempo real contra a senha | Erro "As senhas não coincidem" ao sair do campo |

---

## 4. Inconsistências a Corrigir

> Pontos onde os formulários atuais não seguem o padrão definido nesta spec. Cada item mostra o que acontece hoje e o que deveria acontecer.

---

### IC-01 — Validação só aparece ao enviar (Veículos)

**Hoje:** No formulário de veículo, se você preenche um campo errado, só vê o erro quando clica "Salvar". Até lá não tem nenhum aviso.

**Correto:** O erro deve aparecer assim que você sai do campo (clica em outro lugar). Dessa forma você corrige na hora, sem esperar até o final.

**Exemplo:** Você digita uma placa incompleta ("ABC") e clica no próximo campo. Hoje: nada acontece. Correto: aparece "Placa deve ter 7 caracteres" imediatamente.

---

### IC-02 — Campos sem acessibilidade automática (Cadastro)

**Hoje:** No formulário de cadastro de conta, os campos de email e senha são conectados de um jeito que não gera automaticamente os atributos de acessibilidade (leitor de tela, mensagens de erro vinculadas ao campo).

**Correto:** Todo campo deve usar o componente padrão (`FormField`) que automaticamente conecta o label, o campo e a mensagem de erro para leitores de tela e navegação por teclado.

**Exemplo:** Um usuário com leitor de tela não ouve "Erro: senha fraca" ao navegar para o campo senha. Correto: o leitor anuncia o erro automaticamente.

---

### IC-03 — Campo de valor da multa com comportamento diferente (Multas)

**Hoje:** No formulário de multa, o campo "Valor" aceita digitação livre (você digita "150.00" ou "150,00" e o sistema tenta interpretar). O comportamento é diferente do campo de valor no formulário de despesa.

**Correto:** Deve usar o mesmo componente de valor monetário (`CurrencyInput`) que funciona como uma calculadora: você digita os números e as vírgulas/pontos se posicionam automaticamente (estilo caixa eletrônico). Igual ao de despesas.

**Exemplo:** Você quer digitar R$ 150,00. Hoje na multa: digita "15000" e aparece "15000". Correto: digita "15000" e aparece "150,00" automaticamente.

---

### IC-04 — Cor de fundo dos erros do servidor diferente entre formulários

**Hoje:** Quando o servidor retorna um erro (ex: "Falha ao salvar"), o aviso vermelho aparece com tons de vermelho ligeiramente diferentes em cada formulário.

**Correto:** Todos devem usar o mesmo tom de vermelho suave (`bg-destructive-pastel`) para manter a identidade visual consistente.

**Exemplo:** No form de despesa o fundo do erro é rosa-claro, no de veículo é vermelho mais forte. Correto: todos rosa-claro com borda sutil.

---

### IC-05 — Tela "sem veículos" faltando em alguns formulários

**Hoje:** Quando você não tem nenhum veículo cadastrado, alguns formulários mostram um card dizendo "Cadastre um veículo primeiro" com um botão. Outros simplesmente exibem o formulário vazio (com o campo veículo sem opções).

**Correto:** Todos os formulários que precisam de veículo devem mostrar a tela de "nenhum veículo" com o botão de cadastro.

**Exemplo:** Você abre o formulário de custo recorrente sem ter veículos. Hoje: vê o formulário com um select vazio. Correto: vê a mensagem "Cadastre um veículo" com botão direto para cadastro.

**Afetado:** Formulário de custos recorrentes.

---

### IC-06 — Rascunho automático não funciona em todos os formulários

**Hoje:** Se você está preenchendo um formulário e fecha a aba por acidente, em alguns formulários os dados são salvos como rascunho e restaurados quando você volta. Em outros, tudo se perde.

**Correto:** Quando a função de rascunho está habilitada nas preferências, todos os formulários transacionais (despesa, multa, manutenção, custo recorrente) devem salvar e restaurar rascunhos.

**Exemplo:** Você preenche metade de uma multa e fecha o navegador sem querer. Hoje: perde tudo. Correto: ao reabrir a página, vê a mensagem "Seus dados foram restaurados do rascunho anterior."

**Afetado:** Formulários de multa e custo recorrente.

---

### IC-07 — Formato de resposta das ações de veículo diferente

**Hoje:** Ao salvar um veículo, o sistema retorna o ID do veículo criado. Ao salvar uma despesa, retorna uma mensagem de sucesso. O formato diferente dificulta o tratamento uniforme de sucesso/erro no código.

**Correto:** Todas as ações devem retornar no mesmo formato: sucesso com mensagem, ou erro com detalhes dos campos inválidos.

**Exemplo:** O código que trata o resultado de "salvar" precisa verificar formatos diferentes para cada formulário. Correto: um único formato para todos.

**Afetado:** Ações do formulário de veículo.

---

### IC-08 — Após salvar, alguns formulários não redirecionam

**Hoje:** Ao criar uma despesa, você é levado de volta para a lista de despesas. Ao criar um veículo ou custo recorrente, você fica na mesma página sem feedback claro de que salvou.

**Correto:** Ao criar qualquer registro, você deve ser redirecionado para a listagem correspondente. Ao editar, a página simplesmente atualiza sem redirecionar.

**Exemplo:** Você cadastra um veículo novo e clica salvar. Hoje: fica na mesma tela. Correto: vai para a lista de veículos onde vê seu veículo recém-criado.

**Afetado:** Formulários de veículo e custo recorrente.

---

### IC-09 — Confirmação ao descartar só existe no formulário de veículo

**Hoje:** Se você preencheu metade do formulário de veículo e clica "Cancelar", aparece um diálogo perguntando "Descartar alterações?". Nos outros formulários, o cancelamento é imediato e você perde tudo sem aviso.

**Correto:** Todos os formulários devem perguntar antes de descartar quando há dados preenchidos.

**Exemplo:** Você preenche R$ 350,00 numa despesa, erra e clica cancelar. Hoje: tudo some sem perguntar. Correto: aparece "Descartar alterações?" com opções de confirmar ou voltar.

**Afetado:** Todos os formulários exceto o de veículo.

---

### IC-10 — Campo de valor em custo recorrente usa input numérico nativo

**Hoje:** No formulário de custo recorrente, o campo "Valor" é um input numérico padrão do navegador (com setinhas para cima/baixo). Não formata como moeda brasileira e o comportamento é diferente dos outros formulários.

**Correto:** Deve usar o mesmo `CurrencyInput` (estilo caixa eletrônico) que os formulários de despesa e multa usam: você digita os números e o valor se formata automaticamente como R$ 1.234,56.

**Exemplo:** Você quer digitar R$ 2.500,00 no IPVA. Hoje: vê um campo com setinhas do navegador. Correto: digita "250000" e aparece "2.500,00" formatado.

**Afetado:** Formulário de custo recorrente.

---

## 5. Regras Novas (candidatas para RULES.md)

| ID proposto | Regra | Justificativa |
|-------------|-------|---------------|
| R-FORM-01 | Todo formulário usa `mode: 'onBlur'` e `reValidateMode: 'onChange'` | Uniformizar timing de validação |
| R-FORM-02 | Todo campo usa `FormField` + `Controller` pattern (nunca `.register()`) | Garantir a11y automática via `FormControl` |
| R-FORM-03 | Valores monetários sempre usam `CurrencyInput` (ATM-style); nunca `<input type="number">` | UX consistente para BRL |
| R-FORM-04 | Create actions redirecionam para listagem; update/delete fazem `revalidate()` sem redirect | Fluxo previsível pós-submit |
| R-FORM-05 | Todos os forms transacionais implementam dirty check com `AlertDialog` ao cancelar | Prevenir perda de dados acidental |
| R-FORM-06 | Server Actions retornam `ActionResult` padrão: `{ success, message } \| { success, error, fieldErrors? }` | Contrato uniforme frontend ↔ backend |
| R-FORM-07 | Todo formulário transacional sem veículos exibe empty state com CTA | Guiar o usuário para cadastro de veículo |
| R-FUEL-07 | Pre-fill de `fuel_type` segue prioridade: favorito do veículo > último abastecimento > vazio | Respeitar a preferência explícita do usuário sobre a inferência automática |
| R-FUEL-08 | Pre-fill de `price_per_liter` por fornecedor não sobrescreve edição manual do usuário (pilha `fuelEditOrder`) | Respeitar input explícito; pre-fill é sugestão, não imposição |

---

## 6. Componentes de Referência

| Componente | Pacote | Uso |
|-----------|--------|-----|
| `Form` | `@nave/ui` | Wrapper FormProvider |
| `FormField` | `@nave/ui` | Controller binding com contexto |
| `FormControl` | `@nave/ui` | Slot com a11y automática |
| `FormLabel` | `@nave/ui` | Label vinculado ao campo |
| `FormMessage` | `@nave/ui` | Mensagem de erro |
| `FormDescription` | `@nave/ui` | Texto auxiliar |
| `CurrencyInput` | `@nave/ui` | Input BRL com acumulador ATM |
| `OdometerInput` | `@nave/ui` | Input km com acumulador |
| `DatePicker` | `@nave/ui` | Seletor de data com Calendar (`captionLayout="dropdown"`) |
| `Select` | `@nave/ui` | Dropdown padrão |
| `FipeCombobox` | `apps/web` | Combobox com busca FIPE |
| `FormDraftGuard` | `apps/web` | Notificação de draft restaurado |
| `useFormDraftGuard` | `apps/web` | Hook de persistência de draft |
| `useVehicleContextField` | `apps/web` | Hook de contexto de veículo |

---

## Changelog

- **2026-07-14 (T3.10):** R-FORM-05 (dirty check + confirmação ao cancelar) e R-FORM-07 (empty
  state com CTA quando sem veículos) aplicados retroativamente ao Expense Form
  (`apps/web/src/app/expenses/new/page.tsx`, `apps/web/src/app/expenses/[id]/page.tsx`), único
  formulário transacional com tela própria no frontend até esta data. Adaptação sem
  `AlertDialog`/`FormField` (ver nota da Seção 2026-07-14 acima): confirmação via
  `window.confirm`, mesmo padrão já usado nas exclusões dessas telas. R-FORM-01/02/06 seguem ⏳,
  dependentes da stack react-hook-form/`@nave/ui` (Fase 8). R-FORM-04 já estava conforme (create
  redireciona, update não). Demais formulários do inventário (Vehicle, Fine, Maintenance,
  RecurringCost) ficam fora do escopo desta aplicação retroativa — não têm tela própria ainda ou
  já são tratados em specs específicas (ex: SPEC-20260602-002 para Vehicle).
