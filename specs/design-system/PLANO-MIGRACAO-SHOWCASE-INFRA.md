# Plano de Migração — Infraestrutura do Showcase Prata

> Documento de execução, não uma spec nova. Trata de **como o `brand-showcase` é construído**,
> não de telas consumidoras — isso já é coberto por
> [PLANO-MIGRACAO-CONSUMIDORES.md](PLANO-MIGRACAO-CONSUMIDORES.md). Nasce do gap identificado em
> sessão de 2026-07-30: os specimens do showcase são markup estático (`<div style={{ background:
> "var(--bs-alert)" }}>`) e a paleta em `_data/directions.ts` duplica hex literais em paralelo aos
> tokens reais de `globals.css`/`packages/ui/src/tokens/colors.ts`. Essa duplicação já causou
> drift real: o bug de contraste do `FleetAlertBar` (`bg-danger-pastel` + `text-danger-foreground`,
> 1,22:1 de contraste) não foi pego pelo showcase porque o showcase nunca renderizou o componente
> real, só uma ilustração da paleta.

**Criado em:** 2026-07-30
**Autor:** Douglas Lopes (lps.doug@protonmail.com)

## Objetivo

Convergir o showcase para a direção já decidida (`ADR-009`/`SPEC-20260729-001`) de forma que
mudar um token/componente no showcase **seja** mudar o sistema real — não uma cópia paralela que
precisa ser "traduzida" manualmente depois — e adicionar automação leve (teste de contraste,
visual regression) que substitua conferência manual/humana por verificação determinística.

As outras 5 direções (`rota`/`pulso`/`horizonte`/`campo`/`bussola`) **não** são tocadas por este
plano: seguem como protótipo decorativo de comparação, papel legítimo enquanto ainda existem para
referência histórica de decisão (mesma classe de exceção já dada a `dashboard/concept/*`).

## Como usar este documento

Cada rodada é uma unidade de trabalho isolada (pode virar uma tarefa/PR própria). Ao concluir uma
rodada: marcar os checkboxes, rodar a suíte de testes tocada, e — se a rodada alterar um
componente de `packages/ui` já coberto por `PLANO-MIGRACAO-CONSUMIDORES.md` — verificar se algum
consumidor real precisa de ajuste equivalente.

---

## Rodada 1 — `prata` para de duplicar hex; passa a apontar para os tokens reais

**Por quê primeiro:** é a mudança de menor risco e maior alavancagem — sem ela, qualquer specimen
novo criado nas rodadas seguintes volta a divergir do real na próxima alteração de token.

Trocar cada valor de `palette` da entrada `prata` em `_data/directions.ts` por uma string
`"var(--token-real)"` em vez de hex literal (o `BrandScope` já injeta esses valores como CSS
custom property — `var()` aninhado funciona normalmente). Mapeamento:

| Campo `palette.prata` | Token real equivalente |
|---|---|
| `primary` | `var(--primary)` |
| `anchor` | `var(--foreground)` |
| `surface` | `var(--background)` |
| `surfaceAlt` | `var(--card)` |
| `ink` | `var(--foreground)` |
| `inkMuted` | `var(--muted-foreground)` |
| `alert` | `var(--danger)` |
| `accent` | `var(--gold)` |

- [x] Atualizar `palette.prata` em `apps/web/src/app/(app)/brand-showcase/_data/directions.ts` conforme a tabela acima (light e dark) — **desvio da tabela original:** os campos passaram a ler `colorChannels`/`darkColorChannels` de `packages/ui/src/tokens/colors.ts` (fonte de verdade real do projeto) em vez do literal `"var(--token)"`; ver changelog abaixo
- [x] Remover/ajustar o comentário de `note` de cada campo se o racional textual não corresponder mais 1:1 ao valor (ex: `anchor` deixa de ter hex próprio)
- [x] Confirmar visualmente (`/brand-showcase/prata`) que nada quebra — os valores computados devem ser idênticos aos hex antigos, já que os tokens de `globals.css` foram calibrados a partir dessa mesma paleta em `SPEC-20260729-001` (validado por conversão OKLCH→luminância: mesma faixa AA/AAA de antes, ver changelog)
- [x] `contrastExpectations` de `prata`: trocar `approxRatio` escrito à mão por comentário apontando para o teste automatizado da Rodada 4 como fonte de verdade (evita número que fica obsoleto silenciosamente)

