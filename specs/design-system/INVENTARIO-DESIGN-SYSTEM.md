# Inventário do Design System — navestory

**Propósito:** documento de apoio para recriar no Figma o design system já implementado em código.
**Fonte de verdade:** `packages/ui/src/` — o Figma deve espelhar o código, não o contrário.
**Spec de referência:** `specs/design-system/SPEC-20260525-001.md` (aprovada v0.3, 2026-07-19)
**Última atualização:** 2026-07-31 — paleta de marca migrada de Prata para Azul-Índigo (`SPEC-20260731-001`, `ADR-011`); sistema tipográfico formal adicionado (§1.4)

---

## 1. Tokens

### 1.1 Cores

Arquivo-fonte: `packages/ui/src/tokens/colors.ts`

Os valores são canais OKLCH no formato `"L C H"` (sem a função `oklch()` em volta). No CSS gerado, o token vira `oklch(var(--token) / <alpha>)`, permitindo modificador de opacidade Tailwind (`bg-primary/50`). O nome da variável CSS é derivado do nome camelCase: `primaryForeground` → `--primary-foreground`.

#### Neutros e Base (grafite dedicado — Azul-Índigo, SPEC-20260731-001)

| Nome do token     | Variável CSS         | Valor OKLCH                          | Uso                                                                                                                                                          |
| ----------------- | -------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `background`      | `--background`       | `oklch(97.0% 0.003 265)` (`#F4F5F7`) | Fundo da página — grafite dedicado, independente da família de `primary` (substitui o acorde azul-prata-cinza de Prata, agora deprecated)                    |
| `foreground`      | `--foreground`       | `oklch(19.0% 0.014 285)`             | Texto sobre background                                                                                                                                       |
| `card`            | `--card`             | `oklch(94.0% 0.004 271)`             | Fundo de cartões/panels                                                                                                                                      |
| `cardForeground`  | `--card-foreground`  | `oklch(19.0% 0.014 285)`             | Texto dentro de cartões                                                                                                                                      |
| `border`          | `--border`           | `oklch(88% 0.005 270)`               | Bordas, divisores, linhas de tabela                                                                                                                          |
| `muted`           | `--muted`            | `oklch(90% 0.005 270)`               | Fundo de elementos secundários (hover, zebra)                                                                                                                |
| `mutedForeground` | `--muted-foreground` | `oklch(50.4% 0.021 246)`             | Texto auxiliar, placeholders, labels secundários — inalterado desde Prata (mesma família acromática, atinge razão ≥4.5:1 sobre o novo `background`, C-DS-01) |

#### Marca (Azul-Índigo — SPEC-20260731-001, ADR-011)

| Nome do token         | Variável CSS             | Valor OKLCH              | Uso                                                                                                                                                  |
| --------------------- | ------------------------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `primary`             | `--primary`              | `oklch(44% 0.19 250)`    | Azul-índigo (H≈250) — CTAs, links, anel de foco, borda ativa de tabs. Substitui o azul-prata de Prata (H≈259)                                        |
| `primaryForeground`   | `--primary-foreground`   | `oklch(97.0% 0.003 265)` | Texto sobre primary (= `background`)                                                                                                                 |
| `secondary`           | `--secondary`            | `oklch(48% 0.10 82)`     | Ouro estrutural ("bronze"/"ouro velho", referência Barroco Mineiro) — segunda cor de marca, distinta de `gold`; sem consumidor em `packages/ui` hoje |
| `secondaryForeground` | `--secondary-foreground` | `oklch(97.0% 0.003 265)` | Texto sobre secondary (= `background`)                                                                                                               |
| `accent`              | `--accent`               | `oklch(55.6% 0.15 140)`  | Verde — inalterado, sem consumidor em `packages/ui`; fora de escopo (R-DS-03 já reserva destaque decorativo só a `gold`)                             |
| `accentForeground`    | `--accent-foreground`    | `oklch(15% 0 0)`         | Texto escuro sobre accent                                                                                                                            |

#### Marca — Dourado (inalterado desde Prata, SPEC-20260729-001)

| Nome do token    | Variável CSS        | Valor OKLCH              | Uso                                                                                                                                                                                   |
| ---------------- | ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gold`           | `--gold`            | `oklch(67.4% 0.122 86)`  | Acento de destaque, badge de status premium — nunca texto pequeno sobre fundo claro, nunca fundo de CTA principal, nunca ao lado de elemento prateado de mesmo peso (regra heráldica) |
| `goldForeground` | `--gold-foreground` | `oklch(20.4% 0.011 261)` | Texto sobre fundo `--gold` — fixo, não inverte em dark mode (ouro permanece claro/quente nos dois temas; ver bug corrigido no showcase Prata antes desta adoção)                      |

#### Dark Mode (SPEC-20260721-001 RF-01, RF-02, RF-03; SPEC-20260731-001 RF-02, RF-03)

Aplicado via classe `.dark` no `<html>` (`next-themes`, `defaultTheme="system"` + `enableSystem`). `background` passa a ser o grafite dedicado da proposta (`≈#13131A`), independente da família de `primary`. `primaryForeground` ganha override explícito (o `primary` de dark é claro, então o texto sobre ele precisa ser escuro — não herda mais o claro do light mode). `accent`/`success`/`warning`/`danger`/`info` (sólidos) em dark seguem fora de escopo.

| Nome do token                       | Valor OKLCH (dark)                                  |
| ----------------------------------- | --------------------------------------------------- |
| `background`                        | `oklch(19.0% 0.014 285)` (`#13131A`)                |
| `foreground`                        | `oklch(97.0% 0.003 265)`                            |
| `card` / `cardForeground`           | `oklch(22.5% 0.014 285)` / `oklch(97.0% 0.003 265)` |
| `border`                            | `oklch(30% 0.014 285)`                              |
| `muted` / `mutedForeground`         | `oklch(27% 0.014 285)` / `oklch(75.9% 0.018 248)`   |
| `primary` / `primaryForeground`     | `oklch(66% 0.16 250)` / `oklch(19.0% 0.014 285)`    |
| `secondary` / `secondaryForeground` | `oklch(62% 0.09 82)` / `oklch(19.0% 0.014 285)`     |
| `gold` / `goldForeground`           | `oklch(82.9% 0.12 91)` / `oklch(20.4% 0.011 261)`   |

