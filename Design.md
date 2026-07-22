# Design.md — Nave (Steel & Sapphire v2)

> **O que é este arquivo.** Este documento segue a convenção emergente (2026) de `DESIGN.md` para consumo por agentes de codificação de IA (Claude Code, Cursor, etc.) — não é o padrão clássico de documentação de design system, que em sistemas maduros (Shopify Polaris, IBM Carbon, Atlassian, Material 3) é um site multi-página. Este arquivo é **complementar** à documentação humana existente, não substituto dela. Fonte de verdade de implementação: `packages/ui/src/tokens/` e `packages/ui/src/components/`. Racional de produto e histórico de decisão: `specs/design-system/`.
>
> Estrutura obrigatória deste documento (R-DS-02, [SPEC-20260722-001](specs/design-system/SPEC-20260722-001-design-system-v2-direcao-criativa.md)): Foundations → Tokens → Componentes → Padrões → Acessibilidade → Content/Voice → Governança.

---

## Foundations

**Produto:** Nave é um SaaS B2B de gestão de frota (veículos, despesas, manutenções, multas) — dashboards densos de dados consultados repetidamente ao longo do dia, não uma ferramenta de produtividade pessoal ou uma landing page de conversão única.

**Princípio central — "Calm UI" / anti-fadiga visual:** a interface deve responder "minha frota está saudável hoje?" em poucos segundos de varredura. Cada elemento visual que não carrega informação é ruído. Isso governa toda decisão abaixo.

**Três pilares:**

1. **Cor comunica status, nunca decora.** Verde, âmbar, vermelho e azul-info têm significado fixo (saúde, atenção, urgência, informação). Nenhuma cor aparece em tela "só para dar vida" — se um elemento precisa de destaque sem relação com status de dado, usa o token de marca `gold`, e só ele.
2. **Hierarquia por peso e tamanho, não por decoração.** Tipografia pesada (600-700) em títulos e valores de KPI, corpo em 400 — o contraste de peso é o principal recurso expressivo, como em qualquer sistema de dashboard maduro (Linear, Vercel, Datadog).
3. **Forma comunica função.** Raio de borda distingue ação (`rounded-md`) de rótulo/filtro (`rounded-full`) — nunca o contrário.