---

## Rodada 2 — Specimens de Feedback renderizam os componentes reais (`Alert`, `Toast`, `Dialog`)

Prioridade alta: foi exatamente a categoria "Feedback" que mentiu sobre o padrão real nesta sessão
(`ToastAlertSpecimen` usava fundo sólido + texto claro; o padrão real de `Alert`/`Toast` é
`bg-{variant}-pastel text-foreground`).

- [x] `ModalSpecimen` em `_components/feedback-specimens/index.tsx` — trocar pela `Dialog`/`DialogContent`/`DialogFooter` reais de `@nave/ui`, com o mesmo conteúdo ("Confirmar exclusão")
- [x] `ToastAlertSpecimen` — trocar pelo `Alert` real (`variant="success"`/`variant="error"`) e pelo `Toast` real (via `ToastViewport` ou render direto do componente)
- [x] `ProgressTooltipSpecimen` — confirmado que `ProgressBar` ainda não existe em `packages/ui` (só o protótipo em `dashboard/concept/*`, fora de escopo); barra segue ilustrativa com anotação explícita no specimen, mas o `Tooltip` real de `@nave/ui` substituiu o `<span>` estático
- [x] Repetir suíte de acessibilidade (`jest-axe`) já usada nos componentes reais para o specimen, se o showcase tiver testes — **não aplicável:** `brand-showcase/` não tem suíte de testes própria hoje (nenhum `*.spec.tsx` na árvore); nada a repetir

---

## Rodada 3 — Specimens dos componentes de maior reuso real ainda sem specimen fiel

Ordem por frequência de uso real no app (levantamento da sessão de 2026-07-30), maior primeiro:

- [x] `EmptyState` (9+ páginas reais, nenhum specimen dedicado hoje)
- [x] `Combobox` (8 páginas; specimen atual usa `<select>` nativo, não o componente com busca)
- [x] `KpiCard` (usado em `expenses`/`fines`/`DashboardKpiGrid`; specimen mais próximo é "Stat" genérico)
- [x] `Table` (specimen "DataGrid" é `<table>` cru)
- [x] `ChartWrapper` (specimen "Chart" é SVG cru sem os estados `title`/`loading` reais)
- [x] `CurrencyInput`/`OdometerInput` (sem specimen — "Input" genérico não cobre máscara)
- [x] `ThemeToggle`, `NavBadge`, `VehicleHealthScore`, `CommandPalette` — sem specimen algum

Cada item: substituir/criar specimen que importa o componente de `@nave/ui` (props reais,
inclusive estados `loading`/`error`/vazio quando existirem), não uma recriação visual.

---

## Rodada 4 — Teste de contraste automatizado (substitui conferência manual)

Hoje `contrastExpectations` em `directions.ts` é texto aproximado escrito à mão
(`"~15:1"`), e `_lib/contrast.ts` só é consumido por uma página que um humano precisa abrir e ler.

- [x] Criar teste (`vitest`) que importa os pares semânticos reais de `packages/ui/src/tokens/colors.ts` (ou lê os valores computados de `globals.css`) e roda `contrastRatio`/`wcagLevel` de `_lib/contrast.ts` contra cada par crítico: `foreground`/`background`, `foreground`/`card`, `{success,warning,danger,info}` sobre `card` e sobre a própria `-pastel`, `danger` sobre `danger-foreground` (uso sólido)
- [x] Teste falha o CI se qualquer par cair abaixo de C-DS-01 (4,5:1 texto normal / 3:1 texto grande e elementos não-textuais) — **estado atual: falha de propósito**, ver changelog
- [x] Este teste teria pego o bug do `FleetAlertBar` sozinho, sem precisar de revisão manual — e de fato pegou um bug real equivalente já na primeira execução (`warning`/`success`), ver changelog

