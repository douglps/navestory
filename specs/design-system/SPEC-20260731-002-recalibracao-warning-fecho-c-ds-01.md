---
id: SPEC-20260731-002
title: "Design System — Recalibração de `--warning`/`--danger-foreground` e Fecho de C-DS-01"
status: approved
date: 2026-07-31
author: Douglas Lopes (lps.doug@protonmail.com)
rules: []
security: []
camadas: [frontend, design]
---

# SPEC-20260731-002: Design System — Recalibração de `--warning`/`--danger-foreground` e Fecho de C-DS-01

**Status:** approved
**Criada em:** 2026-07-31
**Autor:** Douglas Lopes (lps.doug@protonmail.com)

---

## Contexto

`apps/web/src/app/(app)/design-system/_lib/contrast.spec.ts` (criado na Rodada 4 de
`specs/design-system/PLANO-MIGRACAO-SHOWCASE-INFRA.md`) ficava intencionalmente vermelho: o
token `--warning` (uso não-textual — seta de tendência do `KpiCard`, `border`/`border-l` de
`Alert`/`Badge`/`Toast`) não atingia o mínimo de 3:1 exigido por `C-DS-01` em light mode
(`warning` sobre `card` ≈ 1,88:1; `warning` sobre `warning-pastel` ≈ 1,68:1). A decisão registrada
em 2026-07-30 foi deixar o teste vermelho até uma spec dedicada recalibrar o token — ver
`PLANO-MIGRACAO-SHOWCASE-INFRA.md` changelog, Rodada 4.

O par `success` sobre `card`, também vermelho naquela rodada (~2,97:1), já foi resolvido como
efeito colateral de `SPEC-20260731-001` (RF-02): a migração de `--card` para o grafite dedicado da
direção Azul-Índigo elevou esse par para ≈3,10:1, acima do piso. Só `--warning` seguia pendente
nesta sessão.

`--danger-foreground` também é reaberto por esta spec: `SPEC-20260731-001` o manteve no valor
literal de Prata (`97.2% 0.003 248`) por não conseguir migrá-lo com segurança para a família de
grafite Azul-Índigo — trocar só o hue (mantendo L=97.2%) derrubava o contraste
`danger`/`danger-foreground` de ~4,51:1 para ~4,499:1, abaixo do piso AA. Embora não houvesse falha
de C-DS-01 associada (o par já passava com o valor literal), o token ficava como uma exceção
isolada, fora da família neutra do resto do sistema — dívida de consistência que esta spec fecha
junto da recalibração de `warning`.

---

## Objetivo

Recalibrar `--warning` (light mode) para atingir ≥3:1 contra `--card` e contra `--warning-pastel`
— o mínimo não-textual de `C-DS-01` — e unificar `--danger-foreground` com a família de grafite
Azul-Índigo, sem regressão nos demais pares testados por `contrast.spec.ts`, fechando a pendência
registrada na Rodada 4 de `PLANO-MIGRACAO-SHOWCASE-INFRA.md` e a nota técnica pendente de
`SPEC-20260731-001`.

---

## Histórias de Usuário e Critérios de Aceitação

**Persona P2 — Gestor de frota**, usuário final que lê indicadores visuais de status (seta de
tendência de KPI, borda de alerta) em rotina tranquila e em momentos de estresse operacional.

### US-01 — Indicador de warning legível em light mode

**Como** P2, **quero** que a seta de tendência amarela do `KpiCard` e a borda do `Alert`/`Badge`/
`Toast` variant `warning` sejam distinguíveis do fundo em light mode, **para** não perder um sinal
de atenção justamente no tema padrão do produto.

- **Dado que** o tema light está ativo, **quando** `--warning` é renderizado sobre `--card`,
  **então** a razão de contraste é ≥3:1.
- **Dado que** o tema light está ativo, **quando** `--warning` é renderizado sobre
  `--warning-pastel` (fundo de `Alert`/`Badge`/`Toast` variant `warning`), **então** a razão de
  contraste é ≥3:1.