**Herança consciente da pesquisa Notion (2026-07-22):** a evolução deste sistema partiu de uma análise do design language do Notion, adaptada — não copiada — para o perfil de dashboard B2B denso do Nave. Ver racional completo em [SPEC-20260722-001](specs/design-system/SPEC-20260722-001-design-system-v2-direcao-criativa.md#contexto). Resumo do que foi adaptado vs. descartado:

| Do Notion | Decisão para o Nave | Por quê |
|---|---|---|
| Tipografia Inter pesada, tracking negativo em títulos | ✅ Adotado | Hierarquia por peso funciona em telas de varredura rápida |
| Elevação quase imperceptível (shadow em camadas translúcidas) | ✅ Reforçado | Já era a direção do Steel & Sapphire — dark-first por variação de luminosidade, não sombra pesada |
| Um único azul estrutural para ação | ✅ Mantido | Já é o padrão (`primary`) — confirma acerto existente |
| Canvas off-white quente (light mode) | ✅ Adotado, em escala mínima | Chroma <0.01 (vs. ~0.02+ do Notion) — reduz fadiga sem competir com o `--warning` âmbar; [SPEC-20260722-002](specs/design-system/SPEC-20260722-002-canvas-quente-light-mode.md) |
| Pill buttons (`rounded-full`) em toda ação | ❌ Descartado | Telas do Nave têm 15-20 ações simultâneas; pills prejudicam escaneabilidade e parecem informais para decisão operacional |
| Paleta decorativa multicolor ("sticker") sem semântica | ❌ Descartado (crítico) | Colidiria com a gramática de cor que já comunica status real de dado — o usuário perderia a leitura instantânea de saúde/alerta/urgência |
| Ilustrações e brand voice rico visualmente | ❌ Descartado | Cada pixel que não é dado compete com o objetivo de "ver a resposta em <10s" |

---

## Tokens

Fonte de verdade: `packages/ui/src/tokens/colors.ts`, `spacing.ts`, `radius.ts`. Valores abaixo são referência de leitura — em caso de divergência, o código vence.

### Cor (canais OKLCH, formato `"L C H"`)

**Neutros e base**

| Token | Light | Dark | Uso |
|---|---|---|---|
| `background` | `98.5% 0.004 80` | `14% 0.02 258` | Fundo de página — canvas quente sutil (matiz 80, mesma família de `--warning` H=85, chroma <0.01 para não competir com o âmbar de alerta; [SPEC-20260722-002](specs/design-system/SPEC-20260722-002-canvas-quente-light-mode.md)) |
| `foreground` | `15% 0 0` | `93% 0.005 260` | Texto sobre background — permanece acromático |
| `card` | `97% 0.004 80` | `19% 0.02 258` | Fundo de cartões/painéis — mesmo undertone quente do background |
| `border` | `90% 0.004 80` | `28% 0.02 258` | Bordas, divisores |
| `muted` | `97% 0.004 80` | `24% 0.015 258` | Fundo secundário (hover, zebra) |
| `mutedForeground` | `42% 0 0` | `62% 0.01 260` | Texto auxiliar — L≤42% garante AA (C-DS-01); permanece acromático |

**Marca — Steel & Sapphire** (mesmo L=55.6%/C=0.15, variando só o matiz H — regularidade proposital, preservar ao criar novos tons de marca)

| Token | OKLCH | Matiz (H) | Uso |
|---|---|---|---|
| `primary` | `55.6% 0.15 260` | 260 (azul) | CTAs, links, foco, navegação ativa — ~15% da superfície visível |
| `secondary` | `55.6% 0.15 200` | 200 (teal) | Variação de marca secundária |
| `accent` | `55.6% 0.15 140` | 140 (verde) | Variação de marca terciária |
| `gold` | `68% 0.18 82` | 82 (dourado) | **Único** elemento decorativo/destaque de marca — ~5% da superfície; nunca texto pequeno sobre fundo claro (contraste ~2.1:1), nunca CTA principal |

**Semânticos** — reservados exclusivamente a status real de dado (R-DS-03), ~10% da superfície

| Token | OKLCH (sólido) | Pastel (fundo) | Significado fixo |
|---|---|---|---|
| `success` | `60% 0.15 150` | `92% 0.12 150` | Veículo saudável, dentro do esperado |
| `warning` | `75% 0.16 85` | `92% 0.15 85` | Atenção, revisão pendente |
| `danger` | `57.7% 0.2 25` | `92% 0.08 25` | Alerta crítico, custo acima do limite |
| `info` | `55.6% 0.15 240` | `92% 0.08 240` | Informação neutra, sem ação requerida |

> Tons "sólidos" são calibrados para contraste sobre o `-pastel` da própria família, não sobre `--card`/`--background` — usar `bg-{variant}-pastel text-foreground`, nunca `text-{variant}` direto sobre fundo neutro (ver correção registrada em SPEC-20260721-001, changelog 2026-07-21).

### Predominância cromática (R-DS-05)

```
Neutro   ████████████████████████████████████████████████████████████████████  ~70%
Primary  ███████████████                                                       ~15%
Semântico████████████                                                          ~10%
Gold     ██████                                                                 ~5%
```

Diretriz de auditoria visual, não lint automatizado — desvio relevante é sinalizado em revisão (`reviewer`/`design-system`).

### Espaçamento e raio

| Token | Valor | Uso |
|---|---|---|
| `spacingTokens.gridUnit` | `0.5rem` (8px) | Unidade base do grid — todo espaçamento é múltiplo de 8px |
| `spacingTokens.touchTarget` | `2.75rem` (44px) | Altura mínima tocável (WCAG 2.5.5 AA) |
| `radiusTokens.sm` | `0.25rem` (4px) | Elementos pequenos (botão fechar, badge pequeno) |
| `radiusTokens.md` | `0.375rem` (6px) | **Padrão de ação de interface** — botões, inputs, cards de conteúdo |
| `radiusTokens.lg` | `0.5rem` (8px) | Card, Dialog, popover |
| `radiusTokens.full` | `9999px` | **Reservado** a badge, tag, preset de filtro (R-DS-04) — nunca botão de ação |

### Tipografia

Escala padrão Tailwind (sem substituição — ver nota de granularidade abaixo). Uso formalizado:

| Papel | Peso | Tracking | Numérico |
|---|---|---|---|
| Heading / título de seção | 600-700 | levemente negativo | — |
| Valor de KPI | 700 | levemente negativo | `tabular-nums` obrigatório |
| Corpo | 400 | 0 | — |
| Coluna de tabela (valor R$/km) | herda do corpo | 0 | `tabular-nums` obrigatório |

`tabular-nums` alinha dígitos verticalmente entre linhas de KPI/tabela — implementado em `KpiCard` e `TableCell` ([SPEC-20260722-001](specs/design-system/SPEC-20260722-001-design-system-v2-direcao-criativa.md) RF-03).

---

## Componentes

Inventário completo (16+ componentes, props, estados, ASCII previews): [`specs/design-system/INVENTARIO-DESIGN-SYSTEM.md`](specs/design-system/INVENTARIO-DESIGN-SYSTEM.md). Não duplicado aqui — este arquivo referencia, o inventário é a fonte técnica.

Regras de forma que se aplicam a **todo** componente novo:

- Ação de interface (`Button` e qualquer botão de fluxo) → raio ≤ `rounded-md`, nunca `rounded-full` (R-DS-04). Exceção: elementos circulares por natureza (spinner de loading, avatar) não são "ações" e não se aplicam a esta regra.
- Badge, tag, preset de filtro → `rounded-full` é o padrão esperado.
- Qualquer variante de cor (`success`/`warning`/`danger`/`info`) só existe se houver um estado de dado real por trás — nunca como skin decorativo (R-DS-03).

---

## Padrões

**Dashboard de KPIs:** métricas "north star" em destaque (peso 700, `tabular-nums`), métricas de suporte em banda secundária — ver `KpiCard` e a curadoria de catálogo em [SPEC-20260721-002](specs/dashboard/SPEC-20260721-002-dashboard-v2.md).

**Dark-first:** o Calm UI do Nave prioriza monitoramento prolongado — elevação por degraus de luminosidade entre camadas (3-6% de variação), não sombra pesada. Recalibração perceptual completa da paleta semântica em dark mode segue fora de escopo (ver SPEC-20260721-001 e SPEC-20260722-001, seção "Fora de Escopo").

**Formulários:** padrão único documentado em [SPEC-20260619-001](specs/forms/SPEC-20260619-001-form-standard.md) — não duplicado aqui.

---

## Acessibilidade

- Contraste mínimo WCAG AA (4.5:1 texto normal, 3:1 texto grande ≥18px/14px bold) em **todo** texto, nos dois temas — regra C-DS-01, sem exceção por hierarquia visual.
- `mutedForeground` trava em L≤42% OKLCH especificamente para não falhar essa régua.
- Alvo de toque mínimo 44px (`spacingTokens.touchTarget`) em todo elemento tocável mobile.
- Auditoria automatizada via `jest-axe` em todos os componentes de `packages/ui` (RNF-02, SPEC-20260721-001).

---

## Content / Voice

Fora de escopo desta rodada — nenhuma diretriz de tom/voz foi definida além do idioma do produto (pt-BR). Registrar aqui quando uma spec dedicada de conteúdo/microcopy for criada.

---

## Governança

- **Alteração de token de cor:** exige atualização de `packages/ui/src/tokens/colors.ts` **e** de `specs/design-system/INVENTARIO-DESIGN-SYSTEM.md` na mesma tarefa — nunca só um dos dois.
- **Novo componente:** segue o fluxo padrão de spec (`specs/design-system/`), com entrada em `matrices/rastreabilidade.md` antes de `status: approved` (gate de sincronia, ver `specs/README.md`).
- **Nova regra de design system:** ganha ID `R-DS-NN` em `specs/RULES.md`, nunca fica implícita em código ou neste arquivo.
- **Este arquivo (`Design.md`):** atualizado como parte do fechamento de qualquer spec da feature `design-system` que altere tokens, gramática de cor ou estrutura de documentação — mesmo gatilho de "não fica para lembrar depois" já aplicado às matrizes.