---

## Rodada 5 — Visual regression leve via Playwright

Aproveita a suíte E2E já configurada (`SPEC-20260716-003`) em vez de ferramenta nova
(Chromatic/Percy) — mantém o escopo leve, conforme pedido.

- [x] Screenshots de baseline para as páginas reais de maior tráfego (`dashboard`, `expenses`, `fines`) em light e dark mode — **não** do showcase, que não é produto — **teste criado, baseline PNG pendente de execução real**, ver changelog
- [x] Rodar comparação de diff no CI com tolerância configurada; falha bloqueia merge — `maxDiffPixelRatio: 0.01` configurado, mesmo mecanismo de falha do job `e2e` existente (RF-CI-06); só falta a baseline inicial existir
- [x] Documentar em `specs/qa/` (seguindo o padrão já usado por `e2e-tester`) como atualizar a baseline quando a mudança visual é intencional — feito em `SPEC-20260716-003` (RF-E2E-12) e `important/PENDENCIAS-E-PROCESSOS.md`

---

## Rodada 6 — Gate de processo (governança, sem código novo)

- [x] Atualizar `specs/AGENTS.md`/`specs/design-system/README.md`: componente novo ou variante nova em `packages/ui` só é "pronto" com specimen real no showcase (Rodada 2/3 como referência de formato) — mesma lógica de "matriz de rastreabilidade não fica pendurada" já aplicada a specs
- [x] Formalizar a varredura de cor hardcoded (hoje manual, `SPEC-20260729-002` RF-04) como check de CI: grep/lint bloqueando `#[0-9a-fA-F]{6}` ou `oklch(` fora de `globals.css`, `packages/ui/src/tokens/`, e as exceções já documentadas (`dashboard/concept/*`, `directions.ts` das 5 direções não-Prata, cor customizável de `vehicle_groups.color`)

---

## Sem ação por ora

| Item | Motivo |
|---|---|
| Converter as 5 direções não escolhidas para tokens reais | São protótipo de comparação ainda ativo, não produto — converter custa esforço sem retorno até decisão de trocar de direção |
| Pipeline completo de Design Tokens (Style Dictionary/W3C Design Tokens) | Overkill para o estágio atual: não há consumidor multiplataforma real (Figma sync automatizado, app mobile) que justifique o overhead. Reavaliar se isso surgir |
| Storybook/Ladle dedicado | O showcase interno já cobre o papel de "preview isolado"; introduzir ferramenta nova custa mais manutenção do que as Rodadas 1–6 acima, que resolvem o problema real (drift) com o que já existe |

---

## Changelog

