# Specs — Nave SaaS

Esta pasta é a **fonte de verdade de requisitos** do projeto. Antes de implementar qualquer feature, a spec deve existir e estar aprovada.

---

## Documentos Centrais

| Documento | Propósito |
|-----------|-----------|
| [RULES.md](RULES.md) | Regras de domínio (R), segurança (S), performance (P), compliance (C) — **ler primeiro** |
| [TESTS_SPEC.md](TESTS_SPEC.md) | Pirâmide de testes, casos críticos, nomenclatura |
| [AGENTS.md](AGENTS.md) | Diretrizes para agentes IA trabalhando neste projeto |
| [API-SPEC.md](API-SPEC.md) | Convenções de API, endpoints, códigos de erro |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Resumo da arquitetura + ponteiro para `docs/architecture/` |
| [PRD.md](PRD.md) | Visão, personas, critérios de sucesso + ponteiro para `docs/PRD/` |

---

## Features e Specs

| Feature | Pasta | Specs |
|---------|-------|-------|
| Autenticação | [auth/](auth/) | SPEC-20260524-001, SPEC-20260524-002 |
| Despesas | [expenses/](expenses/) | SPEC-20260521-003, SPEC-20260601-001, -002, -003, SPEC-20260602-004, SPEC-20260606-001, -002, SPEC-20260608-001, -002, -003, SPEC-20260609-001, -002, -003, SPEC-20260612-001, -002 |
| Multas | [fines/](fines/) | SPEC-20260607-001 |
| Manutenção | [maintenance/](maintenance/) | SPEC-20260521-002, SPEC-20260603-002 |
| Dashboard | [dashboard/](dashboard/) | SPEC-20260531-001, SPEC-20260602-005 |
| Veículos | [vehicles/](vehicles/) | SPEC-20260602-002, SPEC-20260602-003, SPEC-20260603-003 |
| Preferencias | [preferences/](preferences/) | SPEC-20260603-004, SPEC-20260612-003 |
| Segurança | [security/](security/) | SPEC-20260521-001 |
| Admin / LGPD | [admin/](admin/) | SPEC-20260521-004, SPEC-20260521-005 |
| Design System | [design-system/](design-system/) | SPEC-20260525-001 |
| Contexto Global | [context/](context/) | SPEC-20260602-001, SPEC-20260603-001 |
| Formulários | [forms/](forms/) | SPEC-20260619-001 |
| Negócio / Estratégia | [business/](business/) | SPEC-20260620-001 |
| Analytics / BI | [analytics/](analytics/) | SPEC-20260622-001 (Fase 1 implementada) |
| PWA / Offline | [pwa/](pwa/) | SPEC-20260712-001 (draft) |

---

## Criando uma Spec Nova

**1.** Escolha a pasta de feature (ou crie uma nova se o domínio não existe).

**2.** Nomeie o arquivo:
```
specs/<feature>/SPEC-YYYYMMDD-NNN.md
```

**3.** Use o frontmatter obrigatório:
```yaml
---
id: SPEC-YYYYMMDD-NNN
title: "Título da Feature"
status: draft | review | approved | deprecated
date: YYYY-MM-DD
author: <username>
rules: [R1, R4]      # IDs de regras de domínio (ver RULES.md)
security: [S1]       # IDs de regras de segurança (ver RULES.md)
---
```

**4.** Atualize `matrices/rastreabilidade.md` com o novo ID e status `⏳ Pendente`.

**5.** Use o comando `/nova-spec` ou o agente `spec-writer` — eles preenchem o frontmatter automaticamente.

---

## Rastreabilidade

### Código → Spec
Arquivos que implementam requisitos rastreáveis anotam no topo ou na função:
```ts
// @spec SPEC-20260601-001 RF-02
```

### Buscar specs por regra
```bash
grep -r "R1" specs/ --include="*.md"
```

---

## Status dos Ciclos de Vida

| Status | Significado |
|--------|-------------|
| `draft` | Rascunho, ainda não revisado |
| `review` | Em revisão |
| `approved` | Aprovado, pode ser implementado |
| `deprecated` | Substituído ou cancelado |

---

## O Que Não Entra Aqui

- Código → `apps/` e `packages/`
- Decisões arquiteturais (ADRs) → `docs/architecture/decisions/`
- Documentação de produto para usuários → `docs/guides/user/`
- Runbooks e operações → `docs/operations/`
