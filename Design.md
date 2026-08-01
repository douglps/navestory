# Design.md — navestory (Azul-Índigo)

> **O que é este arquivo.** Este documento segue a convenção emergente (2026) de `DESIGN.md` para consumo por agentes de codificação de IA (Claude Code, Cursor, etc.) — não é o padrão clássico de documentação de design system, que em sistemas maduros (Shopify Polaris, IBM Carbon, Atlassian, Material 3) é um site multi-página. Este arquivo é **complementar** à documentação humana existente, não substituto dela. Fonte de verdade de implementação: `packages/ui/src/tokens/` e `packages/ui/src/components/`. Racional de produto e histórico de decisão: `specs/design-system/`.
>
> Estrutura obrigatória deste documento (R-DS-02, [SPEC-20260722-001](specs/design-system/SPEC-20260722-001-design-system-v2-direcao-criativa.md)): Foundations → Tokens → Componentes → Padrões → Acessibilidade → Content/Voice → Governança.

---

## Foundations

**Produto:** navestory é um SaaS B2B de gestão de frota (veículos, despesas, manutenções, multas) — dashboards densos de dados consultados repetidamente ao longo do dia, com momentos emocionalmente neutros (consulta de rotina) e momentos emocionalmente carregados (despesa inesperada, manutenção cara, alerta de atraso).

**Princípio central — "Calm UI" / anti-fadiga visual:** a interface deve responder "minha frota está saudável hoje?" em poucos segundos de varredura. Cada elemento visual que não carrega informação é ruído. Isso governa toda decisão abaixo.

**Três pilares:**

1. **Cor comunica status, nunca decora.** Verde, âmbar, vermelho e azul-info têm significado fixo (saúde, atenção, urgência, informação). Nenhuma cor aparece em tela "só para dar vida" — se um elemento precisa de destaque sem relação com status de dado, usa `gold` (acento de brilho) ou `secondary` (bronze estrutural), nunca uma cor decorativa fora do sistema.
2. **Hierarquia por peso e tamanho, não por decoração.** Tipografia pesada (600-700) em títulos e valores de KPI, corpo em 400 — o contraste de peso é o principal recurso expressivo, como em qualquer sistema de dashboard maduro (Linear, Vercel, Datadog).
3. **Forma comunica função.** Raio de borda distingue ação (`rounded-md`) de rótulo/filtro (`rounded-full`) — nunca o contrário.

**Identidade de marca — Azul-Índigo (`SPEC-20260731-001`, `ADR-011`):** substitui "Prata" (`SPEC-20260729-001`, deprecated). Pesquisa de mercado (fintech: Nubank, Monzo, Mercury; frota: Samsara, Motive) mostrou que o azul-prata acromático de Prata reforçava o padrão visual quase universal da categoria de frota, sem diferenciar o navestory, além de carregar frieza emocional num produto que lida com estresse financeiro do usuário. Azul-Índigo (H≈250) ocupa um espaço do espectro que nenhum concorrente relevante de frota usa hoje. Racional completo: `specs/design-system/PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md`.

| O que mudou (Prata → Azul-Índigo)                        | Detalhe                                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Cor primária                                             | Azul-prata frio (H≈259) → Azul-índigo (H≈250)                                                                                   |
| Fundo/neutros                                            | Acorde azul-prata-cinza, atrelado à família de `primary` → **grafite dedicado**, independente do matiz de `primary`             |
| `secondary`                                              | Neutro derivado de `primary`, sem consumidor → **ouro estrutural** ("bronze", referência Barroco Mineiro), segunda cor de marca |
| `gold`, `danger`, `success`, `warning`, `info`, `accent` | Inalterados                                                                                                                     |

---

## Tokens

Fonte de verdade: `packages/ui/src/tokens/colors.ts`, `spacing.ts`, `radius.ts`. Valores abaixo são referência de leitura — em caso de divergência, o código vence.

### Cor (canais OKLCH, formato `"L C H"`)

**Neutros — grafite dedicado** (independente da família de `primary`)

| Token             | Light                         | Dark                          | Uso                                                            |
| ----------------- | ----------------------------- | ----------------------------- | -------------------------------------------------------------- |
| `background`      | `97.0% 0.003 265` (`#F4F5F7`) | `19.0% 0.014 285` (`#13131A`) | Fundo de página                                                |
| `foreground`      | `19.0% 0.014 285`             | `97.0% 0.003 265`             | Texto principal                                                |
| `card`            | `94.0% 0.004 271`             | `22.5% 0.014 285`             | Fundo de cartões/painéis                                       |
| `border`          | `88% 0.005 270`               | `30% 0.014 285`               | Bordas, divisores                                              |
| `muted`           | `90% 0.005 270`               | `27% 0.014 285`               | Fundo secundário (hover, zebra)                                |
| `mutedForeground` | `50.4% 0.021 246`             | `75.9% 0.018 248`             | Texto auxiliar — atinge AA (C-DS-01) sobre `background`/`card` |