#### Semânticos — Sólidos (ícone, borda, texto)

| Nome do token       | Variável CSS           | Valor OKLCH              | Uso                                                                                                                                                                                                                                                                  |
| ------------------- | ---------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `success`           | `--success`            | `oklch(60% 0.15 150)`    | Verde — borda, texto e ícone de sucesso                                                                                                                                                                                                                              |
| `successForeground` | `--success-foreground` | `oklch(98.5% 0 0)`       | Texto sobre success                                                                                                                                                                                                                                                  |
| `warning`           | `--warning`            | `oklch(75% 0.16 85)`     | Âmbar — borda, texto e ícone de aviso                                                                                                                                                                                                                                |
| `warningForeground` | `--warning-foreground` | `oklch(15% 0 0)`         | Texto escuro sobre warning                                                                                                                                                                                                                                           |
| `danger`            | `--danger`             | `oklch(56.3% 0.14 32)`   | Terracota dessaturado (direção Prata, R-DS-06) — borda, texto e ícone de erro/destrutivo. Substitui o vermelho saturado anterior (era `57.7% 0.2 25`); sem override dark, mesmo tom nos dois temas (nunca direto sobre `background`/`card`, só sobre `dangerPastel`) |
| `dangerForeground`  | `--danger-foreground`  | `oklch(97.2% 0.003 248)` | Texto sobre danger — mantido no valor literal de Prata (não o novo `background` grafite): trocar derrubaria o contraste abaixo do piso AA (C-DS-01, confirmado por `contrast.spec.ts`)                                                                               |
| `info`              | `--info`               | `oklch(55.6% 0.15 240)`  | Azul-info (matiz 240, leve em relação ao primary 260)                                                                                                                                                                                                                |
| `infoForeground`    | `--info-foreground`    | `oklch(98.5% 0 0)`       | Texto sobre info                                                                                                                                                                                                                                                     |

#### Semânticos — Pastel (fundo de alerta/toast)

| Nome do token   | Variável CSS       | Valor OKLCH (light)   | Valor OKLCH (dark)    | Uso                                                                                  |
| --------------- | ------------------ | --------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| `successPastel` | `--success-pastel` | `oklch(92% 0.12 150)` | `oklch(28% 0.09 150)` | Fundo do Alert/Toast de sucesso                                                      |
| `warningPastel` | `--warning-pastel` | `oklch(92% 0.15 85)`  | `oklch(30% 0.10 85)`  | Fundo do Alert/Toast de aviso                                                        |
| `dangerPastel`  | `--danger-pastel`  | `oklch(92% 0.06 32)`  | `oklch(28% 0.05 32)`  | Fundo do Alert/Toast de erro — matiz atualizado para o terracota (era `92% 0.08 25`) |
| `infoPastel`    | `--info-pastel`    | `oklch(92% 0.08 240)` | `oklch(28% 0.06 240)` | Fundo do Alert/Toast de info                                                         |

> Nota sobre os pastéis: os valores de light têm L=92% (fundos claros com contraste legível); o C varia ligeiramente para compensar a percepção de saturação diferente por matiz. **C-DS-02 (`SPEC-20260731-001` RF-03):** os quatro ganharam override próprio de dark mode — antes caíam silenciosamente no valor claro do light mode, tornando `text-foreground` (claro em dark) sobre `bg-*-pastel` quase ilegível em `Alert`/`Badge`/`Toast`.

#### Paleta Categórica (SPEC-20260729-002, ADR-010) — substitui `--chart-1..5`

Reservada exclusivamente para dados sem status real (R-DS-07): gráficos multi-série (`apps/web/src/lib/chart-colors.ts`) e indicadores de modo/contexto (ex: seletor de veículo). Hues fundamentados em Okabe-Ito (Color Universal Design) + ColorBrewer, distinguíveis sob deuteranopia/protanopia por matiz + luminosidade combinados.

| Nome do token   | Variável CSS      | Valor OKLCH (light)      | Valor OKLCH (dark)     | Uso                                                                                                                 |
| --------------- | ----------------- | ------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `categorical-1` | `--categorical-1` | `oklch(50% 0.17 258)`    | `oklch(65% 0.17 258)`  | Azure — série 1 de gráfico; modo `group` do contexto de veículo                                                     |
| `categorical-2` | `--categorical-2` | `oklch(64% 0.14 195)`    | `oklch(72% 0.13 195)`  | Teal — série 2 de gráfico                                                                                           |
| `categorical-3` | `--categorical-3` | `oklch(56% 0.11 132)`    | `oklch(66% 0.1 132)`   | Olive — série 3 de gráfico                                                                                          |
| `categorical-4` | `--categorical-4` | `oklch(72% 0.12 72)`     | `oklch(80% 0.1 72)`    | Sand — série 4 de gráfico; modos `single`/`multi` do contexto de veículo (diferenciados por borda sólida/tracejada) |
| `categorical-5` | `--categorical-5` | `oklch(55% 0.14 315)`    | `oklch(68% 0.13 315)`  | Plum — série 5 de gráfico; modo `attribute` do contexto de veículo                                                  |
| `chart-grid`    | `--chart-grid`    | `oklch(88.5% 0.007 248)` | `oklch(34% 0.016 260)` | Linha de grade de gráfico (Recharts `CartesianGrid`), realinhado à família Prata                                    |

#### Escala de Urgência (SPEC-20260729-002, ADR-010, R-DS-08)

Máximo 4 níveis codificados por cor, sempre com label textual/numérico. Só um par de token é novo — os demais níveis reaproveitam `danger`/`warning`/`info`.

| Nome do token      | Variável CSS           | Valor OKLCH (light)  | Valor OKLCH (dark)   | Uso                                                                         |
| ------------------ | ---------------------- | -------------------- | -------------------- | --------------------------------------------------------------------------- |
| `urgencyHot`       | `--urgency-hot`        | `oklch(62% 0.18 32)` | `oklch(62% 0.18 32)` | Terracota mais vívido — nível "≤7 dias" da escada de vencimento de despesas |
| `urgencyHotPastel` | `--urgency-hot-pastel` | `oklch(93% 0.07 32)` | `oklch(27% 0.09 32)` | Fundo do badge de urgência "≤7 dias"                                        |