- **Dado que** o tema dark está ativo, **quando** os mesmos pares são medidos, **então** a razão
  de contraste permanece igual à de antes desta spec (nenhuma regressão) — o dark mode já
  atingia o piso com o valor claro original de `--warning`.

### US-02 — `--danger-foreground` consistente com a família de grafite

**Como** P1, **quero** que `--danger-foreground` pertença à mesma família neutra de
`--background`/`--primary-foreground` (grafite Azul-Índigo), **para** eliminar a exceção isolada
que `SPEC-20260731-001` deixou registrada como nota técnica pendente, sem reabrir o risco de
quebrar o piso AA que motivou aquela decisão.

- **Dado que** `--danger`/`--danger-foreground` são renderizados como uso sólido (`Button`
  variant `destructive`), **quando** medidos, **então** a razão de contraste é ≥4.5:1 com margem
  (não mais os ~4,499:1 que a migração direta para o hue de grafite produziria).
- **Dado que** `--danger` é consultado para os pares não-textuais existentes (`danger` sobre
  `card`, `danger` sobre `danger-pastel`, em ambos os temas), **quando** medidos após a mudança,
  **então** nenhum regride — `--danger` em si não é alterado por esta spec, só
  `--danger-foreground`.

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | História relacionada |
|----|-----------|------------|----------------------|
| RF-01 | Recalibrar `colorChannels.warning` (light) de `75% 0.16 85` para `54% 0.14 85` em `packages/ui/src/tokens/colors.ts` e no espelho `apps/web/src/app/globals.css` (`:root`) | Alta | US-01 |
| RF-02 | Adicionar `darkColorChannels.warning` explícito (`75% 0.16 85`, o valor claro original) em `colors.ts` e em `globals.css` (`.dark`), preservando o comportamento de dark mode inalterado | Alta | US-01 |
| RF-03 | Atualizar o comentário desatualizado em `packages/ui/src/components/kpi-card.tsx` (RF-02/RNF-02 de `SPEC-20260721-001`) que descrevia incorretamente `warning` como já conforme ao piso não-textual | Média | US-01 |
| RF-04 | Atualizar `matrices/rastreabilidade.md` e `specs/design-system/PLANO-MIGRACAO-SHOWCASE-INFRA.md` (changelog da Rodada 4) registrando o fecho da pendência | Alta | — |
| RF-05 | Recalibrar `colorChannels.dangerForeground`/`--danger-foreground` de `97.2% 0.003 248` (literal de Prata) para `97.5% 0.003 265` (hue da família de grafite, L ligeiramente elevado para preservar margem AA) em `colors.ts` e `globals.css` | Alta | US-02 |

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | `apps/web/.../design-system/_lib/contrast.spec.ts` passa 100% (22/22), ambos os temas | `vitest run` sem falhas |
| RNF-02 | Nenhuma regressão nas suítes existentes de `packages/ui`/`apps/web` | `packages/ui` 179/179; `apps/web` 351/351 (as 2 falhas pré-existentes de `warning` desaparecem como efeito direto desta spec, não são mascaradas) |
| RNF-03 | `danger`/`danger-foreground` (uso sólido) mantém margem folgada acima do piso AA de 4.5:1 após RF-05 | Razão medida ≥4.5:1, validada por `contrast.spec.ts` |

---

## Fora de Escopo

- Recalibração de `--danger` (o solid, não o foreground) — a mudança fica só em
  `--danger-foreground`, ver Notas Técnicas para por que escurecer `--danger` não é uma opção
  segura (quebraria a margem mínima de `danger` sobre `danger-pastel` em dark mode).
- Recalibração de `--warning` de H≈85 para H≈48 (derivado do ouro) — já registrada como avaliação
  futura não-bloqueante em `SPEC-20260731-001` (Fora de Escopo, §3.3 da proposta).
- `warningForeground`/`bg-warning` sólido com texto direto — nenhum componente de produção usa
  esse padrão hoje (confirmado por grep em `alert.tsx`/`toast.tsx`/`badge.tsx`/`kpi-card.tsx`);
  `warningForeground` só é consumido sobre `warning-pastel`, par independente do valor de
  `warning` recalibrado aqui.