**Marca — Azul-Índigo + Ouro (Barroco Mineiro)**

| Token       | Light            | Dark            | Papel                                                                                                                                                        |
| ----------- | ---------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `primary`   | `44% 0.19 250`   | `66% 0.16 250`  | CTAs, links, foco, navegação ativa — elemento estrutural de marca                                                                                       |
| `secondary` | `48% 0.10 82`    | `62% 0.09 82`   | Ouro estrutural ("bronze") — botão secundário, divisor, materiais de marca externos. Maior área permitida que `gold`; nunca ao lado dele na mesma composição |
| `gold`      | `67.4% 0.122 86` | `82.9% 0.12 91` | **Único** acento de brilho — badge de destaque, ícone de conquista, detalhe pontual; nunca área grande, nunca CTA principal                                  |
| `accent`    | `55.6% 0.15 140` | —               | Verde, sem consumidor em `packages/ui` hoje — não faz parte da identidade de marca                                                                           |

**Semânticos** — reservados exclusivamente a status real de dado (R-DS-03)

| Token     | OKLCH (sólido)   | Pastel (fundo)                                 | Significado fixo                      |
| --------- | ---------------- | ---------------------------------------------- | ------------------------------------- |
| `success` | `60% 0.15 150`   | `92% 0.12 150` (light) / `28% 0.09 150` (dark) | Veículo saudável, dentro do esperado  |
| `warning` | `75% 0.16 85`    | `92% 0.15 85` (light) / `30% 0.10 85` (dark)   | Atenção, revisão pendente             |
| `danger`  | `56.3% 0.14 32`  | `92% 0.06 32` (light) / `28% 0.05 32` (dark)   | Alerta crítico, custo acima do limite |
| `info`    | `55.6% 0.15 240` | `92% 0.08 240` (light) / `28% 0.06 240` (dark) | Informação neutra, sem ação requerida |

> **Contrato C-DS-01:** os tons "sólidos" acima são calibrados para contraste sobre o `-pastel` da própria família, não sobre `--card`/`--background` — usar `bg-{variant}-pastel text-{variant}`, nunca `text-{variant}` direto sobre fundo neutro.
>
> **C-DS-02 (`SPEC-20260731-001` RF-03):** os quatro tokens `*-pastel` têm override próprio em dark mode — antes caíam silenciosamente no valor claro do light mode, tornando `text-foreground` sobre `bg-*-pastel` quase ilegível em `Alert`/`Badge`/`Toast`.
>
> **Pendência conhecida:** `warning` sobre `card` e sobre o próprio `warning-pastel` (light mode) ainda não atingem 3:1 (`contrast.spec.ts`) — pendência pré-existente à migração Azul-Índigo, aguardando spec de recalibração dedicada; não bloqueia esta adoção porque `warning` não foi alterado por ela.

### Predominância cromática (R-DS-05, v2 — 60-30-10)

```
Neutro    ████████████████████████████████████████████████████████████  ~60%
Estrutural██████████████████████████████                                ~30%
Acento    ██████████                                                    ~10%
```

Diretriz de auditoria visual, não lint automatizado — desvio relevante é sinalizado em revisão (`reviewer`/`design-system`).

### Espaçamento e raio

| Token                       | Valor            | Uso                                                                          |
| --------------------------- | ---------------- | ---------------------------------------------------------------------------- |
| `spacingTokens.gridUnit`    | `0.5rem` (8px)   | Unidade base do grid — todo espaçamento é múltiplo de 8px                    |
| `spacingTokens.touchTarget` | `2.75rem` (44px) | Altura mínima tocável (WCAG 2.5.5 AA)                                        |
| `radiusTokens.sm`           | `0.25rem` (4px)  | Elementos pequenos (botão fechar, badge pequeno)                             |
| `radiusTokens.md`           | `0.375rem` (6px) | **Padrão de ação de interface** — botões, inputs, cards de conteúdo          |
| `radiusTokens.lg`           | `0.5rem` (8px)   | Card, Dialog, popover                                                        |
| `radiusTokens.full`         | `9999px`         | **Reservado** a badge, tag, preset de filtro (R-DS-04) — nunca botão de ação |

### Tipografia

**Família: Inter** (variável, aplicada via `next/font/google` no layout raiz) — cobre pesos 100-900 num único arquivo, com `tnum`/`cv03`/`cv04` nativos (algarismos tabulares, zero cortado). Substitui a fonte default do sistema operacional.

Escala modular (razão 1.2), definida em `packages/ui/src/tokens/typography.ts` (`SPEC-20260731-001` RF-06):