#### Superfícies e Financeiro Realinhados (SPEC-20260721-002 origem, SPEC-20260729-002 realinhamento)

| Nome do token                                      | Variável CSS                                                  | Valor OKLCH (light)                                                          | Valor OKLCH (dark)                                                           | Uso                                                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `surface`                                          | `--surface`                                                   | `oklch(95% 0.003 248)`                                                       | `oklch(23% 0.014 260)`                                                       | Fundo de `.glass-card` (era acromático puro `L% 0 0`)                                                             |
| `surfaceElevated`                                  | `--surface-elevated`                                          | `oklch(98.5% 0.003 248)`                                                     | `oklch(28% 0.016 260)`                                                       | Camada elevada do glass-card                                                                                      |
| `onSurface` / `onSurfaceMuted` / `onSurfaceSubtle` | `--on-surface` / `--on-surface-muted` / `--on-surface-subtle` | `oklch(20.4% 0.011 261)` / `oklch(50.4% 0.021 246)` / `oklch(63% 0.015 246)` | `oklch(95.1% 0.005 258)` / `oklch(75.9% 0.018 248)` / `oklch(58% 0.014 250)` | Texto sobre `.glass-card`/`.kicker` (`UpcomingCostsWidget`)                                                       |
| `financeOutgoing`                                  | `--finance-outgoing`                                          | `oklch(58% 0.17 32)`                                                         | `oklch(62% 0.16 32)`                                                         | Cor semântica para valores monetários de saída — realinhada ao terracota (era `57.7% 0.2 25`, vermelho pré-Prata) |

---

### 1.2 Espaçamento

Arquivo-fonte: `packages/ui/src/tokens/spacing.ts`

O projeto **não** substitui a escala padrão do Tailwind — apenas formaliza dois valores com intenção semântica explícita:

| Nome do token | Variável/Classe sugerida | Valor             | Uso                                                                |
| ------------- | ------------------------ | ----------------- | ------------------------------------------------------------------ |
| `touchTarget` | —                        | `2.75rem` (44 px) | Altura mínima de botões e itens tocáveis em mobile (WCAG 2.5.5 AA) |
| `gridUnit`    | —                        | `0.5rem` (8 px)   | Unidade base do grid — todo espaçamento é múltiplo de 8 px         |

> No Figma: criar uma grade de 8 px e um estilo de grid "8pt baseline". A maioria dos espaçamentos do projeto (p-3 = 12px, p-4 = 16px, p-6 = 24px, gap-2 = 8px, gap-4 = 16px) já são múltiplos de 8.

---

### 1.3 Raio de Borda

Arquivo-fonte: `packages/ui/src/tokens/radius.ts`

| Nome do token | Valor             | Classe Tailwind equivalente | Uso                                                       |
| ------------- | ----------------- | --------------------------- | --------------------------------------------------------- |
| `sm`          | `0.25rem` (4 px)  | `rounded-sm`                | Elementos pequenos (botão de fechar, badge)               |
| `md`          | `0.375rem` (6 px) | `rounded-md`                | Padrão da maioria dos componentes (Button, Alert, inputs) |
| `lg`          | `0.5rem` (8 px)   | `rounded-lg`                | Card, Dialog, Combobox popover, KpiCard                   |
| `full`        | `9999px`          | `rounded-full`              | Tags/badges redondos, presets do DateRangePicker          |

---

### 1.4 Tipografia (SPEC-20260731-001 RF-06)

Arquivo-fonte: `packages/ui/src/tokens/typography.ts`. Formal pela primeira vez — antes o produto rodava no default do Tailwind/fonte do SO, por omissão.

**Família:** Inter (única, variável), aplicada via `next/font/google` em `apps/web/src/app/layout.tsx` (`--font-inter`, conectada a `fontFamily.sans` em `tailwind.config.ts`).

| Nome do token | `font-size` | `line-height` | Peso    | Uso                        |
| ------------- | ----------- | ------------- | ------- | -------------------------- |
| `xs`          | `11px`      | `1.5`         | 400     | Labels de campo, metadados |
| `sm`          | `13px`      | `1.45`        | 400/500 | Corpo de tabela, badges    |
| `base`        | `15px`      | `1.5`         | 400     | Corpo padrão, parágrafos   |
| `md`          | `18px`      | `1.4`         | 500     | Subtítulos de seção        |
| `lg`          | `22px`      | `1.3`         | 600     | Título de página           |
| `xl`          | `26px`      | `1.25`        | 700     | KPI principal              |
| `2xl`         | `32px`      | `1.2`         | 700     | Display de destaque        |

> A escala de utilitários `text-*` do Tailwind já em uso no app não foi remapeada para estes valores nesta rodada — os tokens são referência formal para componentes novos; remapear a escala existente exige QA visual completa do produto (fora de escopo de `SPEC-20260731-001`).

`tabular-nums` obrigatório em toda célula de tabela, KPI, contador, valor monetário e leitura de odômetro — já implementado em `KpiCard` (`kpi-card.tsx`) e `TableCell` (`table.tsx`).

---

## 2. Componentes

Total: **24 componentes** exportados em `packages/ui/src/index.ts`, agrupados por função.

### 2.1 Base

#### Button

Arquivo: `packages/ui/src/components/button.tsx`
Primitivo: HTML `<button>` nativo com CVA

| Dimensão         | Valores                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `variant`        | `default` (azul primary), `outline` (borda, fundo transparente), `ghost` (sem borda, hover muted), `destructive` (fundo danger) |
| `size`           | `sm` (h-10 mobile / h-8 desktop), `md` (h-11 mobile / h-10 desktop — padrão), `lg` (h-11 fixo)                                  |
| Estado adicional | `loading` (booleano) — exibe spinner animado e desabilita interação                                                             |

**Comportamento mobile-first:** todos os tamanhos atendem o touch target mínimo de 44 px em mobile; em `md:` o tamanho é reduzido para ambientes desktop.

