# Specs — Nave SaaS

Esta pasta é a **fonte de verdade de requisitos** do projeto. Antes de implementar qualquer feature, a spec deve existir e estar aprovada.

**Nível de maturidade do projeto:** 2 (Produto)
**Critério:** SaaS multi-módulo com dado sensível/regulado (dados financeiros e pessoais sob LGPD), múltiplos usuários reais previstos e dependências externas reais já em uso (Supabase, Resend). Estrutura completa de specs/matrizes/ADRs já opera nesse regime desde antes da declaração formal deste campo.
**Última revisão:** 2026-07-31

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
| Multas | [fines/](fines/) | SPEC-20260607-001 (approved — backend), SPEC-20260722-005 (approved — frontend) |
| Manutenção | [maintenance/](maintenance/) | SPEC-20260521-002, SPEC-20260603-002 |
| Dashboard | [dashboard/](dashboard/) | SPEC-20260531-001 (approved — redesign Sprint 1-3), SPEC-20260602-005, SPEC-20260721-002 (approved — Dashboard v2: KPIs configuráveis, FleetCharts, HealthScore), SPEC-20260722-004 (approved — Subheader Financeiro) |
| Veículos | [vehicles/](vehicles/) | SPEC-20260602-002, SPEC-20260603-003, SPEC-20260711-001, SPEC-20260730-001 (draft — score de saúde) |
| Grupos de Veículos | [vehicle-groups/](vehicle-groups/) | SPEC-20260602-003 (approved — CRUD core implementado; RF-11..15 FleetAside ⏳ Fase 5) |
| Preferencias | [preferences/](preferences/) | SPEC-20260603-004, SPEC-20260612-003 |
| Segurança | [security/](security/) | SPEC-20260521-001 |
| Admin / LGPD | [admin/](admin/) | SPEC-20260521-004, SPEC-20260521-005 |
| Design System | [design-system/](design-system/) | SPEC-20260525-001 (approved — §10 implementado; migração de consumidores ⏳), SPEC-20260721-001 (approved), SPEC-20260722-001 (approved — direção criativa v2), SPEC-20260722-002 (deprecated — superseded_by SPEC-20260729-001), SPEC-20260729-001 (approved — Prata como identidade de marca), SPEC-20260729-002 (approved — Prata Fase 2: paleta categórica + urgência + varredura), SPEC-20260729-003 (approved — Fecho de Formulários: Input/Textarea/Checkbox/Switch + migração de consumidores), SPEC-20260730-001 (approved — Showcase Prata: Badge/Skeleton/Container/Tooltip), SPEC-20260731-007 (draft — Migração de Emoji para Ícones Lucide em KPI Catalog e Feed de Atividades). Ver também `PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md` e `PROPOSTA-BRAND-PLATAFORMA-2026-07-30.md` — direção "Azul-Índigo" + identidade de marca (definição, não spec formal ainda) |
| Contexto Global | [context/](context/) | SPEC-20260602-001, SPEC-20260603-001 |
| Formulários | [forms/](forms/) | SPEC-20260619-001 |
| Negócio / Estratégia | [business/](business/) | SPEC-20260620-001. Ver também `PLANO-MARKETING-PUBLICIDADE-FUTURO.md` — plano represado de Marketing/Publicidade, ativa só com gatilho real (soft launch, primeiro pagante, verba aprovada) |
| Analytics / BI | [analytics/](analytics/) | SPEC-20260622-001 (Fase 1 implementada) |
| PWA / Offline | [pwa/](pwa/) | SPEC-20260712-001 (approved, v0.5 — implementada) |
| QA / Testes E2E | [qa/](qa/) | SPEC-20260716-003 (draft) |
| DevOps / Infra | [devops/](devops/) | SPEC-20260716-001 (approved), SPEC-20260716-002 (draft) |
| Layout Responsivo | [layout-responsivo/](layout-responsivo/) | SPEC-20260722-003 (approved), SPEC-20260730-002 (draft — melhorias UX shell) |
| Shell de Rotas Públicas | [public-shell/](public-shell/) | SPEC-20260731-004 (draft — PublicHeader, footer consistente, navegação de retorno) |

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
author: Douglas Lopes (lps.doug@protonmail.com)  # nome completo + email; outro colaborador só se identificado no projeto
rules: [R1, R4]      # IDs de regras de domínio (ver RULES.md)
security: [S1]       # IDs de regras de segurança (ver RULES.md)
camadas: [backend, database]  # camadas técnicas tocadas — vocabulário canônico em ~/.claude/CLAUDE.md
---
```

`camadas` é um array com pelo menos 1 valor: `frontend`, `backend`, `database`, `infra`, `devops`, `qa`, `design`, `data`, `mobile` ou `security`. Existe para permitir consulta horizontal ("quais specs tocam backend?") sem quebrar a organização vertical por feature — não crie pastas por camada dentro de `specs/`.

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
