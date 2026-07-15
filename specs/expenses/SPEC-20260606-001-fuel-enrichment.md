---
id: SPEC-20260606-001
title: "Tipo de Combustível, Tanque Cheio e Cálculo de Consumo"
status: approved
date: 2026-06-06
author: douglps
rules: [R4, R-FUEL-01, R-FUEL-02, R-FUEL-03, R-FUEL-05]
security: [S2]
camadas: [backend, frontend, database]
---

# Tipo de Combustível, Tanque Cheio e Cálculo de Consumo

## Objetivo

Enriquecer o formulário de abastecimento com campos opcionais que desbloqueiam o cálculo automático de km/l e preço/litro — o principal indicador de saúde do veículo — sem adicionar obrigatoriedade ou fricção ao fluxo existente.

## Contexto

O formulário atual captura `amount`, `odometer_km` (obrigatório, R4) e `liters` (opcional). Sem `fuel_type` e `full_tank`, o sistema não consegue:
- Comparar eficiência entre gasolina e etanol (veículos flex)
- Calcular km/l de forma confiável (abastecimentos parciais distorcem a média)
- Derivar preço/litro automaticamente

## Escopo

### Campos novos na tabela `expenses`

| Campo | Tipo | Default | Obrigatório | Regra |
|---|---|---|---|---|
| `fuel_type` | `TEXT NULL` | `null` | Não | R-FUEL-01 |
| `full_tank` | `BOOLEAN NULL` | `null` | Não | R-FUEL-02 |

Enum de valores válidos para `fuel_type`:

| Valor | Label (pt-BR) |
|---|---|
| `gasoline` | Gasolina Comum |
| `gasoline_premium` | Gasolina Aditivada |
| `ethanol` | Etanol |
| `diesel` | Diesel S500 |
| `diesel_s10` | Diesel S10 |
| `gnv` | GNV |
| `electric` | Elétrico |
| `hybrid` | Híbrido |

### Campos derivados (sem persistência)

| Campo | Fórmula | Condição de exibição |
|---|---|---|
| `computed.km_per_liter` | `(odometer_km - max_prev_odometer) ÷ liters` | `full_tank = true` AND `liters > 0` AND histórico disponível |
| `computed.price_per_liter` | `amount ÷ liters` | `liters > 0` |

### Campos novos na tabela `expense_templates`

| Campo | Tipo | Observação |
|---|---|---|
| `fuel_type` | `TEXT NULL` | Pode ser pré-preenchido em templates (R-FUEL-05) |

`full_tank` **não** é adicionado a templates (R-FUEL-05).

## Requisitos Funcionais

### RF-01 — Persistir fuel_type
O sistema deve aceitar `fuel_type` no payload de criação/edição de despesa de categoria `fuel`. Quando informado, deve validar contra o enum `FuelType`. Valor fora do enum retorna HTTP 400.

### RF-02 — Persistir full_tank
O sistema deve aceitar `full_tank` (boolean) no payload. `null` é válido (campo não informado). O campo nunca afeta a validação de odômetro (regressão e obrigatoriedade — já cobertas por SPEC-20260601-001).

### RF-03 — Retornar computed.km_per_liter
Após criar ou editar uma despesa de categoria `fuel`, o sistema deve retornar:
```json
{
  "computed": {
    "km_per_liter": 18.7,
    "price_per_liter": 5.81
  }
}
```
`km_per_liter` é `null` se: `full_tank != true`, `liters` ausente/nulo, sem histórico anterior de odômetro.
`price_per_liter` é `null` se `liters` ausente/nulo.

### RF-04 — Pré-preencher fuel_type com última seleção do veículo
Ao abrir o formulário para um veículo com abastecimentos anteriores, o campo `fuel_type` deve ser pré-preenchido com o `fuel_type` do último registro não-nulo daquele veículo. Sem histórico: campo vazio.

### RF-05 — Default de full_tank no formulário
O toggle "Abastecimento parcial?" deve ser exibido desmarcado por padrão (equivalente a `full_tank = true`). Marcar o toggle define `full_tank = false`.

### RF-06 — Hint de último odômetro com delta
O formulário deve exibir abaixo do campo `odometer_km` o hint:
- Com histórico e sem valor digitado: `Último: 52.340 km · 3 dias atrás`
- Com histórico e valor digitado: `Último: 52.000 km (+840 km desde 03/06)`
- Sem histórico: hint omitido

### RF-07 — Exibir km/l em tempo real no formulário
O formulário deve calcular e exibir `km/l` em tempo real (sem fetch adicional) quando:
- `full_tank` está ativo (toggle desmarcado)
- `liters` preenchido
- Histórico de odômetro disponível (obtido no mount do form)

Quando histórico ausente e full_tank ativo, exibir: `"Consumo aparece após o 2º abastecimento completo"`.

### RF-08 — Exibir preço/litro em tempo real no formulário
Quando `amount` e `liters` estiverem preenchidos, exibir `Preço/litro: R$ X,XX` em tempo real abaixo dos campos. Desaparece ao apagar qualquer um dos dois campos.

## Requisitos Não-Funcionais

- Busca do `max_prev_odometer` reutiliza o índice `idx_expenses_vehicle_odometer` (já existe) — sem query adicional se feita junto à validação de regressão (SPEC-20260601-001)
- Cálculo de km/l e preço/litro é feito no service layer, não no banco
- `fuel_type` e `full_tank` devem ser cobertos por RLS owner-only (herdado da tabela `expenses`)

## Critérios de Aceitação de Alto Nível

- `fuel_type = 'kerosene'` → HTTP 400
- `fuel_type = 'ethanol'`, `full_tank = true`, `liters = 45`, `odometer_km = 52840`, histórico max = 52000 → `computed.km_per_liter = 18.53`, `computed.price_per_liter = amount ÷ 45`
- `full_tank = false` → `computed.km_per_liter = null`
- `liters = null` → `computed.price_per_liter = null` e `computed.km_per_liter = null`
- Template com `fuel_type = 'diesel'` salvo e recuperado corretamente
- Template sem campo `full_tank` (não persiste)

## Histórico de Decisões

- `full_tank` default = `true` no formulário (não `null`) — avaliação gestor-frota: tanque cheio é o caso normal em frotas; toggle exibido como "Abastecimento parcial?" reduz cliques
- `fuel_type` pré-preenchido com último valor do veículo — frotas homogêneas (só diesel) não querem selecionar sempre o mesmo tipo
- km/l nunca persiste — calculado on-demand para evitar inconsistência com edições retroativas de odômetro
