---
id: SPEC-20260606-002
title: "Fornecedor / Posto de Combustível"
status: approved
date: 2026-06-06
author: douglps
rules: [R-FUEL-04, R-FUEL-05]
security: [S2]
camadas: [backend, frontend, database]
---

# Fornecedor / Posto de Combustível

## Objetivo

Permitir o registro do posto de combustível no lançamento de abastecimento, com autocomplete baseado no histórico do próprio usuário, habilitando conciliação com cartão frota e análises de custo por fornecedor.

## Contexto

Gestores que usam cartão combustível precisam conciliar registros do sistema com o extrato do cartão. Hoje o posto é anotado no campo `description` misturado com outras observações, tornando a conciliação manual e propensa a erros.

## Escopo

### Campo novo na tabela `expenses`

| Campo | Tipo | Default | Obrigatório | Regra |
|---|---|---|---|---|
| `supplier` | `TEXT NULL` | `null` | Não | R-FUEL-04 |

Constraint de banco: `char_length(supplier) <= 100`.

### Campo novo na tabela `expense_templates`

| Campo | Tipo | Observação |
|---|---|---|
| `supplier` | `TEXT NULL` | Templates podem persistir o fornecedor habitual (R-FUEL-05) |

## Requisitos Funcionais

### RF-01 — Persistir supplier
O sistema deve aceitar `supplier` no payload de criação/edição de despesa. Sem validação de formato (texto livre). Comprimento > 100 caracteres retorna HTTP 400.

### RF-02 — Autocomplete com histórico do usuário
O formulário deve exibir sugestões de postos já usados pelo usuário ao digitar no campo. As sugestões vêm da query:
```sql
SELECT DISTINCT supplier
FROM expenses
WHERE user_id = $1
  AND supplier IS NOT NULL
  AND deleted_at IS NULL
ORDER BY MAX(date) DESC
LIMIT 10
```
O match é case-insensitive. O valor persistido mantém a capitalização original digitada.

### RF-03 — Sem tabela separada de fornecedores
As sugestões de autocomplete vêm diretamente da tabela `expenses` — sem tabela auxiliar de fornecedores. Isso evita overhead de manutenção e garante que o histórico reflita apenas postos realmente usados.

### RF-04 — Campo aceita texto livre
Se o usuário digitar um nome que não existe no histórico, o valor é aceito normalmente. Na próxima abertura do formulário, o novo posto aparecerá como sugestão.

## Requisitos Não-Funcionais

- A query de sugestões deve usar o índice existente `idx_expenses_user_id` com filtro em `supplier IS NOT NULL`
- A query deve ser disparada uma vez no foco do campo, não a cada keystroke (debounce de 300ms ou fetch-on-focus com cache local)
- `supplier` coberto por RLS owner-only (herdado da tabela `expenses`)

## Critérios de Aceitação de Alto Nível

- `supplier = "Shell Av. Paulista"` salvo e recuperado corretamente
- `supplier` com 101 caracteres → HTTP 400
- `supplier = null` (não preenchido) → HTTP 201, sem erro
- Ao abrir o campo e digitar "sh", sugestão "Shell Av. Paulista" aparece se já usada antes
- Texto livre sem match no histórico é aceito e salvo normalmente
- Template com `supplier = "Ipiranga Centro"` persiste e pré-preenche o campo ao aplicar
