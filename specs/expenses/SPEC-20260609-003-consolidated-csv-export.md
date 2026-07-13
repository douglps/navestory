---
id: SPEC-20260609-003
title: "Exportação CSV consolidada de todas as origens financeiras"
status: approved
date: 2026-06-09
author: douglps
rules: [R5, R-LED-01, S1, S2]
security: [S1, S2]
---

# SPEC-20260609-003 — Exportação CSV Consolidada

## Objetivo

Permitir ao gestor exportar em um único arquivo CSV todas as movimentações financeiras da frota: despesas manuais + despesas vinculadas (manutenções, multas, custos recorrentes), com coluna de origem para rastreabilidade.

---

## Requisitos Funcionais

### RF-01 — Endpoint de exportação consolidada

- `GET /expenses/export?from=&to=&vehicle_id=&format=csv`
- Parâmetros: `from` (data ISO), `to` (data ISO), `vehicle_id` (opcional)
- Retorna JSON array de `ConsolidatedExportRow`
- Padrão: últimos 12 meses quando `from`/`to` ausentes

### RF-02 — Conteúdo da exportação

Inclui em uma única listagem:
1. **Expenses** (`expenses` com `deleted_at IS NULL`) — manual + readonly (todas as fontes)
2. Expenses já incluem manutenções e multas via `source_type` — sem duplicação

Colunas do CSV:

| Coluna | Fonte |
|--------|-------|
| Data | `expenses.date` |
| Veículo | `vehicles.make + model` |
| Placa | `vehicles.plate` |
| Categoria | `expenses.category` (label pt-BR) |
| Valor (R$) | `expenses.amount` |
| Origem | `source_type` humanizado (Despesa Manual / Manutenção / Multa / Documento) |
| Descrição | `expenses.description` |

### RF-03 — Frontend: botão "Exportar consolidado"

- Botão único que exporta todo o ledger (sem filtro obrigatório)
- Label: "Exportar CSV Completo"
- Posicionado ao lado do botão "Exportar CSV" existente na tab Todas
- Exportação client-side (via fetch da query Supabase) — não requer novo endpoint API

---

## Comportamento de exportação (cliente)

1. Busca `expenses` com join de `vehicles`, incluindo `source_type`
2. Gera CSV com `﻿` BOM (UTF-8)
3. Colunas: Data, Veículo, Placa, Categoria, Valor (R$), Origem, Descrição
4. Download automático `despesas-completo-YYYY-MM-DD.csv`

---

## Implementação

- Reutiliza `ExportCSVButton` existente com extensão do tipo `ExpenseCSVRow`
- Adiciona campo `source_type` ao tipo `ExpenseCSVRow`
- Adicionar nova coluna "Origem" na geração do CSV

---

## Testes obrigatórios

- CT-CSV-01: CSV gerado tem coluna "Origem" com valores "Despesa Manual", "Manutenção", "Multa", "Documento"
- CT-CSV-02: expenses com `source_type = null` → origem "Despesa Manual"
- CT-CSV-03: CSV inclui BOM UTF-8
- CT-CSV-04: campos com vírgula são escapados com aspas