**Acessibilidade:** `aria-busy` quando `loading=true`; `focus-visible:ring-2 ring-primary` para foco visível; `disabled:opacity-50` para estado desabilitado.

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   [default]  │  │  [outline]   │  │   [ghost]    │  │[destructive] │
│  bg-primary  │  │ border+transp│  │  sem borda   │  │  bg-danger   │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

---

#### Card

Arquivo: `packages/ui/src/components/card.tsx`
Primitivo: HTML `<div>` com CVA

| Dimensão  | Valores                                                             |
| --------- | ------------------------------------------------------------------- |
| `padding` | `sm` (p-3 = 12 px), `md` (p-4 = 16 px — padrão), `lg` (p-6 = 24 px) |

**Aparência fixa:** `rounded-lg border border-border bg-card text-card-foreground shadow-sm`

> Usado como container base por KpiCard e ChartWrapper — nunca duplicar esse visual inline.

---

#### Input

Arquivo: `packages/ui/src/components/input.tsx`
Primitivo: HTML `<input>` nativo com `forwardRef`

| Prop        | Notas                                                                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `error`     | booleano — troca `border-border` por `border-danger` e marca `aria-invalid`                                                                                    |
| `className` | mesclado via `cn()` sobre a classe-base (`inputBaseClass`, também exportada e reaproveitada por `Textarea`, `CurrencyInput`/`OdometerInput` e `PasswordInput`) |

**Aparência fixa:** `h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50`.

> @spec SPEC-20260729-003 — criado para fechar a lacuna de `<input>`/`<button>` sem estilo nas
> telas de formulário (ver Rodada 5 de `PLANO-MIGRACAO-CONSUMIDORES.md`).

---

#### Textarea

Arquivo: `packages/ui/src/components/textarea.tsx`
Primitivo: HTML `<textarea>` nativo com `forwardRef`

Mesma classe-base do `Input` (`inputBaseClass`), com `min-h-[80px]` no lugar de `h-10`. Mesma prop `error`.

---

#### Checkbox

Arquivo: `packages/ui/src/components/checkbox.tsx`
Primitivo: `<input type="checkbox">` nativo com `accent-primary`

Sem dependência Radix nova — nenhum consumidor atual precisa de estado indeterminado. `h-4 w-4 rounded border-border accent-primary`, com anel de foco tokenizado.

---

#### Switch

Arquivo: `packages/ui/src/components/switch.tsx`
Primitivo: `<button role="switch">` nativo (sem Radix)

| Prop                          | Notas                                  |
| ----------------------------- | -------------------------------------- |
| `checked` / `onCheckedChange` | Controlado, sem prop `onChange` nativa |

Track `bg-primary` (ligado) / `bg-muted` (desligado), thumb `bg-background` com `translate-x`. Ainda sem consumidor real em `apps/web` — ver tabela "Sem ação por ora" do plano de migração.

---

#### Badge

Arquivo: `packages/ui/src/components/badge.tsx`
Primitivo: `<span>` com CVA

| Prop      | Notas                                                                                                                                                     |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `variant` | `success`/`warning`/`danger`/`info` (`border-{variant} bg-{variant}-pastel text-foreground`), `neutral` (`border-muted text-muted-foreground`, sem fundo) |

**Aparência fixa:** `inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium`.

> @spec SPEC-20260730-001 — substitui o padrão `border-{semantic} bg-{semantic}-pastel` que já
> convergia em ~10 arquivos (fines, atividades, manutenção, saúde de veículo). **Não** cobre
> indicadores que tingem uma linha/card inteiro por urgência (`UpcomingCostsWidget`,
> `FleetAlertBar`) — esse é um padrão distinto, fora do escopo de `Badge`.

---

#### Skeleton

Arquivo: `packages/ui/src/components/skeleton.tsx`
Primitivo: `<div aria-hidden="true">`

Sem props além de `className`/`HTMLAttributes<HTMLDivElement>` — cada consumidor define `h-*`/`w-*`. Classe-base `animate-pulse rounded-md bg-muted`. Usado internamente por `KpiCard` (`KpiCardSkeleton`) e `ChartWrapper` (estado `loading`), além de 3 consumidores em `apps/web`.

---

#### Container

Arquivo: `packages/ui/src/components/container.tsx`
Primitivo: `<main>` com CVA

| Prop   | Notas                                                       |
| ------ | ----------------------------------------------------------- |
| `size` | `sm`/`md`/`2xl`/`3xl`/`4xl`/`5xl` (`max-w-*`), default `sm` |
| `gap`  | `4`/`8` (`gap-4`/`gap-8`), default `4`                      |

**Aparência fixa:** `mx-auto flex w-full flex-col p-8`. Substitui o wrapper `<main className="mx-auto flex max-w-{size} flex-col gap-{n} p-8">` idêntico em 32 ocorrências através de quase toda rota `page.tsx` — `className` extra permite casos como `pb-24` (clearance do dock mobile em `atividades`/`dashboard`).

---

#### Tooltip

Arquivo: `packages/ui/src/components/tooltip.tsx`
Primitivo: `@radix-ui/react-tooltip`

| Prop      | Notas                                        |
| --------- | -------------------------------------------- |
| `content` | Conteúdo do tooltip (`ReactNode`)            |
| `side`    | `top`/`right`/`bottom`/`left`, default `top` |

**Trigger:** `asChild`, clona o elemento filho sem wrapper extra. **Aparência do conteúdo:** `rounded-md border border-border bg-card px-2 py-1 text-xs text-card-foreground shadow-md`, com seta (`Arrow`). Substitui `title=` nativo do navegador (sem estilo, sem controle de posição).

---

#### Table (família)