| Papel  | `font-size` | `line-height` | Peso    | Uso                        |
| ------ | ----------- | ------------- | ------- | -------------------------- |
| `xs`   | 11px        | 1.5           | 400     | Labels de campo, metadados |
| `sm`   | 13px        | 1.45          | 400/500 | Corpo de tabela, badges    |
| `base` | 15px        | 1.5           | 400     | Corpo padrão, parágrafos   |
| `md`   | 18px        | 1.4           | 500     | Subtítulos de seção        |
| `lg`   | 22px        | 1.3           | 600     | Título de página           |
| `xl`   | 26px        | 1.25          | 700     | KPI principal              |
| `2xl`  | 32px        | 1.2           | 700     | Display de destaque        |

> Estes tokens são referência formal para componentes novos — a escala de utilitários `text-*` já em uso em todo o app (Tailwind default) não foi remapeada nesta rodada; remapear exige QA visual completa do produto, fora do escopo de `SPEC-20260731-001` (ver "Fora de Escopo" da spec).

`tabular-nums` obrigatório em toda célula de tabela, KPI, contador, valor monetário e leitura de odômetro — já implementado em `KpiCard` e `TableCell` ([SPEC-20260722-001](specs/design-system/SPEC-20260722-001-design-system-v2-direcao-criativa.md) RF-03).

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

**Dark-first:** o Calm UI do navestory prioriza monitoramento prolongado — elevação por degraus de luminosidade entre camadas (grafite `background`/`card`/`muted`), não sombra pesada. Degradê decorativo (R-DS-11) é permitido só em área sem texto direto sobreposto (cabeçalho, empty state, card de destaque), sempre dentro da própria escala tonal de uma cor de marca — nunca atrás de texto, nunca entre matizes diferentes.

**Formulários:** padrão único documentado em [SPEC-20260619-001](specs/forms/SPEC-20260619-001-form-standard.md) — não duplicado aqui.

---

## Acessibilidade

- Contraste mínimo WCAG AA (4.5:1 texto normal, 3:1 texto grande ≥18px/14px bold) em **todo** texto, nos dois temas — regra C-DS-01, sem exceção por hierarquia visual.
- `mutedForeground` atinge a razão exigida sobre `background`/`card` — o requisito é a razão de contraste, não um teto de L fixo.
- Todo token `*-pastel` tem override próprio em dark mode (C-DS-02) — nunca herda silenciosamente o valor claro do light mode.
- Degradê decorativo (R-DS-11): se um ícone/rótulo curto precisar ficar sobre a área do degradê, o contraste é validado contra o ponto mais escuro do degradê, não a média.
- Alvo de toque mínimo 44px (`spacingTokens.touchTarget`) em todo elemento tocável mobile.
- Auditoria automatizada via `jest-axe` em todos os componentes de `packages/ui`, e via `contrast.spec.ts` (`apps/web/.../design-system/_lib/`) para os pares de tokens de marca/semânticos.

---

## Content / Voice

Voz de marca definida em `SPEC-20260731-001`/`PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md` §11 — calorosa e próxima, em registro correto: sem fórmulas de reasseguração institucional ("seus dados estão seguros") e sem coloquialismo de fala solta ("tá", "bora"). O calor vem da atenção ao detalhe e da pergunta direta, não da informalidade.

**Cinco adjetivos:** Competente, Direto, Acolhedor, Confiável, Caloroso com compostura (tom-base; recua para mais sóbrio em alertas críticos).

**Regras rápidas de microcopy:**

- Voz ativa em segunda pessoa ("Adicione", "Você salvou"); CTA descritivo do resultado ("Salvar despesa", nunca "Confirmar"/"Clique aqui").
- Evitar jargão técnico exposto ("erro 422"), tom acusatório em erro de usuário, fórmulas de reasseguração institucional, contrações/gírias regionais, passividade excessiva.
- Se precisar tranquilizar, usar um fato específico, nunca uma frase pronta.

Tabela completa de tom por contexto e exemplos antes/depois: ver a spec/proposta — não duplicados aqui.

---

## Governança

- **Alteração de token de cor:** exige atualização de `packages/ui/src/tokens/colors.ts` **e** de `specs/design-system/INVENTARIO-DESIGN-SYSTEM.md` na mesma tarefa — nunca só um dos dois.
- **Novo componente:** segue o fluxo padrão de spec (`specs/design-system/`), com entrada em `matrices/rastreabilidade.md` antes de `status: approved` (gate de sincronia, ver `specs/README.md`).
- **Nova regra de design system:** ganha ID `R-DS-NN` em `specs/RULES.md`, nunca fica implícita em código ou neste arquivo.
- **Degradê decorativo:** só em área sem texto direto sobreposto, sempre dentro da mesma escala tonal de uma cor de marca — regra `R-DS-11`.
- **Este arquivo (`Design.md`):** atualizado como parte do fechamento de qualquer spec da feature `design-system` que altere tokens, gramática de cor ou estrutura de documentação — mesmo gatilho de "não fica para lembrar depois" já aplicado às matrizes.