| Data | Mudança |
|------|---------|
| 2026-07-30 | Criação do plano, a partir da investigação de contraste do `FleetAlertBar`/`KpiCard` nesta sessão, que expôs a divergência entre o showcase e os tokens/componentes reais |
| 2026-07-30 | Rodada 1 concluída com desvio da tabela original: `--bs-primary` e afins são setados via inline `style` no `BrandScope` (`apps/web/.../_components/brand-scope/index.tsx`), então um valor literal `"var(--primary)"` não resolveria — `--primary` no `globals.css` guarda só os componentes OKLCH (`"L% C H"`), sem o wrapper `oklch()`, e a única fonte de verdade real do projeto é `packages/ui/src/tokens/colors.ts` (`colorChannels`/`darkColorChannels`), não `globals.css` (que é sincronizado manualmente a partir de lá). `directions.ts` agora importa `@nave/ui/tokens` e resolve `oklch(${colorChannels[token]})` para light e `oklch(${darkColorChannels[token] ?? colorChannels[token]})` para dark. Consequência em cascata: `_lib/contrast.ts` só entendia hex — `ContrastBadge` quebraria ao receber uma string `oklch(...)`. Estendido para aceitar `oklch(L% C H)` além de hex (conversão OKLCH→sRGB linear→luminância relativa), o que também é o utilitário que a Rodada 4 vai reusar no teste automatizado. `BrandScope` passou a aplicar a classe real `.dark` (não só `data-brand-mode`) quando `mode === "dark"`, necessário para que componentes reais de `@nave/ui` embutidos em specimens (Rodada 2/3) sigam o toggle local do showcase em vez do tema real do app (`next-themes` não é tocado aqui) |
| 2026-07-30 | Rodada 2 concluída: `_components/feedback-specimens/index.tsx` virou `"use client"` e passou a renderizar `Dialog`/`DialogContent`/`DialogHeader`/`DialogFooter`, `Alert`, `ToastViewport` e `Tooltip` reais de `@nave/ui`, em vez do markup `style={{ backgroundColor: "var(--bs-*)" }}` que mascarou o bug de contraste do `FleetAlertBar`. Nota importante de escopo: esses componentes reais usam as classes Tailwind reais (`bg-primary`, `bg-danger-pastel`, etc.) que leem os tokens globais de `globals.css`/`.dark`, **não** o `--bs-*` escopado pelo `BrandScope` — ou seja, nas 5 direções não-`prata` o specimen de Feedback agora mostra a aparência real do design system (não a paleta decorativa daquela direção). Isso é intencional e é o próprio ponto da rodada: o componente real não muda de cor por direção, só a decoração ao redor dele muda. `ProgressTooltipSpecimen` mantém a barra de progresso ilustrativa (confirmado: `ProgressBar` não existe em `packages/ui`, só o protótipo de `dashboard/concept/*`) com legenda explícita "(ilustrativo — sem componente ProgressBar real ainda)"; o `Tooltip` foi trocado pelo componente real. `brand-showcase/` não tem suíte de testes (`*.spec.tsx`) hoje, então o checkbox de `jest-axe` não teve o que repetir. `npx tsc --noEmit` em `apps/web` passou sem erros após a mudança |
| 2026-07-30 | Rodada 3 concluída — os 7 itens da lista viraram specimens reais: `EmptyState`/`VehicleHealthScore` (novos) e `Table`/`KpiCard` (substituindo "DataGrid"/"Stat") em `data-display-specimens`; `Combobox` (substituindo `<select>`) e `CurrencyInput`/`OdometerInput` (novo) em `input-specimens`; `ChartWrapper` envolvendo o SVG de barras em `media-specimens`; `ThemeToggle`/`NavBadge`/`CommandPalette` (novos) em `navigation-specimens`. Verificação visual no navegador (não só `tsc`/lint) expôs **dois bugs reais**, ambos corrigidos na origem, não contornados no showcase: (1) `packages/ui/src/components/toast.tsx` usava `useEffect` sem a diretiva `"use client"` — build quebrava com "You're importing a module that depends on `useEffect` into a React Server Component" assim que qualquer Server Component (aqui, `media-specimens/index.tsx`) importava `@nave/ui` e a árvore de módulos alcançava `toast.tsx` sem cruzar uma fronteira `"use client"` antes; adicionada a diretiva, igual a quase todo o resto do pacote. (2) `BrandScope` só cobria as variáveis `--bs-*` ilustrativas, não as variáveis reais (`--primary`, `--foreground`, etc.) nem a propriedade `color-scheme` — como `next-themes` seta `style="color-scheme: dark"` no `<html>` real e isso é herdado, um `Button` variant `outline`/`ghost` (sem classe de cor de texto própria) renderizava texto branco ilegível sobre fundo claro sempre que o tema real do app estivesse em dark enquanto a direção do showcase estava em `mode="light"`. Corrigido injetando, além de `--bs-*`, todas as variáveis reais de `packages/ui/src/tokens/colors.ts` (via `cssVariableName`) resolvidas para o `mode` local, mais `colorScheme: mode` e uma declaração `color: oklch(var(--foreground))` própria no `BrandScope` (necessária porque `color` herda o *valor já resolvido*, não uma referência viva — só sobrescrever as variáveis não bastava enquanto o `<body>` real já tinha computado branco a partir do `canvastext` sob `color-scheme: dark`). **Limitação conhecida, não resolvida nesta rodada:** conteúdo portalado (`Dialog`/`CommandPalette`, via `RadixDialog.Portal`) renderiza fora da árvore do `BrandScope` (direto em `document.body`), então segue o tema real do app (`next-themes`), não o `mode` local do showcase — funcional e legível, só cosmeticamente inconsistente com o resto do specimen. Resolver isso exigiria passar um `container` escopado para cada `Portal` dos componentes reais (`dialog.tsx`/`command-palette.tsx` em `packages/ui`), mudança que afeta a API desses componentes em produção, não só o showcase — fora do escopo desta rodada; `next-themes` segue intencionalmente não tocado, mesma decisão já registrada na Rodada 1. Também corrigido um bug menor de layout: labels de `CurrencyInput`/`OdometerInput` precisavam de `className="block"` (o wrapper `inline-flex` do `CurrencyInput` não força quebra de linha como um `<input>` `w-full` força). Verificado visualmente em `/brand-showcase/prata/{feedback,exibicao-dados,inputs,navegacao,midia}` e em `/brand-showcase/rota/feedback` (não-Prata, confirma que o componente real não muda de cor por direção). Sem erros no console do navegador. `npx tsc --noEmit` e `npx eslint` (0 erros, só warnings pré-existentes de `security/detect-object-injection` em acesso a objeto por índice tipado, mesmo padrão já aceito em `directions.ts`) passaram em todos os arquivos tocados |
| 2026-07-30 | Rodada 4 (infra do teste) concluída, mas o teste fica **intencionalmente vermelho** — achado real, não bug do teste. Criado `_lib/contrast.spec.ts` (`vitest`) resolvendo cada token via `colorChannels`/`darkColorChannels` (mesmo padrão de `resolve()` de `directions.ts`) e testando: `foreground`/`background` e `foreground`/`card` (texto normal, 4,5:1 — uso real em `body`/`Card`), `danger`/`danger-foreground` (texto normal sobre fundo sólido, 4,5:1 — uso real em `Button` variant `destructive`), e `{success,warning,danger,info}` sobre `card` e sobre a própria `-pastel` (elemento não-textual, 3:1 — uso real: seta de tendência do `KpiCard`, `border-l` de `Alert`/`Toast`/`Badge`; nenhum desses componentes usa a cor semântica sólida como texto sobre `card`/`-pastel`, sempre `text-foreground`, confirmado lendo `alert.tsx`/`toast.tsx`/`badge.tsx`/`kpi-card.tsx`). Resultado: 4 de 22 casos falham, em ambos os temas — `warning` sobre `card` (~1,81:1, precisa 3:1), `warning` sobre `warning-pastel` (~1,68:1), e `success` sobre `card` (~2,97:1, abaixo do limiar por margem pequena). O comentário em `kpi-card.tsx` RF-02/RNF-02 ("a cor semântica fica só na seta... exige apenas 3:1 não-textual, que todas as variantes cumprem") ficou desatualizado: foi escrito sob `SPEC-20260721-001`, antes de `SPEC-20260729-001` (adoção da paleta Prata) trocar os valores de `warning`/`success`/`card` — exatamente o tipo de drift que esta rodada existe para pegar, e a razão de o teste falhar por design nesta entrega em vez de ser ajustado para passar. Perguntado a Douglas se corrigia os tokens nesta sessão (via `design-system` agent) ou deixava documentado para spec/ADR dedicado: decisão foi **deixar falhando e documentar** — recalibrar `warning`/`success` é decisão de paleta (croma/luminosidade), fora do escopo de "criar o teste", e cabe ao `design-system` agent com uma spec própria, não a um ajuste ad hoc aqui. **Pendência aberta, não fechada nesta rodada:** criar spec (`design-system`) para recalibrar `warning`/`success` em `packages/ui/src/tokens/colors.ts` até `_lib/contrast.spec.ts` passar 100%; até lá, `contrast.spec.ts` fica **vermelho no CI por desenho** — não reverter/pular o teste para "resolver" isso, o vermelho é o sinal correto |
| 2026-07-30 | Rodada 5 (infra do teste) concluída — `apps/web/e2e/tests/visual-regression.spec.ts` criado reaproveitando a suíte Playwright existente (`SPEC-20260716-003`), com `page.emulateMedia({ colorScheme })` para alternar tema (`next-themes` resolve por `prefers-color-scheme` na ausência de preferência salva — não precisa clicar no `ThemeToggle`) e `toHaveScreenshot(..., { fullPage: true, maxDiffPixelRatio: 0.01 })` para `dashboard`/`expenses`/`fines`, light e dark. Como `SPEC-20260716-003` listava explicitamente "testes visuais" em Fora de Escopo, a spec foi atualizada (v1.6): bullet de escopo riscado com nota, novo `RF-E2E-12`, `C-DS-01` adicionado a `rules` do frontmatter, `matrices/rastreabilidade.md` recebeu a linha correspondente (gate de sincronia, Nível 2) — sem isso a spec `approved` ficaria dessincronizada do código, o mesmo tipo de drift que este plano combate. **Pendência real, não fechada nesta rodada:** não havia stack local rodando nem `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` disponíveis nesta sessão para gerar a baseline de PNGs (`--update-snapshots`) — sem ela, todo run falha com "no baseline found" (não é uma regressão real). Registrado em `important/PENDENCIAS-E-PROCESSOS.md` como parte do item já existente de secrets de E2E: depois dos 6/7 secrets provisionados, falta rodar `playwright test visual-regression --update-snapshots` uma vez e commitar a pasta `*-snapshots/` gerada. `npx tsc --noEmit` em `apps/web` passou sem erros |
| 2026-07-30 | Rodada 6 concluída — governança sem código de produto novo. `specs/AGENTS.md` (tabela "Restrições de Processo") e `specs/design-system/README.md` (nova seção "Governança") passam a exigir specimen real no showcase para todo componente/variante novo em `packages/ui`. Varredura de cor hardcoded formalizada em `scripts/check-hardcoded-colors.mjs` (bloqueia `#hex` e `oklch(` literal fora de `packages/ui/src/tokens/`, `globals.css` e exceções documentadas — `dashboard/concept/*`, `directions.ts`, `vehicle-group.schemas.ts`, `manifest.ts`/`layout.tsx` por exigirem hex literal em API de browser, `_lib/contrast.ts` por conter o padrão "oklch(" dentro de regex de parsing, não como cor; `oklch(var(--token))` — referência dinâmica — é sempre permitido em qualquer arquivo), exposta via `pnpm check:hardcoded-colors` e novo job `hardcoded-colors-gate` em `.github/workflows/ci.yml`. Rodar o script contra o estado atual do repo expôs **duas violações reais**, ambas corrigidas na origem (mesmo padrão das Rodadas 3/4): `brand-showcase/comparar/page.tsx` usava `#C4331F`/`#1B6B3A` cravados para os badges Falha/Passa em vez de `oklch(var(--danger))`/`oklch(var(--success))`; `prata-glass-section/index.tsx` usava `#14171C`/`#F4F6F8`/`#5B6670` cravados (duplicando `goldForeground`/`background`/`muted-foreground`) em vez de `oklch(var(--gold-foreground))`/`oklch(var(--background))`/`oklch(var(--muted-foreground))` — variáveis reais já disponíveis desde a correção do `BrandScope` na Rodada 3. Script re-executado após as correções: `check-hardcoded-colors: ok`. `npx eslint`/`npx tsc --noEmit` sem erros nos arquivos tocados |