Arquivo: `packages/ui/src/components/table.tsx`
Sub-componentes exportados: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`

| Sub-componente | Notas                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| `Table`        | Envolve em `<div class="overflow-x-auto">` para scroll horizontal mobile |
| `TableHeader`  | `border-b border-border`, células com `align-top`                        |
| `TableBody`    | Sem estilo próprio                                                       |
| `TableRow`     | Prop `striped` (boolean) — linhas ímpares recebem `bg-muted/15`          |
| `TableHead`    | `h-10 px-3 text-left align-top font-medium text-muted-foreground`        |
| `TableCell`    | `px-3 py-2 align-top`                                                    |

**Padrão "Two-Row Table"** (ver spec §9.1): layout com 4 colunas — Data, Detalhes (2 linhas visuais dentro da célula), Valor, Ações. Hover: `hover:bg-muted/50`.

---

### 2.2 Data Display

#### KpiCard

Arquivo: `packages/ui/src/components/kpi-card.tsx`
Construído sobre: `<Card padding="sm">`

| Prop           | Tipo                                              | Notas                                                                 |
| -------------- | ------------------------------------------------- | --------------------------------------------------------------------- |
| `title`        | string                                            | Label da métrica                                                      |
| `value`        | string \| number                                  | Valor principal formatado                                             |
| `unit`         | string?                                           | Sufixo do valor (ex: "km", "L")                                       |
| `icon`         | ReactNode?                                        | Decorativo — emojis são aceitos                                       |
| `trend`        | `{ value: number; label?: string }?`              | Percentual +/- e texto auxiliar                                       |
| `sparkline`    | number[]?                                         | Array de valores históricos (mínimo 2 pontos)                         |
| `variant`      | `success \| danger \| warning \| info \| neutral` | Sobrescreve a cor calculada pelo trend                                |
| `reverseTrend` | boolean                                           | Quando `true`, tendência positiva = danger (ex: custo subindo = ruim) |
| `loading`      | boolean                                           | Exibe skeleton pulse nos 3 blocos                                     |

**Dimensão fixa:** `min-w-[150px] max-w-[220px]` — permite grade 2×2 no mobile.
**Sparkline:** SVG inline (80×24 px), cor herdada da variante resolvida.
**Loading state:** skeleton com `animate-pulse` em 3 blocos (ícone, valor, sparkline).

```
┌─────────────────────────┐
│ Combustível        ⛽   │   ← título + ícone (decorativo)
│ R$ 4.820                │   ← valor + unit
│ ↑ 12% vs mês anterior  │   ← trend (cor success/danger/warning)
│ ▁▂▃▄▅▆▇█               │   ← sparkline SVG (80×24px)
└─────────────────────────┘
```

---

#### ChartWrapper

Arquivo: `packages/ui/src/components/chart-wrapper.tsx`
Construído sobre: `<Card>`

| Prop          | Notas                                                                            |
| ------------- | -------------------------------------------------------------------------------- |
| `title`       | Título do gráfico (h3, `text-sm font-semibold`)                                  |
| `description` | Subtítulo opcional (`text-xs text-muted-foreground`)                             |
| `loading`     | Skeleton retangular `h-64 animate-pulse`                                         |
| `isEmpty`     | Mensagem centralizada `h-64`, usa `emptyMessage`                                 |
| `actions`     | Slot para ações no header (ex: seletor de período) — alinhado à direita          |
| `children`    | Área do gráfico (Recharts) — renderizado apenas quando não é loading nem isEmpty |

```
┌────────────────────────────────────────┐
│ Título do Gráfico        [ação slot]  │
│ Subtítulo opcional                    │
├────────────────────────────────────────┤
│                                        │
│         [slot do gráfico Recharts]     │  h-64 implícita
│                                        │
└────────────────────────────────────────┘
```

---

### 2.3 navegação

#### Tabs

Arquivo: `packages/ui/src/components/tabs.tsx`
Primitivo: `@radix-ui/react-tabs`

| Dimensão  | Valores                                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `variant` | `default` (borda inferior na aba ativa), `underline` (igual ao default, espaçamento diferente), `pills` (abas com fundo `bg-muted`, ativa com `bg-card shadow-sm`) |

Cada item (`TabItem`) suporta: `value`, `label`, `icon` (ReactNode decorativo), `badge` (string ou número), `disabled`.

**Nota importante:** o componente renderiza apenas a faixa de abas — o painel de conteúdo é responsabilidade do consumidor, que usa o `value` para decidir o que exibir.

```
[default/underline]              [pills]
 Visão Geral  Despesas(3)        [Visão Geral] [Despesas 3] [Manutenções]
 ───────────                      ─────────────
 ^ativa (borda primary)           ^ativa (bg-card, shadow)
```

---

#### Breadcrumb

Arquivo: `packages/ui/src/components/breadcrumb.tsx`
Primitivo: `<nav aria-label="Breadcrumb">` + `<ol>`

| Prop       | Notas                                                                 |
| ---------- | --------------------------------------------------------------------- |
| `items`    | Array de `{ label, href?, icon? }` — último item é o atual (sem link) |
| `maxItems` | Colapsa itens intermediários com `…` quando excede o limite           |

**Separador:** tipográfico `/`, não SVG.
**Item atual:** `aria-current="page"`, `font-medium text-foreground`.
**Links:** `hover:text-foreground hover:underline`.

```
Frota  /  Veículos  /  ABC-1234  /  Despesas
                                    ^atual (sem link)

Mobile com maxItems=3:
Frota  /  …  /  Despesas
```

---

#### Steps

Arquivo: `packages/ui/src/components/steps.tsx`
Renderiza: `<ol>` horizontal com conectores

| Estado do círculo | Visual                                | Cor                                      |
| ----------------- | ------------------------------------- | ---------------------------------------- |
| `completed`       | Círculo preenchido + ✓ SVG            | `bg-success`, `text-success-foreground`  |
| `current`         | Círculo com borda + sem preenchimento | `border-primary`, `text-primary`         |
| `upcoming`        | Círculo vazio                         | `border-border`, `text-muted-foreground` |
| `error`           | Círculo preenchido + ✗ SVG            | `bg-danger`, `text-danger-foreground`    |

Passos `completed` ou `error` são clicáveis se `onStepClick` for fornecido.

```
  ●──────────●──────────○──────────○
 Dados      Veículo   Revisão   Confirmar
  ✓          atual     upcoming  upcoming
