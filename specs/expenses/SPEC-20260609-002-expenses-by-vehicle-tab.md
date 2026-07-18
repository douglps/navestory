---
id: SPEC-20260609-002
title: "Tab 'Por Veículo' em /expenses com accordion e subtotais"
status: approved
date: 2026-06-09
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [R5, S1, S2]
security: [S1, S2]
camadas: [frontend]
---

# SPEC-20260609-002 — Tab "Por Veículo" em /expenses

## Objetivo

Adicionar uma quarta tab em `/expenses` que agrupa despesas por veículo em formato accordion, exibindo subtotais por veículo e tornando a visão por frota imediata.

---

## Requisitos Funcionais

### RF-01 — Nova tab "Por veículo"

- Tab label: `Por veículo`
- URL param: `?tab=por-veiculo`
- Posicionada após "Em atraso" na barra de tabs

### RF-02 — Agrupamento em accordion

- Cada veículo é um item de accordion com:
  - Header: `{make} {model} · {plate}` + subtotal formatado em BRL
  - Conteúdo: tabela de despesas do veículo (mesma estrutura da tab Todas)
  - Contador de registros no badge do header
- Veículos sem despesas no período filtrado não aparecem
- Ordenação do accordion: maior subtotal primeiro

### RF-03 — Subtotal por veículo

- Subtotal = soma de `amount` de todas as despesas do veículo dentro dos filtros ativos (mês, categoria, source_type)
- Exibido em destaque no header do accordion (Typography variant="data" weight="bold")

### RF-04 — Filtros compatíveis

- Filtros de mês e categoria funcionam na tab "Por veículo"
- Filtro de `vehicle` é ignorado (a tab já é por veículo — mostra todos)
- Source filter (se aplicado) restringe apenas as despesas, mantendo os grupos

### RF-05 — Total geral

- Card acima do accordion mostra o total consolidado de todos os veículos

---

## Mockup

```
┌─ Todas ─┬─ Próximas ─┬─ Em atraso ─┬─ Por veículo ──────┐
│                                                            │
│  Total geral: R$ 4.320,00  (3 veículos · 18 registros)    │
│                                                            │
│ ▼ Civic EX (ABC1234)                     R$ 2.100,00 [8]  │
│   ┌──────────────────────────────────────────────────┐    │
│   │ 15/05 │ Combustível │ R$ 180,00  │ ...  │ ⋯ │     │    │
│   │ 03/05 │ Manutenção  │ R$ 950,00  │ ...  │ 🔒│     │    │
│   └──────────────────────────────────────────────────┘    │
│                                                            │
│ ▶ Onix LT (DEF5678)                      R$ 1.450,00 [6]  │
│ ▶ Compass (GHI9012)                       R$ 770,00 [4]   │
└────────────────────────────────────────────────────────────┘
```

---

## Implementação

- Server Component (Next.js) — dados buscados no servidor
- Usa query de expenses com `vehicles(make, model, plate)` join (igual tab Todas, sem paginação)
- Agrupamento feito em memória no servidor (JavaScript `reduce`)
- Accordion usa estado client-side via `use client` ou atributo `details/summary` nativo HTML
- Sem nova rota ou endpoint de API — reutiliza query de expenses existente

---

## Testes obrigatórios

- CT-TAB-01: tab "por-veiculo" renderiza accordion com um item por veículo
- CT-TAB-02: accordion exibe subtotal correto por veículo
- CT-TAB-03: filtro de mês é respeitado (apenas despesas do mês filtrado)
- CT-TAB-04: accordion ordenado por maior subtotal primeiro

---

## Histórico de Revisões

| Versão | Data | Autor | Descrição |
|--------|------|-------|-----------|
| 1.0 | 2026-06-09 | douglps | Criação inicial |
| 1.1 | 2026-06-22 | douglps | Layout de listagem atualizado para padrão 2 linhas + zebra (ref: SPEC-20260525-001 §7) |
