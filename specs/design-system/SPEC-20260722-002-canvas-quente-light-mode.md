---
id: SPEC-20260722-002
title: "Design System — Canvas Quente Sutil no Light Mode"
status: approved
date: 2026-07-22
author: Douglas Lopes (lps.doug@protonmail.com)
rules: [C-DS-01]
security: []
camadas: [frontend, design]
---

# SPEC-20260722-002: Design System — Canvas Quente Sutil no Light Mode

**Status:** approved
**Criada em:** 2026-07-22

---

## Contexto

[SPEC-20260722-001](SPEC-20260722-001-design-system-v2-direcao-criativa.md) registrou, na seção "Fora de Escopo", um adiamento deliberado: adotar um canvas levemente quente no light mode (inspirado na análise do Notion), condicionado a validação de contraste contra `--warning` (âmbar) antes de aprovação. O usuário decidiu implementar esse ajuste nesta rodada.

Por ser uma mudança estrutural que reverte um item explicitamente marcado como fora de escopo de uma spec já aprovada, ela ganha spec própria (conforme regra de changelog pós-aprovação do projeto), em vez de edição in-place de `SPEC-20260722-001`.

## Objetivo

Aplicar chroma sutil no eixo b+ (matiz quente, mesma família de `--warning` H=85) às superfícies neutras do light mode (`background`, `card`, `border`, `muted`), mantendo a luminosidade (L) inalterada e o chroma abaixo de 0.01 — preservando o contraste WCAG AA já garantido (C-DS-01) e evitando competir perceptualmente com o âmbar de alerta.

## Histórias de Usuário e Critérios de Aceitação

### US-01 — Canvas menos clínico em sessões longas

**Como** gestor de frota que usa o dashboard por longos períodos, **quero** que o fundo da aplicação tenha um leve calor em vez de branco clínico, **para** reduzir a fadiga visual sem perder legibilidade.

- **Dado que** o tema light está ativo, **quando** `--background`, `--card`, `--border` ou `--muted` são renderizados, **então** exibem chroma no eixo b+ (H=80) com valor entre 0.003 e 0.01, preservando a luminosidade (L) idêntica à anterior.
- **Dado que** um texto usa `--muted-foreground` sobre `--background`, **quando** medido, **então** o contraste permanece ≥ 4.5:1 (C-DS-01) — a mudança não afeta luminosidade da superfície de forma perceptível.
- **Dado que** um `Alert`/`Toast` de variante `warning` é renderizado sobre o novo `--card`, **quando** comparado visualmente ao `--warning` (H=85, C=0.16), **então** o card continua claramente distinguível do alerta — o chroma da superfície (≤0.01) é ~16x menor que o do token semântico.

## Requisitos Funcionais

| ID | Requisito | Código |
|----|-----------|--------|
| RF-01 | Ajustar `background`, `card`, `border`, `muted` em `packages/ui/src/tokens/colors.ts` e nos overrides `:root` de `globals.css` para `L 0.004 80` (mesma L, chroma 0.004, matiz 80) — apenas light mode; `.dark` inalterado | `packages/ui/src/tokens/colors.ts`, `apps/web/src/app/globals.css` |
| RF-02 | Atualizar `INVENTARIO-DESIGN-SYSTEM.md` (tabela de tokens e bloco de Figma Variables) com os novos valores | `specs/design-system/INVENTARIO-DESIGN-SYSTEM.md` |

## Requisitos Não-Funcionais

| ID | Requisito | Métrica de Aceite |
|----|-----------|------------------|
| RNF-01 | Nenhuma regressão de contraste nos componentes de `packages/ui` | Suíte `vitest` completa (139 testes, incl. `jest-axe` em `alert`/`toast`/`kpi-card`/etc.) passa sem violação |

## Fora de Escopo

- Recalibração do canvas quente em dark mode — `.dark` permanece com base cinza-azulada neutra (`14% 0.02 258`), sem alteração.
- Ajuste de `mutedForeground`/`foreground` — permanecem acromáticos; só as superfícies (não o texto) ganham o undertone.

## Notas Técnicas

**Sobre a validação de contraste:** a suíte `jest-axe` do pacote (`packages/ui`, 139 testes) passou integralmente após a mudança, mas o ambiente jsdom não renderiza estilo computado real o suficiente para a regra `color-contrast` do axe-core operar com precisão de pixel — o resultado confirma ausência de regressão estrutural, não uma medição de contraste pixel-a-pixel. Justificativa analítica complementar: a alteração modifica apenas o canal de chroma (0 → 0.004) em OKLCH, mantendo L idêntico; a luminância relativa (usada na fórmula de contraste WCAG) é dominada por L, e uma variação de chroma desta magnitude (≤0.004, muito abaixo do chroma típico de tokens de marca ~0.15-0.2) produz variação de luminância inferior a 0.5% — insuficiente para mover qualquer razão de contraste existente através do limiar 4.5:1 ou 3:1. Uma medição automatizada com ferramenta de captura real (Playwright + `axe-playwright`, fora do escopo desta spec) fica registrada como melhoria futura de RNF-02 do design system.

---

## Changelog (pós-aprovação)

| Data | O que mudou | Por quê |
|------|-------------|---------|
| — | — | — |