```

---

### 2.4 Formulários Avançados

#### Combobox

Arquivo: `packages/ui/src/components/combobox.tsx`
Primitivo: `@radix-ui/react-popover` + `cmdk`

| Prop                      | Notas                                                       |
| ------------------------- | ----------------------------------------------------------- |
| `options`                 | Array de `{ value, label, description?, icon?, disabled? }` |
| `value` / `onValueChange` | Controlado                                                  |
| `loading`                 | Botão desabilitado, exibe "Carregando..."                   |
| `error`                   | Borda `border-danger` + mensagem abaixo                     |
| `disabled`                | Desabilita o trigger                                        |

**Trigger:** `h-11 w-full` (touch target mobile). Popover com busca interna (`cmdk`), `max-h-60 overflow-y-auto`.

```
┌─────────────────────────────────┐
│ Selecionar veículo...        ▾  │  ← trigger h-11
└─────────────────────────────────┘
  ┌──────────────────────────────┐
  │ [campo de busca]             │
  ├──────────────────────────────┤
  │ ✓ ABC-1234 — Gol 2019       │  ← item selecionado
  │   DEF-5678 — HB20 2021      │
  │   GHI-9012 — Strada 2022    │
  └──────────────────────────────┘
```

---

#### DateRangePicker

Arquivo: `packages/ui/src/components/date-range-picker.tsx`
Primitivo: dois `<input type="date">` nativos (sem lib de calendário)

| Prop                  | Notas                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------- |
| `value`               | `{ from: Date; to?: Date }`                                                           |
| `presets`             | Array de `{ label, range }` — renderizado como botões `rounded-full` acima dos inputs |
| `error`               | Borda `border-danger` nos dois inputs + mensagem                                      |
| `minDate` / `maxDate` | Limites dos inputs nativos                                                            |

**Layout:** mobile — inputs empilhados (`flex-col`); `sm:` — lado a lado (`flex-row`).

```
[Últimos 7 dias] [Este mês] [Este ano]     ← presets (rounded-full)

┌────────────────┐  ┌────────────────┐
│ Data inicial   │  │ Data final     │
│ [input date]   │  │ [input date]   │
└────────────────┘  └──────────────-─┘
```

---

#### FileUpload

Arquivo: `packages/ui/src/components/file-upload.tsx`
Primitivo: `<input type="file">` oculto + `<label>` como zona de drop

| Estado      | Visual                                                                      |
| ----------- | --------------------------------------------------------------------------- |
| Padrão      | Borda dashed `border-border`, ícone de clipe, texto "Arraste ou Selecionar" |
| Dragging    | `border-primary bg-primary/5`                                               |
| Error       | `border-danger`                                                             |
| Disabled    | `opacity-50 pointer-events-none`                                            |
| Com arquivo | Lista abaixo da zona, com nome, tamanho e botão ✕ por item                  |

Validações internas: tipo (`accept`), tamanho (`maxSize`, padrão 10 MB), quantidade (`maxFiles`, padrão 1).

---

### 2.5 Feedback

#### Alert

Arquivo: `packages/ui/src/components/alert.tsx`
Primitivo: `<div role="alert">`

| Variante  | Borda esquerda     | Fundo               | Ícone interno     |
| --------- | ------------------ | ------------------- | ----------------- |
| `info`    | `border-l-info`    | `bg-info-pastel`    | SVG círculo + "i" |
| `success` | `border-l-success` | `bg-success-pastel` | SVG círculo + ✓   |
| `warning` | `border-l-warning` | `bg-warning-pastel` | SVG triângulo + ! |
| `error`   | `border-l-danger`  | `bg-danger-pastel`  | SVG círculo + ✗   |

**Slots opcionais:** `title` (texto em bold), `action` (Button ghost sm no rodapé), `onDismiss` (botão ✕).

```
┌──────────────────────────────────────────┐
│ ⚠  [título em bold]                     │
│    [descrição em text-sm]                │
│                        [Ação (ghost)]    │  ← opcional
│                                       ✕ │  ← opcional (onDismiss)
└──────────────────────────────────────────┘
   ↑ border-l-4 colorida por variante
```

---

#### Toast (ToastViewport)

Arquivo: `packages/ui/src/components/toast.tsx`
Primitivo: `<div role="status">` por item

| Variante                                 | Visual                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| `default`                                | `bg-card border-border` sem ícone                                         |
| `info` / `success` / `warning` / `error` | Mesmo padrão de borda e fundo do Alert (pastel + borda esquerda colorida) |

**Posição:** mobile — topo centralizado (`top-4 left-1/2 -translate-x-1/2`); desktop — canto inferior direito (`md:right-4 md:bottom-4`).

**Auto-dismiss:** `duration` ms (padrão 4000). `duration=0` = persistente (sem X, apenas ação explícita).

**ToastViewport** é o container que recebe o array `toasts[]` e renderiza cada `ToastCard`. Não inclui lógica de state — isso fica no `ui-store` Zustand do app.

---

#### EmptyState

Arquivo: `packages/ui/src/components/empty-state.tsx`
Construído sobre: `<div>` com CVA

| Dimensão | Valores                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `size`   | `sm` (py-4, ícone text-2xl, título text-sm), `md` (py-8, ícone text-4xl, título text-base — padrão), `lg` (py-16, ícone text-5xl, título text-lg) |

**Slots:** `icon` (ReactNode decorativo), `title` (obrigatório), `description`, `action` (Button primary/outline/ghost sm), `secondaryAction` (Button ghost sm).

```
[sm — inline em tabela]          [lg — tela cheia]
  🔍                                  🚗
  Nenhum resultado                    Nenhum veículo ainda
  [Limpar filtros]                    Adicione seu primeiro...
                                      [ + Adicionar veículo ]
```

---

#### Dialog (família)

Arquivo: `packages/ui/src/components/dialog.tsx`
Primitivo: `@radix-ui/react-dialog`

Sub-componentes exportados: `Dialog`, `DialogTrigger`, `DialogClose`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`

| Sub-componente      | Notas                                                                    |
| ------------------- | ------------------------------------------------------------------------ |
| `Dialog`            | Root (re-export do Radix)                                                |
| `DialogTrigger`     | Trigger (re-export do Radix)                                             |
| `DialogContent`     | Modal: `max-w-md`, overlay com `backdrop-blur-sm bg-black/40`, `z-[201]` |
| `DialogHeader`      | `mb-4 flex flex-col gap-1.5 pr-6` (espaço para o ✕)                      |
| `DialogFooter`      | Mobile: coluna-reversa; `sm:` — linha justificada à direita              |
| `DialogTitle`       | `text-lg font-semibold`                                                  |
| `DialogDescription` | `text-sm text-muted-foreground`                                          |