---

## Dependências

| Tipo | Referência | Descrição |
|------|-----------|-----------|
| Spec | SPEC-20260721-001 | Mecanismo de tokens/dark mode/contraste — reutilizado sem alteração |
| Spec | SPEC-20260731-001 | Migração de `--card` para o grafite Azul-Índigo — resolveu `success` sobre `card` como efeito colateral, isolando `warning` como única pendência |
| Regra | C-DS-01 | Contraste WCAG AA mínimo — fechamento formal desta spec |
| Doc | PLANO-MIGRACAO-SHOWCASE-INFRA.md | Rodada 4 registrou a pendência que esta spec fecha |

---

## Notas Técnicas

**Valores calculados (`contrastRatio` de `_lib/contrast.ts`, fórmula WCAG relativa):**

| Par | Antes (L=75%) | Depois (L=54%) |
|---|---|---|
| `warning` sobre `card` (light) | 1,88:1 | 4,27:1 |
| `warning` sobre `warning-pastel` (light) | 1,68:1 | 3,80:1 |
| `warning` sobre `card` (dark, valor preservado) | passava | passa (inalterado) |
| `warning` sobre `warning-pastel` (dark, valor preservado) | passava | passa (inalterado) |

Croma reduzido de `0.16` para `0.14` junto da luminosidade para preservar a saturação percebida ao
escurecer o tom (mesma lógica aplicada a `--muted-foreground` em `SPEC-20260729-001`). O novo
valor de light (`L=54%`) fica na mesma faixa de luminosidade dos demais tokens semânticos
(`danger` L=56,3%, `info` L=55,6%, `success` L=60%), suprimindo a inconsistência visual de
`warning` ser perceptivelmente mais claro que as demais variantes.

**`--danger-foreground` — por que o ajuste ficou no foreground, não no `danger`:** escurecer
`danger` para abrir margem no par `danger`/`danger-foreground` foi cogitado e descartado — em
dark mode, `danger` sobre `danger-pastel` já opera em ~3,03:1 (margem de 0,03 acima do piso
não-textual de 3:1); qualquer redução de L em `danger` derruba esse par abaixo do piso. O ajuste
ficou isolado em `dangerForeground`, elevando L de 97,2% para 97,5% (imperceptível — "branco
quase puro" continua "branco quase puro") e trocando o hue de 248 (Prata) para 265 (grafite
Azul-Índigo, mesmo de `--background`/`--primary-foreground`):

| Par | Antes (Prata, L=97,2% H=248) | Depois (grafite, L=97,5% H=265) |
|---|---|---|
| `danger` sobre `danger-foreground` | ~4,53:1 | ~4,57:1 |
| `danger` sobre `card` (não-textual, inalterado) | ~4,20:1 | ~4,20:1 |
| `danger` sobre `danger-pastel` dark (não-textual, inalterado) | ~3,03:1 | ~3,03:1 |

---

## Changelog (pós-aprovação)

> Preencher apenas após `status: approved`. Mudança estrutural (reverte/substitui requisito) não
> edita aqui — cria spec nova com `superseded_by`.

| Data | O que mudou | Por quê |
|------|-------------|---------|
| 2026-07-31 | RF-01 a RF-05 implementados e spec promovida direto a `approved` na mesma sessão (mesmo padrão de `SPEC-20260729-001`/`SPEC-20260731-001`). Escopo ampliado durante a implementação: `--danger-foreground` também recalibrado (RF-05/US-02), unificando-o com a família de grafite em vez de deixá-lo como exceção isolada — decisão tomada ao constatar que escurecer `--danger` (alternativa natural para abrir margem) quebraria `danger` sobre `danger-pastel` em dark mode (~3,03:1, margem mínima). RNF-01 a RNF-03 confirmados: `contrast.spec.ts` 22/22, `packages/ui` 179/179, `apps/web` 351/351 (sem falhas remanescentes). | Usuário pediu explicitamente para recalibrar `warning`/`dangerForeground` e fechar C-DS-01. |