**Prop `hideCloseButton`** em `DialogContent`: oculta o botão ✕ padrão (usar quando o fechamento só é via ação explícita).

**Acessibilidade herdada do Radix:** focus-trap, Esc para fechar, `aria-labelledby` / `aria-describedby` via `DialogTitle` / `DialogDescription`.

---

### 2.6 Inputs Mascarados

#### CurrencyInput / OdometerInput

Arquivo: `packages/ui/src/components/masked-input.tsx`
Primitivo: `<input type="text" inputMode="numeric">`

Não é um componente visual com variantes — são inputs controlados com máscara "caixa-eletrônico" (dígitos entram pela direita). Sem estilo próprio de container (o consumidor aplica as classes de input do seu formulário).

| Componente      | Formato                              | Limite de dígitos |
| --------------- | ------------------------------------ | ----------------- |
| `CurrencyInput` | `R$ 1.234,56` (prefixo configurável) | 11 dígitos        |
| `OdometerInput` | `123.456` (sem decimais)             | 7 dígitos         |

Helpers exportados para conversão: `digitsToCurrencyDisplay`, `digitsToOdometerDisplay`, `currencyDigitsToValue`, `valueToCurrencyDigits`, `odometerDigitsToValue`, `valueToOdometerDigits`.

---

## 3. Recomendações para Recriar no Figma

### 3.1 Variáveis de Cor (Figma Variables)

**Estrutura sugerida de grupos:**

```
Colors/
  Neutral/
    background        → oklch(97.2% 0.003 248)
    foreground        → oklch(20.4% 0.011 261)
    card              → oklch(92.6% 0.007 248)
    card-foreground   → oklch(20.4% 0.011 261)
    border            → oklch(88.5% 0.007 248)
    muted             → oklch(92.6% 0.007 248)
    muted-foreground  → oklch(50.4% 0.021 246)
  Brand/ (direção Prata — SPEC-20260729-001)
    primary           → oklch(35.3% 0.093 259)
    primary-foreground→ oklch(97.2% 0.003 248)
    secondary         → oklch(75% 0.03 255)
    secondary-foreground → oklch(20.4% 0.011 261)
    accent            → oklch(55.6% 0.15 140)
    accent-foreground → oklch(15% 0 0)
    gold              → oklch(67.4% 0.122 86)
    gold-foreground   → oklch(20.4% 0.011 261)
  Semantic/
    success           → oklch(60% 0.15 150)
    success-foreground→ oklch(98.5% 0 0)
    success-pastel    → oklch(92% 0.12 150)
    warning           → oklch(75% 0.16 85)
    warning-foreground→ oklch(15% 0 0)
    warning-pastel    → oklch(92% 0.15 85)
    danger            → oklch(56.3% 0.14 32)
    danger-foreground → oklch(97.2% 0.003 248)
    danger-pastel     → oklch(92% 0.06 32)
    info              → oklch(55.6% 0.15 240)
    info-foreground   → oklch(98.5% 0 0)
    info-pastel       → oklch(92% 0.08 240)
    urgency-hot        → oklch(62% 0.18 32)
    urgency-hot-pastel → oklch(93% 0.07 32)
  Categorical/ (SPEC-20260729-002 — dados sem status real, ver R-DS-07)
    categorical-1     → oklch(50% 0.17 258)
    categorical-2     → oklch(64% 0.14 195)
    categorical-3     → oklch(56% 0.11 132)
    categorical-4     → oklch(72% 0.12 72)
    categorical-5     → oklch(55% 0.14 315)
    chart-grid        → oklch(88.5% 0.007 248)
  Surface/ (SPEC-20260721-002, realinhado por SPEC-20260729-002)
    surface           → oklch(95% 0.003 248)
    surface-elevated  → oklch(98.5% 0.003 248)
    on-surface        → oklch(20.4% 0.011 261)
    on-surface-muted  → oklch(50.4% 0.021 246)
    on-surface-subtle → oklch(63% 0.015 246)
    finance-outgoing  → oklch(58% 0.17 32)
```

> O Figma suporta cores no formato OKLCH a partir de 2024. Use a notação `oklch(L% C H)` diretamente no seletor de cor — se a versão do Figma não aceitar, converta para P3 ou sRGB pelo conversor oklch.evilmartians.io.

**Nomeação:** use exatamente os mesmos nomes dos tokens (com hífen, não camelCase) — facilita a rastreabilidade entre Figma e código.

---

### 3.2 Estilos de Texto

O projeto usa a escala padrão do Tailwind para tipografia. Os tamanhos mais frequentes nos componentes:

| Classe Tailwind         | Tamanho (rem/px) | Peso                   | Uso nos componentes                                    |
| ----------------------- | ---------------- | ---------------------- | ------------------------------------------------------ |
| `text-xs`               | 0.75rem / 12px   | —                      | Labels de input, tamanho de arquivo, descrição de step |
| `text-sm`               | 0.875rem / 14px  | `font-medium` / normal | Botões, corpo de Alert/Toast, conteúdo de tabela       |
| `text-base`             | 1rem / 16px      | `font-semibold`        | EmptyState lg título, Button lg                        |
| `text-lg`               | 1.125rem / 18px  | `font-semibold`        | KpiCard valor, DialogTitle                             |
| `text-sm font-semibold` | 14px bold        | —                      | ChartWrapper título                                    |

Crie estilos de texto no Figma para cada combinação frequente, nomeando-os como a classe Tailwind (`text-sm/medium`, `text-lg/semibold`, etc.).

---

### 3.3 Estilos de Efeito (sombras e bordas)

| Nome sugerido | CSS equivalente                     | Uso                     |
| ------------- | ----------------------------------- | ----------------------- |
| `shadow-sm`   | `0 1px 2px 0 rgb(0 0 0 / 0.05)`     | Card, KpiCard           |
| `shadow-lg`   | `0 10px 15px -3px rgb(0 0 0 / 0.1)` | Toast, Combobox popover |
| `shadow-xl`   | `0 20px 25px -5px rgb(0 0 0 / 0.1)` | DialogContent           |

---

### 3.4 Componentes Figma — Ordem Sugerida de Criação

Seguindo a mesma prioridade da spec de implementação:

| Ordem | Componente Figma                                               | Por que primeiro                                                                                        |
| ----- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1     | Variáveis de cor (todas as 22)                                 | Bloqueia tudo — nenhum outro componente pode ter cor hardcoded                                          |
| 2     | Estilos de texto (5-6 combinações)                             | Base de tipografia                                                                                      |
| 3     | **Button** (4 variantes × 3 tamanhos × 3 estados)              | Usado por Alert, EmptyState, Dialog                                                                     |
| 4     | **Card** (3 padding)                                           | Usado por KpiCard, ChartWrapper                                                                         |
| 5     | **Alert** (4 variantes × com/sem ação × com/sem dismiss)       | Muito usado, alta visibilidade                                                                          |
| 6     | **EmptyState** (3 tamanhos × com/sem ação)                     | Presente em todas as listagens                                                                          |
| 7     | **KpiCard** (5 variantes × loading/normal × com/sem sparkline) | Dashboard principal                                                                                     |
| 8     | **Toast** (5 variantes × com/sem ação)                         | Posição mobile e desktop                                                                                |
| 9     | **Table** (linha normal × zebra × hover)                       | Listagens                                                                                               |
| 10    | **Combobox** (fechado/aberto × error × loading)                | Formulários                                                                                             |
| 11    | **Tabs** (3 variantes × ativo/inativo/disabled)                | navegação contextual                                                                               |
| 12    | **Steps** (4 estados de passo × 4 passos)                      | Wizard de cadastro                                                                                      |
| 13    | **DateRangePicker** (com/sem presets × error)                  | Filtros de relatório                                                                                    |
| 14    | **FileUpload** (idle/dragging/com arquivo/error)               | Uploads                                                                                                 |
| 15    | **ChartWrapper** (normal/loading/empty)                        | Gráficos                                                                                                |
| 16    | **Breadcrumb** (com/sem collapse)                              | navegação hierárquica                                                                              |
| 17    | **Dialog** (com/sem footer × com/sem dismiss)                  | Modais                                                                                                  |
| 18    | **Input** (normal/focus/error/disabled)                        | Presente em quase todo formulário de escrita (adicionado na Rodada 5, `SPEC-20260729-003`)              |
| 19    | **Textarea** (normal/focus/error/disabled)                     | Mesma prioridade do Input — campos multi-linha                                                          |
| 20    | **Checkbox** (marcado/desmarcado/disabled)                     | Formulários de seleção múltipla e termos                                                                |
| 21    | **Switch** (ligado/desligado/disabled)                         | Sem consumidor real ainda — baixa prioridade                                                            |
| 22    | **Skeleton** (dimensões variáveis)                             | Já duplicado 5x, incluindo dentro de KpiCard/ChartWrapper (adicionado na Rodada 6, `SPEC-20260730-001`) |
| 23    | **Badge** (5 variantes)                                        | Padrão convergente em ~10 arquivos de status                                                            |
| 24    | **Container** (6 tamanhos × 2 gaps)                            | Wrapper de página, 32 ocorrências idênticas                                                             |
| 25    | **Tooltip** (fechado/aberto, 4 lados)                          | Poucos consumidores reais (3), baixa prioridade                                                         |

---

### 3.5 Convenções de Nomenclatura no Figma

- **Variáveis:** `grupo/nome-com-hífen` (ex: `Semantic/danger-pastel`) — espelha o nome da variável CSS
- **Componentes:** PascalCase igual ao nome exportado no código (ex: `KpiCard`, `EmptyState`)
- **Propriedades de variante:** nome igual à prop TypeScript (ex: `variant=default`, `size=md`, `loading=true`)
- **Estados:** usar propriedades booleanas do Figma (`loading`, `disabled`, `error`) + variantes de estado UX (`hover`, `focus`, `pressed`) — não criar frames separados para cada estado

---

### 3.6 Pontos de Atenção

1. **KpiCard tem largura fixa:** `min-w-[150px] max-w-[220px]` — no Figma, use Min width 150 / Max width 220 nas constraints do frame, não width fixo.

2. **Toast tem posicionamento diferente por breakpoint:** no Figma, documente as duas posições em frames separados (mobile e desktop) ou use notas no componente.

3. **Ícones semânticos em Alert e Steps são SVG inline fixos** — não são Lucide nem emojis. Recrie os 4 ícones (círculo+✓, triângulo+!, círculo+✗, círculo+i) como componentes Figma reutilizáveis, correspondendo aos SVGs do código.

4. **CurrencyInput e OdometerInput não têm estilo próprio** — no Figma, documente apenas o padrão de máscara (campo de texto comum, com o consumidor aplicando o estilo de input do contexto).

5. **Dialog usa backdrop blur** — `backdrop-blur-sm` com `bg-black/40`. No Figma, simule com um retângulo semitransparente + efeito de blur de layer sobre o conteúdo.

6. **Tabs não renderiza o painel de conteúdo** — no Figma, o componente Tabs deve ser apenas a faixa de abas; o conteúdo abaixo é um slot separado que cada tela preenche.

---

## 4. Dependências Headless (contexto para o Figma)

Os componentes interativos usam primitivos Radix UI como base lógica. No Figma, o comportamento de interação (abrir/fechar popover, focus-trap em dialog) é simulado via Prototype — o visual dos estados aberto/fechado deve ser representado como variantes distintas do componente.

| Componente      | Primitivo headless                 |
| --------------- | ---------------------------------- |
| Combobox        | `@radix-ui/react-popover` + `cmdk` |
| Tabs            | `@radix-ui/react-tabs`             |
| Dialog          | `@radix-ui/react-dialog`           |
| DateRangePicker | `<input type="date">` nativo       |
| FileUpload      | `<input type="file">` nativo       |
| Tooltip         | `@radix-ui/react-tooltip`          |
| Demais          | HTML nativo / CVA                  |
